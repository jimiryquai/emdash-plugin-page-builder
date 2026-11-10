# Block fields are required to publish, not to save

EmDash's admin autosaves a draft two seconds after every change, with no setting to turn it off (`AUTOSAVE_DELAY` is fixed in @emdash-cms/admin 1.4.0), and EmDash validates required fields on every write, drafts included. A block always starts empty, so a schema-required field made the first autosave of every new block fail. We keep block fields optional in the schema and enforce what a block needs before it goes live with a `content:beforePublish` hook in the package's plugin entry, reading each block module's `requiredToPublish` list. James decided this on 2026-11-10, after hitting the autosave failure on the local site.

## Considered options

- **Patch autosave off** (a pnpm patch on the admin, as jamesryan-sites already patches emdash): keeps schema-required fields, but loses autosave's protection against lost work, must be redone on every EmDash upgrade, and needs every site to carry the patch.
- **Optional fields with no check**: drafts work, but half-empty blocks can go live.

## Consequences

The hook covers every route to publishing (admin, REST API, MCP agents, visual editor, scheduler) and rejects with a reason naming each block and missing field, so agents and editors get the same answer. The package gains its plugin entry for this, earlier than the Portable Text work it was first planned for. A site must register the plugin to get the guarantee.
