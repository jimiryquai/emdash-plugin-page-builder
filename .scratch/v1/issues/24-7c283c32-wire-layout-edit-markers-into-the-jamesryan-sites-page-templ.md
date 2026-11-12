# 24-7c283c32: Wire Layout edit markers into the jamesryan-sites page templates

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

On jamesryan-sites, after 0.4.0 and ticket 14 are in: move the site to `emdash-plugin-page-builder@0.5.0` and pass each page's `edit.layout` attributes through `PageLayout.astro` to `PageBuilder` wherever a page renders its layout (`PublishedPage.astro`, `index.astro`, `about.astro`), so in EmDash edit mode, clicking a block opens that page's Layout in the admin. Prove it locally: signed in with edit mode on, a block carries the marker and a click opens the admin at the page; signed out, the HTML matches the version before. Also switch `apps/marketing-site/src/pages/[...slug].md.ts` to render pages with the package's `layoutToMarkdown` (v1/26), passing the items its sources read, so `/<page>.md` serves the page again; posts and projects keep their Portable Text conversion. Run the site's CI sequence.

**Blocked by:** 23-2d3b64a9, 26-d638e399

**Status:** done

- [x] In edit mode each rendered block carries the page's Layout marker, and clicking one opens the page's Layout in the admin (local proof).
- [x] Signed out, the rendered HTML matches the version before.
- [x] `/<page>.md` for home, about, pricing and privacy-policy returns the page's layout as Markdown, asserted by the rendered check in CI.
- [x] The marketing site's CI sequence passes: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `bash scripts/check-rendered-seo.sh`.

## Comments

**2026-11-12 Codex orchestrator:** Branch handling decision: build this locally stacked on prepared site feat/14-layout-only (1e1f057), whose code is already available. Removed 14 as a build blocker so its production-only acceptance cannot deadlock the Markdown repair that must precede the final production rollout. Integration still waits for 14’s staging merge and verification; no production writes in this helper scope. Risk: medium (reversible site code destined for staging); GLM builder, OpenAI orchestrator cross-family review required.


**2026-11-12 Antigravity orchestrator:** Rebased onto `jamesryan-sites` `master` (`7edcc39`) at `f72d173`. Independent full CI run passed (`orchestrator-ci-check-rendered-seo.txt`), cross-family Standards/Spec review saved (`orchestrator-cross-family-review.md`, Google Gemini 4 Carbon reviewing Zhipu GLM-5.3, 0 blocking findings). Opened and merged PR `#34` (`1a68c2e`) after all GitHub checks passed. Explainer `.scratch/explainers/24-7c283c32.html`; evidence `.orchestrate/runs/2026-11-12-24-layout-edit-markers/`. Closed and tidied.
