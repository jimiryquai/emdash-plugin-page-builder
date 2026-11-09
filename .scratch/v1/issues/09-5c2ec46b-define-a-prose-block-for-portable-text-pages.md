# 09-5c2ec46b: Define a prose block for Portable Text pages

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Define a `prose` block holding a `portableText` field, so prose pages (privacy-policy and its `marketing.document`) can move into `layout`. Variants from what `jamesryan-sites' `apps/marketing-site/src/plugins/marketing-blocks/index.ts` and `src/components/blocks/Document.astro` shows. Inline content. Follow the block-module pattern in `src/blocks/types/` and CODING_STANDARDS.md; read the source component read-only.

**Blocked by:** none

**Status:** done

- [x] The block renders Portable Text through a test sections map for every variant.
- [x] A stored `marketing.document` body can be carried into the block without loss (a fixture conversion test).

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code: new block type). Helper: agy (default model).

**2026-11-09 Orchestrator:** Done in 22c4954, merged to master (a18bacf) with no fix round. Inline `prose` block: variants `centered` and `start`, a required heading, an optional plain-text body, and required Portable Text `content`. The test shows a stored `marketing.document` converting without loss; ticket 14's migration can reuse that mapping.
