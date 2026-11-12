# 28-f9155a36: Render Home's recent posts from a posts block on jamesryan-sites

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

On jamesryan-sites, after the `posts` block (27-e3a4b150) is released: offer `posts` (add it to `offered-blocks.json` and regenerate the seed), write a posts source from the `posts` collection (newest `published_at` first, tags and bylines as the current Home template reads them, cache hints passed on), and add sections for each variant reusing the current Home markup (`PostCard` and the featured layout), so Home looks the same. Remove Home's hard-coded recent-posts section from `index.astro` and add a `posts` block (variant `featured-grid`, count 4) after the hero in Home's seed layout. **Keep the featured image preload:** Home preloads the featured post's image in the page head (`<link rel="preload" fetchpriority="high">`), which is its LCP image; the route must still emit it when the layout has a `featured-grid` posts block (one source read, shared with the section). Extend `move-content-to-layout.mjs`, or add a small companion script that plans by default, to add the posts block to Home's layout on a live site. Prove it locally pixel-identical (Home before and after) with the preload present.

**Blocked by:** 27-e3a4b150, 24-7c283c32

**Status:** done

- [x] Home renders its recent posts from a `posts` block, pixel-identical to before locally, and the featured image preload is still emitted.
- [x] Every `posts` variant renders through a site section (each with `default`), shown by a test or a rendered check.
- [x] A script plans and applies adding the posts block to Home on a live site, and a second run changes nothing (local proof).
- [x] The marketing site's CI sequence passes: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `bash scripts/check-rendered-seo.sh`.

## Comments

**2026-11-12 Orchestrator:** Blocked by 24 too, since both edit index.astro after 14. Staging runs are the orchestrator's after merge; production needs James.


**2026-11-12 Antigravity orchestrator:** Claimed in `emdash-plugin-page-builder` (`69bb528`/`7e8b55a` resolved blockers `27-e3a4b150` at `0.6.0` and `24-7c283c32` at `1a68c2e`). Risk: medium (reversible site code destined for staging; Zhipu `pi` builder, Google orchestrator cross-family review required; no tenant credentials or live calls). Worktree `feat/28-home-posts-block`, port `4338`.

**2026-11-12 Antigravity orchestrator:** Verified and merged (`jimiryquai/jamesryan-sites#36`, `8b60d84`). Local pixel diff `0 (0)` with single-read LCP preload (`perRequestSource`), Fix Round 1 added pending-draft / `liveData` and full read-back safety to `scripts/add-home-posts-block.mjs`, cross-family review + independent CI green. Applied `posts` block type (`staging-cli-apply.json`) and Home `posts` block (`staging-home-posts-apply.json`, rerun `unchanged`) on `https://staging.jamesryan.dev`; staging `Deploy` `43283559800` succeeded and live `/` preload + `/home.md` verified. Evidence archived under `.orchestrate/runs/2026-11-12-28-home-posts-block/`.
