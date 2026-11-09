# 12-de8f654a: Define the team block

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Define the shared-content `team` block on `createCollectionSource`: a `TeamMember` shape from the site's `team` collection, `scope`, a starter collection and default source, `starter` set. Variants from jamesryan-sites' `apps/marketing-site/src/plugins/marketing-blocks/index.ts` and `src/components/blocks/Team.astro`. Follow the block-module pattern in `src/blocks/types/` and CODING_STANDARDS.md; read the source component read-only.

**Blocked by:** none

**Status:** done

- [x] The block renders team members from a source through a test sections map for every variant, honouring scope.
- [x] The default source works with the starter collection with no mapping.

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code: new block type). Helper: pi (default model).

**2026-11-09 Orchestrator:** Done in 36914bd, merged to master (389e3c3) with no fix round. Shared-content `team` block on `createCollectionSource`: the `TeamMember` shape (name, role, image), variants `four-column` and `three-column`, `scope` and `count`, starter collection and `createTeamSource`, `starter` set.
