# 21-3f72e4a7: Move every page's marketing blocks from content into layout with one script

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md) (adoption, point 6)

**What to build:**

On jamesryan-sites (branch from `master`), generalise `scripts/move-home-hero-to-layout.mjs` into `scripts/move-content-to-layout.mjs`: for every page (all statuses, cursor-paginated), map each Portable Text marketing block in `content` (`marketing.hero`, `.cta`, `.features`, `.testimonials`, `.pricing`, `.document`, `.faq`, `.stats`, `.team`, `.comparison`) to the matching page-builder block (`document` becomes `prose`) at the package's current version, in the same order, appended to `layout` after any blocks already there, with stable `_key`s so a re-run changes nothing. Read each marketing block's shape from `src/plugins/marketing-blocks/` and each target's fields from the `emdash-plugin-page-builder` 0.2.0 definitions; a field that can't be mapped stops the run for that page with a reason, never a silent drop. Non-marketing Portable Text in `content` (plain paragraphs, images, code) goes into one `prose` block at its position. Plan by default (JSON: per page, what moves, what is skipped and why, the revision it read); `--apply` writes each page with its `_rev` and keeps its status (a published page gets a draft and is published through the API so the page builder's publish policy runs; a draft stays a draft); `--page <slug>` limits it to one page. It leaves `content` in place (ticket 14 clears it). Pure mapping functions are unit-tested; the API flow is tested against a fake site the way the home script's test does. `move-home-hero-to-layout.mjs` and its test are removed once the new script covers home. Local only: prove it against a fresh local database (`pnpm seed:local`); no staging or production writes.

**Blocked by:** none.

**Status:** needs Ryan (merge jamesryan-sites PR #28)

- [x] Each of the ten marketing block types maps to its page-builder block, with a unit test per type using a real marketing block shape from the seed or the plugin.
- [x] Plan output lists, per page, what moves, what is skipped and why, and the revision read; `--apply` writes with `_rev`, keeps each page's status, and a second run plans nothing.
- [x] An unmappable field stops that page with a named reason and leaves it unchanged.
- [x] Against a fresh local database, every seeded page's content appears in `layout` and renders the same (home and privacy-policy screenshots before and after).
- [x] The marketing site's CI sequence passes: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `bash scripts/check-rendered-seo.sh`.

## Comments

**2026-11-12 Orchestrator:** Risk: high (another repo, jamesryan-sites; local only, no staging or production writes). Helper: pi (GLM 5.3, high).

**2026-11-12 Orchestrator:** Built by pi (GLM 5.3). I reviewed it myself (cross-family) and re-ran the site's CI sequence; all green. PR jimiryquai/jamesryan-sites#28 is open with CI green and merges cleanly onto master (dc101c4), alongside the other half of the split. Merging is James's: the auto-mode permission rules refuse a PR merge from this session. Evidence in the worktree's `.orchestrate/evidence/` (orchestrator runs under `orchestrator/`).
