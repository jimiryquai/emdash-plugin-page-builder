# 06-f40708c4: Define the testimonials block with shapes, sources and scope

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Define the `testimonials` block type and the shared-content machinery: the `Testimonial` shape, the `source` interface (a typed function from a site's entries to a shape), `scope: page | all` with the page's group reference (`page` falls back to `all` when no group is configured), and `count`. Ship the starter testimonials collection definition with its default source. See spec "What each site owns" and ADR 0001.

**Blocked by:** 03-48a1daa0

**Status:** done

- [x] A test site's source maps its own collection to `Testimonial`, and renaming a field in that collection's type fails typecheck.
- [x] `scope: page` returns only entries in the page's group; `all` returns every entry; with no group configured, `page` behaves as `all`.
- [x] `count` limits the entries.
- [x] The default source works with the starter collection with no mapping.

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code: new block types, compatible). Helper: pi.

**2026-11-09 Orchestrator:** Done in 69f9fee, merge 61d3f7c and fix round daa0dcf, merged to master. `testimonials` block (variants `single`, `grid`, `split`; `scope`, `count`), the `Testimonial` shape, typed `Source<T>` returning items or `{ items, cacheHints }`, `scopeField`/`countField` in core, the starter testimonials collection (`starterTestimonialsCollection(groupCollection)`) and `createTestimonialsSource` with an injectable query API. Review fixes: one home for `count`, cursor paging in page scope, EmDash cache hints applied to `Astro.cache` by `<PageBuilder>`, a third layout, clearer docs. Known cost: page scope reads each entry's references separately (EmDash exposes references per entry only).
