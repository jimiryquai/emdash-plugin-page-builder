import type { ApplySeedBlockTypeInput, BlockFieldDefinition, CacheHint, SeedCollection } from 'emdash';
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

/** Label and URL pairs. The first item is the primary action. */
export const LINKS_FIELD_SLUG = 'links';

export function linksField(): BlockFieldDefinition {
  return {
    slug: LINKS_FIELD_SLUG,
    label: 'Links',
    type: 'repeater',
    validation: {
      subFields: [
        { slug: 'label', label: 'Label', type: 'string' },
        { slug: 'url', label: 'URL', type: 'url' },
      ],
    },
  };
}

/** Read a stored field as non-empty text, or undefined (Markdown skips empties). */
export function markdownText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

/**
 * `![alt](url)` for a stored media value, or undefined. The URL is the stored
 * `src`, the provider preview, or EmDash's file URL for local media — the
 * same address EmDash's `getEmbed` resolves.
 */
export function markdownImage(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const media = value as {
    src?: unknown;
    previewUrl?: unknown;
    id?: unknown;
    alt?: unknown;
    caption?: unknown;
    meta?: unknown;
  };
  const storageKey = typeof media.meta === 'object' && media.meta !== null
    ? markdownText((media.meta as Record<string, unknown>).storageKey)
    : undefined;
  const key = storageKey ?? markdownText(media.id);
  const url = markdownText(media.src) ?? markdownText(media.previewUrl)
    ?? (key !== undefined ? `/_emdash/api/media/file/${key}` : undefined);
  if (url === undefined) return undefined;
  const alt = markdownText(media.alt) ?? markdownText(media.caption) ?? '';
  return `![${alt}](${url})`;
}

/** One `- [label](url)` line per complete link, or undefined when there are none. */
export function markdownLinks(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const lines = value.flatMap((link): string[] => {
    if (typeof link !== 'object' || link === null) return [];
    const label = markdownText((link as Record<string, unknown>).label);
    const url = markdownText((link as Record<string, unknown>).url);
    return label !== undefined && url !== undefined ? [`- [${label}](${url})`] : [];
  });
  return lines.length > 0 ? lines.join('\n') : undefined;
}

/** The link `href`s of one Portable Text block, keyed by mark definition `_key`. */
function linkMarkDefs(value: unknown): Map<string, string> {
  const links = new Map<string, string>();
  if (!Array.isArray(value)) return links;
  for (const stored of value) {
    if (typeof stored !== 'object' || stored === null) continue;
    const def = stored as Record<string, unknown>;
    if (def._type === 'link' && typeof def._key === 'string' && typeof def.href === 'string') {
      links.set(def._key, def.href);
    }
  }
  return links;
}

/** One span's text with its marks applied: code innermost, then em, strong, link. */
function markedText(text: string, marks: unknown, links: Map<string, string>): string {
  if (!Array.isArray(marks)) return text;
  const applied = new Set(marks.filter((mark): mark is string => typeof mark === 'string'));
  let marked = text;
  if (applied.has('code')) marked = `\`${marked}\``;
  if (applied.has('em')) marked = `*${marked}*`;
  if (applied.has('strong')) marked = `**${marked}**`;
  const link = marks.find((mark): mark is string => typeof mark === 'string' && links.has(mark));
  return link !== undefined ? `[${marked}](${links.get(link)})` : marked;
}

/** The inline Markdown of one Portable Text block's children (spans only). */
function spansToMarkdown(children: unknown, markDefs: unknown): string {
  if (!Array.isArray(children)) return '';
  const links = linkMarkDefs(markDefs);
  let text = '';
  for (const stored of children) {
    if (typeof stored !== 'object' || stored === null) continue;
    const child = stored as Record<string, unknown>;
    if (child._type !== undefined && child._type !== 'span') continue;
    if (typeof child.text !== 'string' || child.text.length === 0) continue;
    text += markedText(child.text, child.marks, links);
  }
  return text;
}

/**
 * Render EmDash Portable Text as plain Markdown: normal paragraphs, `h1`–`h6`
 * headings, `blockquote`s, bullet and number lists with levels, and
 * `strong`/`em`/`code` marks with `link` mark definitions. Unknown block and
 * span types are skipped, never thrown on; numbering counts per level and
 * restarts after any other block, and child items indent under their parent's
 * marker. Blocks are separated by one blank line, list items by one
 * newline.
 */
