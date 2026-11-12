# 26-d638e399: Serve page layouts as Markdown on the jamesryan-sites .md route

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

After v1/14, `apps/marketing-site/src/pages/[...slug].md.ts` serves pages as their title only: their text moved from `content` into `layout`, and the route's `marketing.*` cases went with the plugin. Agents and LLMs read the site through this route, so pages must come back. Add a pure `layoutToMarkdown(value, blockTypes)` to the package's `blocks` entry (after `migrateBlocks`), giving each of the ten block types a readable Markdown rendering (headings, body text, links, list items, prose's Portable Text) and skipping shared-content blocks' source items unless the caller passes them. Release it, then use it in the site's route for pages, alongside the existing Portable Text conversion for posts and projects. It also serves the backlog item "a way out for content".

**Blocked by:** 14-d910a4dc

**Status:** ready-for-agent

- [ ] `layoutToMarkdown` renders each of the ten block types, with a test per type, and is exported from `blocks`.
- [ ] The site's `/<page>.md` (home, about, pricing, privacy-policy) returns the page's layout as Markdown, shown by a rendered check in CI.
- [ ] Package check and the site's CI sequence pass, and the package release is published.

## Comments

**2026-11-12 Orchestrator:** Found reviewing v1/14: the route's page output regressed to title only. Must land before 14 reaches production.
