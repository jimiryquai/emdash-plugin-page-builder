# 27-e3a4b150: Define the posts block for recent-post listings

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

A `posts` block type for listings of a site's posts, built like `testimonials`: the block holds no posts itself, and the site supplies a typed source. The block has `heading` (optional), the shared `countField()` (default 4) and an optional `category` text field (a taxonomy slug the source may filter by). Its variants are `featured-grid` (the first post with an image is featured, the rest in a grid; jamesryan-sites' Home), `grid` and `list`, each described so an agent knows when to choose it. Add a `Post` shape: `title`, `url`, `excerpt?`, `date?`, `image?`, `tags?` (`{ slug, label }[]`) and `bylines?`. Add `createPostsSource({ query, ... })` alongside the other source factories, honouring `count` and passing cache hints on. Add a starter definition if the other shared-content blocks have one. Give it `requiredToPublish` (none beyond what the variant needs) and a `layoutToMarkdown` rendering (heading plus a Markdown list of post links from the items passed in). Validate the definition with EmDash's `validateSeed` as the other blocks are. Release it (the next minor) through a GitHub release.

**Blocked by:** 26-d638e399

**Status:** in progress

- [ ] The `posts` block, `Post` shape and `createPostsSource` are exported from `blocks`, pass `validateSeed`, and have tests for count, cache hints and each variant's description.
- [ ] `layoutToMarkdown` renders a posts block from passed items, with a test.
- [ ] `rm -rf dist && npm ci && npm run check` passes, and the release is published from a GitHub release with provenance.

## Comments

**2026-11-12 Orchestrator:** From James noticing Home's recent posts aren't a block. Blocked by 26 so the new block includes its Markdown rendering. Risk: medium (package code), plus the release under the standing npm approval.
