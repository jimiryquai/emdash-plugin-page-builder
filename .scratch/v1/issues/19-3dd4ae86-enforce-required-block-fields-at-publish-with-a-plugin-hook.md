# 19-3dd4ae86: Enforce required block fields at publish with a plugin hook

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md), [ADR 0003](../../../docs/adr/0003-required-to-publish-not-to-save.md)

**What to build:**

Ticket 18 makes every block field optional so a new block can autosave. This ticket restores the guarantee at the point that matters: publishing (ADR 0003).

1. **One home per block:** add `requiredToPublish` to `BlockType` in `src/blocks/core.ts`: field slugs, plus repeater rules (e.g. features items need a `title`; `linksField()` links need a label and URL; a repeater may need at least one item). Each block module declares its own, at its current version, restoring what ticket 18 removed from the schema (heading on hero, cta, features, stats, prose; prose content; repeater sub-fields).
2. **A pure check in core:** `findMissingToPublish(value, blockTypes)` returns every missing field as `{ blockKey, blockType, field }` (repeater items located by index), after upgrading old blocks with `migrateBlocks`. Tested directly.
3. **The plugin entry:** a new `./plugin` export (a native EmDash plugin via `definePlugin`, read the docs: `npx mcporter call emdash-docs.search_docs query:"definePlugin native plugin hooks"` and the `content:beforePublish` hook reference) declaring `hooks.content-policy:register` only. Its `content:beforePublish` hook walks `content.data`, finds blocks fields holding this package's block types, runs the check, and returns `{ cancel: true, reason }` naming each block and missing field in plain text (1-500 characters, as EmDash requires; summarise when longer), otherwise allows. It needs no content read or write capability. Importing the `blocks` entry must still not load the plugin, and the plugin must load in plain Node for its tests.
4. **README:** how a site registers the plugin in `astro.config.mjs`, and what editors and agents see when a publish is rejected.

**Blocked by:** 18-80574483

**Status:** done

- [x] Every block module declares `requiredToPublish`, and `findMissingToPublish` reports each missing field by block key, type and field (repeater items by index), with tests.
- [x] The `./plugin` entry's `content:beforePublish` hook rejects a publish with a plain-text reason (1-500 characters) naming the missing fields, and allows a complete layout, tested with a fake event; it declares only `hooks.content-policy:register`.
- [x] The package's `exports` add `./plugin` without the `blocks` entry loading it, the packed tarball includes it, and the README shows how a site registers it.

## Comments

**2026-11-10 Orchestrator:** Risk: medium (new plugin entry and export; no live writes). Helper: codex (default model).

**2026-11-10 Orchestrator:** Done in 6010d7a and e46e228, merged to master (9f5a9c9) with no fix round. `requiredToPublish` on every block module; `findMissingToPublish` in core (upgrades first, reports block key, type and field path); `./plugin` exports a native plugin (`default()` descriptor, `createPlugin()` runtime) whose `content:beforePublish` hook rejects with a plain-text reason of at most 500 characters, declaring only `hooks.content-policy:register`. Checked from the built package in plain Node: an incomplete hero is rejected naming `heading` and `links[0].url`; a complete one passes. `isBlockType` is now shared by the CLI and the plugin.
