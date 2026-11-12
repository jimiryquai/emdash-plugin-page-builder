# 27-e3a4b150: Define the posts block for recent-post listings

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

A `posts` block type for listings of a site's posts, built like `testimonials`: the block holds no posts itself, and the site supplies a typed source. The block has `heading` (optional), the shared `countField()` (default 4) and an optional `category` text field (a taxonomy slug the source may filter by). Its variants are `featured-grid` (the first post with an image is featured, the rest in a grid; jamesryan-sites' Home), `grid` and `list`, each described so an agent knows when to choose it. Add a `Post` shape: `title`, `url`, `excerpt?`, `date?`, `image?`, `tags?` (`{ slug, label }[]`) and `bylines?`. Add `createPostsSource({ query, ... })` alongside the other source factories, honouring `count` and passing cache hints on. Add a starter definition if the other shared-content blocks have one. Give it `requiredToPublish` (none beyond what the variant needs) and a `layoutToMarkdown` rendering (heading plus a Markdown list of post links from the items passed in). Validate the definition with EmDash's `validateSeed` as the other blocks are. Release it (the next minor) through a GitHub release.

**Blocked by:** 26-d638e399

**Status:** done

- [x] The `posts` block, `Post` shape and `createPostsSource` are exported from `blocks`, pass `validateSeed`, and have tests for count, cache hints and each variant's description.
- [x] `layoutToMarkdown` renders a posts block from passed items, with a test.
- [x] `rm -rf dist && npm ci && npm run check` passes, and the release is published from a GitHub release with provenance.

## Comments

**2026-11-12 Orchestrator:** From James noticing Home's recent posts aren't a block. Blocked by 26 so the new block includes its Markdown rendering. Risk: medium (package code), plus the release under the standing npm approval.

**2026-11-12 Codex orchestrator:** Risk: medium (compatible package addition); helper agy Carbon trial, independently verified. Release remains orchestrator-owned under standing npm approval. Worktree feat/27-posts-block.


**2026-11-12 Antigravity orchestrator:** Verified round-1 packed-consumer and schema-dedup fixes (`392b1c2`, `d67e320`; cross-family Standards/Spec reviews saved in `codex-review27-{standards,spec}.md`). Merged to `master` (`ba29898`), clean `rm -rf dist && npx -y npm@11.21.1 ci && npm run check` passed (153/153 tests, 0 `astro check` diagnostics), pushed and released `v0.6.0` (GitHub Actions run `43270434927`, published to npm with SLSA v1 provenance `publish-0.6.0-npm.json`). Explainer `.scratch/explainers/27-e3a4b150.html`; evidence `.orchestrate/runs/2026-11-12-27-posts-block/`. Closed and tidied.
