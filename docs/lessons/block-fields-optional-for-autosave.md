---
type: Lesson
title: Block fields are optional so a new block autosaves
description: EmDash's admin autosaves a new, empty block as a draft and validates required fields on every write, so any required field or repeater minItems fails the first autosave; enforce what a block needs at publish instead.
tags: [emdash, block-types, autosave]
generated: { by: pi/glm-5.3, at: 2026-11-10T12:00:00Z }
sources:
  - id: adr
    resource: docs/adr/0003-required-to-publish-not-to-save.md (the decision)
  - id: ticket
    resource: .scratch/v1/issues/18-80574483-let-a-new-block-autosave-by-making-block-fields-optional.md
  - id: guard
    resource: test/blocks/autosave.test.js (fails npm run check on any required field)
---

# Context
James added a block to a page's layout on the local site and the admin failed at once, before any save, with `VALIDATION_ERROR "layout[1].heading: Invalid input: expected string, received undefined"` in the network tab. The admin autosaves a draft as soon as a block is added, EmDash validates required fields on every write (drafts included), and a new block always starts empty — so the hero's required `heading` (and every other required field, repeater sub-field and `minItems`) made the first autosave of every new block fail.

# Lesson
Block fields are required to publish, not to save.[^adr] Keep every block field, repeater sub-field and repeater `minItems` optional in the schema: a compatible loosening, folded into each block's current version in place, with no new version and no migration. What a block needs before it goes live is enforced at publish, by the `content:beforePublish` hook planned for the package's plugin entry reading each block module's `requiredToPublish` list (ADR 0003; the hook itself comes in ticket 19).

# How to apply
- Never mark a block field or repeater sub-field `required: true`, and never set a repeater `minItems` above 0. `test/blocks/autosave.test.js` fails `npm run check` if any exported definition does, with a message naming the autosave reason.[^guard]
- The exported value types and shapes (`FeaturesBlockValue`, `StatItem`, `ComparisonRow`, …) treat those fields as optional too; the empty-value fixtures under `test/blocks/fixtures/` fail typecheck otherwise.
- Starter collections keep their `required` fields: a collection entry is a document an editor fills in deliberately, not an empty block a page autosaves on creation.
- Loosening validation is a compatible change in EmDash: it amends the current version in place, so sites get it on the next apply without a migration (see [emdash-decides-block-breaking-changes](emdash-decides-block-breaking-changes.md)).

[^adr]: ADR 0003, decided 2026-11-10 after the local-site failure
[^guard]: The autosave guard test added with ticket 18
