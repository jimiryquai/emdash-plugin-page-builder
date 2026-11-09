# 01-e1a022b4: Scaffold the package and its blocks entry

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Set up the package for its first entry point: TypeScript, Astro component exports, an `exports` map with a `blocks` entry (the plugin entry comes later, so leave room for it but don't stub it), a test runner and a `check` script. Pin `emdash` 1.4.0 and `astro` to the versions jamesryan-sites uses, as peer dependencies. Check every new dev dependency for telemetry and switch it off.

**Blocked by:** none.

**Status:** done

- [x] `npm run check` typechecks and runs tests, and passes on an empty test suite plus one smoke test importing the `blocks` entry.
- [x] `package.json` `exports` exposes only the `blocks` entry.
- [x] No dependency sends telemetry (state which were checked in the PR).

## Comments

**2026-11-09 Orchestrator:** Risk: medium (no docs/agents/review.md; scaffold with new dependencies). Helper: codex.
**2026-11-09 Orchestrator:** Done in 0f6e70e and fix round 0d8812d, merged in 736cbdf. Package scaffold: TypeScript (NodeNext build to `dist`), `astro check` typecheck, Node test runner with a packed-entry smoke test, a single `./blocks` export, peers `astro ^6.4.8` / `emdash ^1.4.0` with exact dev pins. Telemetry checked: astro (disabled in its script and machine-wide), emdash, @astrojs/check, typescript (tsserver only, unused), mcporter unchanged. Review fixes: peer ranges, NodeNext build, self-sufficient `npm test`, clearer telemetry evidence. Shipping `.astro` components moved to ticket 03 as a box.
