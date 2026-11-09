# 05-e6b61585: Define the features block

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Define the `features` block type (inline content): heading plus a repeater of items, using nested `repeater` and `image` where the existing `Features.astro` needs them, with its variant vocabulary taken from the sections that component chooses between.

**Blocked by:** 03-48a1daa0

**Status:** done

- [x] The block renders through a test sections map for every variant.
- [x] Repeater items reach the section as typed props.

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code: new block types, compatible). Helper: agy.

**2026-11-09 Orchestrator:** Done in 3d2e941 and fix round 813bb34, merged to master. `features` block (`src/blocks/types/features.ts`): eyebrow, heading, subheadline, variant (`two-column`, `three-column`, `three-column-demos`, `alternating`), items repeater (title, description, image, icon, CTA). Its circular import with `index.ts` led to master's `src/blocks/core.ts` refactor. Accepted for now: variant descriptions are written twice (in `featureVariantDescriptions` and the block description); backlogged.
