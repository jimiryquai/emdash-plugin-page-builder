# 04-34eb2e97: Define the hero and cta blocks

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Define the `hero` and `cta` block types (inline content) in the block-type format from 03: fields using real `image` fields and links, variant vocabularies, and agent-readable descriptions. Start from marketing-blocks' hero and CTA and from the `@jamesryan/ui` sections the marketing site's `Hero.astro` and `CTA.astro` choose between, so the variants cover what the site already shows.

**Blocked by:** 03-48a1daa0

**Status:** done

- [x] Both block types render through a test sections map for every variant.
- [x] The apply CLI's plan (or its definition fixtures) includes both at version 1.
- [x] Descriptions say when to use each variant.

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code: new block types, compatible). Helper: grok.

**2026-11-09 Orchestrator:** Done in a5995c7 and fix round 5f8347a, merged to master. `hero` (variants `centered`, `photo`, `demo`; eyebrow with URL and action, heading, body, image with dark variant, links) and `cta` (variants `start`, `centered`; heading, body, links). `linksField()` now lives in core and both blocks use it. The test harness sets `server.ws = false` so several Astro test servers can run. Review fixes: finished a half-done merge, removed a duplicate variant builder, gave `links` one home. The priced-plans hero section is left for the pricing block.
