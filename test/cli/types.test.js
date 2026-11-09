import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { test } from "node:test";

// Nothing in this file may reach the network: any code path that bypasses the
// injected transport fails here rather than calling a real site.
globalThis.fetch = () => {
	throw new Error("tests must not touch the network");
};

import { run } from "../../dist/cli/main.js";
import { createFakeSite } from "./fake-site.mjs";

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

test("--types limits the plan to the listed block types", async () => {
	const site = createFakeSite();
	const writer = io();
	const code = await run(
		["apply", "https://site.example", "--from", fixturePath, "--types", "hero"],
		{ transport: site.transport },
		writer,
	);

	strictEqual(code, 0);
	const result = jsonOutput(writer);
	deepStrictEqual([...new Set(result.plan.actions.map((action) => action.blockType))], ["hero"]);
	deepStrictEqual(result.plan.counts, { create: 2, update: 0, activate: 1, migrate: 0, unchanged: 0 });
});

test("--types limits what --field adds to a blocks field's allowedTypes; without it every block type is added", async () => {
	const seed = () => ({
		blockTypes: [],
		collections: [
			{
				slug: "pages",
				fields: [
					{ id: "f1", slug: "layout", label: "Layout", type: "blocks", required: false, validation: { allowedTypes: ["banner"] } },
				],
				entries: [],
			},
		],
	});

	// With --types: only the listed block type is allowed in the field.
	const restricted = createFakeSite();
	await restricted.seed(seed());
	let writer = io();
	strictEqual(
		await run(
			["apply", "https://site.example", "--from", fixturePath, "--apply", "--types", "cta", "--field", "pages/layout"],
			{ transport: restricted.transport },
			writer,
		),
		0,
	);
	deepStrictEqual(jsonOutput(writer).fieldUpdates, ["cta"]);
	deepStrictEqual([...restricted.collections.get("pages").fields.get("layout").validation.allowedTypes], ["banner", "cta"]);

	// Without --types: unchanged behaviour, every block type the module exports.
	const everything = createFakeSite();
	await everything.seed(seed());
	writer = io();
	strictEqual(
		await run(["apply", "https://site.example", "--from", fixturePath, "--apply", "--field", "pages/layout"], { transport: everything.transport }, writer),
		0,
	);
	deepStrictEqual(jsonOutput(writer).fieldUpdates, ["cta", "hero"]);
	deepStrictEqual(
		[...everything.collections.get("pages").fields.get("layout").validation.allowedTypes].sort(),
		["banner", "cta", "hero"],
	);
});

test("an empty --types is an error, not an unrestricted run", async () => {
	const site = createFakeSite();
	const writer = io();
	const code = await run(
		["apply", "https://site.example", "--from", fixturePath, "--types", ""],
		{ transport: site.transport },
		writer,
	);

	strictEqual(code, 1);
	ok(jsonOutput(writer).errors[0].message.includes("--types"));
	deepStrictEqual(site.requests, [], "the error happens before any request");
});

test("--types also limits the starter collections to the listed block types", async () => {
	const site = createFakeSite();
	const writer = io();
	const code = await run(
		["apply", "https://site.example", "--apply", "--collections", "--group", "services", "--types", "testimonials"],
		{ transport: site.transport },
		writer,
	);

	strictEqual(code, 0);
	const result = jsonOutput(writer);
	deepStrictEqual(result.collectionsCreated, ["testimonials"]);
	deepStrictEqual([...new Set(result.plan.actions.map((action) => action.blockType))], ["testimonials"]);
});

test("an unknown --types slug is a located JSON error before any request", async () => {
	const site = createFakeSite();
	const writer = io();
	const code = await run(
		["apply", "https://site.example", "--from", fixturePath, "--types", "hero,mystery"],
		{ transport: site.transport },
		writer,
	);

	strictEqual(code, 1);
	const error = jsonOutput(writer).errors[0];
	ok(error.message.includes("mystery"), error.message);
	strictEqual(error.blockType, "mystery");
	ok(error.message.includes("hero"), "the message names the available block types");
	deepStrictEqual(site.requests, [], "the error happens before any request");
});
