# emdash-plugin-page-builder

A page builder for [EmDash](https://emdashcms.com): a library of versioned block types and the Astro components that render them, built on EmDash's own `blocks`, `repeater`, `image` and `reference` fields.

EmDash already has the custom fields. This project is the page-building layer on top of them: something as close to ACF Pro's Flexible Content as EmDash allows, and better where EmDash makes that possible (versioned block schemas, two-way relations, and agents building pages through MCP with the same fields people use).

It's an npm package, not an EmDash runtime plugin: EmDash plugins can't define block types (see [ADR 0001](docs/adr/0001-package-owns-data-sites-own-collections-and-visuals.md) and the spec). An optional native plugin entry for Portable Text blocks comes later.

Status: designed, not built. See [the v1 spec](docs/specs/v1-page-builder.md), [the glossary](docs/GLOSSARY.md), and `docs/research/` for what EmDash 1.4 provides.

Licence: MIT.

## Block layer

Import the runtime functions and types from `emdash-plugin-page-builder/blocks`.
Import the Astro component separately so plain Node consumers (including the apply
CLI) never need to load an Astro file:

```astro
---
import PageBuilder from 'emdash-plugin-page-builder/blocks/PageBuilder.astro';
import { hero } from './blocks/hero.js';
import HeroSection from './sections/Hero.astro';
import FeaturedHero from './sections/FeaturedHero.astro';

const blocks = [{
  ...hero,
  sections: { default: HeroSection, featured: FeaturedHero },
}];
---
<PageBuilder value={Astro.props.layout} blocks={blocks} />
```

`hero` here is a site's imported block module; the production block modules arrive
in subsequent tickets. The package currently supplies the block layer without
visual sections. Every registered block requires `sections.default`; omitting it
is a site type error. Other section keys map the block's fixed variants. An
unmapped variant uses the default. Sections receive EmDash's `value`, `index`, and
`blockKey`, plus `items` when a source is supplied. `value` is always upgraded to
the block's current version before section selection or rendering.

Unknown block types pass through to EmDash's `<Blocks>` unchanged. The optional
`fallback` prop is forwarded to EmDash: it renders the fallback in production,
a diagnostic in development, and nothing in production without a fallback.
A null or omitted `value` renders nothing.

### One module per block type

Each block module exports an object satisfying `BlockType`. Keep all its fields,
numbered versions, migrations, fixed variants and description in that module;
the CLI and block layer import it rather than maintaining another schema.
The working two-version example is
[test/blocks/fixtures/example.ts](test/blocks/fixtures/example.ts).

| Member | Contract |
| --- | --- |
| `definition` | EmDash's seed `blockTypes` entry: `{ slug, label, description, icon?, category?, currentVersion, versions: [{ version, fields }] }`. Fields use EmDash's `BlockFieldDefinition`; there is no separate package schema. The CLI takes an array of these definitions. |
| `variants` | The fixed variant vocabulary, also used to build the definition's `variant` select options in the same module. |
| `migrations` | A map keyed by the version being upgraded. Function `N` returns version `N + 1`, preserving `_key` and `_type`, without mutating the input. Keep one function and test per step. Use an empty map for a block with only version 1. |
| `sections` | Added by the site when rendering, producing a `SiteBlockType`; the package definition has no visual components. `default` is required, other keys map variants. |

`migrateBlocks(value, blockTypes)` returns the upgraded layout in the same order
and leaves unknown types alone. Render-time upgrades call this same function.
Missing steps, invalid transitions and unsupported versions throw an error naming
the block and version, so a revision cannot silently render with the wrong shape.
Migrations must remain pure, including any nested content they transform.

### Shared-content seam

`PageBuilder` optionally accepts `sources`, keyed by block slug, and `group`, a
site-supplied group identifier. A `Source` receives `{ scope, group }` and returns
an array (or a promise of an array), passed to the section as `items`. A stored
`scope: 'page'` remains `page` when a group is configured; without a group it
becomes `all`. A stored `all` stays `all`. Inline blocks need no source. This is
the minimal seam for the shared-content tickets, which will add typed shapes and
collection mappings.

### Checks

`npm run check` checks the Astro component and runs public-export tests, including
Astro container rendering and the required-default type fixture. Its package test
packs the library, installs the tarball in a temporary consumer, reuses the exact
installed peer dependencies, and imports and renders the exported `.astro`
component there. It reports the retained consumer directory for inspection and
cleanup. The test harness disables Astro telemetry; no new dependencies are
needed for the block layer.
