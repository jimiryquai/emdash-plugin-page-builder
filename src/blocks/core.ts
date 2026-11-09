import type { ApplySeedBlockTypeInput, BlockFieldDefinition, CacheHint } from 'emdash';
import { getEmDashCollection, getEmDashEntry } from 'emdash';

export const VARIANT_FIELD_SLUG = 'variant';

/** Build the shared select field from a block's fixed variant vocabulary. */
export function variantField(variants: readonly string[]): BlockFieldDefinition {
  return {
    slug: VARIANT_FIELD_SLUG,
    label: 'Variant',
    type: 'select',
    validation: { options: [...variants] },
  };
}

export const SCOPE_FIELD_SLUG = 'scope';
export const SCOPES = ['page', 'all'] as const;

/** Build the shared scope select for shared-content blocks. */
export function scopeField(): BlockFieldDefinition {
  return {
    slug: SCOPE_FIELD_SLUG,
    label: 'Scope',
    type: 'select',
    defaultValue: 'all',
    validation: { options: [...SCOPES] },
  };
}

export const COUNT_FIELD_SLUG = 'count';

/** Build the shared count field for shared-content blocks. */
export function countField(options: { min?: number; max?: number } = {}): BlockFieldDefinition {
  return {
    slug: COUNT_FIELD_SLUG,
    label: 'Count',
    type: 'integer',
    validation: { min: options.min ?? 1, max: options.max ?? 24 },
  };
}

/** Union of every hint a source read, for the page's `Astro.cache`. */
export function mergeCacheHints(hints: readonly CacheHint[]): CacheHint {
  const tags = new Set<string>();
  let lastModified;
  for (const hint of hints) {
    for (const tag of hint.tags ?? []) tags.add(tag);
    if (hint.lastModified && (!lastModified || hint.lastModified > lastModified)) {
      lastModified = hint.lastModified;
    }
  }
  return tags.size || lastModified ? { tags: [...tags], lastModified } : {};
}

export interface StoredBlock {
  _type: string;
  _version: number;
  _key: string;
  [field: string]: unknown;
}

/** A block module owns the seed definition and every upgrade step. */
export interface BlockType {
  definition: ApplySeedBlockTypeInput & { description: string };
  variants: readonly string[];
  /** Keyed by the version being upgraded; each step returns version N + 1. */
  migrations: Readonly<Record<number, (block: Readonly<StoredBlock>) => StoredBlock>>;
}

export type Section = (props: { value: StoredBlock; index: number; blockKey: string; items?: readonly unknown[] }) => unknown;

export interface Sections {
  default: Section;
  [variant: string]: Section;
}

/** Sites attach their sections to each package block module. */
export interface SiteBlockType extends BlockType {
  sections: Sections;
}

/** What a source read: its items plus the cache hints of everything it queried. */
export interface SourceResult<T = unknown> {
  items: readonly T[];
  cacheHints?: readonly CacheHint[];
}

/** Narrow a source's return to the result form (Array.isArray cannot narrow readonly arrays). */
export function isSourceResult<T>(value: SourceResult<T> | readonly T[]): value is SourceResult<T> {
  return !Array.isArray(value);
}

/** A site's typed mapping from its collection's entries to a shape. */
export type Source<T = unknown> = (
  context: {
    scope: 'page' | 'all';
    group?: string;
    count?: number;
  },
) => SourceResult<T> | readonly T[] | Promise<SourceResult<T> | readonly T[]>;

export const GROUP_FIELD_SLUG = 'group';

/** One entry of a collection, as the query API returns it. */
export interface CollectionEntry {
  id: string;
  data: Record<string, unknown>;
  /** One page per reference field the query asked for, by field slug. */
  references?: Readonly<Record<string, { entries: readonly CollectionEntry[] }>>;
}

/** One page of a collection query, as the query API returns it. */
export interface QueryListResult {
  entries: readonly CollectionEntry[];
  nextCursor?: string;
  cacheHint?: CacheHint;
  error?: unknown;
}

