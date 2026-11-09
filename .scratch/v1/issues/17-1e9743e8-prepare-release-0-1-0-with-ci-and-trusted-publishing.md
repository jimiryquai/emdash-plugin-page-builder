# 17-1e9743e8: Prepare release 0.1.0 with CI and trusted publishing

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Make the package publishable, following emdash-plugin-code-block-pro (read its `package.json`, `.github/workflows/` and README "Release" sections at `/home/james/Repos/Workspace/building/emdash-plugin-code-block-pro`, read-only).

- `package.json`: version `0.1.0`; remove `"private": true`; add `publishConfig` (`access: public`, `provenance: true`), `keywords` (emdash, emdash-plugin, page-builder, astro), `homepage` and `bugs`. Keep `files`, `exports` and `bin` as they are, and check the packed tarball holds exactly `dist`, the `.astro` sources, README, LICENSE and package.json.
- `.github/workflows/ci.yml`: on push to master and on pull requests, Node 24, `npm ci` then `npm run check`, exactly as the repo runs it (read-only `contents` permission).
- `.github/workflows/publish.yml`: on a published GitHub release, trusted publishing (OIDC: `id-token: write`) with `npm publish --provenance --access public`, after `npm ci` and `npm run check`. Copy code-block-pro's npm-version note: trusted publishing needs npm 11.5.1 or later; pin the npm it installs, as code-block-pro does.
- README: a short "Install" section (`npm install emdash-plugin-page-builder`, peer dependencies, the two entries and the CLI) and a "Release 0.1.0" section saying what's in it (ten block types, the block layer, the apply CLI) and how later releases happen (a GitHub release triggers `publish.yml`).
- Nothing is published from this ticket: no `npm publish`, no tags, no GitHub release.

**Blocked by:** none.

**Status:** done

- [x] `npm pack --dry-run` lists exactly `dist`, the `.astro` sources, README, LICENSE and package.json, at version 0.1.0, not private.
- [x] `ci.yml` and `publish.yml` exist and `actionlint` (or an equivalent YAML and schema check run locally) reports no problems; `publish.yml` runs `npm run check` before publishing with provenance.
- [x] The README has Install and Release 0.1.0 sections, and `npm run check` passes.

## Comments

**2026-11-09 Orchestrator:** Risk: high (adds CI definitions and a publish workflow). James approves before merge. Helper: codex (default model).

**2026-11-09 Orchestrator:** Approved by James and merged to master (1bd27d8). 0.1.0, public, provenance; CI runs `npm run check` on Node 24; `publish.yml` publishes on a GitHub release through trusted publishing. Cross-family review in the archived evidence. The first publish is James's, by the wizard; the package audit is clean (0 production vulnerabilities).
