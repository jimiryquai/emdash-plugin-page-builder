import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { test } from "node:test";

import { run } from "../../dist/cli/main.js";
import { createFakeSite } from "./fake-site.mjs";
import heroCta, { hero as heroDefinition, cta as ctaDefinition } from "./fixtures/definitions.mjs";

const fixturePath = new URL("./fixtures/definitions.mjs", import.meta.url).pathname;

function io() {
	const lines = [];
	return {
		lines,
		out: (message) => lines.push(message),
		err: (message) => lines.push(`stderr: ${message}`),
	};
}

function jsonOutput(writer) {
	return JSON.parse(writer.lines.filter((line) => !line.startsWith("stderr: ")).join("\n"));
}

test("plan is the default: JSON listing each block type and version as create, activate or unchanged", async () => {
	const site = createFakeSite();
	const writer = io();
	const code = await run(["apply", "https://site.example", "--from", fixturePath], { transport: site.transport }, writer);

	strictEqual(code, 0);
	const result = jsonOutput(writer);
	strictEqual(result.applied, false);

	const heroActions = result.plan.actions.filter((action) => action.blockType === "hero");
	deepStrictEqual(
		heroActions.map((action) => [action.version, action.action]),
		[
			[1, "create"],
			[2, "create"],
			[2, "activate"],
		],
	);
	const ctaActions = result.plan.actions.filter((action) => action.blockType === "cta");
	deepStrictEqual(
		ctaActions.map((action) => [action.version, action.action]),
		[
			[1, "create"],
			[1, "activate"],
		],
	);
	deepStrictEqual(result.plan.counts, { create: 3, update: 0, activate: 2, migrate: 0, unchanged: 0 });

	// Plan only: nothing was written to the site.
	strictEqual(site.blockTypes.size, 0);
});

test("--apply creates the types, and a second --apply reports no changes", async () => {
	const site = createFakeSite();
	let writer = io();
	strictEqual(await run(["apply", "https://site.example", "--from", fixturePath, "--apply"], { transport: site.transport }, writer), 0);

	const hero = site.blockTypes.get("hero");
	strictEqual(hero.versions.length, 2);
	// A new type's own current version is activated: no stored blocks can exist.
	strictEqual(hero.currentVersion, 2);
	strictEqual(site.blockTypes.get("cta").currentVersion, 1);

	writer = io();
	strictEqual(await run(["apply", "https://site.example", "--from", fixturePath, "--apply"], { transport: site.transport }, writer), 0);
	const second = jsonOutput(writer);
	deepStrictEqual(second.plan.counts, { create: 0, update: 0, activate: 0, migrate: 0, unchanged: 3 });
	ok(second.plan.actions.every((action) => action.action === "unchanged"));
});

test("a breaking version is created inactive and only activated with --activate; --migrate preserves _key", async () => {
	const site = createFakeSite();
	site.seed({
		blockTypes: [{ ...heroDefinition, currentVersion: 1, versions: [heroDefinition.versions[0]] }],
		collections: [
			{
				slug: "pages",
				fields: [{ id: "f1", slug: "layout", label: "Layout", type: "blocks", required: false, validation: { allowedTypes: ["hero"] } }],
				entries: [
					{
						id: "home",
						slug: "home",
						status: "published",
						data: {
							layout: [
								{ _type: "hero", _version: 1, _key: "key-1", heading: "Hello" },
							],
						},
					},
				],
			},
		],
	});

	// 1. apply without --activate: v2 is created but stays inactive.
	let writer = io();
	strictEqual(await run(["apply", "https://site.example", "--from", fixturePath, "--apply"], { transport: site.transport }, writer), 0);
	const first = jsonOutput(writer);
	const heroCreate = first.plan.actions.find((action) => action.blockType === "hero" && action.version === 2 && action.action === "create");
	strictEqual(heroCreate.result, "done");
	const heroActivate = first.plan.actions.find((action) => action.blockType === "hero" && action.action === "activate");
	strictEqual(heroActivate.result, "skipped");
	strictEqual(site.blockTypes.get("hero").currentVersion, 1);
	ok(site.blockTypes.get("hero").versions.some((version) => version.version === 2));

	// The migration is planned but not performed without --migrate.
	const migration = first.plan.actions.find((action) => action.action === "migrate");
	ok(migration, "the plan lists the pending migration");
	strictEqual(migration.result, "skipped");
	strictEqual(site.content.get("pages").get("home").data.layout[0]._version, 1);

	// 2. activate: the renderer is deployed.
	writer = io();
	strictEqual(await run(["apply", "https://site.example", "--from", fixturePath, "--apply", "--activate"], { transport: site.transport }, writer), 0);
	strictEqual(site.blockTypes.get("hero").currentVersion, 2);

	// 3. migrate: the stored block moves to v2 with its _key intact.
	writer = io();
	strictEqual(await run(["apply", "https://site.example", "--from", fixturePath, "--apply", "--migrate"], { transport: site.transport }, writer), 0);
	const block = site.content.get("pages").get("home").data.layout[0];
	strictEqual(block._version, 2);
	strictEqual(block._key, "key-1");
	strictEqual(block.heading, "Hello");

	const migrateWrite = site.requests.find(
		(request) => request.method === "PUT" && request.path === "/_emdash/api/content/pages/home",
	);
	ok(migrateWrite);
	strictEqual(migrateWrite.body.migrateBlocks, true);
});

