import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { test } from "node:test";

// Nothing in this file may reach the network: any code path that bypasses the
// injected transport fails here rather than calling a real site.
globalThis.fetch = () => {
	throw new Error("tests must not touch the network");
};

import { run } from "../../dist/cli/main.js";
import { createFakeSite } from "./fake-site.mjs";
import { hero as heroModule, cta as ctaModule } from "./fixtures/definitions.mjs";
import { card as cardModule } from "./fixtures/compatible-v2.mjs";

const fixturePath = new URL("./fixtures/definitions.mjs", import.meta.url).pathname;
const compatiblePath = new URL("./fixtures/compatible-v2.mjs", import.meta.url).pathname;
const reorderedPath = new URL("./fixtures/reordered.mjs", import.meta.url).pathname;

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

test("a definition with reordered field keys plans unchanged (canonical comparison)", async () => {
	const site = createFakeSite();
	await site.seed({ blockTypes: [heroModule.definition, ctaModule.definition] });
	const writer = io();
	strictEqual(await run(["apply", "https://site.example", "--from", reorderedPath, "--apply"], { transport: site.transport }, writer), 0);
	const result = jsonOutput(writer);
	deepStrictEqual(result.plan.counts, { create: 0, update: 0, activate: 0, migrate: 0, unchanged: 2 });
});

test("a version that is not breaking against its predecessor errors before any write", async () => {
	const site = createFakeSite();
	await site.seed({
		blockTypes: [{ ...cardModule.definition, currentVersion: 1, versions: [cardModule.definition.versions[0]] }],
	});
	const writer = io();
	const code = await run(["apply", "https://site.example", "--from", compatiblePath, "--apply"], { transport: site.transport }, writer);

	strictEqual(code, 1);
	const result = jsonOutput(writer);
	const error = result.errors[0];
	ok(error.message.includes("card v2 is not a breaking change"), error.message);
	ok(error.message.includes("fold"), error.message);
	// The site was never touched: no in-place rewrite of v1, no new version.
	const card = site.blockTypes.get("card");
	strictEqual(card.versions.length, 1);
	strictEqual(card.currentVersion, 1);
	deepStrictEqual(card.versions[0].fields, cardModule.definition.versions[0].fields);
	ok(result.plan.errors.some((message) => message.includes("card v2")));
});

test("a breaking version is created inactive and only activated with --activate; --migrate runs the migration chain and preserves _key", async () => {
	const site = createFakeSite();
	await site.seed({
		blockTypes: [{ ...heroModule.definition, currentVersion: 1, versions: [heroModule.definition.versions[0]] }],
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
							layout: [{ _type: "hero", _version: 1, _key: "key-1", heading: "Hello", body: "World" }],
						},
					},
				],
			},
		],
	});

	// 1. apply without --activate: v2 is created but stays inactive; the stored
	//    block waits, and the plan says so instead of listing a migration.
	let writer = io();
	strictEqual(await run(["apply", "https://site.example", "--from", fixturePath, "--apply"], { transport: site.transport }, writer), 0);
	const first = jsonOutput(writer);
	strictEqual(first.plan.actions.find((a) => a.blockType === "hero" && a.version === 2 && a.action === "create").result, "done");
	strictEqual(first.plan.actions.find((a) => a.blockType === "hero" && a.action === "activate").result, "skipped");
	strictEqual(site.blockTypes.get("hero").currentVersion, 1);
	ok(site.blockTypes.get("hero").versions.some((v) => v.version === 2));
	ok(first.plan.actions.every((a) => a.action !== "migrate"));
	ok(first.plan.warnings.some((w) => w.includes("hero") && w.includes("--activate")), first.plan.warnings.join("; "));
	strictEqual(site.content.get("pages").get("home").data.layout[0]._version, 1);

	// 2. activate: the renderer is deployed.
	writer = io();
	strictEqual(await run(["apply", "https://site.example", "--from", fixturePath, "--apply", "--activate"], { transport: site.transport }, writer), 0);
	strictEqual(site.blockTypes.get("hero").currentVersion, 2);

	// The pending migration shows in the plan, skipped without --migrate.
	const second = jsonOutput(writer);
	const migration = second.plan.actions.find((a) => a.action === "migrate");
	ok(migration, "the plan lists the pending migration");
	strictEqual(migration.detail, "pages/home.layout");
	strictEqual(migration.result, "skipped");

	// 3. migrate: the migration chain renames body→text, the value survives,
	//    and _key and _version move to the active version.
	writer = io();
	strictEqual(await run(["apply", "https://site.example", "--from", fixturePath, "--apply", "--migrate"], { transport: site.transport }, writer), 0);
	const block = site.content.get("pages").get("home").data.layout[0];
	strictEqual(block._version, 2);
	strictEqual(block._key, "key-1");
	strictEqual(block.heading, "Hello");
	strictEqual(block.text, "World", "the renamed field's value survived the migration");

	const migrateWrite = site.requests.find(
		(request) => request.method === "PUT" && request.path === "/_emdash/api/content/pages/home",
	);
	ok(migrateWrite);
	strictEqual(migrateWrite.body.migrateBlocks, true);
	ok(migrateWrite.body._rev, "the entry's _rev travels with the write");
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

