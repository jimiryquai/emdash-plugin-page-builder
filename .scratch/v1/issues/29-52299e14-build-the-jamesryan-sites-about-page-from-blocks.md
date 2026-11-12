# 29-52299e14: Build the jamesryan-sites About page from blocks

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

The About page's body is template code (`apps/marketing-site/src/pages/about.astro`, or the shared `PublishedPage` with no layout), not Content, so ticket 14 left it as the fallback when its Layout is empty. Toward "the whole site built from blocks" (James): decide which existing blocks express it, or which block a gap needs, then move it into Layout so it looks the same and the template keeps no hand-written body. Triage first: list each section of the page against the ten block types and name any gap.

**Blocked by:** 14-d910a4dc

**Status:** done (triage complete; implementation parked in `.scratch/backlog.md` per James)

- [x] A triage comment maps each section of the About page to a block type or names the gap.

## Comments

**2026-11-12 Orchestrator:** Raised with James's go-ahead alongside the posts block.

**2026-11-12 Codex orchestrator:** Triage at site feat/14-layout-only 1e1f057: the portrait, social links, headline, lead, biography paragraphs and About Me list form one responsive two-column profile. prose holds the biography paragraphs/list, hero holds some headline/image/link data, and team represents shared member cards; none of the ten existing block types preserves this composition and social-link labels. Gap: a profile/biography block with image, labelled links and rich text, with visuals owned by the site. Keep existing copy and responsive layout. This is a mapping only; implementation waits for 14 and a follow-up scope.

**2026-11-12 Antigravity orchestrator:** James decided to leave About's fallback template as-is for now and redesign it later using layout blocks (low priority); parked in `.scratch/backlog.md`.
