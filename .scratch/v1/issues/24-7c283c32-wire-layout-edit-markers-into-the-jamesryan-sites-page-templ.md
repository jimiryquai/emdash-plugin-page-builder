# 24-7c283c32: Wire Layout edit markers into the jamesryan-sites page templates

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

On jamesryan-sites, after 0.4.0 and ticket 14 are in: move the site to `emdash-plugin-page-builder@0.4.0` and pass each page's `edit.layout` attributes through `PageLayout.astro` to `PageBuilder` wherever a page renders its layout (`PublishedPage.astro`, `index.astro`, `about.astro`), so in EmDash edit mode, clicking a block opens that page's Layout in the admin. Prove it locally: signed in with edit mode on, a block carries the marker and a click opens the admin at the page; signed out, the HTML matches the version before. Run the site's CI sequence.

**Blocked by:** 23-2d3b64a9, 14-d910a4dc

**Status:** ready-for-agent

- [ ] In edit mode each rendered block carries the page's Layout marker, and clicking one opens the page's Layout in the admin (local proof).
- [ ] Signed out, the rendered HTML matches the version before.
- [ ] The marketing site's CI sequence passes: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `bash scripts/check-rendered-seo.sh`.

## Comments
