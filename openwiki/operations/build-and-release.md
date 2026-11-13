---
type: operations
title: Build, checks, and release
description: How emdash-plugin-page-builder is compiled (NodeNext tsc to dist), checked (node --test plus astro check), and published — CI on every push/PR, trusted npm publishing with provenance on GitHub releases.
tags: [build, release, ci, npm]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T18:45:38.950Z
sources:
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-f2608d0d515da097485b6ec5
    resource: repo://.github/workflows/publish.yml
  - id: openwiki-source-ae4ac769cf1f9e86b659c844
    resource: repo://CODING_STANDARDS.md
  - id: openwiki-source-7e15bad1e44b2b1adac1f674
    resource: repo://docs/lessons/lockfile-npm-matches-ci.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-493ba14a90823e29eec8dfdf
    resource: repo://tsconfig.build.json
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
generated: { by: "claude-code", at: "2026-11-13T18:45:38.950Z" }
---

# Build, checks, and release

## Build

The library build is `tsc -p tsconfig.build.json`: `module`/`moduleResolution` `NodeNext`, `declaration: true`, emitting `src/` → `dist/`. Because the runtime is Node as much as bundlers (tests and the apply CLI run in plain Node), relative imports in `src/` carry `.js` extensions (CODING_STANDARDS rule 1). The base `tsconfig.json` extends `astro/tsconfigs/strict` and includes all of `src/**/*`, so `astro check` type-checks the `.astro` component too. `allowImportingTsExtensions` is off in the build config — emitted code must not import `.ts` paths.

What ships (`files`) is `dist` plus `src/blocks/**/*.astro` — the `PageBuilder.astro` entry is served as source, not compiled (see [Package architecture](../architecture/overview.md)). The npm `exports` map routes `./blocks` and `./plugin` to `dist`, and `./blocks/PageBuilder.astro` to the source file.

## Checks

`npm run check` = `npm test` + `npm run typecheck`:

- `npm test` runs `node --test`, and `pretest` builds first, so tests run against the compiled output and import through the package's own `exports` (see [Testing strategy](testing.md)).
- `npm run typecheck` runs `ASTRO_TELEMETRY_DISABLED=1 astro check`.

Telemetry is disabled in the script itself (CODING_STANDARDS rule 9), not left to the environment — the same variable is set in CI and in the test harness.

## CI

`.github/workflows/ci.yml` runs on every push to `master` and every pull request: checkout, Node 24, `npm ci`, `npm run check` — nothing else. Permissions are `contents: read`.

A lockfile gotcha is recorded as a lesson: the npm on the CI runner decides whether `package-lock.json` is valid. An older local npm once omitted EmDash's optional `pg` from the lockfile and the runner's newer `npm ci` refused it; when dependencies change, regenerate the lockfile with the runner's npm (`npx -y npm@<version> install --package-lock-only`) and verify with that npm's `ci` ([lesson](../../../docs/lessons/lockfile-npm-matches-ci.md)).

## Release

Publishing is trusted npm publishing (OIDC), not token-based:

1. Update the package and lockfile versions, then publish a GitHub release with a matching version tag.
2. That release triggers `.github/workflows/publish.yml`: checkout, Node 24 with the npm registry configured, `npm install -g npm@11.21.1` (trusted publishing needs npm ≥ 11.5.1; the pin matches what `emdash-plugin-code-block-pro` uses), `npm ci`, `npm run check`, then `npm publish --provenance --access public`.
3. `prepack` runs the build, so the tarball always carries fresh `dist`.
4. The job needs `id-token: write` (for OIDC) alongside `contents: read`; no npm token secret exists. The npm package's trusted publisher must authorize owner `jimiryquai`, repository `emdash-plugin-page-builder` and workflow `publish.yml`.

`publishConfig` sets `access: public` and `provenance: true`. These two workflows — `ci.yml` and `publish.yml` — are the repository's only GitHub Actions workflows.
