# 10-b8f04e43: Define the faq block

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Define the shared-content `faq` block on `createCollectionSource`: a `Faq` shape (question, answer) from the site's `faqs` collection, `scope`, `count`, a starter collection and default source, and `starter` set. Variants from jamesryan-sites' `apps/marketing-site/src/plugins/marketing-blocks/index.ts` and `src/components/blocks/FAQ.astro`. Follow the block-module pattern in `src/blocks/types/` and CODING_STANDARDS.md; read the source component read-only.

**Blocked by:** none

**Status:** done

- [x] The block renders FAQs from a source through a test sections map for every variant, honouring scope and count.
- [x] The default source works with the starter collection with no mapping.

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code: new block type). Helper: pi (default model).

**2026-11-09 Orchestrator:** Done in d604fdc and 9e6d064, merged to master (c6a9e72) with no fix round. Shared-content `faq` block on `createCollectionSource`: the `Faq` shape (question, answer), variants `two-column` and `centered`, `scope` and `count`, a starter `faqs` collection and `createFaqSource`, `starter` set.
