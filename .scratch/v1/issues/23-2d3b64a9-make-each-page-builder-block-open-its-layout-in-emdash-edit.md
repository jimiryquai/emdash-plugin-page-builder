# 23-2d3b64a9: Make each page builder block open its Layout in EmDash edit mode

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

EmDash's edit mode edits only top-level fields in place: its in-page editor resolves `data-emdash-ref` fields by top-level slug (`manifest.collections[c].fields[field]`) and saves `{ data: { [field]: value } }`, so a block inside a `blocks` field can't be edited in place, and a click on an unrecognised field opens the entry in the admin (`openAdmin`). That's true in EmDash 1.4.0 and 1.5.0. Give editors that click: `PageBuilder.astro` takes an optional `edit` prop, the attributes of the page's `entry.edit.<field>` (for example `{...page.edit.layout}`). When it has any attributes, PageBuilder wraps each rendered block in one element with `style="display:contents"` carrying them, so a click anywhere in a block opens that page's Layout field in the admin. When it has none (production, where EmDash's edit proxy is a no-op, or no prop at all), the rendered HTML is byte-for-byte what it is today. Document the prop in the README's block-layer section, saying plainly that this opens the admin and is not in-place editing, and why. Release 0.4.0 through a GitHub release.

**Blocked by:** none.

**Status:** done

- [x] With edit attributes, each block's output sits inside exactly one `display:contents` element carrying them; a test asserts the markup.
- [x] Without the prop, or with an empty attribute set, the rendered HTML is identical to 0.3.0's; a test asserts it.
- [x] The README documents the `edit` prop and that it opens the admin rather than editing in place, and `rm -rf dist && npm ci && npm run check` passes.
- [x] Release 0.4.0 is published from a GitHub release with provenance.

## Comments

**2026-11-12 Orchestrator:** From James's question "Can these blocks be editable (not the structure but the content) in EmDash edit mode (posts are)". He chose option 1 of 3 (this ticket), plus raising nested-field visual editing with EmDash upstream; building our own in-place editor is on the backlog. Risk: high (npm publish).

**2026-11-12 Orchestrator:** Upstream: EmDash takes feature requests as Ideas Discussions, and its AI policy keeps community conversation human, so James posts it. A draft with notes and disclosure is in this session's scratchpad (`emdash-ideas-nested-visual-editing.md`). Helper: agy (Argon).

**2026-11-12 Orchestrator:** Done. Built by agy (Gemini 4 Argon) in 5c69317, with no fix rounds; reviewed by me (cross-family). Merged as 50107cd. My clean check: 128/128, 0 type errors; CI green. Tests cover the wrapped markup, unchanged HTML with no or empty `edit`, and a packed consumer using EmDash's real `createEditable`. Released v0.4.0 (npm `latest`, SLSA provenance). Site wiring is v1/24.
