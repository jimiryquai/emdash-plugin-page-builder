# 06-f40708c4: Define the testimonials block with shapes, sources and scope

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Define the `testimonials` block type and the shared-content machinery: the `Testimonial` shape, the `source` interface (a typed function from a site's entries to a shape), `scope: page | all` with the page's group reference (`page` falls back to `all` when no group is configured), and `count`. Ship the starter testimonials collection definition with its default source. See spec "What each site owns" and ADR 0001.

**Blocked by:** 03-48a1daa0

**Status:** ready-for-agent

- [ ] A test site's source maps its own collection to `Testimonial`, and renaming a field in that collection's type fails typecheck.
- [ ] `scope: page` returns only entries in the page's group; `all` returns every entry; with no group configured, `page` behaves as `all`.
- [ ] `count` limits the entries.
- [ ] The default source works with the starter collection with no mapping.

## Comments
