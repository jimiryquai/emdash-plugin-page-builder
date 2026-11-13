---
type: workflow
title: Markdown export
description: How a page layout becomes plain Markdown for agents and LLMs — layoutToMarkdown dispatching to each block module's toMarkdown, the items option for shared-content blocks, and portableTextToMarkdown for EmDash Portable Text.
tags: [markdown, agents, portable-text, export]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T18:45:38.950Z
sources:
  - id: openwiki-source-6c72aa398e15b80e013f80eb
    resource: repo://src/blocks/core.ts
  - id: openwiki-source-072c807c0df6e27e15023178
    resource: repo://src/blocks/types/comparison.ts
  - id: openwiki-source-ae86278ffd6192b44fab9207
    resource: repo://src/blocks/types/faq.ts
  - id: openwiki-source-537d08ef6d9c051bda03a9f0
    resource: repo://src/blocks/types/hero.ts
  - id: openwiki-source-235050334ae43fc05bf5facd
    resource: repo://src/blocks/types/posts.ts
  - id: openwiki-source-7ad69727b4a441aef3775043
    resource: repo://src/blocks/types/pricing.ts
  - id: openwiki-source-1ab5adc28a7e10aafe8f5d08
    resource: repo://src/blocks/types/team.ts
  - id: openwiki-source-09026a4a7b8c0d40395657a8
    resource: repo://src/blocks/types/testimonials.ts
generated: { by: "claude-code", at: "2026-11-13T18:45:38.950Z" }
---

# Markdown export

## Purpose

`layoutToMarkdown(value, blockTypes, options?)`, exported from `emdash-plugin-page-builder/blocks`, renders a page layout as plain Markdown — for an `.md` route, MCP tools, or exporting content out of the page builder to agents and LLMs. `portableTextToMarkdown(value)` is also exported on its own for any other EmDash Portable Text content (a posts collection rendered outside a layout, say).

The output is deterministic: the same layout and block types produce the same Markdown, with unknown block types, modules without `toMarkdown`, and empty renderings skipped rather than thrown on. Migration failures propagate, including unsupported versions, missing migration steps and invalid transitions; custom module renderers can also throw.

## `layoutToMarkdown`

Two steps, both delegating to the modules' own ownership ([Block module contract](../architecture/block-module-contract.md)):

1. **Upgrade** the layout with `migrateBlocks`, so old blocks render by current-version rules ([Versioning and migrations](../architecture/versioning-and-migrations.md)).
2. **Dispatch** each block to its module's optional `toMarkdown(block, items?)`, joining non-empty results with exactly one blank line.

The `options.items` map is keyed by block `_key` and carries what a site's sources read — the same items its sections receive, in the shape its `Source` produces. Shared-content blocks render their own heading text plus these items:

```js
import { layoutToMarkdown } from 'emdash-plugin-page-builder/blocks';

const markdown = layoutToMarkdown(page.data.layout, blocks, {
  items: { 'quotes-1': [{ quote: 'Fast to build with.', author: 'Ada' }] },
});
```

A site's Markdown route therefore supplies what its sources read (testimonials, pricing, faq, team, posts), while inline blocks need nothing passed in.

## Per-block conventions

Every module owns its own `toMarkdown`, built from the shared helpers in `core.ts`:

- **Heading levels.** The hero's heading is the page's one `#` heading; other blocks with heading text generally use `##`, with `###` for item headings where applicable. The comparison block emits a table without a heading. Testimonials, pricing, FAQ and team use their definition labels (e.g. `## Testimonials`); posts emits a heading only when its stored heading is present.
- **Helpers.** `markdownText` checks that a field contains non-whitespace text, returning the original string (whitespace-only values are skipped); `markdownImage` renders `![alt](url)` resolving the URL from the stored `src`, the provider `previewUrl`, or EmDash's file URL `/_emdash/api/media/file/<storageKey|id>` — the same address EmDash's `getEmbed` resolves; `markdownLinks` renders one `- [label](url)` bullet per *complete* link.
- **Inline blocks.** hero (eyebrow joined with its action, optionally linked; heading; body; image; links), cta (heading, body, links), features (eyebrow/heading/subheadline, then `###` items with description, image, CTA link), comparison (a Markdown table: `Feature | <column labels>` with pipes escaped and newlines flattened; group-only rows render a bold group header row), stats (eyebrow/heading/body, `- **value** — label` bullets), prose (heading, body, then its Portable Text through `portableTextToMarkdown`).
- **Shared-content blocks.** testimonials (`> "quote"` then `> — **author**, role (company)`), pricing (per-tier `### name — badge`, monthly/yearly pair or price+period, description, feature lines, CTA), faq (`### question` then answer), team (`- **name** — role` bullets), posts (optional `## heading`, then `- [title](url)` per post).

## `portableTextToMarkdown`

Renders EmDash Portable Text as plain Markdown:

- normal paragraphs, `h1`–`h6` headings, and `blockquote`s (`> ` per line);
- `bullet` and `number` list items with `level` nesting — numbering counts per level and restarts after any other block; child items indent under their parent's marker by the parent's marker width; a level change between bullet and number flushes the current list run;
- spans with `code` (innermost backticks), `em`, `strong`, and `link` marks resolved through the block's `markDefs`;
- unknown block and span types are skipped, never thrown on; blocks are separated by one blank line and list items by one newline.

The built-in renderers do not mutate their inputs. `portableTextToMarkdown` returns an empty string for null or non-array input; `layoutToMarkdown` expects a layout array and returns an empty string for an empty array.

## Relation to rendering

The same upgrade-first discipline and per-module ownership that `PageBuilder` follows ([Page rendering](page-rendering.md)) apply here: one module per block type renders both HTML (via the site's sections) and Markdown (via `toMarkdown`), from the same current-version blocks. `test/blocks/markdown.test.js` pins the output shape per block and the join/skip semantics.
