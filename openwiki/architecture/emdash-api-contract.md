---
type: architecture
title: EmDash API client and field-contract port
description: The CLI's HTTP boundary to an EmDash site (EmdashClient over an injectable Transport) and its port of EmDash's block-field contract rules — canonicalisation, fingerprints and compatible-versus-breaking field changes.
tags: [cli, emdash, http-client, schema-contract]
verified:
  - by: openwiki/0.9.0
    at: 2026-11-13T16:16:20.656Z
sources:
  - id: openwiki-source-4fe029403e1c15f1db22bb11
    resource: repo://src/cli/client.ts
  - id: openwiki-source-6f43ce95a02456a19df0688a
    resource: repo://src/cli/contract.ts
generated: { by: "claude-code", at: "2026-11-13T16:16:20.656Z" }
---

# EmDash API client and field-contract port

## Responsibility

Two modules own how the apply CLI sees an EmDash site:

- `src/cli/client.ts` — `EmdashClient`, the single HTTP boundary. Every request the CLI makes goes through it, over an injectable `Transport`, so tests supply a fake site and no request can reach the network (CODING_STANDARDS rule 7).
- `src/cli/contract.ts` — a faithful port of EmDash's own block-field contract rules, needed to decide what counts as a compatible versus breaking field change and to reproduce EmDash's version fingerprints client-side.

`src/cli/types.ts` holds only what the CLI itself owns (remote report shapes, the plan); domain types come from the blocks core and `emdash`.

## The transport and error model

<!-- openwiki: broken internal link [/openwiki/workflows/apply-cli.md] link "/openwiki/workflows/apply-cli.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
A `Transport` is a fetch-like function from `{ method, path, query, body }` to `{ status, json }`, where `path` starts at `/_emdash/api`. The default `fetchTransport(siteUrl, token)` strips trailing slashes from the site URL, sends `content-type: application/json`, and — when a token exists — `authorization: Bearer <token>` (the token comes from `EMDASH_TOKEN` or `--token`; see [The apply CLI](/openwiki/workflows/apply-cli.md)).

Every call goes through `EmdashClient.#request`, which unwraps EmDash's `{ success, data, error }` envelope. A call fails unless the HTTP status is 2xx (exactly 201 when a create is expected) **and** `success === true`; anything else throws `EmdashError`, which carries `operation` (the human phrase naming the call, e.g. `update block type hero`), `status`, the server's `code` and `message`, and optional `blockType`/`version` so error output locates the failing operation. The CLI wraps this into its JSON `{"errors": [...]}` payload.

## Endpoints

| Operation | Endpoint | Notes |
| --- | --- | --- |
| List block types | `GET /_emdash/api/schema/block-types` | Returns the site's types with versions and fingerprints. |
| Create block type | `POST /_emdash/api/schema/block-types` | Creates at v1, active; expects 201. Body is the seed definition's metadata plus v1 fields. |
| Update block type | `PUT /_emdash/api/schema/block-types/{slug}` | `breaking: true` asks for a new (inactive) version; EmDash may update in place instead. |
| Activate version | `POST /_emdash/api/schema/block-types/{slug}/versions/{version}/activate` | `expectedFingerprint` is the fingerprint of the currently **active** version, not the target — a concurrent-change guard. |
| List collections | `GET /_emdash/api/schema/collections` (+ per-collection `GET .../{slug}?includeFields=true`) | The list endpoint carries no fields, so `listCollections` fetches each collection's detail to attach fields. |
| Create collection / field | `POST .../collections`, `POST .../collections/{slug}/fields` | One field at a time; used for starter collections. Expects 201. |
| Update collection / field | `PUT .../collections/{slug}`, `PUT .../collections/{slug}/fields/{fieldSlug}` | e.g. set `titleField` after its field exists, or extend a blocks field's `allowedTypes`. |
| List content | `GET /_emdash/api/content/{collection}?page=&limit=&status=all` | Paged (default 100) with `status=all`; drives the stale-block migration scan. |
| Migrate entry blocks | `PUT /_emdash/api/content/{collection}/{id}` with `migrateBlocks: true` | EmDash's one supported way to move a stored block to the active version; preserves `_key` and validates against the target schema. Carries `_rev` so a lost update surfaces as a conflict. |

## The ported field contract

EmDash 1.4.0 does not export its schema-contract helpers from the package root (they live in its internal `#schema` module), so `contract.ts` carries a port of `emdash/src/schema/block-type-contract.ts`:

- **Canonicalisation** — recursively sorts object keys and drops `undefined` values, so key order and absent-versus-undefined never matter.
- **Contract projection** — each field reduces to `{ slug, type, required (default false), defaultValue?, validation?, options? }`; absent keys are omitted.
- **Fingerprints** — `fingerprintBlockFields(fields)` hashes the canonical JSON with SHA-256 (WebCrypto) into `block-type:v1:sha256:<hex>` — the same digest EmDash uses for its version fingerprints. `blockFieldsEqual` compares canonical strings for plan idempotency.
- **Compatibility** — `compareBlockFields(before, after)` classifies each difference: removing a field, adding a required field, changing a type, tightening a bound, or removing an allowed option is **breaking**; adding an optional field, relaxing a constraint, or adding options is **compatible**. Repeater `subFields` recurse.

This is what lets `buildPlan` reject a declared version N that isn't breaking against N−1 before anything reaches the site, and what lets the plan decide "fields changed on the current version" (in-place update) versus a new version. EmDash remains the authority: a PUT with `breaking: true` still only creates a new version when EmDash's own comparison finds the change incompatible ([EmDash decides breaking changes](../../../docs/lessons/emdash-decides-block-breaking-changes.md)) — the CLI checks each PUT's response for that reason.

**Drift risk.** The port is pinned to emdash 1.4.0's behaviour. The tests compare against the same port, so drift between the port and a future EmDash release would be caught only by the response checks in `executePlan`; the module's header notes that if a later emdash release exports these helpers, the CLI should switch to them.

## Relationship to the rest of the CLI

<!-- openwiki: broken internal link [/openwiki/workflows/apply-cli.md] link "/openwiki/workflows/apply-cli.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [/openwiki/architecture/versioning-and-migrations.md] link "/openwiki/architecture/versioning-and-migrations.md" is root-absolute, which no real consumer resolves against the repository root (not a coding agent reading the page, not GitHub's Markdown renderer, not a local viewer); use a path relative to this file instead. Fix the href or restore the target, then delete this comment. -->
`main.ts` constructs one `EmdashClient` and hands it to `plan.ts` (pure, no HTTP — compares definitions against the site's reported schema) and `apply.ts` (executes, activates, scans and migrates). See [The apply CLI](/openwiki/workflows/apply-cli.md) for that flow, and [Versioning and migrations](/openwiki/architecture/versioning-and-migrations.md) for the create-activate-migrate order these endpoints serve.
