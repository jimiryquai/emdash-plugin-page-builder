# 14-d910a4dc: Retire marketing-blocks on the jamesryan-sites marketing site

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

On jamesryan-sites' marketing site, once every page renders from `layout` with page builder blocks proven live: migrate each remaining Portable Text marketing block into `layout` with a script, then remove the marketing-blocks plugin and its components. Production writes need James's approval.

**Blocked by:** 08-a3332f54, 09-5c2ec46b, 10-b8f04e43, 11-c13d8c40, 12-de8f654a, 13-4f5bb821

**Status:** ready-for-agent

- [ ] Every page renders from `layout` locally and the same as before.
- [ ] marketing-blocks and its components are removed and the site's checks pass.
- [ ] Production content was migrated with James's approval (needs James).

## Comments
