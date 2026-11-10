# Spec: page builder v1

Agreed in a grilling on 2026-11-09, starting from [the EmDash 1.4 research](../research/emdash-1-4-page-building.md). Terms are defined in [the glossary](../GLOSSARY.md); the load-bearing choices are in [`docs/adr/`](../adr/).

## Outcome

The jamesryan-sites marketing site builds its pages from a `layout` field of page builder blocks, rendered with its own `@jamesryan/ui` sections, and the marketing-blocks plugin is gone from it. The package that does this is portable: any EmDash 1.4 site can install it, apply its block types, map its own collections and supply its own visuals.

The long-term goal is a whole site built from blocks, prose pages included. v1 is the first step: marketing pages only.

## Shape

One public npm package, `emdash-plugin-page-builder`, published like `emdash-plugin-code-block-pro`. It isn't an EmDash runtime plugin: EmDash plugins can't define block types or collection fields, and EmDash's own guidance is that a fields-only package is a schema, not a plugin.

```
  emdash-plugin-page-builder                         a site
 ┌──────────────────────────────────────┐        ┌─────────────────────────────────────┐
 │ definitions   block types + versions │─apply─▶│ EmDash database: block types,       │
 │               + migrations           │ (CLI)  │   pages.layout (blocks field)       │
 │ shapes        Testimonial, Tier, …   │        │                                     │
 │ block layer   upgrade, resolve       │◀import─│ page.astro: <PageBuilder value      │
 │               source, pick variant   │        │   sections={…} sources={…} />       │
 │ starter       optional collections   │        │ sections: the site's own components │
 │ plugin/       (later) PT blocks      │        │ sources:  the site's collections    │
 └──────────────────────────────────────┘        └─────────────────────────────────────┘
```

Two entry points: the `blocks` library and a plugin entry. The plugin entry starts with the required-to-publish hook (ADR 0003); Portable Text blocks for rich-text bodies join it later. A site that never imports the plugin entry never installs a native plugin.

## What the package owns

- **Block definitions**: each block type with every numbered version, its `currentVersion`, and descriptions written so an agent working through EmDash's MCP can choose and fill blocks from the schema alone.
- **Migrations**: one function per breaking version step (vN → vN+1). The same chain migrates stored blocks (`migrateBlocks`, preserving `_key`) and upgrades an old block at render time when a revision or draft still holds one. Block components only ever see the current version.
- **Shapes**: TypeScript types for the shared content blocks display (`Testimonial`, `PricingTier`, `Faq`, …). A shape is the contract between a source and a section.
- **Variant vocabulary**: each block has a fixed `variant` select in its definition (ADR 0002). Adding a variant is a compatible change and a minor release; removing one is breaking.
- **The block layer**: a `<PageBuilder>` wrapper around EmDash's `<Blocks>` that, for each stored block, upgrades it, resolves its source and scope, picks the section for its variant, and renders it.
- **Starter collections**: optional collection definitions (testimonials, pricing, FAQs) with default sources that need no mapping, for a site with no collections of its own.
- **Required to publish**: each block module lists the fields it needs before it can go live (`requiredToPublish`). Schema fields stay optional so a new, empty block can autosave as a draft; a `content:beforePublish` hook in the package's plugin entry rejects publishing with a reason naming each block and missing field ([ADR 0003](../adr/0003-required-to-publish-not-to-save.md)).
- **The apply CLI**: applies block types (and, on request, the starter collections) to a site through EmDash's REST API with a Bearer token (`EMDASH_TOKEN`).

## What each site owns

- **Its collections.** A site keeps its own collections and maps them to the shapes through **sources**: typed functions from the site's entries to a shape. They're typed against EmDash's generated collection types, so a renamed field fails the build instead of rendering an empty block (ADR 0001).
- **Its visuals.** A **sections** map from each block's variants to the site's own components. A variant the site hasn't mapped falls back to that block's default section, which the site must supply. The package ships no visual components in v1.
- **Its grouping.** Blocks can't hold references, so a page says which group it belongs to through its own `reference` field (on jamesryan-sites, `service` → `services`). Shared-content blocks carry `scope: page | all`: `page` shows entries in the page's group, `all` shows every entry. A site with no grouping configured treats `page` as `all`.
- **Its page schema.** The site's own collection holds the `layout` blocks field; the CLI can add the package's block types to that field's `allowedTypes`.

## v1 blocks

Five block types, rebuilt from marketing-blocks without its old workarounds: real `image` fields, nested `repeater`s, no hand-typed image URLs.

| Block | Content | Notes |
|---|---|---|
| `hero` | inline | heading, body, image, links |
| `features` | inline | heading, repeater of items |
| `testimonials` | shared (source) | `count`, `scope`; shape `Testimonial` |
| `pricing` | shared (source) | `scope`; shape `PricingTier` |
| `cta` | inline | heading, body, link |

Exact fields and each block's variant vocabulary are settled in its ticket, starting from what the `@jamesryan/ui` sections and the existing `Testimonials.astro`-style adapters already display.

## The apply CLI

- `plan` is the default: it reads the site's current schema and reports, as JSON, every block type and version it would create, activate or leave alone. `--apply` performs the plan; `--table` gives a human view of the same output.
- Safe to rerun: a second `--apply` with nothing to do reports no changes.
- Breaking versions follow EmDash's order: create inactive, (the site deploys a package release that renders both), activate, then migrate stored blocks. The CLI won't activate a version until it's told the renderer is deployed (`--activate`), and migrates with `--migrate`.
- Errors are actionable: the failing operation, EmDash's error code and message.
- The HTTP boundary is injectable, so tests run against a fake site.

## Adopting it in jamesryan-sites (marketing site)

Decided 2026-11-09, after finding that marketing-blocks registers ten block types (hero, features, testimonials, pricing, CTA, plus document, FAQ, comparison, stats and team), not five: the page builder is added **alongside** marketing-blocks, which stays untouched until the page builder's blocks are proven on the live site.

1. Add `pages.layout` (a `blocks` field) and a `service` reference on pages. A page renders its `layout` when it has blocks, and its Portable Text `content` otherwise.
2. Apply the five block types with the CLI (locally first; production only with James's approval).
3. Map each block's variants to `@jamesryan/ui` sections; write sources for testimonials and pricing from the existing collections.
4. Prove it on home: home's hero moves into `home.layout` and renders the same. Locally with a script; on production only after checking production's marketing blocks and with James's approval.
5. marketing-blocks keeps all ten types. Later tickets add the five blocks the package lacks (document as a prose block, FAQ, comparison, stats, team) and then retire the plugin once every page renders from `layout`.

## Out of v1

On the [backlog](../../.scratch/backlog.md): the plugin entry, default visuals, gallery, conditional logic. The five blocks marketing-blocks still provides, and retiring it, are tickets 09 to 14.