/**
 * The supported runtime query API, injectable so tests use a fake
 * (CODING_STANDARDS rule 7). The default wraps EmDash's query functions.
 */
export interface QueryApi {
  list(
    collection: string,
    filter?: { limit?: number; cursor?: string },
  ): Promise<QueryListResult>;
  get(
    collection: string,
    id: string,
    options?: { references: Record<string, true> },
  ): Promise<{ entry?: CollectionEntry | null; cacheHint?: CacheHint; error?: unknown }>;
}

export interface CollectionSourceOptions {
  collection?: string;
  groupField?: string;
  query?: QueryApi;
}

const emdashQuery: QueryApi = {
  async list(collection, filter) {
    // The public shape (entries, error, cursors, cacheHint) already matches;
    // the extra fields a real result carries are irrelevant to the source.
    return getEmDashCollection(collection, filter);
  },
  async get(collection, id, options) {
    return getEmDashEntry(collection, id, options);
  },
};

function inGroup(entry: CollectionEntry, groupField: string, group: string): boolean {
  const linked = entry.references?.[groupField]?.entries ?? [];
  return linked.some((target) => target.id === group || target.data.id === group);
}

/**
 * Build a shared-content default source parameterized by collection, group
 * reference field, and an entry-to-shape mapper.
 */
export function createCollectionSource<T>(config: {
  collection: string;
  groupField?: string;
  query?: QueryApi;
  mapEntry: (entry: CollectionEntry) => T;
}): Source<T> {
  const { collection, groupField = GROUP_FIELD_SLUG, query = emdashQuery, mapEntry } = config;
  return async ({ scope, group, count }) => {
    const cacheHints: CacheHint[] = [];
    if (scope === 'page' && group !== undefined) {
      // Reference selections are per entry, so page scope walks the collection
      // page by page and keeps the entries whose group reference resolves to
      // this group, stopping once count is reached or the collection ends.
      const grouped: CollectionEntry[] = [];
      let cursor: string | undefined;
      do {
        const page = await query.list(collection, cursor !== undefined ? { cursor } : undefined);
        if (page.cacheHint) cacheHints.push(page.cacheHint);
        const matches = await Promise.all(
          page.entries.map(async (entry) => {
            const { entry: full, cacheHint } = await query.get(collection, entry.id, {
              references: { [groupField]: true },
            });
            if (cacheHint) cacheHints.push(cacheHint);
            return full && inGroup(full, groupField, group) ? entry : null;
          }),
        );
        grouped.push(...matches.filter((entry): entry is CollectionEntry => entry !== null));
        cursor = page.nextCursor;
      } while (cursor !== undefined && (count === undefined || grouped.length < count));
      return { items: grouped.slice(0, count).map(mapEntry), cacheHints };
    }
    const page = await query.list(collection, count !== undefined ? { limit: count } : undefined);
    if (page.cacheHint) cacheHints.push(page.cacheHint);
    return { items: page.entries.map(mapEntry), cacheHints };
  };
}

/** The same pure chain serves stored-content migration and render-time upgrades. */
export function migrateBlocks(
  value: readonly StoredBlock[],
  blockTypes: readonly BlockType[],
): StoredBlock[] {
  const types = new Map(blockTypes.map((block) => [block.definition.slug, block]));
  return value.map((stored) => {
    const type = types.get(stored._type);
    if (!type) return stored;
    const target = type.definition.currentVersion;
    if (!Number.isInteger(stored._version) || stored._version < 1 || stored._version > target) {
      throw new Error(`Unsupported version ${stored._version} for block ${stored._type} (${stored._key})`);
    }
    let block = stored;
    while (block._version < target) {
      const migrate = type.migrations[block._version];
      if (!migrate) throw new Error(`Missing migration for ${block._type} v${block._version}`);
      const next = migrate(block);
      if (next._key !== block._key || next._type !== block._type || next._version !== block._version + 1) {
        throw new Error(`Invalid migration for ${block._type} v${block._version}: preserve _key and _type and advance one version`);
      }
      block = next;
    }
    return block;
  });
}