test("an EmDash error names the operation, code and message, and exits non-zero", async () => {
	const site = createFakeSite();
	const failing = async (request) => {
		if (request.method === "POST" && request.path === "/_emdash/api/schema/block-types" && request.body?.slug === "hero") {
			return { status: 403, json: { success: false, error: { code: "FORBIDDEN", message: "token lacks schema:manage" } } };
		}
		return site.transport(request);
	};
	const writer = io();
	const code = await run(["apply", "https://site.example", "--from", fixturePath, "--apply"], { transport: failing }, writer);

	strictEqual(code, 1);
	const result = jsonOutput(writer);
	const error = result.errors[0];
	strictEqual(error.code, "FORBIDDEN");
	strictEqual(error.status, 403);
	strictEqual(error.blockType, "hero");
	ok(error.message.includes("create block type"), error.message);
	ok(error.message.includes("token lacks schema:manage"), error.message);
});

test("--table prints a human view of the same plan", async () => {
	const site = createFakeSite();
	const writer = io();
	strictEqual(await run(["apply", "https://site.example", "--from", fixturePath, "--table"], { transport: site.transport }, writer), 0);
	const table = writer.lines.join("\n");
	ok(table.includes("hero"));
	ok(table.includes("create"));
	ok(table.includes("activate"));
});

test("--field adds the block types to a named blocks field's allowedTypes", async () => {
	const site = createFakeSite();
	site.seed({
		collections: [
			{
				slug: "pages",
				fields: [{ id: "f1", slug: "layout", label: "Layout", type: "blocks", required: false, validation: { allowedTypes: ["banner"] } }],
				entries: [],
			},
		],
	});
	const writer = io();
	const code = await run(
		["apply", "https://site.example", "--from", fixturePath, "--apply", "--field", "pages/layout"],
		{ transport: site.transport },
		writer,
	);
	strictEqual(code, 0);
	const result = jsonOutput(writer);
	deepStrictEqual(result.fieldUpdates.sort(), ["cta", "hero"]);
	deepStrictEqual(site.collections.get("pages").fields.get("layout").validation.allowedTypes, ["banner", "hero", "cta"]);
});

test("--collections applies starter collections only on request", async () => {
	const site = createFakeSite();
	const args = ["apply", "https://site.example", "--from", fixturePath, "--apply"];
	let writer = io();
	strictEqual(await run([...args], { transport: site.transport }, writer), 0);
	strictEqual(site.collections.size, 0, "no collections without --collections");

	writer = io();
	strictEqual(await run([...args, "--collections"], { transport: site.transport }, writer), 0);
	const result = jsonOutput(writer);
	deepStrictEqual(result.collectionsCreated, ["testimonials"]);
	ok(site.collections.has("testimonials"));
});

test("no token and no injected transport: the CLI fails before any request", async () => {
	const previous = process.env.EMDASH_TOKEN;
	delete process.env.EMDASH_TOKEN;
	const writer = io();
	try {
		const code = await run(["apply", "https://site.example", "--from", fixturePath], {}, writer);
		strictEqual(code, 1);
		const result = jsonOutput(writer);
		ok(result.errors[0].message.includes("EMDASH_TOKEN"));
	} finally {
		if (previous !== undefined) process.env.EMDASH_TOKEN = previous;
	}
});

test("every request in these tests was served by the in-memory fake site", async () => {
	const site = createFakeSite();
	await run(["apply", "https://site.example", "--from", fixturePath, "--apply"], { transport: site.transport }, io());
	ok(site.requests.length > 0);
	for (const request of site.requests) {
		ok(request.path.startsWith("/_emdash/api/"), request.path);
	}
	// The definitions fixture carries the seed shape the block modules export.
	strictEqual(heroDefinition.versions.at(-1).version, heroDefinition.currentVersion);
	strictEqual(ctaDefinition.currentVersion, 1);
});
