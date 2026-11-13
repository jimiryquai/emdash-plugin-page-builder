---
type: workflow
title: Publish policy plugin
description: The native plugin entry — emdash-plugin-page-builder/plugin — that rejects publishing a page whose blocks are missing required fields, why enforcement happens at publish instead of in the schema, and the shared plain-text reason editors and agents receive.
tags: [publish-policy, plugin, emdash, validation]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T18:45:38.950Z
sources:
  - id: openwiki-source-e40fe0d4a2e085e66b32997f
    resource: repo://docs/adr/0003-required-to-publish-not-to-save.md
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-6c72aa398e15b80e013f80eb
    resource: repo://src/blocks/core.ts
  - id: openwiki-source-e357d61069f3b66782c52ded
    resource: repo://src/plugin.ts
generated: { by: "claude-code", at: "2026-11-13T18:45:38.950Z" }
---

# Publish policy plugin

## Why it exists (ADR 0003)

EmDash's admin autosaves a draft two seconds after every change with no setting to turn it off, and it validates required fields on every write — drafts included. A block always starts empty, so a schema-required field made the *first autosave of every new block fail*. The rejected options were patching autosave off (losing lost-work protection, redoing it on every upgrade, every site carrying the patch) and optional fields with no check (half-empty blocks going live).

The accepted design: **block fields are required to publish, not to save.** Schemas keep every block field optional so new blocks autosave; the package's plugin entry enforces each block module's `requiredToPublish` list with a `content:beforePublish` hook ([Block module contract](../architecture/block-module-contract.md)).

## Registration and capability

A site registers the plugin in `astro.config.mjs`:

```js
integrations: [emdash({ plugins: [pageBuilderPlugin()] })]
```

The `blocks` library stays independently usable; publish validation requires registering the plugin. `pageBuilderPlugin()` returns a `PluginDescriptor` (`format: 'native'`, entrypoint `emdash-plugin-page-builder/plugin`, id `page-builder`, version from `package.json`) requesting exactly one capability: `hooks.content-policy:register`. EmDash's native loader calls the module's named `createPlugin()` factory at runtime, which returns the plugin with its `content:beforePublish` hook and reads only the content supplied by the publish event.

## What the hook does

1. **Collect the checked set.** `Object.values()` of the whole `blocks` entry filtered by `isBlockType` — no registry; unknown block types are left to their owners.
2. **Walk the content.** `findMissingInData(event.content.data)` recurses arrays and objects, so it checks every layout in `content.data`, including nested layouts (a layout inside a repeater, a block inside another structure), at any depth.
3. **Judge package blocks only.** An array is treated as a layout when it contains package-recognised blocks (`_type` in the package's slugs, plus `_key` and `_version`); other values are ignored.
4. **Check after upgrade.** `findMissingToPublish(value, blockTypes)` (also exported from `blocks` as a pure function for callers that need the same missing-field facts) runs `migrateBlocks` first, so old-version blocks are judged by current-version rules ([Versioning and migrations](../architecture/versioning-and-migrations.md)). Each `requiredToPublish` rule — a field slug, or `{ field, minItems?, fields }` for repeaters — reports `MissingPublishField { blockKey, blockType, field }`, with repeater paths zero-based (`links[0].url`).
5. **Reject.** Any missing field returns `{ cancel: true, reason }`; the hook returns nothing (allow) otherwise. Complete layouts, unknown blocks and content without layouts publish freely.

## The rejection reason

The reason is shared plain text — editors and agents get the same answer:

```
Missing required block fields: hero (intro): heading; cta (action): links[0].url
```

Stored keys are editor input, so every interpolated value is sanitized first: `<`, `>`, and ASCII control characters are replaced with spaces (markup or control characters in a block `_key` cannot smuggle anything into the reason), and the key is truncated to 80 characters. The whole reason stays within EmDash's **500-character limit**: longer lists are truncated and end with `; N missing fields total. Fix these and retry.`

## Coverage and failure semantics

The `content:beforePublish` hook covers every route to publishing — admin, REST API, MCP agents, visual editor — and scheduled publishing checks again when due; a rejected scheduled publish is unscheduled and its reason appears on the dashboard. EmDash returns `PUBLISH_REJECTED` to the caller; filling in the named fields and retrying succeeds. The pure `findMissingToPublish(value, blockTypes)` gives the identical check without the hook, so a site or agent can pre-validate.

## Tests

`test/plugin.test.js` drives the hook path: rejection with the shared reason and minimal capability, multiple and nested layouts walked with unrelated values ignored, complete layouts/unknown blocks/layout-free content allowed, and the reason staying plain text within 500 characters for large layouts and hostile keys ([Testing strategy](../operations/testing.md)).
