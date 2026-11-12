# 30-ea9021b7: Build the jamesryan-sites Pricing page from blocks

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

The Pricing page's body is template code (`apps/marketing-site/src/pages/pricing.astro`, or the shared `PublishedPage` with no layout), not Content, so ticket 14 left it as the fallback when its Layout is empty. Toward "the whole site built from blocks" (James): decide which existing blocks express it, or which block a gap needs, then move it into Layout so it looks the same and the template keeps no hand-written body. Triage first: list each section of the page against the ten block types and name any gap.

**Blocked by:** 14-d910a4dc

**Status:** needs triage

- [ ] A triage comment maps each section of the Pricing page to a block type or names the gap.

## Comments

**2026-11-12 Orchestrator:** Raised with James's go-ahead alongside the posts block.
