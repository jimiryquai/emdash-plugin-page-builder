---
type: reference
title: Block type catalog
description: The eleven block modules in src/blocks/types/ — six inline and five shared-content — with their variants, key fields, required-to-publish rules, starter collections and shapes, all at version 1.
tags: [block-types, reference, catalog, variants]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T16:16:20.656Z
sources:
  - id: openwiki-source-c40f3c5fcc7900f7e26d64d4
    resource: repo://src/blocks/index.ts
  - id: openwiki-source-072c807c0df6e27e15023178
    resource: repo://src/blocks/types/comparison.ts
  - id: openwiki-source-ae86278ffd6192b44fab9207
    resource: repo://src/blocks/types/faq.ts
  - id: openwiki-source-8894c5a68d1904e2a8ff1f05
    resource: repo://src/blocks/types/features.ts
  - id: openwiki-source-537d08ef6d9c051bda03a9f0
    resource: repo://src/blocks/types/hero.ts
  - id: openwiki-source-235050334ae43fc05bf5facd
    resource: repo://src/blocks/types/posts.ts
  - id: openwiki-source-7ad69727b4a441aef3775043
    resource: repo://src/blocks/types/pricing.ts
  - id: openwiki-source-d562b4f02d203e742bc26694
    resource: repo://src/blocks/types/prose.ts
  - id: openwiki-source-d5c14721c4fad16286aadb9c
    resource: repo://src/blocks/types/stats.ts
  - id: openwiki-source-1ab5adc28a7e10aafe8f5d08
    resource: repo://src/blocks/types/team.ts
  - id: openwiki-source-09026a4a7b8c0d40395657a8
    resource: repo://src/blocks/types/testimonials.ts
  - id: openwiki-source-215d3ab70de159aab29e8b22
    resource: repo://test/blocks/types/hero.test.js
generated: { by: "claude-code", at: "2026-11-13T16:16:20.656Z" }
---

# Block type catalog

<!-- openwiki: broken internal link [/openwiki/architecture/block-module-contract.md] link "/openwiki/architecture/block-module-contract.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [/openwiki/workflows/markdown-export.md] link "/openwiki/workflows/markdown-export.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
Eleven block types, each one module in `src/blocks/types/` satisfying the `BlockType` contract ([Block module contract](/openwiki/architecture/block-module-contract.md)). All are at `currentVersion: 1` with empty `migrations` maps. Every module also carries a `toMarkdown` rendering (see [Markdown export](/openwiki/workflows/markdown-export.md)). Descriptions are written for an agent filling the block from EmDash's schema alone, including when *not* to use a block (priced plans → `pricing`; a later prompt to act → `cta`, opening section → `hero`; quotes → `testimonials`).

## Inline blocks

Content lives in the page's layout; no source, no starter collection.

| Block | Variants | Key fields (v1) | `requiredToPublish` |
| --- | --- | --- | --- |
| `hero` | `centered` (default), `photo`, `demo` | `eyebrow`+`eyebrow_url`+`eyebrow_action` (set together), `heading`, `body`, `image` (dark-variant slot), `links` (`linksField()`: label+url pairs, first = primary action) | `heading`; every link's `label` and `url` |
| `cta` | `start` (default), `centered` | `heading`, `body`, `links` | `heading`; every link's `label` and `url` |
| `features` | `two-column`, `three-column`, `three-column-demos`, `alternating` | `eyebrow`, `heading`, `subheadline`, `items` repeater (title, description, image, icon, cta_label, cta_url) | `heading`; ≥1 item; each item's `title` |
| `comparison` | `table` (only) | `columns` repeater (`key` ∈ first/second/third, `label`; max 3), `rows` repeater (`group_name`, `name`, `first_value`/`second_value`/`third_value`) | ≥1 column, each with `key`+`label`; ≥1 row with `name` |
| `stats` | `graph` (only) | `eyebrow`, `heading`, `body`, `items` repeater (value, label) | `heading`; ≥1 item; each item's `value` |
| `prose` | `centered` (default), `start` | `heading`, `body`, `content` (EmDash Portable Text) | `heading`, `content` |

Typed value shapes exported beside the modules: `FeaturesBlockValue`/`FeatureItem`, `ComparisonBlockValue`/`ComparisonColumn`/`ComparisonRow`, `StatsBlockValue`/`StatItem`. Column keys select which row value (`first_value`, …) shows under each label. The hero's Markdown heading is the page's single `#`; prose renders its Portable Text through `portableTextToMarkdown`.

## Shared-content blocks

<!-- openwiki: broken internal link [/openwiki/architecture/shared-content-sources.md] link "/openwiki/architecture/shared-content-sources.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
Content comes from a collection through a `Source` ([Shared-content sources](/openwiki/architecture/shared-content-sources.md)); the shape is the contract between source and section. Group-scoped blocks carry `scope` (`page | all`, via `scopeField()`) and — except `pricing` — `count` (1–24, via `countField()`).

| Block | Variants | Scope/Count | Shape | Starter collection |
| --- | --- | --- | --- | --- |
| `testimonials` | `single`, `grid`, `split` | scope + count | `Testimonial { quote, author, role?, company?, avatar? }` | `testimonials` (title field `author`) |
| `pricing` | `tiers`, `toggle`, `single` | scope only — a pricing table shows the complete set of tiers, not a capped sample | `PricingTier { name, price, price_monthly?, price_yearly?, period?, description?, features?, cta_label?, cta_url?, badge?, highlighted? }` | `pricing` (title field `name`; `period` defaults `/mo`) |
| `team` | `four-column`, `three-column` | scope + count | `TeamMember { name, role, image? }` | `team` (title field `name`) |
| `faq` | `two-column` (default), `centered` | scope + count | `Faq { question, answer }` | `faqs` (title field `question`) |
| `posts` | `featured-grid`, `grid`, `list` | `count` (default `4`, from the definition's `defaultValue`) + `heading` + `category` slug | `Post { title, url, excerpt?, date?, image?, tags?, bylines? }` | `posts` (title, featured_image, content, excerpt; URL pattern `/posts/{slug}`) |

None of the shared-content blocks enforce `requiredToPublish` — the items arrive from the source, not the editor. All five default sources (`createTestimonialsSource`, `createPricingSource`, `createTeamSource`, `createFaqSource`, `createPostsSource`) are exported from `blocks`.

`posts` is the odd one: it classifies by **taxonomy**, not by a page-group reference. Its starter ignores the group-collection parameter, its `category` field is a plain string slug forwarded through `sourceContext`, and `createPostsSource` filters with `where: { category: <slug> }` in a single `published_at: 'desc'` list read. The four group-scoped starters each carry a `group` reference field targeting the site's grouping collection.

## How these facts are enforced

<!-- openwiki: broken internal link [/openwiki/workflows/page-rendering.md] link "/openwiki/workflows/page-rendering.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
Each module's sibling test (`test/blocks/types/<slug>.test.js`) pins the exact seed definition, variants, publish rules and Markdown output, so the catalog above fails a check when a module drifts. Sections are never part of the package: a site maps each variant to its own component with a required `default` ([Page rendering](/openwiki/workflows/page-rendering.md)).
