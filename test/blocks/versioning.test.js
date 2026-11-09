import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { test } from "node:test";

// Import through the package's exports (CODING_STANDARDS.md rule 8), so a
// broken build or exports map fails this test.
import * as blocks from "emdash-plugin-page-builder/blocks";
import { compareBlockFields } from "../../dist/cli/contract.js";

/** Every export that is a BlockType (the same discovery rule as the CLI). */
function blockTypes() {
	return Object.values(blocks).filter(
		(value) =>
			typeof value === "object" &&
			value !== null &&
			"definition" in value &&
			"variants" in value &&
			"migrations" in value,
	);
}

test("every exported BlockType has contiguous versions from 1 and a declared currentVersion", async () => {
	const types = blockTypes();
	ok(types.length >= 4, `expected the four v1 blocks, found ${types.length}`);
	for (const block of types) {
		const versions = block.definition.versions.map((version) => version.version).sort((a, b) => a - b);
		deepStrictEqual(versions, versions.map((_, index) => index + 1), `${block.definition.slug}: versions must be contiguous from 1`);
		ok(
			block.definition.versions.some((version) => version.version === block.definition.currentVersion),
			`${block.definition.slug}: currentVersion must be declared`,
		);
	}
});

test("every exported BlockType's version N is breaking against N-1", async () => {
	for (const block of blockTypes()) {
		const declared = [...block.definition.versions].sort((a, b) => a.version - b.version);
		for (let index = 1; index < declared.length; index += 1) {
			const compatibility = compareBlockFields(declared[index - 1].fields, declared[index].fields);
			ok(
				!compatibility.compatible,
				`${block.definition.slug} v${declared[index].version} is only a compatible change against ` +
					`v${declared[index - 1].version} (${compatibility.differences.map((d) => `${d.path}: ${d.change}`).join(", ")}); ` +
					`fold it into v${declared[index - 1].version} — EmDash would update the earlier version in place`,
			);
			strictEqual(typeof block.migrations[declared[index - 1].version], "function", `${block.definition.slug}: a breaking version needs a migration from v${declared[index - 1].version}`);
		}
	}
});