test("a lost update during --migrate surfaces as a located conflict", async () => {
	const site = createFakeSite();
	await site.seed({
		blockTypes: [heroModule.definition],
		collections: [
			{
				slug: "pages",
				fields: [{ id: "f1", slug: "layout", label: "Layout", type: "blocks", required: false, validation: { allowedTypes: ["hero"] } }],
				entries: [
					{ id: "home", slug: "home", status: "published", data: { layout: [{ _type: "hero", _version: 1, _key: "k", heading: "Hi", body: "x" }] } },
				],
			},
		],
	});
	// The site has moved on since the CLI read the entry: the scan's _rev is stale.
	// (Copies, not mutations — the fake's entries are shared references.)
	const stale = async (request) => {
		const response = await site.transport(request);
		if (request.method === "GET" && request.path === "/_emdash/api/content/pages") {
			response.json = {
				...response.json,
				data: {
					...response.json.data,
					items: response.json.data.items.map((item) => ({ ...item, _rev: "someone-else-wrote" })),
				},
			};
		}
		return response;
	};
	const writer = io();
	const code = await run(["apply", "https://site.example", "--from", fixturePath, "--apply", "--migrate"], { transport: stale }, writer);

	strictEqual(code, 1);
	const result = jsonOutput(writer);
	const error = result.errors[0];
	strictEqual(error.code, "CONFLICT");
	strictEqual(error.status, 409);
	ok(error.operation.includes("pages/home"), error.operation);
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
	deepStrictEqual(result.fieldUpdates, ["cta", "hero"]);
	deepStrictEqual([...site.collections.get("pages").fields.get("layout").validation.allowedTypes].sort(), ["banner", "cta", "hero"]);
});

test("the package's own block modules plan against an empty site with no --from", async () => {
	const site = createFakeSite();
	const writer = io();
	const code = await run(["apply", "https://site.example"], { transport: site.transport }, writer);
	strictEqual(code, 0);
	const result = jsonOutput(writer);
	const created = [
		...new Set(result.plan.actions.filter((a) => a.action === "create").map((a) => a.blockType)),
	];
	deepStrictEqual(created.sort(), ["comparison", "cta", "faq", "features", "hero", "pricing", "prose", "stats", "team", "testimonials"]);
});

test("--collections derives starters from the block modules and needs --group", async () => {
	const site = createFakeSite();
	let writer = io();
	const code = await run(
		["apply", "https://site.example", "--apply", "--collections"],
		{ transport: site.transport },
		writer,
	);
	strictEqual(code, 1);
	ok(jsonOutput(writer).errors[0].message.includes("--collections needs --group"));

	// With --group: the testimonials starter arrives as a collection plus its
	// fields (EmDash's create body carries no fields), referencing the group.
	writer = io();
	strictEqual(
		await run(["apply", "https://site.example", "--apply", "--collections", "--group", "services"], { transport: site.transport }, writer),
		0,
	);
	const result = jsonOutput(writer);
	deepStrictEqual(result.collectionsCreated, ["faqs", "pricing", "team", "testimonials"]);
	const collection = site.collections.get("testimonials");
	ok(collection, "the starter collection was created");
	deepStrictEqual(
		[...collection.fields.keys()].sort(),
		["author", "avatar", "company", "group", "quote", "role"],
	);
	strictEqual(collection.fields.get("group").validation.targetCollection, "services");
	strictEqual(collection.titleField, "author");
	// The create-collection body never carried fields (EmDash rejects that).
	const createCollection = site.requests.find(
		(request) => request.method === "POST" && request.path === "/_emdash/api/schema/collections",
	);
	ok(!("fields" in createCollection.body));
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
	// The fixtures carry the module shape the blocks core exports.
	strictEqual(heroModule.definition.versions.at(-1).version, heroModule.definition.currentVersion);
	ok(Array.isArray(heroModule.variants));
	ok(typeof heroModule.migrations[1] === "function");
	strictEqual(ctaModule.definition.currentVersion, 1);
});
