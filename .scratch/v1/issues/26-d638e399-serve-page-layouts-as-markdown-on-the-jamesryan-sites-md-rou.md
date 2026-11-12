# 26-d638e399: Render a page layout as Markdown

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

After v1/14, jamesryan-sites' `[...slug].md.ts` route can only give pages their title, because their text lives in `layout`. Agents and LLMs read the site through that route. Add a pure `layoutToMarkdown(value, blockTypes, options?)` to the package's `blocks` entry. It runs `migrateBlocks` first, then gives each of the ten block types readable Markdown: headings, body text, links, list items, and prose's Portable Text (marks, lists, links, headings). Shared-content blocks (testimonials, pricing, faq, team) render their own heading text, plus the items the caller passes in `options.items` keyed by block `_key`, so the site can supply what its sources read. Release it as 0.5.0. The site's route moves to it in v1/24. It also serves the backlog item "a way out for content".

**Blocked by:** none.

**Status:** in progress

- [ ] `layoutToMarkdown` renders each of the ten block types, with a test per type, and is exported from `blocks`.
- [ ] `rm -rf dist && npm ci && npm run check` passes, and release 0.5.0 is published from a GitHub release with provenance.

## Comments

**2026-11-12 Orchestrator:** Found reviewing v1/14: the route's page output regressed to title only. Must land before 14 reaches production.

**2026-11-12 Orchestrator:** Narrowed to the package part so it can run while #31 waits; the site route moves to `layoutToMarkdown` in v1/24.

**2026-11-12 Orchestrator:** Risk: medium (package code), plus the release under James's standing npm approval. Helper: pi (GLM 5.3).
