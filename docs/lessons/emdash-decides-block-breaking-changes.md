---
type: Lesson
title: EmDash decides whether a block type change is breaking
description: A PUT with breaking true creates a new version only when EmDash's own field comparison finds the change incompatible; otherwise it rewrites the active version in place.
tags: [emdash, block-types, schema-api]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-09T16:00:00Z }
sources:
  - id: registry
    resource: node_modules/emdash/src/schema/block-type-registry.ts (updateBlockType, emdash 1.4.0)
  - id: contract
    resource: node_modules/emdash/src/schema/block-type-contract.ts (compareBlockFields, emdash 1.4.0)
  - id: cli
    resource: src/cli/contract.ts and src/cli/plan.ts (the port and the plan-time check)
---

# Context
The first apply CLI sent `breaking: true` for every new version and tested against a fake site that always created one. A Spec review against EmDash's source found the real server compares the fields itself: adding an optional field is compatible, so EmDash updated the active version in place and the next activate call failed. A live site would have had v1 rewritten.

# Lesson
Treat EmDash's field comparison as the authority on breaking changes. A new version is created only when `compareBlockFields` finds the change incompatible (a field removed, a field added as required, a type changed, a constraint narrowed); anything compatible amends the current version, whatever the request says.[^registry][^contract] So every declared version N of a block type must be breaking against N-1, checked before any write.[^cli]

# How to apply
- Compatible changes (an optional field, a new variant option, looser validation) go into the current version, not a new number.
- `test/blocks/versioning.test.js` fails `npm run check` when a block module's version isn't breaking against its predecessor; the CLI's plan refuses it before writing.
- EmDash 1.4 doesn't export the comparison, so `src/cli/contract.ts` carries a port. When upgrading EmDash, re-check the port against `block-type-contract.ts`, or switch to an export if one appears.
- Fakes of EmDash in tests must follow the same rule, or they hide this.

[^registry]: EmDash `updateBlockType`
[^contract]: EmDash `compareBlockFields`
[^cli]: The page builder's port and plan-time check
