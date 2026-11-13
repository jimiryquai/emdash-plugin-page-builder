---
type: workflow
title: Page rendering with PageBuilder.astro
description: How a stored layout becomes HTML — PageBuilder's props, upgrade-before-anything, per-block source resolution with cache hints, variant-to-section selection, the edit-mode display:contents wrapper, and passthrough for unknown blocks.
tags: [rendering, astro, pagebuilder, edit-mode]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T16:16:20.656Z
sources:
  - id: openwiki-source-3220fe7918026b6b5d10afb8
    resource: repo://docs/lessons/emdash-content-get-hydrates-pending-drafts.md
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-b1bf8e0bb2cfae6497e9c844
    resource: repo://src/blocks/PageBuilder.astro
generated: { by: "claude-code", at: "2026-11-13T16:16:20.656Z" }
---

# Page rendering with PageBuilder.astro

## Props

```astro
<PageBuilder value={page.data.layout} blocks={blocks} sources={sources}
             group={group} edit={page.edit.layout} fallback={Fallback} />
```

| Prop | Contract |
| --- | --- |
| `value` | The stored layout (`readonly StoredBlock[]`), or null/omitted — which renders nothing. |
<!-- openwiki: broken internal link [/openwiki/architecture/block-module-contract.md] link "/openwiki/architecture/block-module-contract.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
| `blocks` | The site's `SiteBlockType[]`: package block modules with the site's `sections` attached ([Block module contract](/openwiki/architecture/block-module-contract.md)). |
<!-- openwiki: broken internal link [/openwiki/architecture/shared-content-sources.md] link "/openwiki/architecture/shared-content-sources.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
| `sources?` | `Record<blockSlug, Source>` for shared-content blocks ([Shared-content sources](/openwiki/architecture/shared-content-sources.md)). |
| `group?` | The site's group identifier for `scope: page` resolution. |
| `edit?` | Field-level edit attributes (e.g. `page.edit.layout`); see edit mode below. |
| `fallback?` | Forwarded to EmDash's `<Blocks>`: renders the fallback in production, a diagnostic in development, nothing in production without a fallback. |

## The flow, one block at a time

<!-- openwiki: broken internal link [/openwiki/architecture/versioning-and-migrations.md] link "/openwiki/architecture/versioning-and-migrations.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
1. **Upgrade first.** `migrateBlocks(value ?? [], blocks)` runs before anything else, so sources, sections and Markdown-like decisions all see current-version blocks ([Versioning and migrations](/openwiki/architecture/versioning-and-migrations.md)). Unknown `_type`s pass through untouched.
2. **Resolve sources.** For each upgraded block, if `sources[block._type]` exists, the source is awaited with `resolveSourceContext(block, blockType, group)` — scope (`page` stays `page` only with a `group`), count (stored positive number or the definition's declared default), and block-specific context such as posts' `category`. The result (bare array or `{ items, cacheHints }`) is stored in a `Map` keyed by the block object.
3. **Apply cache hints.** Every hint a source read is merged (`mergeCacheHints`: union of tags, latest `lastModified`) and applied via `Astro.cache.set(hint)` when `Astro.cache?.enabled` — the same pattern EmDash's own templates use.
4. **Wrap sections as components.** For each block type, `PageBuilder` builds an Astro component (via `createComponent` from Astro's server runtime — the `.astro` frontmatter needs a runtime component to hand to EmDash's `<Blocks>`) that closes over `sections` and the items `Map`.
5. **Render.** `<Blocks value={upgraded} components={components} fallback={fallback} />` — EmDash's own renderer walks the layout and invokes the component per block with `value`, `index` and `blockKey`.

Inside the per-block component: the stored `variant` (read through the shared `VARIANT_FIELD_SLUG`) selects `sections[variant]` when the site mapped it (`Object.hasOwn`), otherwise `sections.default` — the required fallback (ADR 0002). The section is invoked with `{ ...props, items: items.get(block) }`, so sections receive EmDash's `value`/`index`/`blockKey` plus `items` when a source read them.

**Unknown block types** have no component in the map, so EmDash's `<Blocks>` handles them unchanged — same behavior as passing them to `<Blocks>` directly (verified byte-for-byte in tests).

## Edit mode

When `edit` carries attributes (EmDash's `page.edit.layout` in edit mode), each rendered block is wrapped in

```html
<div style="display:contents" data-emdash-ref="…">…</div>
```

carrying the attributes — `display:contents` keeps the wrapper out of the layout. Clicking a block in EmDash's edit mode opens the page's **Layout field in the admin** rather than editing in place. That is deliberate: EmDash's in-page visual editor resolves `data-emdash-ref` by top-level field slug (`manifest.collections[c].fields[field]`) and saves `{ data: { [field]: value } }`, so nested fields inside a `blocks` field cannot be edited in place, and unrecognised field types open the entry in the admin (`openAdmin`).

When `edit` is omitted or has no attributes (EmDash's no-op edit proxy in production), **no wrapper element is rendered and the HTML is byte-for-byte unchanged** — `hasEditAttrs` checks for at least one attribute with a defined value, and the wrapper branch is skipped entirely.

## Staleness, drafts, and the content seam

Render-time upgrade means a revision or draft holding an old-version block still renders correctly after a breaking version activates, before the CLI migrates stored content. One content seam worth knowing: an authenticated `GET` of a published entry with a pending draft hydrates the *draft* into `item.data` (published columns land in `item.liveData`), so full read-backs must classify pending drafts before comparing ([lesson](../../../docs/lessons/emdash-content-get-hydrates-pending-drafts.md)).

## Tests

`test/blocks/render.test.js` proves with Astro's container: v1 storage rendering through the v2 section with `data-key` unchanged, unmapped variant → default section and mapped variant → its section, unknown-block fallback parity with `<Blocks>`, source scope/group resolution reaching the section, edit wrappers (wrapped exactly once with the attributes, unwrapped output identical when absent), and null `value` rendering nothing. Autosave behavior (optional fields, empty blocks) is covered in `test/blocks/autosave.test.js`.
