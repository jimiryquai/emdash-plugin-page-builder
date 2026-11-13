---
type: architecture
title: Package architecture and ownership
description: What emdash-plugin-page-builder is — the page-building layer on EmDash's own fields — its four public entries, and the package-owns-data / sites-own-collections-and-visuals boundary that shapes every module.
tags: [architecture, package, ownership, entry-points]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T18:45:38.950Z
sources:
  - id: openwiki-source-ae4ac769cf1f9e86b659c844
    resource: repo://CODING_STANDARDS.md
  - id: openwiki-source-1b69c8fa631a6b1d7cf51794
    resource: repo://docs/adr/0001-package-owns-data-sites-own-collections-and-visuals.md
  - id: openwiki-source-83d80edb3d7bf61ad8fb0133
    resource: repo://docs/specs/v1-page-builder.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-537d08ef6d9c051bda03a9f0
    resource: repo://src/blocks/types/hero.ts
generated: { by: "claude-code", at: "2026-11-13T18:45:38.950Z" }
---

# Package architecture and ownership

## What this package is

`emdash-plugin-page-builder` is a page builder for [EmDash](https://emdashcms.com): a library of versioned block types and the logic that renders them, built on EmDash's own `blocks`, `repeater`, `image` and `reference` fields rather than inventing a parallel content model. EmDash already has the custom fields; this project is the page-building layer on top of them — as close to ACF Pro's Flexible Content as EmDash allows, and better where EmDash makes it possible (versioned block schemas, two-way relations, agents building pages through MCP with the same fields people use).

A page is an ordered composition of blocks (a **layout**) stored in a `blocks` field on the site's own page collection. The package defines what blocks exist and what they mean; a site supplies what they look like and where their content lives.

## Four public entries

The `exports` map and `bin` in `package.json` define the public surface:

1. **`emdash-plugin-page-builder/blocks`** → compiled `dist/blocks/index.js`: block modules, shapes, starter collections, sources and helpers (`migrateBlocks`, `layoutToMarkdown`, `findMissingToPublish`, …). Usable from plain Node — the CLI itself imports it.
2. **`emdash-plugin-page-builder/blocks/PageBuilder.astro`** → shipped as source (`src/blocks/PageBuilder.astro`), imported separately so Node-only consumers never load an Astro file. See [Page rendering](../workflows/page-rendering.md).
3. **`emdash-plugin-page-builder/plugin`** → the native EmDash plugin entry (`src/plugin.ts`) that enforces required block fields before publishing. See [Publish policy](../workflows/publish-policy.md).
4. **`bin: emdash-page-builder`** → the apply CLI (`dist/cli/main.js`) that plans and applies block types (and optional starter collections) to a site through EmDash's REST API. See [The apply CLI](../workflows/apply-cli.md).

Requires Node.js ≥ 24 and peer dependencies `astro ^6.4.8 || ^7.2.8` and `emdash ^1.4.0` in the consuming site; devDependencies pin the exact versions the checks run against.

## The ownership boundary (ADR 0001)

The central decision: **the package owns the data layer; each site owns its collections and visuals.** The package was first planned to own the testimonials/pricing/FAQ collections too, but that was reversed after looking at Bricks and ACF Pro — no page builder owns the site's content types.

The package owns:

- **Block definitions** — every numbered version, `currentVersion`, and descriptions written so an agent working through EmDash's MCP can choose and fill blocks from the schema alone ([Block module contract](block-module-contract.md)).
- **Migrations** — the same pure chain migrates stored blocks and upgrades old ones at render time ([Versioning and migrations](versioning-and-migrations.md)).
- **Shapes** — the typed content a shared-content block displays (`Testimonial`, `PricingTier`, `Faq`, `Post`, …), the contract between a source and a section.
- **The variant vocabulary** — fixed per block; a site maps variants to its own sections, and an unmapped variant falls back to the site's default section (ADR 0002).
- **The block layer** — `PageBuilder.astro` plus the source-resolution core.
- **Starter collections** — optional collection definitions with default sources, for a site with no collections of its own ([Shared-content sources](shared-content-sources.md)).
- **Required-to-publish rules** — enforced by the plugin entry's `content:beforePublish` hook (ADR 0003).
- **The apply CLI.**

Each site owns:

- **Its collections**, mapped to the shapes through typed **sources** — typed against EmDash's generated collection types, so a renamed field fails the build instead of rendering an empty block.
- **Its visuals** — a `sections` map from variants to the site's own components; the package ships none.
- **Its grouping** — a reference field on the page (e.g. `service` → `services`) that shared-content blocks' `scope: page` reads; a site with no grouping treats `page` as `all`.
- **Its page schema** — the site's collection holds the `layout` blocks field; the CLI can add the package's block types to that field's `allowedTypes`.

CODING_STANDARDS rule 4 enforces this in code: `src/` never names `services`, `@jamesryan/ui` or any one site's collections, except as the documented defaults of the starter collections.

## How the pieces connect

```
package                                a site
┌────────────────────────────┐      ┌────────────────────────────────┐
│ block modules (definitions,│─CLI─▶│ EmDash schema API: block types │
│ versions, migrations)      │      │ site content: pages.layout     │
│ blocks core (upgrade,      │◀─────│ page.astro:                    │
│ source resolution, md)     │import│   <PageBuilder value blocks    │
│ plugin entry (publish      │      │     sources group edit />      │
│ policy)                    │      │ sections: site components      │
└────────────────────────────┘      │ sources:  site collections     │
                                    └────────────────────────────────┘
```

The CLI writes definitions to the site's schema (plan-first, `--apply` to write); the site imports the runtime library to render stored blocks and register the publish policy.

## Where the decisions live

- `docs/specs/v1-page-builder.md` — the v1 design: outcome, shape, adoption path.
- `docs/adr/` — the three load-bearing ADRs (ownership, fixed variants, required-to-publish-not-to-save).
- `docs/GLOSSARY.md` — the term vocabulary (block type, layout, variant, section, shape, source, group, scope, starter collections) with words to avoid.
- `docs/lessons/` — hard-won platform facts (EmDash decides breaking changes; validate definitions with EmDash's `validateSeed`; autosave; draft hydration on authenticated GETs; npm/lockfile).
- `docs/research/` — EmDash 1.4 page-building and schema-API research the spec was grounded in.
- `CODING_STANDARDS.md` — the nine rules every change follows (NodeNext `.js` imports, pinned dev peers, one module per block type, no site knowledge, pure migrations, plan-by-default JSON-first CLI, fake EmDash in tests, test through package exports, no telemetry).
