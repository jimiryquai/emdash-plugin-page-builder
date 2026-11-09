# 08-a3332f54: Adopt the page builder on the jamesryan-sites marketing site

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Add the page builder to jamesryan-sites' marketing site **alongside** marketing-blocks, which stays untouched (spec "Adopting it in jamesryan-sites", updated 2026-11-09). Add `pages.layout` and a `service` reference on pages; a page renders `layout` when it has blocks and Portable Text `content` otherwise. Map every variant of hero, cta, features, testimonials and pricing to `@jamesryan/ui` sections (with a default section each); write testimonials and pricing sources from the existing collections (`createPricingSource({ groupField: 'service' })` may read pricing directly). Apply the block types with the CLI against the local dev site, and prove it on home: a script moves home's `marketing.hero` into `home.layout`, and home renders the same. Work happens in a jamesryan-sites worktree off `baseline`; consume this package from a local link (publishing to npm is James's step). Stop at the live boundary: no production token, no production writes. The production check and live apply are James's, with his approval.

**Blocked by:** 02-1daf711c, 04-34eb2e97, 05-e6b61585, 06-f40708c4, 07-7d542ca1

**Status:** ready-for-agent

- [ ] Home renders from `layout` locally with the same look as before (screenshots before and after).
- [ ] The apply CLI planned and applied the five block types to the local dev site, with its JSON output saved.
- [ ] marketing-blocks is unchanged, and pages without a `layout` (privacy-policy) still render from `content`.
- [ ] The marketing site's checks (typecheck, build) pass.
- [ ] Production was checked for marketing blocks and the live apply and home migration ran with James's approval (needs James).

## Comments
