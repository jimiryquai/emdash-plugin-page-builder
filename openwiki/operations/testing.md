---
type: operations
title: Testing strategy
description: How the package is proven — public-entry imports through package exports, a packed-tarball consumer test on both supported Astro versions, an Astro container harness, and fake EmDash (fake site transport, fake QueryApi) so no test ever reaches a real site.
tags: [testing, node-test, astro-container, fake-emdash]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T18:45:38.950Z
sources:
  - id: openwiki-source-ae4ac769cf1f9e86b659c844
    resource: repo://CODING_STANDARDS.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-6c72aa398e15b80e013f80eb
    resource: repo://src/blocks/core.ts
  - id: openwiki-source-899aa56dcf7c86d80a0614d9
    resource: repo://test/blocks/astro-harness.js
  - id: openwiki-source-ec0c9ee96d4fc754ec197a27
    resource: repo://test/blocks/package.test.js
  - id: openwiki-source-1fcde581fee0b9f1fd267122
    resource: repo://test/blocks/render.test.js
  - id: openwiki-source-2b90bfcdc84e9d92e494b4c4
    resource: repo://test/blocks/types/posts.test.js
  - id: openwiki-source-8a4bfe73b9393905cb4d0906
    resource: repo://test/cli/fake-site.mjs
generated: { by: "claude-code", at: "2026-11-13T18:45:38.950Z" }
---

# Testing strategy

## Layout and entry rule

Tests are `node:test` files under `test/`, mirroring `src/`: `test/blocks/` for the block layer (with per-type tests in `test/blocks/types/`), `test/cli/` for the apply CLI, `test/plugin.test.js` for the publish policy. `npm test` runs `node --test` after a `pretest` build, so tests exercise compiled output.

CODING_STANDARDS rule 8: tests of public behaviour import through the package's `exports` (`emdash-plugin-page-builder/blocks`, `emdash-plugin-page-builder/blocks/PageBuilder.astro`), never through relative `src/` paths — a broken build or exports map fails a test, not a consumer.

## The Astro container harness

`PageBuilder.astro` renders through Astro, so block tests start a real Vite SSR server (`test/blocks/astro-harness.js`): it builds an Astro config in middleware mode, stubs EmDash's virtual modules (`virtual:emdash/config`, `virtual:emdash/block-components`) with empty registries, forces production semantics (`import.meta.env.DEV: false`), disables the dev toolbar, and — because several tests each start a server — turns Vite's websocket off so a second server doesn't die on port 24678. Telemetry is disabled inside the harness (`ASTRO_TELEMETRY_DISABLED=1`).

On top of the server, tests use Astro's `experimental_AstroContainer.renderToString` to render `PageBuilder` with fixture sections (`test/blocks/fixtures/Section.astro`, `Featured.astro`, marker variants, per-block section fixtures like `prose/`, `stats/`, `features/`, `comparison/`). This proves real rendering behaviour: migration before render, variant section selection with default fallback, unknown-block parity with EmDash's `<Blocks>`, source scope/group resolution, edit-attribute wrappers byte-identical when absent.

## The packed-consumer test

`test/blocks/package.test.js` tests the package exactly as sites get it: it packs a tarball (`npm pack`), installs it into a temporary consumer directory together with exact peer dependency versions selected from `package.json`, and imports and renders the exported `.astro` component there. It runs twice — once with the oldest supported Astro from the `peerDependencies` range (`^6.4.8`) and once with the pinned devDependency (`astro` 7.x) — installing the selected versions with `npm install`, which can download packages from the registry. A passing test removes its temp consumer; a failing one retains it and reports the path for inspection and cleanup.

## Fake EmDash, twice

CODING_STANDARDS rule 7: code that calls EmDash takes an injectable boundary, and tests supply the fake from the first red run.

- **CLI**: the HTTP boundary is the injectable `Transport` ([EmDash API client](../architecture/emdash-api-contract.md)). `test/cli/fake-site.mjs` implements the schema and content endpoints in memory — including EmDash's *real* versioning rules (a compatible PUT updates the active version in place even with `breaking: true`; only an incompatible change creates a new inactive version), built on the same ported `compareBlockFields`/`fingerprintBlockFields` from `dist/cli/contract.js`. No request can leave the module, so no test touches a real site or token. The fake also records requests so tests assert exactly what was written (or not written).
- **Sources**: the `QueryApi` (list/get) is injectable, so shared-content source tests (`test/blocks/types/posts.test.js`, testimonials, faq, …) pass scripted query results and assert cursor paging, group matching, count capping and cache-hint collection.

## Per-type and behavior tests

Each block module has a sibling test (`test/blocks/types/<slug>.test.js`) asserting its seed definition — exact fields, variants, `currentVersion`, migrations, `requiredToPublish` — plus container-rendered section behavior and its Markdown rendering. Cross-cutting suites cover migrations (per-step purity, `_key` preservation, gap/invalid-transition rejection), versioning (every declared version breaking against its predecessor — the same rule `buildPlan` enforces), render/autosave/edit behavior, Markdown export, publish checks (`findMissingToPublish`), and variants. `test/plugin.test.js` drives the native publish policy through the real hook path: rejection reasons, nested layouts, unknown blocks, and the 500-character plain-text limit ([Publish policy](../workflows/publish-policy.md)).

## What is deliberately not tested

Tests never reach a real EmDash site or publish to npm; those boundaries stay behind the injected transport and the pack-into-consumer pattern. `npm run check` adds `astro check` typechecking of the `.astro` component and fixture type tests (the required-`default` section error is proven by a type fixture), closing the gap between runtime and type-level contracts.
