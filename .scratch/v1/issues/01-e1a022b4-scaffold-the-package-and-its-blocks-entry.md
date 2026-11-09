# 01-e1a022b4: Scaffold the package and its blocks entry

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Set up the package for its first entry point: TypeScript, Astro component exports, an `exports` map with a `blocks` entry (the plugin entry comes later, so leave room for it but don't stub it), a test runner and a `check` script. Pin `emdash` 1.4.0 and `astro` to the versions jamesryan-sites uses, as peer dependencies. Check every new dev dependency for telemetry and switch it off.

**Blocked by:** none.

**Status:** ready-for-agent

- [ ] `npm run check` typechecks and runs tests, and passes on an empty test suite plus one smoke test importing the `blocks` entry.
- [ ] `package.json` `exports` exposes only the `blocks` entry.
- [ ] No dependency sends telemetry (state which were checked in the PR).

## Comments
