# 08-a3332f54: Adopt the page builder on the jamesryan-sites marketing site

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Adopt the page builder on jamesryan-sites' marketing site, following the spec's "Adopting it in jamesryan-sites" steps: add `pages.layout` and a `service` reference on pages, apply the block types with the CLI, map variants to `@jamesryan/ui` sections, write testimonials and pricing sources from the existing collections, migrate home's `marketing.hero` into `home.layout`, and remove the marketing-blocks plugin. Before migrating, check production for marketing blocks; if it holds more than the seed (home's one hero, privacy-policy's document), stop and report. Work happens in the jamesryan-sites repo; consume this package from a local link or a pre-release.

**Blocked by:** 02-1daf711c, 04-34eb2e97, 05-e6b61585, 06-f40708c4, 07-7d542ca1

**Status:** ready-for-agent

- [ ] Home renders from `layout` locally with the same look as before.
- [ ] Production was checked, and the PR states what it held.
- [ ] marketing-blocks is removed; privacy-policy still renders from `content`.
- [ ] `npm run check` / typecheck passes in the marketing site.

## Comments
