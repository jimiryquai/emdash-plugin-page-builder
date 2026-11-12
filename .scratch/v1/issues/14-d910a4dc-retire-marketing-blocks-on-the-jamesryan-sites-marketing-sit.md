# 14-d910a4dc: Retire marketing-blocks on the jamesryan-sites marketing site

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

On jamesryan-sites' marketing site, once every page renders from `layout` with page builder blocks proven live: migrate each page's remaining Portable Text `content` (its marketing blocks) into `layout` with a script, the way `move-home-hero-to-layout.mjs` moved the home hero, across seed, staging and production data; make the page templates read only `layout`; remove the marketing-blocks plugin and its components; then remove the `content` field from the `pages` collection so the admin shows only Layout. Work branches from jamesryan-sites `master`, after ticket 23 (published pages) has merged there. Production writes need James's approval.

**Blocked by:** 09-5c2ec46b, 10-b8f04e43, 11-c13d8c40, 12-de8f654a, 13-4f5bb821, 20-f32e818c, 21-3f72e4a7

**Status:** ready-for-agent

- [ ] Every page's `content` has moved into `layout` by script, in the seed and on staging, and every page renders from `layout` locally the same as before.
- [ ] The page templates read only `layout`; marketing-blocks and its components are removed and the site's checks pass.
- [ ] The `pages` collection has no `content` field, and the admin shows only Layout.
- [ ] Production content was migrated with James's approval (needs James).

## Comments

**2026-11-12 Orchestrator:** Scope widened at James's request, relayed by the jamesryan-sites session: the Content field on pages "seems redundant" once Layout is there, so adoption finishes by moving every page's content into `layout` (seed, staging, production), templates reading only `layout`, and the `content` field removed from `pages`. Start after jamesryan-sites ticket 23 (`23-published-pages`, PR #23) merges: it rewrites the same page templates.

**2026-11-12 Orchestrator:** Split for parallel work: 20-f32e818c offers the other five blocks, 21-3f72e4a7 builds the general content-to-layout script. 14 keeps the rest: seed pages in `layout`, templates reading only `layout`, marketing-blocks removed, the `content` field removed (with a script for live sites that removes it only once every page's content is empty). 08 is no longer a blocker for the local work; production runs after 08's production steps.
