# Files

- [The apply CLI](apply-cli.md) - The emdash-page-builder apply command — plan-first JSON output, module loading with isBlockType, the create-activate-migrate order, starter collections via --collections/--group, allowedTypes extension via --field, and the entry-point guard.
- [Markdown export](markdown-export.md) - How a page layout becomes plain Markdown for agents and LLMs — layoutToMarkdown dispatching to each block module's toMarkdown, the items option for shared-content blocks, and portableTextToMarkdown for EmDash Portable Text.
- [Page rendering with PageBuilder.astro](page-rendering.md) - How a stored layout becomes HTML — PageBuilder's props, upgrade-before-anything, per-block source resolution with cache hints, variant-to-section selection, the edit-mode display:contents wrapper, and passthrough for unknown blocks.
- [Publish policy plugin](publish-policy.md) - The native plugin entry — emdash-plugin-page-builder/plugin — that rejects publishing a page whose blocks are missing required fields, why enforcement happens at publish instead of in the schema, and the shared plain-text reason editors and agents receive.
