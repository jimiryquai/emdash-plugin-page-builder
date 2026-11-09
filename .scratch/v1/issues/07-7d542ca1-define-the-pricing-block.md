# 07-7d542ca1: Define the pricing block

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Define the `pricing` block type on the shared-content machinery from 06: the `PricingTier` shape (taken from the fields in jamesryan-sites' `pricing` collection, including monthly/yearly prices and highlighting), the starter pricing collection and its default source, and the variant vocabulary from the existing `Pricing.astro`.

**Blocked by:** 06-f40708c4

**Status:** done

- [x] The block renders tiers from a source through a test sections map, honouring `scope`.
- [x] The default source works with the starter collection with no mapping.

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code: new shared-content block). Helper: agy (Argon, its default).

**2026-11-09 Orchestrator:** Done in f814e9c and merged to master. `pricing` block (variants `tiers`, `toggle`, `single`; `scope`), the `PricingTier` shape, the starter pricing collection and `createPricingSource`. Shared logic moved into `createCollectionSource` in core (paging, group matching, cache hints, injectable query), which testimonials now uses too. `pricing.starter` wired when 02 merged. For 08: the site's `pricing` collection matches the starter's fields except its group reference is `service`, so `createPricingSource({ groupField: 'service' })` reads it directly.
