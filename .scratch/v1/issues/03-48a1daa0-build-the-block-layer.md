# 03-48a1daa0: Build the block layer

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Build `<PageBuilder>`, the block layer around EmDash's `<Blocks>` (spec: "What the package owns"). For each stored block it runs the migration chain up to the current version, resolves sources and scope for shared-content blocks (an interface the testimonials ticket fills in), picks the site's section for the block's variant with fallback to the block's default section, and renders it. Also define the in-package format for a block type: its versions, migrations, variant vocabulary and description, as one module per block. Prove it with a test-only block type that has two versions.

**Blocked by:** 01-e1a022b4

**Status:** ready-for-agent

- [ ] A stored v1 block renders through its v2 section after the migration chain runs, with `_key` unchanged.
- [ ] An unmapped variant renders the block's default section; a block type with no default section is a type error for the site.
- [ ] An unknown block type renders EmDash's fallback, not an exception.
- [ ] The block-type module format is documented in the README for the next tickets.

## Comments
