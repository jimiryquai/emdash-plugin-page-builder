---
type: quickstart
title: Quickstart
description: A task-routing map for emdash-plugin-page-builder — which wiki page to read for which job, plus the public entries (blocks library, PageBuilder.astro, plugin, CLI) and the commands that prove a change.
tags: [quickstart, routing, orientation]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T18:45:38.950Z
sources:
  - id: openwiki-source-ae4ac769cf1f9e86b659c844
    resource: repo://CODING_STANDARDS.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-8a4bfe73b9393905cb4d0906
    resource: repo://test/cli/fake-site.mjs
generated: { by: "claude-code", at: "2026-11-13T18:45:38.950Z" }
---

# Quickstart

`emdash-plugin-page-builder` is a page builder for EmDash: a library of versioned block types and the logic that renders them, on EmDash's own `blocks`, `repeater`, `image` and `reference` fields. Sites install it, apply its block types to their schema, map their own collections through sources, and supply their own visual sections.

## The public entries

| Entry | Use |
| --- | --- |
| `emdash-plugin-page-builder/blocks` | Runtime library: block modules, shapes, sources, starter collections, `migrateBlocks`, `layoutToMarkdown`, `findMissingToPublish`. Plain-Node safe. |
| `emdash-plugin-page-builder/blocks/PageBuilder.astro` | The renderer component, imported separately so Node-only consumers never load Astro. |
| `emdash-plugin-page-builder/plugin` | The native EmDash plugin entry enforcing required block fields at publish (`pageBuilderPlugin()` in `astro.config.mjs`). |
| `npx emdash-page-builder apply <site-url>` | The CLI that plans and applies block types (and optional starter collections) to a site. Plan by default; `EMDASH_TOKEN` for auth. |

## Task routing

| I want to… | Read |
| --- | --- |
| Understand the package, its ownership boundary, where the ADRs/spec/glossary live | [Package architecture and ownership](architecture/overview.md) |
| Add or change a block type (fields, variants, publish rules) | [Block module contract](architecture/block-module-contract.md) and the [Block type catalog](reference/block-types.md) |
| Add a new version of a block or change migrations | [Block versioning and migrations](architecture/versioning-and-migrations.md) |
| Change how layouts render (variants, sections, sources, edit mode, caching) | [Page rendering with PageBuilder.astro](workflows/page-rendering.md) |
| Wire a block to a collection (sources, scope, group, starter collections) | [Shared-content sources and starter collections](architecture/shared-content-sources.md) |
| Change publish validation (required fields, rejection reasons) | [Publish policy plugin](workflows/publish-policy.md) |
| Change the CLI (plan, apply, activate, migrate, `--field`, `--collections`) | [The apply CLI](workflows/apply-cli.md) and [EmDash API client and field-contract port](architecture/emdash-api-contract.md) |
| Change Markdown rendering for agents and LLMs | [Markdown export](workflows/markdown-export.md) |
| Write or debug a test | [Testing strategy](operations/testing.md) |
| Cut a release, fix CI, change the build | [Build, checks, and release](operations/build-and-release.md) |

## Prove it

```bash
npm run check        # node --test (after a build) + astro check
```

Nothing writes to a real EmDash site from tests — the CLI tests use a fake site transport, source tests a fake query API, and the package test packs a tarball into a temp consumer on both supported Astro versions.

## Non-negotiables to know before touching code

- One module per block type (`src/blocks/types/<slug>.ts`); nothing restates a field or variant elsewhere.
- Migrations are pure, preserve `_key`, one function and test per version step; a declared version must be breaking against its predecessor.
- Block schema fields stay optional (autosave); enforce completeness via `requiredToPublish`, never via schema `required`.
- No site knowledge in `src/` (no collection names, no `@jamesryan/ui`), no telemetry, `.js`-suffixed relative imports.

These are `CODING_STANDARDS.md` rules 1–9; the glossary (`docs/GLOSSARY.md`) fixes the vocabulary.
