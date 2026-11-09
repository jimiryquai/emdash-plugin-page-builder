# 02-1daf711c: Build the apply CLI

**Spec:** [docs/specs/v1-page-builder.md](../../../docs/specs/v1-page-builder.md)

**What to build:**

Build the apply CLI described in the spec's "The apply CLI" section: read the site's schema through EmDash's REST API (Bearer `EMDASH_TOKEN`, site URL as an argument), compare it with the package's block definitions, and print a JSON plan. `--apply` performs it, `--activate` and `--migrate` handle breaking versions in EmDash's order, `--table` prints a human view, and a flag adds the block types to a named `blocks` field's `allowedTypes`. Starter collections are applied only on request. Confirm the exact schema operations from `GET /_emdash/api/openapi.json` before coding. The HTTP boundary is injectable; tests use a fake site.

**Blocked by:** 01-e1a022b4

**Status:** done

- [x] Plan output lists each block type and version as create, activate, migrate or unchanged, as JSON by default.
- [x] A second `--apply` against the fake site reports no changes.
- [x] A breaking version is created inactive and isn't activated without `--activate`; `--migrate` preserves each block's `_key`.
- [x] An EmDash error surfaces the operation, error code and message, and the CLI exits non-zero.
- [x] Tests never touch a real site.

## Comments

**2026-11-09 Orchestrator:** Risk: high (writes to a live EmDash site through --apply/--activate/--migrate). Helper: pi (GLM 5.3).

**2026-11-09 Orchestrator:** Approved by James and merged to master, after fix rounds c773c30/b94d232 and f29a839. `emdash-page-builder apply <site>`: plans by default (JSON, `--table`), `--apply` writes, `--activate` and `--migrate` handle breaking versions in EmDash's order, `--field` extends a blocks field's `allowedTypes`, `--collections --group <collection>` creates starter collections from `BlockType.starter`. Block set derived from the package exports. EmDash's breaking rules ported (`src/cli/contract.ts`) and checked at plan time; migrations run the block chain; content writes carry `_rev`. Cross-family review: `.orchestrate/runs/2026-11-09-feat-02-apply-cli/evidence/cross-family-review.md`. At merge `pricing.starter` was wired and two tests' derived lists gained pricing.
