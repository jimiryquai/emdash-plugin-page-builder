# 18-80574483: Let a new block autosave by making block fields optional

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

James found it on the local site (2026-11-10): adding a block to a page's `layout` in the admin fails at once, before he saves, with `VALIDATION_ERROR` "layout[1].heading: Invalid input: expected string, received undefined" in the network tab. The admin autosaves a draft as soon as the block is added, and EmDash validates required block fields on every write, drafts included. A new block always starts empty, so any `required: true` block field (hero, cta, features, stats and prose headings; prose content), any required repeater sub-field (features item `title`, `linksField()` label and URL, comparison and stats rows), and any repeater `minItems` makes the first autosave fail.

Make every block field and repeater sub-field optional and drop repeater `minItems`, in place at each block's current version (loosening validation is a compatible change in EmDash, so no new version and no migration). Keep `defaultValue`s. Make the exported value types and shapes treat those fields as optional, and check every section fixture and test still renders a block with missing fields (an empty block must render, not throw). Add a package test that fails if any exported block definition has a required field or sub-field or a repeater with `minItems` above 0, with a message saying why (autosave of a new, empty block). Record the reason in `docs/lessons/` (one lesson, via the existing bundle format).

**Blocked by:** none.

**Status:** ready-for-agent

- [ ] No exported block definition has a required field or sub-field or a repeater `minItems` above 0, enforced by a test in `npm run check` that explains the autosave reason.
- [ ] Every block renders through its test sections with all its optional fields missing.
- [ ] `validateSeed` and the versioning tests still pass with every block at its current version, and a lesson records why block fields stay optional.

## Comments
