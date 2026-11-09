# 11-c13d8c40: Define the stats block

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Define the inline `stats` block (heading plus a repeater of value and label, as jamesryan-sites' `apps/marketing-site/src/plugins/marketing-blocks/index.ts` and `src/components/blocks/Stats.astro` shows), with variants from that component's sections. Follow the block-module pattern in `src/blocks/types/` and CODING_STANDARDS.md; read the source component read-only.

**Blocked by:** none

**Status:** done

- [x] The block renders through a test sections map for every variant.
- [x] Repeater items reach the section as typed props.

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code: new block type). Helper: grok (default model).

**2026-11-09 Orchestrator:** Done in 31411e4, merged to master (af03ad4) with no fix round. Inline `stats` block: variant `graph`, eyebrow, heading, body, and an items repeater of value and label.
