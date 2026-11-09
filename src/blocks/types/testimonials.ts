import type { ApplySeedBlockTypeInput, CacheHint, MediaValue, SeedCollection } from 'emdash';
import { getEmDashCollection, getEmDashEntry } from 'emdash';
import { countField, scopeField, variantField } from '../core.js';
import type { BlockType, Source } from '../core.js';

/** The shape a testimonials source produces and a testimonials section renders. */
export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatar?: MediaValue;
}

/** One entry of a collection, as the query API returns it. */
export interface TestimonialEntry {
  id: string;
  data: Record<string, unknown>;
  /** One page per reference field the query asked for, by field slug. */
  references?: Readonly<Record<string, { entries: readonly TestimonialEntry[] }>>;
}

/** One page of a collection query, as the query API returns it. */
export interface TestimonialsQueryListResult {
  entries: readonly TestimonialEntry[];
  nextCursor?: string;
  cacheHint?: CacheHint;
  error?: unknown;
}

/**
 * The supported runtime query API, injectable so tests use a fake
 * (CODING_STANDARDS rule 7). The default wraps EmDash's query functions.
 */
export interface TestimonialsQueryApi {
  list(
    collection: string,
    filter?: { limit?: number; cursor?: string },
  ): Promise<TestimonialsQueryListResult>;
  get(
    collection: string,
    id: string,
    options?: { references: Record<string, true> },
  ): Promise<{ entry?: TestimonialEntry | null; cacheHint?: CacheHint; error?: unknown }>;
}

const emdashQuery: TestimonialsQueryApi = {
  async list(collection, filter) {
    // The public shape (entries, error, cursors, cacheHint) already matches;
    // the extra fields a real result carries are irrelevant to the source.
    return getEmDashCollection(collection, filter);
  },
  async get(collection, id, options) {
    return getEmDashEntry(collection, id, options);
  },
};

export const STARTER_TESTIMONIALS_COLLECTION = 'testimonials';
export const TESTIMONIAL_GROUP_FIELD = 'group';

/**
 * The starter testimonials collection, in EmDash's seed `collections` shape.
 * `groupCollection` names the site's own grouping collection (on
 * jamesryan-sites, `services`); the `group` reference matches entries against
 * the page's group.
 */
export function starterTestimonialsCollection(groupCollection: string): SeedCollection {
  return {
    slug: STARTER_TESTIMONIALS_COLLECTION,
    label: 'Testimonials',
    labelSingular: 'Testimonial',
    description: 'Customer quotes shown by the testimonials block.',
    titleField: 'author',
    fields: [
      { slug: 'quote', label: 'Quote', type: 'text', required: true },
      { slug: 'author', label: 'Author', type: 'string', required: true },
      { slug: 'role', label: 'Role', type: 'string' },
      { slug: 'company', label: 'Company', type: 'string' },
      { slug: 'avatar', label: 'Avatar', type: 'image' },
      {
        slug: TESTIMONIAL_GROUP_FIELD,
        label: 'Group',
        type: 'reference',
        validation: { targetCollection: groupCollection },
      },
    ],
  };
}

function toTestimonial(entry: TestimonialEntry): Testimonial {
  const { quote, author, role, company, avatar } = entry.data;
  return {
    quote: String(quote ?? ''),
    author: String(author ?? ''),
    role: role !== undefined ? String(role) : undefined,
    company: company !== undefined ? String(company) : undefined,
    avatar: typeof avatar === 'object' && avatar !== null ? (avatar as MediaValue) : undefined,
  };
}

function inGroup(entry: TestimonialEntry, groupField: string, group: string): boolean {
  const linked = entry.references?.[groupField]?.entries ?? [];
  return linked.some((target) => target.id === group || target.data.id === group);
}

/**
 * The default testimonials source. It reads the starter collection (or another
 * collection with the same field names, via `collection`); a site whose fields
 * differ writes its own `Source<Testimonial>` against its own generated types.
 */
export function createTestimonialsSource(options: {
  collection?: string;
  groupField?: string;
  query?: TestimonialsQueryApi;
} = {}): Source<Testimonial> {
  const collection = options.collection ?? STARTER_TESTIMONIALS_COLLECTION;
  const groupField = options.groupField ?? TESTIMONIAL_GROUP_FIELD;
  const query = options.query ?? emdashQuery;
  return async ({ scope, group, count }) => {
    const cacheHints = [];
    if (scope === 'page' && group !== undefined) {
      // Reference selections are per entry, so page scope walks the collection
      // page by page and keeps the entries whose group reference resolves to
      // this group, stopping once count is reached or the collection ends.
      const grouped = [];
      let cursor;
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
        grouped.push(...matches.filter((entry): entry is TestimonialEntry => entry !== null));
        cursor = page.nextCursor;
      } while (cursor !== undefined && (count === undefined || grouped.length < count));
      return { items: grouped.slice(0, count).map(toTestimonial), cacheHints };
    }
    const page = await query.list(collection, count !== undefined ? { limit: count } : undefined);
    if (page.cacheHint) cacheHints.push(page.cacheHint);
    return { items: page.entries.map(toTestimonial), cacheHints };
  };
}

const variants = ['single', 'grid', 'split'] as const;

export const testimonials = {
  definition: {
    slug: 'testimonials',
    label: 'Testimonials',
    description:
      'Customer quotes pulled from a shared testimonials collection rather than written inline. ' +
      'Scope picks whether the quotes come from the page\'s group or the whole collection; ' +
      'count caps how many. Variant single shows one large quote with a photo; grid shows ' +
      'several quotes side by side; split shows one quote beside a large photo.',
    currentVersion: 1,
    versions: [{ version: 1, fields: [variantField(variants), scopeField(), countField()] }],
  } satisfies ApplySeedBlockTypeInput & { description: string },
  variants,
  migrations: {},
  starter: starterTestimonialsCollection,
} satisfies BlockType;
