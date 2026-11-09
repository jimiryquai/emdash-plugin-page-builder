---
type: Lesson
title: Validate block definitions with EmDash's own validateSeed
description: Package tests of rendering and types can't catch EmDash's schema rules, such as snake_case field slugs; run EmDash's validator over every definition.
tags: [emdash, block-types, testing]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-09T17:00:00Z }
sources:
  - id: adoption
    resource: .scratch/v1/issues/08-a3332f54-adopt-the-page-builder-on-the-jamesryan-sites-marketing-site.md (first real adoption)
  - id: check
    resource: test/blocks/versioning.test.js (validateSeed over every exported definition and starter)
---

# Context
Ten block types passed 97 package tests, then the first real site rejected `features` at create time: two repeater sub-field slugs were camelCase. The validator then found `comparison` had the same fault. The package's tests checked rendering, types and versioning, and none of them knew EmDash's schema rules.

# Lesson
Treat EmDash as the judge of a definition's validity. Its exported `validateSeed` applies the same rules the schema API and seed apply (field slugs start with a letter and use only lowercase letters, numbers and underscores, among others).[^check] A block isn't valid until EmDash says so.[^adoption]

# How to apply
- `npm run check` builds a seed from every exported `BlockType` and `starter` and requires `validateSeed` to report valid with no warnings. Keep new blocks inside it: they're picked up from the package exports automatically.
- Name every field and sub-field in snake_case.
- When EmDash adds rules, the check picks them up on the next EmDash upgrade; read its failures as package bugs, not test noise.

[^adoption]: Ticket 08's first run on jamesryan-sites
[^check]: The validateSeed test in versioning.test.js
