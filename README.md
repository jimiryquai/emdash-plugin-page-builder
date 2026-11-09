# emdash-plugin-page-builder

A page builder for [EmDash](https://emdashcms.com): a library of versioned block types and the Astro components that render them, built on EmDash's own `blocks`, `repeater`, `image` and `reference` fields.

EmDash already has the custom fields. This project is the page-building layer on top of them: something as close to ACF Pro's Flexible Content as EmDash allows, and better where EmDash makes that possible (versioned block schemas, two-way relations, and agents building pages through MCP with the same fields people use).

It's an npm package, not an EmDash runtime plugin: EmDash plugins can't define block types (see [ADR 0001](docs/adr/0001-package-owns-data-sites-own-collections-and-visuals.md) and the spec). An optional native plugin entry for Portable Text blocks comes later.

Status: block layer built; block types, CLI and adoption in progress. See [the v1 spec](docs/specs/v1-page-builder.md), [the glossary](docs/GLOSSARY.md), and `docs/research/` for what EmDash 1.4 provides.

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
Block modules import the shared pieces (`BlockType`, `variantField`, `linksField`, `migrateBlocks`) from `src/blocks/core.ts`, never from `src/blocks/index.ts`, which re-exports the block modules and would make the import circular. The working two-version example is
[test/blocks/fixtures/example.ts](test/blocks/fixtures/example.ts).

| Member | Contract |
| --- | --- |
| `definition` | EmDash's seed `blockTypes` entry: `{ slug, label, description, icon?, category?, currentVersion, versions: [{ version, fields }] }`. Fields use EmDash's `BlockFieldDefinition`; there is no separate package schema. The CLI takes an array of these definitions. |
| `variants` | The fixed variant vocabulary. Use the exported `variantField(variants)` to build its select field in each version's `fields`; the helper and renderer share the exported `VARIANT_FIELD_SLUG` constant. |
| `links` | Use the exported `linksField()` for a repeater of label and URL pairs. The first item is the primary action and the second is an optional alternative. |
| `migrations` | A map keyed by the version being upgraded. Function `N` returns version `N + 1`, preserving `_key` and `_type`, without mutating the input. Keep one function and test per step. Use an empty map for a block with only version 1. |
| `sections` | Added by the site when rendering, producing a `SiteBlockType`; the package definition has no visual components. `default` is required, other keys map variants. |

`migrateBlocks(value, blockTypes)` returns the upgraded layout in the same order
and leaves unknown types alone. Render-time upgrades call this same function.
Missing steps, invalid transitions and unsupported versions throw an error naming
the block and version, so a revision cannot silently render with the wrong shape.
Migrations must remain pure, including any nested content they transform.

### Shared-content seam

`PageBuilder` optionally accepts `sources`, keyed by block slug, and `group`, a
site-supplied group identifier. A `Source<T>` receives `{ scope, group, count }`
and returns either an array of shape `T` or `{ items, cacheHints }`; the items
are passed to the section as `items`, and the cache hints (EmDash query results
carry them) are merged and applied to the page's `Astro.cache` when it is
enabled. A stored `scope: 'page'` remains `page` when a group is configured;
without a group it becomes `all`. A stored `all` stays `all`. A stored `count`
passes through when it is a positive number. Inline blocks need no source.
Shared-content blocks build their scope select with `scopeField()` and their
count field with `countField()`, sharing the `SCOPE_FIELD_SLUG` and
`COUNT_FIELD_SLUG` constants beside `variantField` and `VARIANT_FIELD_SLUG`;
`PageBuilder` reads all three through the constants. Default sources share
`createCollectionSource({ collection, groupField?, query?, mapEntry })` in
`src/blocks/core.ts`, which handles cursor paging, group reference matching,
optional `count` capping, cache hint collection, and the injectable query API.

### Checks

`npm run check` checks the Astro component and runs public-export tests, including
Astro container rendering and the required-default type fixture. Its package test
packs the library, installs the tarball in a temporary consumer, reuses the exact
installed peer dependencies, and imports and renders the exported `.astro`
component there. Successful tests remove their temporary consumer; failed tests
retain it and report its path for inspection and cleanup. The test harness
disables Astro telemetry; no new dependencies are needed for the block layer.

## Block types

### features

An inline content block representing a list or grid of capabilities, product features, or value propositions with optional images, icons, and CTA links.

**Fields (v1):**
- `eyebrow` (`string`): Optional small lead text displayed above the heading.
- `heading` (`string`, required): Main section heading.
- `subheadline` (`text`): Supporting multiline descriptive text.
- `variant` (`select`): Layout variant selection.
- `items` (`repeater`, min 1 item): Feature entries:
  - `title` (`string`, required): Feature headline.
  - `description` (`text`): Detailed copy describing the feature.
  - `image` (`image`): Screenshot, diagram, or illustration asset.
  - `icon` (`string`): Icon identifier (e.g. `mail`, `zap`).
  - `ctaLabel` (`string`): Call-to-action link text.
  - `ctaUrl` (`url`): Destination URL for the CTA.

**Variants:**
- `two-column`: Two-column card grid with visual demo screenshots or graphics.
- `three-column`: Compact three-column grid highlighting values or capabilities with icons and text.
- `three-column-demos`: Three-column grid showcasing features alongside screenshots or demo assets.
- `alternating`: Full-width stacked rows alternating between feature description and visual demo assets.

### testimonials

Customer quotes pulled from a shared testimonials collection (`src/blocks/types/testimonials.ts`).

| Field | Type | Notes |
| --- | --- | --- |
| `variant` | select | `single` (one large quote with a photo), `grid` (several quotes side by side) or `split` (one quote beside a large photo); unmapped variants use the site's default section |
| `scope` | select | `page` (entries in the page's group) or `all` (every entry); `page` behaves as `all` when no group is configured; built with `scopeField()` |
| `count` | integer | How many entries to show (1–24, optional); built with `countField()` |

**Shape.** `Testimonial`: `{ quote, author, role?, company?, avatar? }`, the
contract between a testimonials source and a testimonials section.

**Sources.** A site maps its own collection through a `Source<Testimonial>`
typed against its generated collection types, so a renamed field fails the
build. `createTestimonialsSource({ collection?, groupField?, query? })` is the
default source: it reads the starter collection (or another collection with
the same field names, via `collection`) with no mapping, takes EmDash's query
API as an injectable `query` for tests, follows the query cursor until `scope:
page` has grouped enough entries, applies `count`, and returns
`{ items, cacheHints }` with the hints of every list and get it read.

### hero

The opening section of a page. Priced plans belong on the pricing block.

| Field | Type | Notes |
| --- | --- | --- |
| `variant` | select | `centered` (default), `photo`, `demo` |
| `eyebrow` | string | Short announcement above the heading. Set with `eyebrow_url` and `eyebrow_action`. |
| `eyebrow_url` | url | Makes the eyebrow a link. |
| `eyebrow_action` | string | Action text on that link. |
| `heading` | string | Required. |
| `body` | text | Optional supporting copy. |
| `image` | image | Optional. Includes a dark-color-scheme slot. Unused for `centered`. |
| `links` | repeater | Built with `linksField()`. `label` (string) and `url` (url), both required on each item. The first item is the primary action. |

| Variant | When to use it |
| --- | --- |
| `centered` | The heading, body and links sit in a centered stack and no image is shown. |
| `photo` | The copy is aligned to the start and the image is a photograph shown with it. |
| `demo` | The copy is aligned to the start and the image is a product screenshot or interface shown as a demo. |

### cta

A later prompt to act. Use `hero` for the opening section.

| Field | Type | Notes |
| --- | --- | --- |
| `variant` | select | `start` (default), `centered` |
| `heading` | string | Required. |
| `body` | text | Optional supporting copy. |
| `links` | repeater | Built with `linksField()`. `label` (string) and `url` (url), both required on each item. The first item is the primary action. |

| Variant | When to use it |
| --- | --- |
| `start` | The heading, body and links line up with the start of the section. |
| `centered` | The heading, body and links sit in the middle of the section. |

### pricing

Pricing tiers pulled from a shared pricing collection (`src/blocks/types/pricing.ts`).
Pricing blocks carry `variant` and `scope` (no `count`, because a pricing
table displays the complete set of tiers to compare rather than a capped sample).

| Field | Type | Notes |
| --- | --- | --- |
| `variant` | select | `tiers` (several plans side by side), `toggle` (several plans with a monthly/yearly billing switcher) or `single` (one plan beside its feature list); unmapped variants use the site's default section |
| `scope` | select | `page` (entries in the page's group) or `all` (every entry); `page` behaves as `all` when no group is configured; built with `scopeField()` |

**Shape.** `PricingTier`: `{ name, price, price_monthly?, price_yearly?, period?, description?, features?, cta_label?, cta_url?, badge?, highlighted? }`,
the contract between a pricing source and a pricing section.

**Sources.** `starterPricingCollection(groupCollection)` defines the starter
pricing collection in EmDash's seed `collections` shape.
`createPricingSource({ collection?, groupField?, query? })` is the default
source, built on `createCollectionSource`: it reads the starter collection (or
another collection with the same field names, via `collection` and `groupField`)
with no mapping, resolves `scope`, and returns `{ items, cacheHints }`.

### comparison

An inline block for comparing features across up to three options. Its only
variant, `table`, is a grouped comparison table.

| Field | Type | Notes |
| --- | --- | --- |
| `variant` | select | `table` (the grouped comparison table) |
| `columns` | repeater | One to three columns. Each column has a `key` (`first`, `second` or `third`) and a required `label`. |
| `rows` | repeater | At least one row. Each row has a required `name`, optional `groupName`, and optional `firstValue`, `secondValue` and `thirdValue` text fields. |

`ComparisonBlockValue`, `ComparisonColumn` and `ComparisonRow` describe the
values passed to a site's section. Column keys select which row value is shown
under each label.

### team

Team members pulled from a shared team collection (`src/blocks/types/team.ts`).
Use team for the people behind the page; customer quotes belong on the
testimonials block.

| Field | Type | Notes |
| --- | --- | --- |
| `variant` | select | `four-column` (many compact portrait cards in a dense grid) or `three-column` (fewer, larger cards per row); unmapped variants use the site's default section |
| `scope` | select | `page` (members in the page's group) or `all` (every member); `page` behaves as `all` when no group is configured; built with `scopeField()` |
| `count` | integer | How many members to show (1–24, optional); built with `countField()` |

**Shape.** `TeamMember`: `{ name, role, image? }`, the contract between a team
source and a team section.

**Sources.** `starterTeamCollection(groupCollection)` defines the starter team
collection in EmDash's seed `collections` shape.
`createTeamSource({ collection?, groupField?, query? })` is the default source,

### faq

Frequently asked questions pulled from a shared FAQs collection
(`src/blocks/types/faq.ts`). A question-and-answer section; use `cta` for a
prompt to act and `pricing` for priced plans.

| Field | Type | Notes |
| --- | --- | --- |
| `variant` | select | `two-column` (questions beside a heading and supporting copy; default) or `centered` (questions under a centered heading); unmapped variants use the site's default section |
| `scope` | select | `page` (entries in the page's group) or `all` (every entry); `page` behaves as `all` when no group is configured; built with `scopeField()` |
| `count` | integer | How many entries to show (1–24, optional); built with `countField()` |

**Shape.** `Faq`: `{ question, answer }`, the contract between an FAQ source
and an FAQ section.

**Sources.** `starterFaqCollection(groupCollection)` defines the starter FAQs
collection in EmDash's seed `collections` shape.
`createFaqSource({ collection?, groupField?, query? })` is the default source,
built on `createCollectionSource`: it reads the starter collection (or another
collection with the same field names, via `collection` and `groupField`) with
no mapping, resolves `scope`, applies `count`, and returns `{ items, cacheHints }`.
