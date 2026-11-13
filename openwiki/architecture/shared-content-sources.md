---
type: architecture
title: Shared-content sources and starter collections
description: The Source seam that lets shared-content blocks read a site's own collections — scope/group/count resolution, cache hints, createCollectionSource's paging, starter collections, and the taxonomy-based posts source.
tags: [sources, collections, scope, cache-hints]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T18:45:38.950Z
sources:
  - id: openwiki-source-6c72aa398e15b80e013f80eb
    resource: repo://src/blocks/core.ts
  - id: openwiki-source-b1bf8e0bb2cfae6497e9c844
    resource: repo://src/blocks/PageBuilder.astro
  - id: openwiki-source-ae86278ffd6192b44fab9207
    resource: repo://src/blocks/types/faq.ts
  - id: openwiki-source-235050334ae43fc05bf5facd
    resource: repo://src/blocks/types/posts.ts
  - id: openwiki-source-09026a4a7b8c0d40395657a8
    resource: repo://src/blocks/types/testimonials.ts
  - id: openwiki-source-0547748f6ce41077d22b75d1
    resource: repo://src/cli/main.ts
generated: { by: "claude-code", at: "2026-11-13T18:45:38.950Z" }
---

# Shared-content sources and starter collections

## The seam

Five block types display content that lives in a collection rather than in the page's layout: `testimonials`, `pricing`, `team`, `faq` and `posts`. Because the package owns no collections ([ADR 0001](../../../docs/adr/0001-package-owns-data-sites-own-collections-and-visuals.md)), each of these is wired through a **Source**: a site-supplied typed function from its collection's entries to the block's **shape** — the typed content contract (`Testimonial`, `PricingTier`, `TeamMember`, `Faq`, `Post`) between the source and the section that renders it.

```ts
type Source<T> = (context: SourceContext) =>
  SourceResult<T> | readonly T[] | Promise<SourceResult<T> | readonly T[]>;
```

A source returns either a bare array of items or `{ items, cacheHints }`. `PageBuilder` passes `items` to the section and merges every `cacheHints` entry into the page's `Astro.cache` when caching is enabled (see [Page rendering](../workflows/page-rendering.md)). Inline blocks (hero, cta, features, comparison, stats, prose) need no source.

## `SourceContext` resolution

For each stored block, `PageBuilder` calls `resolveSourceContext(block, blockType, group)` in `core.ts`:

- **Scope.** The stored `scope` select has options `page | all`. A stored `page` remains `page` **only when a `group` is configured** on the render; without a group it becomes `all`. A stored `all` stays `all`.
- **Group.** The site's group identifier, passed straight through (typically a page's reference to its grouping entry).
- **Count.** A stored `count` passes through when it is a positive number; otherwise it falls back to the `defaultValue` declared on the block definition's `count` field (`blockFieldDefault`), if any — this is how `posts` gets its default `4`.
- **Block-specific context.** A block module's optional `sourceContext` hook is merged in. Only `posts` uses it today, forwarding a trimmed, non-empty `category` slug (`declare module` extends `SourceContext` with `category?`). This lets `PageBuilder` dispatch generically without switching on `_type`.

## `createCollectionSource`

The default sources for the four group-scoped blocks are all thin wrappers over one shared factory in `core.ts`:

```ts
createCollectionSource<T>({ collection, groupField?, query?, mapEntry }): Source<T>
```

with `groupField` defaulting to `group` and `query` defaulting to a wrapper around EmDash's `getEmDashCollection`/`getEmDashEntry` (the `QueryApi` interface is deliberately narrow: `list` and `get` with cursor, `where`, `orderBy` filters — narrow enough for tests to fake, per CODING_STANDARDS rule 7).

Two read strategies, chosen by resolved scope:

- **`all`** — a single `list(collection, { limit: count })` when a count resolved, else unbounded; the page's `cacheHint` is forwarded.
- **`page` with a group** — EmDash's reference selections are per entry, so the source walks the collection page by page via `list` cursors; for each entry it issues `get(collection, id, { references: { [groupField]: true } })` and keeps the entry when its group reference resolves to the group (`target.id === group` or `target.data.id === group`). It stops paging once `count` grouped entries are collected or the collection ends, slices to `count`, and returns the cache hints of **every** list and get it read.

Each default source (`createTestimonialsSource`, `createPricingSource`, `createTeamSource`, `createFaqSource`) is `createCollectionSource` with its starter collection slug, its group field and an entry-to-shape mapper — accepting `{ collection, groupField, query }` so a site can point them at another collection with the same field names. A site whose fields differ writes its own `Source<T>` against its generated collection types, so drift fails the build.

## Starter collections

Each group-scoped block module exports a `starter(groupCollection)` — a seed-shape `SeedCollection` definition parameterised by the site's grouping collection, whose `group` field is a `reference` with `validation.targetCollection = groupCollection`:

- `starterTestimonialsCollection` — `testimonials` (quote, author, role, company, avatar; title field `author`)
- `starterPricingCollection` — `pricing` (name, price, monthly/yearly, period `/mo` default, description, features, CTA, badge, highlighted; title field `name`)
- `starterTeamCollection` — `team` (name, role, photo; title field `name`)
- `starterFaqCollection` — `faqs` (question, answer; title field `question`)

Starters are optional and applied only on request (`--collections` with `--group` in the apply CLI, which creates the collection, then each field, then sets the title field once its column exists). `posts` is different: its starter ignores the group parameter because posts classify through taxonomies, not a page-group reference.

## The posts source

`createPostsSource(options?)` in `src/blocks/types/posts.ts` does not use `createCollectionSource`; posts filter by taxonomy rather than group:

- One `list(collection, …)` read, default collection `posts`, ordered `published_at: 'desc'` (recent first).
- `count` (falling back to the block definition's default `4`) caps `limit`; a present, trimmed `category` slug adds `where: { [categoryTaxonomy]: category }` (default taxonomy `category`).
- The default mapper produces `Post { title, url, excerpt?, date?, image?, tags?, bylines? }` — `url` from the starter pattern `/${collection}/${entry.id}`, `tags` from hydrated `terms[tagTaxonomy]` (default `tag`), `bylines` filtered to hydrated credits with a `displayName`.
- `mapEntry` overrides the URL/field mapping for custom or localized post URLs; `collection`, `categoryTaxonomy`, `tagTaxonomy`, `orderBy` and the injectable `query` are also options.

Its `cacheHints` carry the single list read's hint.

## Relationship to rendering and testing

`PageBuilder` resolves sources per block before rendering (see [Page rendering](../workflows/page-rendering.md)); the same items a section receives can be handed to `layoutToMarkdown` via its `items` option keyed by block `_key` (see [Markdown export](../workflows/markdown-export.md)). The catalog of which blocks are shared-content, with their shapes and starters, is in [Block type catalog](../reference/block-types.md). Tests exercise sources with fake `QueryApi`s — no real site or token is ever contacted.
