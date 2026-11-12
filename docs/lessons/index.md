---
okf_version: 0.2
---

# Lessons

## emdash

* [EmDash decides whether a block type change is breaking](emdash-decides-block-breaking-changes.md) - A PUT with breaking true creates a new version only when EmDash finds the change incompatible; otherwise it rewrites the active version in place.
* [Validate block definitions with EmDash's own validateSeed](validate-definitions-with-emdash.md) - Package tests of rendering and types can't catch EmDash's schema rules, such as snake_case field slugs; run EmDash's validator over every definition.
* [Block fields are optional so a new block autosaves](block-fields-optional-for-autosave.md) - The admin autosaves a new, empty block as a draft and validates required fields (and non-empty URL strings on 1.5+) on every write, so block fields stay optional and unset URLs stay omitted; enforce publish completeness in `content:beforePublish` (ADR 0003).
* [Authenticated content GET hydrates a pending draft into item.data](emdash-content-get-hydrates-pending-drafts.md) - When a published entry has `draftRevisionId` set, `GET` returns the draft in `item.data` and published columns in `item.liveData`; classify pending drafts and check full read-backs before publishing.

## npm

* [Write the lockfile with the npm that CI runs](lockfile-npm-matches-ci.md) - An older local npm can leave optional dependencies out of package-lock.json, and the runner's newer npm ci then refuses it.
