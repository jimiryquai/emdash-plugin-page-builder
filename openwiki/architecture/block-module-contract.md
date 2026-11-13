---
type: architecture
title: Block module contract
description: How one module under src/blocks/types/ owns a block type end to end — its EmDash definition, variants, migrations and publish rules — and how the plugin, CLI and renderer discover modules without a registry.
tags: [block-types, contract, modules, core]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T18:45:38.950Z
sources:
  - id: openwiki-source-1b69c8fa631a6b1d7cf51794
    resource: repo://docs/adr/0001-package-owns-data-sites-own-collections-and-visuals.md
  - id: openwiki-source-f8a39c79f110a13698bc4887
    resource: repo://docs/adr/0002-fixed-variant-vocabulary.md
  - id: openwiki-source-e40fe0d4a2e085e66b32997f
    resource: repo://docs/adr/0003-required-to-publish-not-to-save.md
  - id: openwiki-source-6c72aa398e15b80e013f80eb
    resource: repo://src/blocks/core.ts
  - id: openwiki-source-c40f3c5fcc7900f7e26d64d4
    resource: repo://src/blocks/index.ts
  - id: openwiki-source-8894c5a68d1904e2a8ff1f05
    resource: repo://src/blocks/types/features.ts
  - id: openwiki-source-537d08ef6d9c051bda03a9f0
    resource: repo://src/blocks/types/hero.ts
  - id: openwiki-source-235050334ae43fc05bf5facd
    resource: repo://src/blocks/types/posts.ts
  - id: openwiki-source-0547748f6ce41077d22b75d1
    resource: repo://src/cli/main.ts
  - id: openwiki-source-e357d61069f3b66782c52ded
    resource: repo://src/plugin.ts
generated: { by: "claude-code", at: "2026-11-13T18:45:38.950Z" }
---

# Block module contract

## Responsibility

Every page-builder block type is defined by exactly one module in `src/blocks/types/` (`hero.ts`, `cta.ts`, `features.ts`, `testimonials.ts`, `pricing.ts`, `comparison.ts`, `team.ts`, `faq.ts`, `stats.ts`, `prose.ts`, `posts.ts`). The module is the single source of truth for that block: its EmDash seed definition with every numbered version, its fixed variant vocabulary, its migration chain, its required-to-publish rules, its optional starter collection, its Markdown rendering and its optional source context. Nothing else in the package restates a field, variant or version — the CLI, the publish-policy plugin and the renderer all import the module (CODING_STANDARDS rule 3: "one module per block type", backed by [ADR 0002](../../../docs/adr/0002-fixed-variant-vocabulary.md)).

The shared vocabulary those modules build on lives in `src/blocks/core.ts`, which defines the `BlockType` interface and the helpers every module uses. `src/blocks/index.ts` only re-exports `core.ts` and the eleven modules; it adds no definitions of its own.

## The `BlockType` interface

`BlockType` (core.ts) is the contract each module's export satisfies:

| Member | What it owns |
| --- | --- |
| `definition` | EmDash's seed `blockTypes` entry: `{ slug, label, description, icon?, category?, currentVersion, versions: [{ version, fields }] }`. Fields are EmDash `BlockFieldDefinition`s — there is no separate package schema. Descriptions are written so an agent working through EmDash's MCP can choose and fill the block from the schema alone. |
| `variants` | The fixed variant vocabulary (ADR 0002). Adding a variant is a compatible minor change; removing one is breaking. |
| `migrations` | Map keyed by the version being upgraded; step `N` returns version `N + 1`, preserving `_key` and `_type` (see [Versioning and migrations](versioning-and-migrations.md)). Empty map for a block that has only version 1 — which is all eleven blocks today. |
| `requiredToPublish` | Current-version publish rules: plain field slugs, or `{ field, minItems?, fields }` for repeaters. Empty lists are explicit for blocks with nothing to enforce (see [Publish policy](../workflows/publish-policy.md)). |
| `starter?` | Optional starter collection factory, parameterised by the site's grouping collection (`(groupCollection) => SeedCollection`). |
| `toMarkdown?` | Plain Markdown for one current-version block, dispatched by `layoutToMarkdown` (see [Markdown export](../workflows/markdown-export.md)). A module without one is skipped, never thrown on. |
| `sourceContext?` | Optional block-specific `SourceContext` fields extracted from a stored block (for example `posts` forwarding a trimmed `category` slug), so `PageBuilder` can dispatch generically without switching on `_type`. |

Block modules keep their fields optional in the schema deliberately: EmDash's admin autosaves a new, empty block as a draft and validates required fields on every write, so a schema-required field would break the first autosave ([ADR 0003](../../../docs/adr/0003-required-to-publish-not-to-save.md)). Completeness is enforced at publish time instead.

## Shared field builders

The shared field shapes that recur across modules are built once in `core.ts` so the schema, the renderer and the sources agree on their slugs:

- `variantField(variants)` builds the `variant` select; the slug lives in `VARIANT_FIELD_SLUG = 'variant'` and the renderer reads exactly that constant to pick a section.
- `linksField()` builds the `links` repeater of `label`/`url` pairs (`LINKS_FIELD_SLUG = 'links'`); the first item is the primary action, the second an optional alternative. Used by `hero` and `cta`.
- `scopeField()` builds the shared-content `scope` select (`SCOPE_FIELD_SLUG = 'scope'`, options `page | all`, default `all`); used by `testimonials`, `pricing`, `team` and `faq`.
- `countField({ min, max, defaultValue })` builds the `count` integer field (`COUNT_FIELD_SLUG = 'count'`, default validation 1–24); used with `defaultValue: 4` by `posts`.

Module-scoped constants re-express the same slugs where a module needs them (`TESTIMONIAL_GROUP_FIELD`, `PRICING_GROUP_FIELD`, `POST_CATEGORY_FIELD_SLUG`, …), but each is derived from the core constant (`GROUP_FIELD_SLUG`) or names a field only that module owns.

## Discovery without a registry

Consumers never keep a list of block types. `isBlockType(value)` in `core.ts` recognises a block module export structurally — an object with `definition`, `variants` and `migrations` — so:

- the publish-policy plugin walks `Object.values()` of the whole `blocks` entry and filters with `isBlockType` to build its checked set;
- the apply CLI's `loadBlockTypes(modulePath)` does the same over whatever module `--from` names (by default `emdash-plugin-page-builder/blocks`), failing when it exports none;
- `PageBuilder.astro` takes block types as its `blocks` prop, so a site composes its own list.

Adding a block type is therefore one new module plus one re-export line in `src/blocks/index.ts`; every consumer picks it up.

## Sites extend the module: `SiteBlockType`

The package's block modules carry no visual components ([ADR 0001](../../../docs/adr/0001-package-owns-data-sites-own-collections-and-visuals.md)). A site spreads a package module and attaches `sections` — a map from variant to its own Astro component, with a required `default`:

```js
const blocks = [{ ...hero, sections: { default: HeroSection, featured: FeaturedHero } }];
```

`SiteBlockType extends BlockType` with that `sections` map. An unmapped variant falls back to `default`; a missing `default` is a site type error. Sections receive EmDash's `value`, `index` and `blockKey`, plus `items` when a source is supplied (see [Page rendering](../workflows/page-rendering.md)).

## Import rule: `core.ts`, never `index.ts`

Block modules import their shared pieces (`BlockType`, `variantField`, `linksField`, `migrateBlocks`) from `../core.js`, never from `../index.js`. `index.ts` re-exports the block modules, so a module importing it would create a circular import. The one documented two-version example of the full contract is `test/blocks/fixtures/example.ts`, with a migration per step beside it.
