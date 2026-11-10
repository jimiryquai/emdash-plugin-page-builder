---
okf_version: 0.2
---

# Lessons

## emdash

* [EmDash decides whether a block type change is breaking](emdash-decides-block-breaking-changes.md) - A PUT with breaking true creates a new version only when EmDash finds the change incompatible; otherwise it rewrites the active version in place.
* [Validate block definitions with EmDash's own validateSeed](validate-definitions-with-emdash.md) - Package tests of rendering and types can't catch EmDash's schema rules, such as snake_case field slugs; run EmDash's validator over every definition.
* [Block fields are optional so a new block autosaves](block-fields-optional-for-autosave.md) - The admin autosaves a new, empty block as a draft and validates required fields on every write, so any required field or repeater minItems fails the first autosave; enforce what a block needs at publish (ADR 0003) instead.

## npm

* [Write the lockfile with the npm that CI runs](lockfile-npm-matches-ci.md) - An older local npm can leave optional dependencies out of package-lock.json, and the runner's newer npm ci then refuses it.
