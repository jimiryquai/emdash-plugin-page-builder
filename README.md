# emdash-plugin-page-builder

A page builder for [EmDash](https://emdashcms.com): a library of versioned block types and the Astro components that render them, built on EmDash's own `blocks`, `repeater`, `image` and `reference` fields.

EmDash already has the custom fields. This project is the page-building layer on top of them: something as close to ACF Pro's Flexible Content as EmDash allows, and better where EmDash makes that possible (versioned block schemas, two-way relations, and agents building pages through MCP with the same fields people use).

It's an npm package, not an EmDash runtime plugin: EmDash plugins can't define block types (see [ADR 0001](docs/adr/0001-package-owns-data-sites-own-collections-and-visuals.md) and the spec). An optional native plugin entry for Portable Text blocks comes later.

Status: designed, not built. See [the v1 spec](docs/specs/v1-page-builder.md), [the glossary](docs/GLOSSARY.md), and `docs/research/` for what EmDash 1.4 provides.

Licence: MIT.
