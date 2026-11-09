# 16-fa7db037: Make the apply CLI run through a symlinked bin

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Ticket 08 found the apply CLI exits 0 with no output when run through pnpm's `node_modules/.bin` symlink: `src/cli/main.ts`'s entry guard compares `import.meta.url` with `process.argv[1]`, which is the symlink, so the guard never runs the CLI. Compare real paths instead (resolve `process.argv[1]` with `fs.realpathSync`), keeping importing the module free of side effects. Prove it the way sites run it: pack the package, install the tarball in a temp consumer (as `test/blocks/package.test.js` does), and run `node_modules/.bin/emdash-page-builder apply` with no token; it must print the JSON missing-token error and exit nonzero.

Added 2026-11-09 by the orchestrator: ticket 08 showed a site must choose which blocks editors can insert. The site maps sections for some blocks only; `--field` today allows every block the package exports, so editors could add blocks the site can't render.

**Blocked by:** none.

**Status:** done

- [x] Running the CLI through an installed package's `.bin` symlink prints its JSON output (the missing-token error with no token) and exits nonzero, in a test that runs in `npm run check`.
- [x] Importing `src/cli/main.ts` still runs nothing.
- [x] `--types <slug,...>` limits what `--field` adds to a blocks field's `allowedTypes` (and what the plan registers) to the listed block types, erroring on an unknown slug; without it, behaviour is unchanged.

## Comments

**2026-11-09 Orchestrator:** Risk: medium (package code and checks). Helper: pi (default model).

**2026-11-09 Orchestrator:** Done in a093907 and 4bfadde, merged to master (af485b8). The entry guard compares the real path of `process.argv[1]`, so the CLI runs through pnpm's `.bin` symlink; a test installs the packed tarball and runs the bin. `--types <slug,...>` limits the plan, `--field`'s allowedTypes and the starters to the listed blocks, rejecting an unknown slug before any request.