export function portableTextToMarkdown(value: unknown): string {
  if (!Array.isArray(value)) return '';
  const segments: string[] = [];
  const listLines: string[] = [];
  let runKind: 'bullet' | 'number' | undefined;
  const levels = new Map<number, {
    kind: 'bullet' | 'number'; count: number; indent: number; markerWidth: number;
  }>();
  const flushList = (): void => {
    if (listLines.length > 0) {
      segments.push(listLines.join('\n'));
      listLines.length = 0;
    }
  };
  for (const stored of value) {
    if (typeof stored !== 'object' || stored === null) continue;
    const block = stored as Record<string, unknown>;
    if (block._type !== 'block') continue;
    const text = spansToMarkdown(block.children, block.markDefs);
    if (text.length === 0) continue;
    const { listItem } = block;
    if (listItem === 'bullet' || listItem === 'number') {
      const level = Number.isInteger(block.level) && (block.level as number) >= 1
        ? block.level as number
        : 1;
      if (level === 1) {
        if (runKind !== undefined && runKind !== listItem) flushList();
        runKind = listItem;
      }
      for (const storedLevel of levels.keys()) {
        if (storedLevel > level) levels.delete(storedLevel);
      }
      const previous = levels.get(level);
      const count = listItem === 'number' && previous?.kind === listItem ? previous.count + 1 : 1;
      const marker = listItem === 'bullet' ? '-' : `${count}.`;
      const parent = levels.get(level - 1);
      const indent = parent ? parent.indent + parent.markerWidth : 2 * (level - 1);
      levels.set(level, { kind: listItem, count, indent, markerWidth: marker.length + 1 });
      listLines.push(`${' '.repeat(indent)}${marker} ${text}`);
      continue;
    }
    levels.clear();
    runKind = undefined;
    flushList();
    if (block.style === 'blockquote') {
      segments.push(text.split('\n').map((line) => `> ${line}`).join('\n'));
      continue;
    }
    const heading = typeof block.style === 'string' ? /^h([1-6])$/.exec(block.style) : null;
    segments.push(heading ? `${'#'.repeat(Number(heading[1]))} ${text}` : text);
  }
  flushList();
  return segments.join('\n\n');
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
export function countField(
  options: { min?: number; max?: number; defaultValue?: number } = {},
): BlockFieldDefinition {
  return {
    slug: COUNT_FIELD_SLUG,
    label: 'Count',
    type: 'integer',
    ...(options.defaultValue !== undefined ? { defaultValue: options.defaultValue } : {}),
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

/** Current-version publish rules; repeater sub-fields use zero-based item paths. */
export type PublishRequirement = string | {
  field: string;
  minItems?: number;
  fields: readonly string[];
};

export interface MissingPublishField {
  blockKey: string;
  blockType: string;
  field: string;
}

/** A block module owns the seed definition and every upgrade step. */
export interface BlockType {
  definition: ApplySeedBlockTypeInput & { description: string };
  variants: readonly string[];
  requiredToPublish: readonly PublishRequirement[];
  /** Keyed by the version being upgraded; each step returns version N + 1. */
  migrations: Readonly<Record<number, (block: Readonly<StoredBlock>) => StoredBlock>>;
  /** Optional starter collection, parameterised by the site's grouping collection. */
  starter?: (groupCollection: string) => SeedCollection;
  /**
   * Readable plain Markdown for one current-version block, as `layoutToMarkdown`
   * dispatches it. `items` carries what a source read for shared-content blocks.
   * Optional so a module without one is skipped, never thrown on.
   */
  toMarkdown?: (block: Readonly<StoredBlock>, items?: readonly unknown[]) => string;
  /**
   * Optional block-specific source context extracted from a stored block
   * (such as `posts` forwarding a trimmed `category` slug) so `PageBuilder`
   * dispatches generically without switching on `_type`.
   */
  sourceContext?: (block: Readonly<StoredBlock>) => Partial<SourceContext>;
}

/** Recognise block module exports without maintaining a separate registry. */
export function isBlockType(value: unknown): value is BlockType {
  return typeof value === 'object' && value !== null &&
    'definition' in value && 'variants' in value && 'migrations' in value;
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

/** Context passed to a shared-content source for one block on a page. */
export interface SourceContext {
  scope: 'page' | 'all';
  group?: string;
  count?: number;
}

/** A site's typed mapping from its collection's entries to a shape. */
export type Source<T = unknown> = (
  context: SourceContext,
) => SourceResult<T> | readonly T[] | Promise<SourceResult<T> | readonly T[]>;

/** Read a current-version field's declared `defaultValue` from a block definition. */
export function blockFieldDefault(blockType: BlockType, slug: string): unknown {
  const current = blockType.definition.versions.find(
    (entry) => entry.version === blockType.definition.currentVersion,
  );
  return current?.fields.find((field) => field.slug === slug)?.defaultValue;
}

/** Resolve a positive count, falling back to `fallback` when positive. */
export function resolvePositiveCount(value: unknown, fallback?: unknown): number | undefined {
  if (typeof value === 'number' && value > 0) return value;
  if (typeof fallback === 'number' && fallback > 0) return fallback;
  return undefined;
}

/** Build the `SourceContext` for one upgraded block from its definition and stored values. */
export function resolveSourceContext(
  block: Readonly<StoredBlock>,
  blockType?: BlockType,
  group?: string,
): SourceContext {
  const storedScope = block[SCOPE_FIELD_SLUG];
  const scope = storedScope === 'page' && group !== undefined ? 'page' : 'all';
  const defaultCount = blockType !== undefined ? blockFieldDefault(blockType, COUNT_FIELD_SLUG) : undefined;
  const count = resolvePositiveCount(block[COUNT_FIELD_SLUG], defaultCount);
  return {
    scope,
    group,
    count,
    ...blockType?.sourceContext?.(block),
  };
}

export const GROUP_FIELD_SLUG = 'group';

/** One entry of a collection, as the query API returns it. */
export interface CollectionEntry {
  id: string;
  data: Record<string, unknown>;
  /** One page per reference field the query asked for, by field slug. */
  references?: Readonly<Record<string, { entries: readonly CollectionEntry[] }>>;
}

/** Filter options supported by `QueryApi.list`. */
export interface QueryListFilter {
  limit?: number;
  cursor?: string;
  where?: Record<string, string>;
  orderBy?: Record<string, 'asc' | 'desc'>;
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
    filter?: QueryListFilter,
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

/** Options for `layoutToMarkdown`. */
export interface LayoutToMarkdownOptions {
  /** What a site's source read for each block, keyed by that block's `_key`. */
  items?: Readonly<Record<string, readonly unknown[]>>;
}

/**
 * Render a page layout as plain Markdown for agents and LLMs: upgrade every
 * block first (`migrateBlocks`), then dispatch to each block module's own
 * `toMarkdown` and join the results with one blank line. Unknown block types,
 * modules without `toMarkdown` and empty renderings are skipped, never thrown
 * on; only an unsupported stored version throws, as in rendering.
 */
export function layoutToMarkdown(
  value: readonly StoredBlock[],
  blockTypes: readonly BlockType[],
  options: LayoutToMarkdownOptions = {},
): string {
  const types = new Map(blockTypes.map((blockType) => [blockType.definition.slug, blockType]));
  return migrateBlocks(value, blockTypes)
    .map((block) => types.get(block._type)?.toMarkdown?.(block, options.items?.[block._key]))
    .filter((markdown): markdown is string => typeof markdown === 'string' && markdown.trim().length > 0)
    .join('\n\n');
}

/** Upgrade first, then report every missing current-version publish field. */
export function findMissingToPublish(
  value: readonly StoredBlock[],
  blockTypes: readonly BlockType[],
): MissingPublishField[] {
  const types = new Map(blockTypes.map(type => [type.definition.slug, type]));
  const missing: MissingPublishField[] = [];
  const empty = (value: unknown): boolean => value == null ||
    (typeof value === 'string' && value.trim().length === 0) ||
    (Array.isArray(value) && value.length === 0);
  for (const block of migrateBlocks(value, blockTypes)) {
    const type = types.get(block._type);
    if (!type) continue;
    const add = (field: string): void => {
      missing.push({ blockKey: block._key, blockType: block._type, field });
    };
    for (const rule of type.requiredToPublish) {
      if (typeof rule === 'string') {
        if (empty(block[rule])) add(rule);
        continue;
      }
      const items = block[rule.field];
      if (!Array.isArray(items)) {
        if ((rule.minItems ?? 0) > 0 || !empty(items)) add(rule.field);
        continue;
      }
      if (items.length < (rule.minItems ?? 0)) add(rule.field);
      items.forEach((item: unknown, index: number) => {
        for (const field of rule.fields) {
          if (typeof item !== 'object' || item === null ||
            empty((item as Record<string, unknown>)[field])) add(`${rule.field}[${index}].${field}`);
        }
      });
    }
  }
  return missing;
}
