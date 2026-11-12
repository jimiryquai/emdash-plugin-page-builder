# 22-6f8475dd: Support Astro 7 so sites can take the critical Astro security fix

**Spec:** none.

**What to build:**

Astro 6.4.8 (this package's dev pin, and jamesryan-sites') has a critical advisory, "Remote code execution through AVIF image optimization", patched only in Astro >=7.2.8 (latest 7.4.11, 2026-11-12). Sites can't upgrade while this package's peer range is `astro ^6.4.8`. Widen the peer to `^6.4.8 || ^7.2.8`, move the dev pins to Astro 7 (and EmDash 1.5.0 if the site moves with it; its peer is `astro >=6`), fix anything the Astro 7 upgrade breaks (`astro check`, the PageBuilder component tests, the packed-tarball consumer test), and release 0.3.0 through a GitHub release. Read Astro 7's upgrade guide first and record what affected us in a comment. The jamesryan-sites upgrade (with `@astrojs/cloudflare` 14, which needs `astro ^7.4`) is that repo's ticket.

**Blocked by:** none.

**Status:** done

- [x] The peer range accepts Astro 6.4.8+ and 7.2.8+, and a consumer test installs the packed tarball against Astro 7.
- [x] Dev pins are on Astro 7 and `rm -rf dist && npm ci && npm run check` passes.
- [x] `npm audit` shows no critical advisory from Astro.
- [x] Release 0.3.0 is published from a GitHub release with provenance.

## Comments

**2026-11-12 Orchestrator:** Raised by James ("the version of astro we are using seems to have a really bad security score ... needs doing", not urgent). Risk: high (npm publish).

**2026-11-12 Orchestrator:** Done. Built by Copilot (GPT-6 Luna) in 9acffb7, plus fix round b79c2ca (my finding: EmDash goes back to 1.4.0, the site's version, not the day-old 1.5.0). Merged as c36d8f3.
- Peer range `astro ^6.4.8 || ^7.2.8`. Dev pins: Astro 7.4.4 (newest release at least two weeks old), EmDash 1.4.0.
- The packed consumer test installs from the registry against Astro 6.4.8 and Astro 7.4.4, both with EmDash 1.4.0. Each version is read from package.json.
- My clean check: 126/126 pass, 0 type errors. CI is green.
- Released v0.3.0 through a GitHub release. npm `latest` is 0.3.0, with SLSA provenance.
- `npm audit` shows 0 critical. 6 high come from EmDash 1.4.0's `zod`, a dev-only path; the package ships no dependencies. They clear when the site moves to EmDash 1.5 (site ticket 25).
- Astro 7 upgrade-guide items that touch this package: Vite 8, stricter compiler validation, whitespace compression, and the reserved `src/fetch.ts` name. None needed a change here.
