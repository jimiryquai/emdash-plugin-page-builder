# 02-1daf711c: Build the apply CLI

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Build the apply CLI described in the spec's "The apply CLI" section: read the site's schema through EmDash's REST API (Bearer `EMDASH_TOKEN`, site URL as an argument), compare it with the package's block definitions, and print a JSON plan. `--apply` performs it, `--activate` and `--migrate` handle breaking versions in EmDash's order, `--table` prints a human view, and a flag adds the block types to a named `blocks` field's `allowedTypes`. Starter collections are applied only on request. Confirm the exact schema operations from `GET /_emdash/api/openapi.json` before coding. The HTTP boundary is injectable; tests use a fake site.

**Blocked by:** 01-e1a022b4

**Status:** ready-for-agent

- [ ] Plan output lists each block type and version as create, activate, migrate or unchanged, as JSON by default.
- [ ] A second `--apply` against the fake site reports no changes.
- [ ] A breaking version is created inactive and isn't activated without `--activate`; `--migrate` preserves each block's `_key`.
- [ ] An EmDash error surfaces the operation, error code and message, and the CLI exits non-zero.
- [ ] Tests never touch a real site.

## Comments
