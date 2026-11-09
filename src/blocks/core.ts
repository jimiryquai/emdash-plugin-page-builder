import type { ApplySeedBlockTypeInput, BlockFieldDefinition, CacheHint } from 'emdash';

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

/** Label and URL pairs. The first item is the primary action. */
export function linksField(): BlockFieldDefinition {
  return {
    slug: 'links',
    label: 'Links',
    type: 'repeater',
    validation: {
      subFields: [
        { slug: 'label', label: 'Label', type: 'string', required: true },
        { slug: 'url', label: 'URL', type: 'url', required: true },
      ],
    },
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
