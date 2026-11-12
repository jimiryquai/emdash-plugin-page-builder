# 08-a3332f54: Adopt the page builder on the jamesryan-sites marketing site

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Add the page builder to jamesryan-sites' marketing site **alongside** marketing-blocks, which stays untouched (spec "Adopting it in jamesryan-sites", updated 2026-11-09). Add `pages.layout` and a `service` reference on pages; a page renders `layout` when it has blocks and Portable Text `content` otherwise. Map every variant of hero, cta, features, testimonials and pricing to `@jamesryan/ui` sections (with a default section each); write testimonials and pricing sources from the existing collections (`createPricingSource({ groupField: 'service' })` may read pricing directly). Apply the block types with the CLI against the local dev site, and prove it on home: a script moves home's `marketing.hero` into `home.layout`, and home renders the same. Work happens in a jamesryan-sites worktree off `baseline`; consume this package from a local link (publishing to npm is James's step). Stop at the live boundary: no production token, no production writes. The production check and live apply are James's, with his approval.

**Blocked by:** 15-9ab9b40a, 16-fa7db037

**Status:** done

- [x] Home renders from `layout` locally with the same look as before (screenshots before and after).
- [x] The apply CLI planned and applied the five block types to the local dev site, with its JSON output saved.
- [x] marketing-blocks is unchanged, and pages without a `layout` (privacy-policy) still render from `content`.
- [x] The marketing site's checks (typecheck, build) pass.
- [x] Production was checked for marketing blocks and the live apply and home migration ran with James's approval (needs James).

## Comments

**2026-11-09 Orchestrator:** Risk: high (another repo; leads to production content). Scope narrowed with James: additive, local only; the live steps need his approval. Helper: codex (default model).

**2026-11-09 Orchestrator:** First run (e8d73f2, f022dcb on feat/page-builder-adoption) proved home, adapters, sources, fallbacks and site checks locally, and found two package defects: features sub-field slugs EmDash rejects, and a CLI entry guard that no-ops under pnpm symlinks. Blocked on 15-9ab9b40a and 16-fa7db037; resumes with a new package build.

**2026-11-09 Orchestrator:** Local work done and verified (jamesryan-sites `feat/page-builder-adoption` at 026ee71, after resume 1). Fresh seed registers exactly the five offered blocks (`offered-blocks.json`, one site-owned list read by `blocks.ts`, the seed sync and the CLI wrapper); CLI plan/apply/plan through the real bin with nothing pending; home renders the same from `layout`; all 15 variants, grouped sources and privacy-policy's fallback proven; my own runs: typecheck 0 errors, 45 tests and cms-helpers pass, build complete, marketing-blocks unchanged. Cross-family review saved in the worktree's evidence. Not mergeable until the package is on npm: the dependency is a gitignored tarball path. Remaining, all James's: first npm publish, then swapping to an exact version and merging into `baseline` (coordinate with the session working there), then the production procedure in the helper's report.

**2026-11-10 Orchestrator:** James tried the local site: adding a block fails its first autosave because block fields are required (ticket 18-80574483). The demo database was rebuilt with media via `pnpm seed:local` (dev-bypass alone imports no media). 08 needs a repack after 18-80574483.

**2026-11-10 Orchestrator:** ADR 0003: block fields are required to publish, not to save. After tickets 18 and 19, the site registers the package plugin in `astro.config.mjs` so publishing enforces each block's `requiredToPublish`.

**2026-11-10 Orchestrator:** Resume 2 done (1e8137c): plugin registered, fresh database with media via `pnpm seed:local`, CLI plan/apply/plan with nothing pending, and the autosave and publish flow proven through the admin API: an empty features block autosaves (200), publishing it is refused (422 `PUBLISH_REJECTED` naming heading and items), and publishing works once filled (200). Verified in a separate clean checkout: frozen install, typecheck 0 errors, 45 tests pass, build complete, marketing-blocks unchanged. Dev server left running on :4331 for James. Waits on: a 0.2.0 release (npm 0.1.0 predates 18 and 19), then the dependency swap, the merge into `baseline` (which has moved to ba0e359) and the production steps.

**2026-11-12 Orchestrator:** Route changed with the jamesryan-sites session: `feat/page-builder-adoption` is rebased onto jamesryan-sites `master` (dropping the `baseline` tracker commits) once ticket 23 (`23-published-pages`, PR #23) merges, and goes in as a PR against `master`, not a merge into `baseline`. That session messages when 23 lands. 0.2.0: release v0.2.0 created; its npm publish failed (no matching trusted publisher), waiting on James's npm settings.

**2026-11-12 Orchestrator:** Resume 3 (pi, GLM 5.3) rebased the branch onto jamesryan-sites `master` after ticket 23 (seven commits, no tracker commits). The layout/content switch lives in `PublishedPage.astro`, home and about. Fix round 1 (mine): `getPublishedRoute` takes a `references` selection so each route fetches its entry once, and the site uses `emdash-plugin-page-builder@0.2.0` from npm. My own run of the CI sequence: frozen install, typecheck 0 errors, build, 45/45 tests, rendered SEO check passing. PR #25 (jimiryquai/jamesryan-sites) is open against `master` with CI green. Waits on James approving the merge (high), then the staging and production steps.

**2026-11-12 Orchestrator:** Staging done, with James's go-ahead ("I'll allow it in staging"). I created a staging API token on the admin user (schema and content read/write, expires 2026-12-12, in jamesryan-sites `.env` as `EMDASH_STAGING_SCHEMA_TOKEN`) and ran 08's procedure against https://staging.jamesryan.dev:
- audit: home has one hero, privacy-policy one document, about and pricing are empty;
- `layout` and `service` fields created;
- CLI plan, apply, then plan again: 5 unchanged, 0 pending, `layout` allows exactly the five offered types;
- home hero moved and published (200); a re-run reports `unchanged`, there is no draft, and the before and after screenshots are pixel-identical (3/3 images);
- privacy-policy, about and pricing render 200; contact is 404 because staging has no contact page (ticket 23's rule);
- publish policy live: a throwaway page's empty features block was refused with `PUBLISH_REJECTED` (heading, items) and then deleted.

Evidence: `.orchestrate/runs/2026-11-12-staging-adoption/`. Only the production box remains, and that's James's.

**2026-11-12 Codex orchestrator:** Production adoption complete under recovered prior approval and James’s “+” approval of the exact move plan in this session. Ten block types applied, then plan reports 10 unchanged. Home marketing.hero -> hero, republished through policy; Privacy Policy marketing.document -> prose, stays draft. About and Pricing unchanged. Rerun plans zero moves. Home and About screenshots pixel-identical after waiting for image decoding; all9 sitemap URLs200; draft Pricing/Privacy404. Production token revoked by exact ID, read-back0rows, HTTP401; local env entry removed. Evidence `.orchestrate/runs/2026-11-12-production-promotion-a/`. Content field NOT retired; that is final rollout work.
