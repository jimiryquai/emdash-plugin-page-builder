# 22-6f8475dd: Support Astro 7 so sites can take the critical Astro security fix

**Spec:** none.

**What to build:**

Astro 6.4.8 (this package's dev pin, and jamesryan-sites') has a critical advisory, "Remote code execution through AVIF image optimization", patched only in Astro >=7.2.8 (latest 7.4.11, 2026-11-12). Sites can't upgrade while this package's peer range is `astro ^6.4.8`. Widen the peer to `^6.4.8 || ^7.2.8`, move the dev pins to Astro 7 (and EmDash 1.5.0 if the site moves with it; its peer is `astro >=6`), fix anything the Astro 7 upgrade breaks (`astro check`, the PageBuilder component tests, the packed-tarball consumer test), and release 0.3.0 through a GitHub release. Read Astro 7's upgrade guide first and record what affected us in a comment. The jamesryan-sites upgrade (with `@astrojs/cloudflare` 14, which needs `astro ^7.4`) is that repo's ticket.

**Blocked by:** none.

**Status:** in progress

- [ ] The peer range accepts Astro 6.4.8+ and 7.2.8+, and a consumer test installs the packed tarball against Astro 7.
- [ ] Dev pins are on Astro 7 and `rm -rf dist && npm ci && npm run check` passes.
- [ ] `npm audit` shows no critical advisory from Astro.
- [ ] Release 0.3.0 is published from a GitHub release with provenance.

## Comments

**2026-11-12 Orchestrator:** Raised by James ("the version of astro we are using seems to have a really bad security score ... needs doing", not urgent). Risk: high (npm publish).
