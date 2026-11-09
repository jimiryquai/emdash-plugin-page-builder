# EmDash 1.4 page-building features, compared with ACF Pro

Researched 2026-11-09 from the EmDash docs (through the `emdash-docs` MCP), not yet tried in code. Sources: https://docs.emdashcms.com/reference/field-types/, /guides/blocks/, /guides/relations/, /guides/media-library/, /guides/sections/, /plugins/creating-plugins/block-kit/.

## By ACF Pro feature

| ACF Pro | EmDash 1.4 | Notes |
|---|---|---|
| Flexible Content | Yes: the `blocks` field type | An ordered composition of typed blocks; editors add and reorder them. Block types are defined through the schema API, MCP or a seed, before a field uses them. Each type keeps numbered versions with a `currentVersion` pointer; a stored block records type, version and a stable key. Rendered with `<Blocks value components fallback>` from `emdash/ui`. `allowedTypes`, `retiredTypes`, `minItems`, `maxItems` (≤ 100). |
| Repeater | Yes: the `repeater` field | Sub-fields: `string`, `text`, `url`, `number`, `integer`, `boolean`, `datetime`, `select`, `image`. No nested repeater, `portableText`, `reference` or `file`. |
| Gallery | Partly | The media picker selects several images in order, with per-image alt text and caption ("Gallery fields" in the media library guide), and Portable Text has a gallery block. No `gallery` type appears in the field-types reference: check before relying on one. |
| Relationship / Post Object | Yes, and better | `reference` fields bind to relations: both collections can edit one set of links, with order and limits. Links live outside the collection tables and are read through `references`, not `data`. |
| Clone | Partly | Block types can be reused across collections. Sections are reusable Portable Text that is copied on insert (no live link). |
| Options pages | Partly | Site settings and widget areas hold centrally managed values. |
| ACF Blocks (editor blocks) | Yes | Native plugins register custom Portable Text block types, with Block Kit fields: now including `repeater` and `media_picker`, and `select` with `optionsRoute`. |
| Conditional logic | No (for content fields) | Conditional fields exist only in Block Kit forms (plugin admin pages). Content fields and block fields have none. |

## Limits that shape the design

- A block definition can hold scalar, text, selection, Portable Text, image, file and repeater fields, but **not references, JSON, slugs or nested blocks**. A block can't link to entries directly; a block that shows shared content (testimonials, team, FAQs) says what to show, and the template queries it.
- A `blocks` field can't be required, unique, searchable, indexed, or use a custom field widget.
- Custom field widgets exist for other fields, which may be the route to conditional logic or a richer gallery.

## Where it came from

jamesryan-sites' `apps/marketing-site/src/plugins/marketing-blocks/` (adapted from Cloudflare's EmDash marketing template) registers five Portable Text block types: hero, features, testimonials, pricing and CTA. It was written around limits that 1.4 removes: flattened fields because Block Kit had no object group, scalar-only repeaters, and image URLs typed by hand because the block editor had no media picker. Its selects load `services` entries through plugin routes.
