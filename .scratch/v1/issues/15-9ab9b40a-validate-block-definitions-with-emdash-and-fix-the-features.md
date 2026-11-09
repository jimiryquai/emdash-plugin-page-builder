# 15-9ab9b40a: Validate block definitions with EmDash and fix the features slugs

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Ticket 08's first real adoption found that EmDash rejects the `features` block: its repeater sub-fields `ctaLabel` and `ctaUrl` break EmDash's slug rule (lowercase letters, numbers, underscores), so the CLI's create fails with VALIDATION_ERROR and a fresh seed fails setup. None of the package's tests ran EmDash's own validation. Add a test in `npm run check` that builds a seed from every `BlockType` the blocks entry exports (all definitions, plus every `starter` built with a sample group collection) and runs EmDash's exported `validateSeed` over it; it must report valid with no warnings. Then rename the two sub-fields to `cta_label` and `cta_url` in features v1 (in place: no site has applied features yet) and its `FeatureItem` type, fixtures, tests and README.

**Blocked by:** none.

**Status:** done

- [x] `npm run check` runs EmDash's `validateSeed` over every exported block definition and starter collection, and fails on the current features definition (red run saved).
- [x] Features' sub-fields are `cta_label` and `cta_url`, and the validation test passes for every block.

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code and checks). Helper: codex (default model).

**2026-11-09 Orchestrator:** Done in 0e6dd95, merged to master (fd89309). `test/blocks/versioning.test.js` now runs EmDash's `validateSeed` over every exported block definition and starter collection (valid, no warnings). The red run caught two blocks: features (`ctaLabel`, `ctaUrl` became `cta_label`, `cta_url`) and comparison (its camelCase sub-fields became snake_case). Both fixed in place at version 1, since no site has applied either.
