# Backlog: parked items

- **Plugin entry**: a native plugin entry that registers Portable Text blocks for rich-text bodies, reusing the same sections and shapes. It's where marketing-blocks' rich-text blocks return, including `optionsRoute` selects.
- **Prose block**: a block holding Portable Text, so prose pages (privacy-policy and its `marketing.document`) can move into `layout`. A step towards sites built entirely from blocks.
- **Default visuals**: plain default sections for sites with no design system. Not v1: sites supply their own.
- **Gallery**: check whether 1.4 has a `gallery` field or only the multi-select media picker, then decide on a gallery block.
- **Conditional logic**: EmDash content fields have none; a custom field widget may be the route (not usable on a `blocks` field itself).
- **Apply from the admin**: find out whether a native plugin can apply block types itself (an admin page in place of the CLI). Undocumented as of 2026-11-09.
- **Variant descriptions, one home**: `features` writes each variant's description twice (`featureVariantDescriptions` and the block `description`). Let `variantField` take descriptions, or derive the block description from them, so agents and editors read one source.
