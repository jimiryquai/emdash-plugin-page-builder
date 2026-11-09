# Coding standards

Apply these rules to added or changed code. Each rule names its design principle (James's design principles, kept in his private agent-workflow repo at `docs/design-principles.md`) or links to this repo's ADRs, and names an example where one exists yet. Rules marked *(first example due in ticket NN)* bind that ticket.

1. **Build for Node and bundlers.** The library build (`tsconfig.build.json`) uses `NodeNext`, so relative imports in `src/` carry `.js` extensions. Sites import the package through Vite, but tests and the apply CLI run in plain Node. Example: `tsconfig.build.json`.

2. **Peers as ranges, development pins exact.** `peerDependencies` take a caret range from the oldest version the package supports (`emdash ^1.4.0`); `devDependencies` pin the exact version the checks run against. A site on a later patch has to be able to install the package. Example: `package.json`.

3. **One module per block type.** A block type's fields, every numbered version, its migrations, its variant vocabulary and its description all live in one module. The apply CLI, the block layer and tests import from that module and never restate a field or variant. Principle: deep modules and one source of truth; [ADR 0002](docs/adr/0002-fixed-variant-vocabulary.md). *(First example due in ticket 03.)*

4. **No site knowledge in the package.** Collection names, the grouping collection, field mappings and visual components come in as inputs (sources, sections, config). `src/` never names `services`, `@jamesryan/ui` or any one site's collections, except as the documented defaults of the starter collections. Principle: configuration and derived defaults; [ADR 0001](docs/adr/0001-package-owns-data-sites-own-collections-and-visuals.md). *(First example due in ticket 06.)*

5. **Migrations are pure and keep `_key`.** A migration is a pure function from one version's stored block to the next. It keeps `_key`, sets `_version`, and has a test per version step. The same function serves stored-content migration and render-time upgrade. Principle: one source of truth. *(First example due in ticket 03.)*

6. **CLI: plan by default, JSON first.** Commands print JSON on stdout for success and failure, with errors as `{"errors": [{"message": …}]}` plus fields that locate the problem (block type, version, EmDash error code). Failure sets a nonzero exit code. `--table` gives a human view of the same result. Nothing writes to a site without `--apply`, and results name what changed so a caller can verify it. Keep logic importable: put argument handling behind an entry-point guard, so importing the module runs nothing. Principle: agent-native interfaces. *(First example due in ticket 02.)*

7. **Fake EmDash in tests.** Code that calls EmDash's REST API takes an injectable HTTP client. Tests supply a fake site from the first red run and never reach a real site or token. Principle: deep modules. *(First example due in ticket 02.)*

8. **Test the package as sites get it.** Tests of public behaviour import through the package's `exports` (`emdash-plugin-page-builder/blocks`), not through relative `src/` paths, so a broken build or exports map fails a test. A change to what the package ships (`exports`, `files`, `.astro` components) is proven against the packed tarball installed in a consumer. Example: `test/blocks.test.js`.

9. **No telemetry.** Every script that runs a tool with telemetry switches it off in the script itself (`ASTRO_TELEMETRY_DISABLED=1`). A new dependency is checked for telemetry before it's added, and the check is stated in the ticket or commit. Example: `package.json` `typecheck`.
