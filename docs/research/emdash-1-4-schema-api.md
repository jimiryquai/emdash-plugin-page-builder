# EmDash 1.4 schema and content API, as the apply CLI uses it


Established 2026-11-09 from the installed `emdash` 1.4.0 source while building the apply CLI (ticket v1/02), not from a live site. Two additions since: EmDash itself decides whether a block change is breaking (see [the lesson](../lessons/emdash-decides-block-breaking-changes.md)), and starter collections are created without fields, then each field through `POST /_emdash/api/schema/collections/{slug}/fields`.
Established from the installed `node_modules/emdash` source (emdash 1.4.0, exact
dev pin) — no live site was contacted. File paths below are relative to
`node_modules/emdash/src/`.

All routes are mounted under `/_emdash/api` (confirmed by the route-file doc
comments, e.g. `astro/routes/api/schema/block-types/index.ts`, and the auth
middleware's path list in `astro/middleware/auth.ts`). Auth is a Bearer API
token resolved by `astro/middleware/auth.ts` (`resolveApiToken`). Success
envelope: `{ success: true, data }`; failure: `{ success: false, error:
{ code, message, details? } }` (`api/error.ts`, `apiError`).

## List block types

- `GET /_emdash/api/schema/block-types` — `schema:read`.
- Response `data.items`: array of `blockTypeSchema` (`api/schemas/schema.ts`):
  `{ id, slug, label, description?, icon?, category?, currentVersion, source,
  versions: [{ id, blockTypeId, version, fields, fingerprint, active,
  unsupportedTypes? }] }`.
- Source: `astro/routes/api/schema/block-types/index.ts` → `api/handlers/block-types.ts`
  `handleBlockTypeList`.

## Create block type

- `POST /_emdash/api/schema/block-types` — `schema:manage`, returns 201.
- Body `createBlockTypeBody` (`api/schemas/schema.ts`): `{ slug, label,
  description?, icon?, category?, fields: BlockFieldDefinition[] }` (strict).
- Semantics (`schema/block-type-registry.ts` `createBlockType`): always creates
  **version 1 and makes it current**. Fields per `blockFieldDefinitionSchema`:
  `{ slug, label, type, required?, defaultValue?, validation?, options? }`;
  `type` ∈ {string, text, url, number, integer, boolean, datetime, select,
  multiSelect, portableText, image, file, repeater}.
- Error codes: `BLOCK_TYPE_EXISTS` (409-ish handler error).

## Create a new (breaking) version, or update the current one in place

- `PUT /_emdash/api/schema/block-types/{slug}` — `schema:manage`.
- Body `updateBlockTypeBody`: `{ expectedFingerprint, label?, description?,
  icon?, category?, fields?, breaking? }` (strict).
- `expectedFingerprint` is checked against the **currently active** version's
  fingerprint (`CONFLICT` otherwise).
- With `breaking: true` and incompatible fields, the registry inserts version
  `max(versions) + 1` **inactive** — `current_version` is untouched (only the
  separate activate call changes it). Exactly one new version per call.
- With compatible (or identical) fields, the current version is updated in
  place; a change the server deems breaking without `breaking: true` returns
  `BLOCK_TYPE_BREAKING_CHANGE`.
- Source: `schema/block-type-registry.ts` `updateBlockType`.

## Activate a version

- `POST /_emdash/api/schema/block-types/{slug}/versions/{version}/activate` —
  `schema:manage`.
- Body `{ expectedFingerprint }` — again the **active** version's fingerprint
  (`activateVersion`, `block-type-registry.ts`).
- Only versions that already exist can be activated
  (`BLOCK_TYPE_VERSION_CONFLICT`).

## Migrate stored blocks

There is no dedicated schema-level "migrate blocks" REST endpoint. EmDash's
supported path is the content write: a block's `_version` may change only in a
content update that carries `migrateBlocks: true`, only to the type's
**current (active)** version; `_key` is preserved when the block already has
one (`schema/block-values.ts`, `normalizeBlockArray`: `key =
options.replaceBlocks ? ulid() : rawBlock._key ?? ulid()`).

- `GET /_emdash/api/content/{collection}?page=&limit=&status=all` —
  `content:read`; `data.items[]`, each entry `{ id, slug, status, data, _rev }`
  (`api/handlers/content.ts` `handleContentList`; page param from
  `api/schemas/content.ts` `contentListQuery`).
- `PUT /_emdash/api/content/{collection}/{id}` — body `contentUpdateBody`:
  `{ data?: { fieldSlug: value }, migrateBlocks?: boolean, ... }`
  (`astro/routes/api/content/[collection]/[id].ts`).

So the CLI's `--migrate` reads each affected entry, bumps each stale block's
`_version` to the definition's current version, and PUTs the whole field value
back with `migrateBlocks: true`; `_key` and sibling blocks are untouched.

## Add block types to a blocks field's `allowedTypes`

- `GET /_emdash/api/schema/collections` — list without fields;
  `GET /_emdash/api/schema/collections/{slug}?includeFields=true` — one
  collection with `fields[]` (`astro/routes/api/schema/collections/[slug]/index.ts`;
  `fieldSchema` carries `validation.allowedTypes`).
- `PUT /_emdash/api/schema/collections/{slug}/fields/{fieldSlug}` — `schema:manage`,
  body `updateFieldBody`: `{ validation?: { allowedTypes?: string[] } | null }`
  (validation replaces wholesale, so the existing validation is read first and
  resent with the merged `allowedTypes`).

## Create collections (starter collections, `--collections`)

- `POST /_emdash/api/schema/collections` — `schema:manage`, 201, body
  `createCollectionBody` (strict): `{ slug, label, labelSingular?, description?,
  icon?, admin?, supports?, source?, urlPattern?, routable?, hasSeo?, hidden?,
  sortOrder?, editLocking?, group? }`. **It carries no fields** — a body with
  `fields` fails the strict parse (source: `api/schemas/schema.ts`
  `createCollectionBody`).
- `POST /_emdash/api/schema/collections/{slug}/fields` — `schema:manage`, 201,
  body `createFieldBody`: `{ slug, label, type, required?, unique?,
  defaultValue?, validation?, widget?, options?, sortOrder?, searchable?,
  indexed?, translatable? }` (source: `astro/routes/api/schema/collections/[slug]/fields/index.ts`,
  which parses with `createFieldBody` and returns 201). One field per call, so
  a starter collection's fields follow its collection creation one by one.
- `PUT /_emdash/api/schema/collections/{slug}` — `updateCollectionBody`
  includes `titleField`, so the title column is set once its field exists
  (source: `astro/routes/api/schema/collections/[slug]/index.ts`).

## Notes / gaps

- Old **inactive** stored versions whose fields differ from the definition
  cannot be rewritten through the REST API (PUT only updates the active
  version); the CLI reports this as a plan warning instead of acting.
- The seed-only `applySeedBlockType` (multi-version in one call) has no REST
  route; the CLI composes create + breaking PUTs + activate instead.
- Body-field migration data shaping (renames etc.) is not possible through
  these endpoints: the CLI bumps `_version` only and lets EmDash validate the
  stored data against the target version. If a definition's breaking version
  renames a field, stored values for it are dropped by EmDash's schema parse —
  flagged for James under Needs Ryan (the package's own migration functions,
  owned by ticket 03, may have to run through a different write path).
