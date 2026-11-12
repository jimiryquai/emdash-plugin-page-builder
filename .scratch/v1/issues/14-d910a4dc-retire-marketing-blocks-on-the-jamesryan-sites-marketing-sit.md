# 14-d910a4dc: Retire marketing-blocks on the jamesryan-sites marketing site

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

On jamesryan-sites' marketing site, finish the move to Layout. Work on branch `feat/14-layout-only`, which is site `master` with tickets 20 (all ten blocks offered) and 21 (`scripts/move-content-to-layout.mjs`) merged in.

1. **Seed:** every seeded page's marketing content lives in `layout`, produced by 21's conversion functions (no hand-copied blocks), and no page has `content`.
2. **Templates read only Layout:** remove the Portable Text `content` path from `PublishedPage.astro`, `index.astro` and `about.astro`. Pages render their `layout`. About's hand-written body stays as its fallback when its layout is empty (it was never Content; rebuilding it from blocks is a later ticket).
3. **Retire marketing-blocks:** remove the plugin (`src/plugins/marketing-blocks/`, its registration in `astro.config.mjs`) and `MarketingBlocks.astro`. Keep the `src/components/blocks/*` components the page builder's sections still render.
4. **Remove the field:** the `pages` collection has no `content` field in the seed or the generated types. For live sites, add `scripts/retire-pages-content.mjs`: plan by default; it refuses unless 21's script plans nothing for every page (everything has moved); with `--apply`, it clears each page's `content` (with `_rev`, republishing published pages through the policy), then deletes the `content` field through the schema API, and reads both back.

Prove it all locally on a fresh database. Staging runs come from the orchestrator, after this merges. Production needs James's approval.

**Blocked by:** 09-5c2ec46b, 10-b8f04e43, 11-c13d8c40, 12-de8f654a, 13-4f5bb821, 20-f32e818c, 21-3f72e4a7

**Status:** in progress (stacked on 20 and 21; their PRs #27 and #28 await James's merge)

- [ ] Every page's `content` has moved into `layout` by script, in the seed and on staging, and every page renders from `layout` locally the same as before.
- [ ] The page templates read only `layout`; the marketing-blocks plugin and `MarketingBlocks.astro` are removed, and the site's checks pass.
- [ ] The `pages` collection has no `content` field in the seed and types, the admin shows only Layout, and `retire-pages-content.mjs` plans, refuses while anything is unmoved, and applies against a local database.
- [ ] Production content was migrated with James's approval (needs James).

## Comments

**2026-11-12 Orchestrator:** Scope widened at James's request, relayed by the jamesryan-sites session: the Content field on pages "seems redundant" once Layout is there, so adoption finishes by moving every page's content into `layout` (seed, staging, production), templates reading only `layout`, and the `content` field removed from `pages`. Start after jamesryan-sites ticket 23 (`23-published-pages`, PR #23) merges: it rewrites the same page templates.

**2026-11-12 Orchestrator:** Split for parallel work: 20-f32e818c offers the other five blocks, 21-3f72e4a7 builds the general content-to-layout script. 14 keeps the rest: seed pages in `layout`, templates reading only `layout`, marketing-blocks removed, the `content` field removed (with a script for live sites that removes it only once every page's content is empty). 08 is no longer a blocker for the local work; production runs after 08's production steps.

**2026-11-12 Orchestrator:** Scope made precise for the stacked branch (see What to build). About's hand-written body stays as its empty-layout fallback; rebuilding about (and pricing) from blocks is a later ticket. The `src/components/blocks/*` components stay, because 20's sections render them. Risk: high (another repo, and it removes a field). Helper: pi (GLM 5.3). The staging run is mine after the merge.
