# 20-f32e818c: Offer the prose, faq, stats, team and comparison blocks on the jamesryan-sites marketing site

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md) (adoption, point 6)

**What to build:**

On jamesryan-sites' marketing site (branch from `master`), offer the package's other five block types, `prose`, `faq`, `stats`, `team` and `comparison`, alongside the five already offered. Add them to `apps/marketing-site/src/components/page-builder/offered-blocks.json` (the one site-owned list that `blocks.ts`, the seed sync and the CLI wrapper read), regenerate the seed's `blockTypes` with `scripts/sync-page-builder-seed.mjs`, and add a section for every variant of each block plus its `default`. The site owns the visuals: render each through the existing marketing-blocks components in `src/components/blocks/` (`Document.astro`, `FAQ.astro`, `Stats.astro`, `Team.astro`, `Comparison.astro`) via small adapters, so a page looks the same whichever field holds the block. Write sources for faq and team from the site's `faqs` and `team` collections the way testimonials and pricing do, grouped by the page's `service`. `prose` renders Portable Text, so code blocks and images in it keep their current renderers. Local only: no staging or production writes. Leave marketing-blocks and the `content` field in place (ticket 14 removes them).

**Blocked by:** none.

**Status:** needs Ryan (merge jamesryan-sites PR #27)

- [x] `offered-blocks.json` lists all ten block types, and a fresh local seed registers exactly those ten on `pages.layout`.
- [x] Every variant of prose, faq, stats, team and comparison renders through a site section (each block also has a `default`), shown by a test or a rendered check per variant.
- [x] faq and team sources read the site's `faqs` and `team` collections, scoped by the page's `service` group, with cache hints passed on.
- [x] A page holding each new block in `layout` renders the same as the matching marketing block in `content` (screenshots side by side, locally).
- [x] The marketing site's CI sequence passes: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `bash scripts/check-rendered-seo.sh`.

## Comments

**2026-11-12 Orchestrator:** Risk: high (another repo, jamesryan-sites; local only, no staging or production writes). Helper: pi (GLM 5.3, high).

**2026-11-12 Orchestrator:** Built by pi (GLM 5.3). I reviewed it myself (cross-family) and re-ran the site's CI sequence; all green. PR jimiryquai/jamesryan-sites#27 is open with CI green and merges cleanly onto master (dc101c4), alongside the other half of the split. Merging is James's: the auto-mode permission rules refuse a PR merge from this session. Evidence in the worktree's `.orchestrate/evidence/` (orchestrator runs under `orchestrator/`).
Package gap: the `faq` and `team` blocks have no heading field, so their sections show the components' default headings. 21's script refuses to move a marketing FAQ or team block with a heading, so nothing is lost. Backlog: add `heading` to both blocks (a compatible change).
