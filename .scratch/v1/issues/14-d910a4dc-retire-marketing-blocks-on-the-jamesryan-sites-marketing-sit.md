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

**2026-11-12 Orchestrator:** Built by pi (GLM 5.3). After site ticket 25 (Astro 7, EmDash 1.5) merged, I rebuilt the stack on site master 33227ca: merged 20 and 21, then cherry-picked 14's four commits. One conflict: 14 deletes `marketing-blocks/index.ts`, which 25 had edited, so I kept the deletion. My CI run on the stack passed: typecheck 0 errors in both apps, build, 73/73 tests, rendered SEO and code-block checks. AGENTS.md: every removed line described the removed plugin. Regression found: pages' Markdown route is title only, so I raised 26-d638e399, which must land before production. Pre-rebuild head kept as `backup/14-layout-only-pre-astro7`.

**2026-11-12 Orchestrator:** PR #31 is held as a draft until production has been promoted with the current staging stack (agreed with the jamesryan-sites session). Production order, each write with James's approval and each step plan, apply, plan:
- **Promotion A:** restore point; promote; plugin active; create the `layout` and `service` fields; CLI apply with `--types`; `move-content-to-layout.mjs` plan then apply (needs #28); check every page.
- **Promotion B:** #31 plus v1/26. Take a restore point and a raw export of `ec_pages`; promote; `retire-pages-content.mjs` plan then apply; check pages and `/<page>.md`.

**2026-11-12 Orchestrator:** Staging steps 4–6 of Promotion A done, after #27 and #28 deployed (9102b49):
- CLI plan, apply, plan with all ten offered types: 10 unchanged, 0 pending; `layout` allows exactly the ten.
- `move-content-to-layout.mjs` planned one move (privacy-policy `marketing.document` to `prose`) and applied it, published through the policy. A re-run plans nothing.
- Home, About and Pricing are pixel-identical before and after.
- Privacy-policy has all its text, headings, bold, list and link. It is 176px taller, because each paragraph is now its own Portable Text block with paragraph spacing, which the old HTML string ran together.
- Evidence: `.orchestrate/runs/2026-11-12-staging-adoption/{ten-blocks,content-move}/`.

Box 1's staging part is done for the move; `retire-pages-content` on staging waits for #31.
