import { deepStrictEqual, ok } from "node:assert";
import { test } from "node:test";

// Import through the package's exports (CODING_STANDARDS.md rule 8), so a
// broken build or exports map fails this test.
import * as blocks from "emdash-plugin-page-builder/blocks";

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

/**
 * EmDash's admin autosaves a page draft as soon as a block is added, and
 * EmDash validates required fields on every write, drafts included. A new
 * block always starts empty, so any required field or sub-field, or any
 * repeater minItems above 0, makes that first autosave fail. Block fields
 * are required to publish, not to save; the publish check is the plugin
 * entry's beforePublish hook (ADR 0003).
 */
const REASON =
	"a new, empty block must autosave as a draft: required fields and repeater " +
	"minItems fail EmDash's validation on the admin's first autosave before the " +
	"editor has filled anything in (ADR 0003, required to publish not to save)";

test("no exported block definition has a required field, a required sub-field, or a repeater minItems above 0", () => {
	const types = blockTypes();
	ok(types.length > 0, "expected exported block types to guard");
	const violations = [];
	for (const block of types) {
		for (const version of block.definition.versions) {
			for (const field of version.fields) {
				const where = `${block.definition.slug} v${version.version}`;
				if (field.required) violations.push(`${where}: field ${field.slug} is required`);
				for (const subField of field.validation?.subFields ?? []) {
					if (subField.required) {
						violations.push(`${where}: repeater ${field.slug} sub-field ${subField.slug} is required`);
					}
				}
				if ((field.validation?.minItems ?? 0) > 0) {
					violations.push(`${where}: repeater ${field.slug} has minItems ${field.validation.minItems}`);
				}
			}
		}
	}
	deepStrictEqual(violations, [], violations.length ? `${violations.join("; ")} — ${REASON}` : REASON);
});
