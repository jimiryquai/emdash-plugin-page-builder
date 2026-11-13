---
type: workflow
title: The apply CLI
description: The emdash-page-builder apply command — plan-first JSON output, module loading with isBlockType, the create-activate-migrate order, starter collections via --collections/--group, allowedTypes extension via --field, and the entry-point guard.
tags: [cli, apply, plan, migrations]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T16:16:20.656Z
sources:
  - id: openwiki-source-ae4ac769cf1f9e86b659c844
    resource: repo://CODING_STANDARDS.md
  - id: openwiki-source-2612ddd0597da78ee912a948
    resource: repo://src/cli/apply.ts
  - id: openwiki-source-0547748f6ce41077d22b75d1
    resource: repo://src/cli/main.ts
  - id: openwiki-source-5a4a93ce049abf09d729a484
    resource: repo://src/cli/plan.ts
generated: { by: "claude-code", at: "2026-11-13T16:16:20.656Z" }
---

# The apply CLI

## Command and contract

```
emdash-page-builder apply <site-url> [options]
```

The CLI applies the package's block-type definitions (and, on request, starter collections and field `allowedTypes`) to an EmDash site through its REST API. Its contract (CODING_STANDARDS rule 6): **plan by default, JSON first** — stdout is JSON for success *and* failure, errors come as `{"errors": [{ message, operation?, code?, status?, blockType?, version? }]}`, failure sets a nonzero exit code, and nothing is written to a site without `--apply`. `--table` prints a human view of the same result. When a run fails mid-`--apply`, the error payload carries the plan as far as it got (`plan` field) so the partial write can be audited.

Options: `--apply`, `--activate` (activate breaking versions; the renderer is deployed), `--migrate` (migrate stored blocks), `--field <collection>/<fieldSlug>` (add the block types to a blocks field's `allowedTypes`), `--collections` (apply starter collections; needs `--group <collection>` naming the site's grouping collection), `--from <module>` (whose exports to apply; default `emdash-plugin-page-builder/blocks`), `--types <slug,...>` (restrict the run; an unknown slug fails before any request, naming what's available), `--token`.

Auth: the token comes from `EMDASH_TOKEN` (preferred) or `--token`; a `--token` value is visible in `ps`, hence the environment preference. No token and no injected transport → immediate failure with the JSON error payload and exit code 1.

## Run flow (`run()` in `src/cli/main.ts`)

1. Parse arguments (`node:util` `parseArgs`); usage errors print the error payload plus usage on stderr with exit code 2.
<!-- openwiki: broken internal link [/openwiki/architecture/block-module-contract.md] link "/openwiki/architecture/block-module-contract.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
2. `loadBlockTypes(from)` — imports the module and keeps every export that satisfies `isBlockType` (definition + variants + migrations); no hand-kept list, the module is the source of truth ([Block module contract](/openwiki/architecture/block-module-contract.md)). Zero block types is an error. `--types` then restricts the set.
3. `buildPlan(definitions, remote)` — pure, no HTTP: compares each definition against the site's reported block types (`listBlockTypes`).
4. **Plan errors abort before any write** — even with `--apply`. Today that means a declared version N that isn't breaking against N−1 ("fold it into v…").
5. `executePlan(client, plan, blockTypes, flags)` — performs creates/updates/activates the flags allow (below).
6. Migration scan — `findPendingMigrations` runs *after* the schema ops (a just-run `--activate` makes more blocks eligible); pending entries become `migrate` actions on the plan, each with its `collection/entryId.field` detail. With `--apply --migrate`, `migrateStoredBlocks` upgrades each pending entry's stale blocks through the package's `migrateBlocks` chain and writes them back with `migrateBlocks: true`, carrying the entry's `_rev` so a lost update conflicts. In plan-only mode the scan still reports what *would* migrate.
7. Starter collections (`--collections` + `--group`): starters derive from the block modules' `starter` factories; each collection that doesn't already exist is created, then its fields one at a time, then its `titleField` once the column exists.
8. `--field <col>/<fieldSlug>`: reads the site's collections, finds the field, refuses when it's not a `blocks` field, computes which slugs would be added to `allowedTypes`, and writes the merged validation only with `--apply`.
9. Output: `RunResult { site, applied, plan, collectionsCreated, fieldUpdates }` as JSON, or `renderTable` for `--table`.

## The plan and its execution order

`buildPlan` (pure) emits per-version actions with counts, warnings and errors:

- **Missing type** → create at v1 (active), create each later version as an inactive breaking version, then `activate` the definition's `currentVersion` with `autoActivate` (a brand-new type can hold no stored blocks, so activating its own current version is safe and needs no `--activate`).
- **Missing version of an existing type** → create as a new inactive version ("activate with --activate").
- **Same fields** (canonical comparison) → `unchanged`, which is what makes reruns idempotent: a second `--apply` with nothing to do reports no changes.
- **Different fields on the site's current version** → `update` in place (must stay compatible).
- **Different fields on an old inactive version** → warning: the REST API cannot rewrite an inactive version's contract.
- **Definition's `currentVersion` ahead of the site's** → `activate` requiring `--activate` ("deploy a renderer for both versions first"); ahead in the other direction → warning, no activation.

<!-- openwiki: broken internal link [/openwiki/architecture/emdash-api-contract.md] link "/openwiki/architecture/emdash-api-contract.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [/openwiki/architecture/versioning-and-migrations.md] link "/openwiki/architecture/versioning-and-migrations.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
`executePlan` (with `--apply`) walks the actions in order, threading the remote block types through each write: **create → update → activate** (and content migration last, after the scan). Breaking-ness is EmDash's decision — each version-creating PUT is checked for the requested version actually appearing, else a `PlanError` reports the fold-in requirement ([EmDash API client](/openwiki/architecture/emdash-api-contract.md); [Versioning and migrations](/openwiki/architecture/versioning-and-migrations.md)). Activation waits for `--activate` because between creating a breaking version and migrating content, the site must first deploy a package release whose renderer handles both versions — `PageBuilder`'s render-time upgrade is what makes that window safe.

Without `--apply`, every non-`unchanged` action is marked `skipped` and nothing is written.

## Entry-point guard

`main.ts` runs only when invoked as an entry: it compares `import.meta.url` with the real path of `process.argv[1]` (`realpathSync`, because an installed `.bin` symlink resolves differently), so importing the module for tests runs nothing (CODING_STANDARDS rule 6). `errorPayload` is exported so the bin wrapper and `run()` share one error shape.

## What the tests prove

<!-- openwiki: broken internal link [/openwiki/operations/testing.md] link "/openwiki/operations/testing.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
`test/cli/apply-cli.test.js` and `test/cli/bin.test.js` drive `run()` (and the real bin through `execFileSync`) against the fake site: plan-only writes nothing, `--apply` performs the planned actions, reruns are idempotent, bad `--types` and missing token fail with the documented payload, and migration/activation flags gate their writes. The fake site follows EmDash's real versioning rules, so the create-activate-migrate order is exercised against honest server behavior ([Testing strategy](/openwiki/operations/testing.md)).
