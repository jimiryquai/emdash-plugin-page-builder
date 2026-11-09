# 13-4f5bb821: Define the comparison block

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Define the inline `comparison` block from jamesryan-sites' `apps/marketing-site/src/plugins/marketing-blocks/index.ts` and `src/components/blocks/Comparison.astro` (its rows and columns as repeaters), with variants from that component's sections. Follow the block-module pattern in `src/blocks/types/` and CODING_STANDARDS.md; read the source component read-only.

**Blocked by:** none

**Status:** done

- [x] The block renders through a test sections map for every variant.
- [x] Rows and columns reach the section as typed props.

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code: new block type). Helper: copilot (default model).

**2026-11-09 Orchestrator:** Done in 91795c8, merged to master with no fix round. Inline `comparison` block: variant `table`; up to three columns (position + label) and rows (optional group, feature name, a value per position). Its repeater sub-field select keeps its choices in `options`, which is where EmDash reads them for sub-fields (`block-type-contract.ts` line 110), unlike a top-level select's `validation.options`.
