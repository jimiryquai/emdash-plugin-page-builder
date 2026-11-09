# 10-b8f04e43: Define the faq block

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Define the shared-content `faq` block on `createCollectionSource`: a `Faq` shape (question, answer) from the site's `faqs` collection, `scope`, `count`, a starter collection and default source, and `starter` set. Variants from jamesryan-sites' `apps/marketing-site/src/plugins/marketing-blocks/index.ts` and `src/components/blocks/FAQ.astro`. Follow the block-module pattern in `src/blocks/types/` and CODING_STANDARDS.md; read the source component read-only.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] The block renders FAQs from a source through a test sections map for every variant, honouring scope and count.
- [ ] The default source works with the starter collection with no mapping.

## Comments
