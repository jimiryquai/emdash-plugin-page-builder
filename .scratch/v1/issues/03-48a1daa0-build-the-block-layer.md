# 03-48a1daa0: Build the block layer

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Build `<PageBuilder>`, the block layer around EmDash's `<Blocks>` (spec: "What the package owns"). For each stored block it runs the migration chain up to the current version, resolves sources and scope for shared-content blocks (an interface the testimonials ticket fills in), picks the site's section for the block's variant with fallback to the block's default section, and renders it. Also define the in-package format for a block type: its versions, migrations, variant vocabulary and description, as one module per block. Prove it with a test-only block type that has two versions.

**Blocked by:** 01-e1a022b4

**Status:** done

- [x] A stored v1 block renders through its v2 section after the migration chain runs, with `_key` unchanged.
- [x] An unmapped variant renders the block's default section; a block type with no default section is a type error for the site.
- [x] An unknown block type renders EmDash's fallback, not an exception.
- [x] The package ships `.astro` components (packaged and exported, not only compiled TS), proven by importing one from the packed package in a consumer.
- [x] The block-type module format is documented in the README for the next tickets.

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code: block layer, migrations, packaging). Helper: codex (gpt-6.1-sol).

**2026-11-09 Orchestrator:** Done in c001033, with fix rounds 0019afc and cf8bfd3, merged to master. `<PageBuilder>` (exported as `emdash-plugin-page-builder/blocks/PageBuilder.astro`) wraps EmDash `<Blocks>`: it upgrades stored blocks through `migrateBlocks`, maps variants to site sections (default required at type level), forwards EmDash's fallback, and has a minimal sources/scope seam for ticket 06. Block modules export `definition` in EmDash's seed `blockTypes` shape plus `variants` and `migrations`; `variantField()` and `VARIANT_FIELD_SLUG` own the variant field. Review fixes: temp consumer cleanup, one home for the variant field, README status, and `check` ordering so a clean checkout passes (the helper's green relied on a stale `dist/`).
