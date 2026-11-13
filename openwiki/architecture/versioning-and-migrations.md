---
type: architecture
title: Block versioning and migrations
description: How numbered versions, currentVersion and the pure migrateBlocks chain keep stored blocks renderable across breaking schema changes — at render time, at publish time and through the CLI's create-activate-migrate order.
tags: [versioning, migrations, block-types, schema]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T16:16:20.656Z
sources:
  - id: openwiki-source-876f5ed47bf4158e6cb4a45c
    resource: repo://docs/lessons/emdash-decides-block-breaking-changes.md
  - id: openwiki-source-6c72aa398e15b80e013f80eb
    resource: repo://src/blocks/core.ts
  - id: openwiki-source-b1bf8e0bb2cfae6497e9c844
    resource: repo://src/blocks/PageBuilder.astro
  - id: openwiki-source-537d08ef6d9c051bda03a9f0
    resource: repo://src/blocks/types/hero.ts
  - id: openwiki-source-2612ddd0597da78ee912a948
    resource: repo://src/cli/apply.ts
  - id: openwiki-source-5a4a93ce049abf09d729a484
    resource: repo://src/cli/plan.ts
  - id: openwiki-source-3300a14da5015daa6dc0c2e9
    resource: repo://test/blocks/fixtures/example.ts
  - id: openwiki-source-f1aac1525135e709bf203195
    resource: repo://test/blocks/migrations.test.js
generated: { by: "claude-code", at: "2026-11-13T16:16:20.656Z" }
---

# Block versioning and migrations

## The model

<!-- openwiki: broken internal link [/openwiki/architecture/block-module-contract.md] link "/openwiki/architecture/block-module-contract.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
Every block module declares numbered `versions: [{ version, fields }]` and a `currentVersion` in its EmDash seed definition ([Block module contract](/openwiki/architecture/block-module-contract.md)). Stored blocks carry `_version`; components and publish checks only ever see a block at its type's current version. Today all eleven block types sit at v1, but the machinery is proven by the two-version fixture `test/blocks/fixtures/example.ts` (v1 `heading` renamed to v2 `title`).

<!-- openwiki: broken internal link [/openwiki/architecture/emdash-api-contract.md] link "/openwiki/architecture/emdash-api-contract.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
The rule for adding a version: a declared version N must be a **breaking** change against N−1 — a field removed, a field added as required, a type changed, a constraint narrowed. A compatible change (optional field added, variant option added, validation relaxed) folds into the current version instead, because EmDash would amend the existing version in place whatever the request says. Two guards enforce this: `buildPlan` refuses a non-breaking declared version before anything is written, and `test/blocks/versioning.test.js` fails `npm run check` on the same condition. EmDash's own field comparison is the authority on breakingness — a PUT with `breaking: true` creates a new version only when EmDash finds the change incompatible ([lesson](../../../docs/lessons/emdash-decides-block-breaking-changes.md); the comparison logic is ported in [EmDash API client and field-contract port](/openwiki/architecture/emdash-api-contract.md)).

## `migrateBlocks`

The one pure chain serves both stored-content migration (CLI) and render-time upgrades:

```ts
migrateBlocks(value: readonly StoredBlock[], blockTypes: readonly BlockType[]): StoredBlock[]
```

It maps each stored block in order, looking up its `_type`. Unknown types pass through untouched — they belong to other owners. For a known type it validates `_version` is an integer in `[1, currentVersion]`, then loops the block forward one migration step at a time from the module's `migrations` map (keyed by the version being upgraded; step `N` returns a block at version `N + 1`).

Three failure classes, each thrown with a message naming the block and version so a revision can never silently render with the wrong shape:

1. **Unsupported version** — `_version` is not an integer, is below 1, or exceeds `currentVersion`: `Unsupported version 9 for block example (stable)`.
2. **Missing migration** — the map has no function for the version being upgraded: `Missing migration for example v2` (a gap in the chain).
3. **Invalid migration** — a step's result does not preserve `_key` and `_type` and advance `_version` by exactly one: `Invalid migration for example v1: preserve _key and _type and advance one version`.

Migration steps must be pure — no mutation of the input block (including nested content they transform), `_key` preserved, one test per step (CODING_STANDARDS rule 5). `migrateBlocks` returns the upgraded layout in the same order and never mutates its input; the chain is also what upgrades old blocks inside revisions and drafts at render time, because `PageBuilder`, `layoutToMarkdown` and `findMissingToPublish` all call `migrateBlocks` first.

## Who upgrades when

| Caller | When | Effect |
| --- | --- | --- |
| `PageBuilder.astro` | Every render | Upgrades `value` before source resolution and section selection. |
| `layoutToMarkdown` | Every Markdown render | Upgrades before dispatching to each module's `toMarkdown`. |
| `findMissingToPublish` | Publish policy | Upgrades before checking `requiredToPublish`, so old blocks are judged by current-version rules. |
| CLI `migrateStoredBlocks` | `--apply --migrate` | Upgrades stale stored blocks via the same chain, then writes them back with EmDash's `migrateBlocks: true` (which preserves `_key` and validates against the target schema), carrying the entry `_rev` so a lost update conflicts. |

## CLI-side version lifecycle

<!-- openwiki: broken internal link [/openwiki/workflows/apply-cli.md] link "/openwiki/workflows/apply-cli.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
The apply CLI walks EmDash's version lifecycle in order (see [The apply CLI](/openwiki/workflows/apply-cli.md)):

1. **Create** — a type the site lacks is created at v1 (active); each later version is created as a breaking, **inactive** version. A brand-new type's own `currentVersion` is then activated automatically (no stored blocks can exist for it).
2. **Update** — a stored version whose fields differ from the definition is updated in place only when it is the site's current version; a differing inactive old version is a warning (the REST API cannot rewrite an old version's contract).
3. **Activate** — a definition's `currentVersion` ahead of the site's is activated only with `--activate`, after the site has deployed a package release whose renderer handles both versions. Activation posts the fingerprint of the currently active version as `expectedFingerprint`.
4. **Migrate** — a content scan finds stored blocks of these types below the version the site can migrate to (the site's **active** version, and only when it matches the definition's `currentVersion`; otherwise the entry is reported as waiting on `--activate`). `--apply --migrate` then moves them up.

This order is why the renderer's upgrade-before-everything matters: between "new version created" and "stored blocks migrated", pages still render old-version blocks, upgraded on the fly by the same migration chain.
