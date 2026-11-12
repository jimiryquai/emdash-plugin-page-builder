# 25-26f59066: Spike: in-place block editing with the emdash-visual-editor plugin

**Spec:** none (spike; answers a question, ships nothing).

**What to build:**

Find out whether https://github.com/DavesAgenda/emdash-visual-editor (MIT; a side-by-side EmDash plugin that edits a page's blocks by `_key`, reading fields from `/_emdash/api/schema/block-types`) can edit the page builder's ten blocks on jamesryan-sites. In a throwaway jamesryan-sites branch, locally only: copy its `src/plugins/visual-editor/` in, point it at `pages.layout` (it hard-codes `data.content`), emit its markers (`data-vx-key` per block from `PageBuilder`'s per-block wrapper, `data-vx-f="<key>.<field>"` on text elements) only inside its preview, and edit each block type. Record what works, what breaks (EmDash 1.4/1.5 versus its tested 1.1, nested repeater items, images, `requiredToPublish` against its "leave unfinished sections out of the draft" rule), and a recommendation: adopt, fork as a package, build our own, or wait for EmDash upstream. Nothing merges.

**Blocked by:** 23-2d3b64a9

**Status:** in progress

- [ ] A findings note in `docs/research/` covers each of the ten block types (edits or not, and why), the version gap, the publish-rule conflict and a recommendation, with screenshots or recordings as evidence.

## Comments

**2026-11-12 Orchestrator:** James agreed (with the EmVB comparison): stay with structured blocks and site-owned design (ADR 0001). This spike tests the smaller editor as a route to in-place editing.

**2026-11-12 Codex orchestrator:** Local-only spike can build on prepared14 code without waiting for its production rollout; removed14 as a build blocker. Nothing merges. Static preflight pinned upstream08a5e7542d9fc12cb2452bfef2aff14acc139ae4, saved .orchestrate/evidence/25-editor-preflight.md: hard-coded content paths and external placeholder import need adaptation; filtering unfinished blocks risks draft data loss; shared-content blocks edit controls, not source collection items. Browser proof still required. Risk: medium for isolated throwaway integration, no live writes or deployment.
