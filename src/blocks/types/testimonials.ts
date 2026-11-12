import type { ApplySeedBlockTypeInput, MediaValue, SeedCollection } from 'emdash';
import {
  countField,
  createCollectionSource,
  GROUP_FIELD_SLUG,
  markdownText,
  scopeField,
  variantField,
} from '../core.js';
import type {
  BlockType,
  CollectionEntry,
  CollectionSourceOptions,
  QueryApi,
  QueryListResult,
  Source,
  StoredBlock,
} from '../core.js';

/** The shape a testimonials source produces and a testimonials section renders. */
export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatar?: MediaValue;
}

/** One entry of a collection, as the query API returns it. */
export type TestimonialEntry = CollectionEntry;

/** One page of a collection query, as the query API returns it. */
export type TestimonialsQueryListResult = QueryListResult;

/**
 * The supported runtime query API, injectable so tests use a fake
 * (CODING_STANDARDS rule 7). The default wraps EmDash's query functions.
 */
export type TestimonialsQueryApi = QueryApi;

export const STARTER_TESTIMONIALS_COLLECTION = 'testimonials';
export const TESTIMONIAL_GROUP_FIELD = GROUP_FIELD_SLUG;

/**
 * The starter testimonials collection, in EmDash's seed `collections` shape.
 * `groupCollection` names the site's own grouping collection; the `group`
 * reference matches entries against the page's group.
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

/**
 * The default testimonials source. It reads the starter collection (or another
 * collection with the same field names, via `collection`); a site whose fields
 * differ writes its own `Source<Testimonial>` against its own generated types.
 */
export function createTestimonialsSource(options: CollectionSourceOptions = {}): Source<Testimonial> {
  return createCollectionSource({
    collection: options.collection ?? STARTER_TESTIMONIALS_COLLECTION,
    groupField: options.groupField ?? TESTIMONIAL_GROUP_FIELD,
    query: options.query,
    mapEntry: toTestimonial,
  });
}

const variants = ['single', 'grid', 'split'] as const;

/** The block's own heading text, then each testimonial the site's source read. */
function toMarkdown(_block: Readonly<StoredBlock>, items?: readonly unknown[]): string {
  const parts = [`## ${testimonials.definition.label}`];
  for (const stored of items ?? []) {
    if (typeof stored !== 'object' || stored === null) continue;
    const { quote, author, role, company } = stored as Record<string, unknown>;
    const quoteText = markdownText(quote);
    const authorText = markdownText(author);
    const attribution = [
      authorText !== undefined ? `**${authorText}**` : undefined,
      markdownText(role),
    ]
      .filter((part): part is string => part !== undefined)
      .join(', ');
    const companyText = markdownText(company);
    const withCompany = companyText !== undefined
      ? `${attribution} (${companyText})`
      : attribution;
    const lines = [
      quoteText !== undefined ? `> "${quoteText}"` : undefined,
      withCompany.length > 0 ? `> — ${withCompany}` : undefined,
    ].filter((part): part is string => part !== undefined);
    if (lines.length > 0) parts.push(lines.join('\n'));
  }
  return parts.join('\n\n');
}

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
  requiredToPublish: [],
  starter: starterTestimonialsCollection,
  toMarkdown,
} satisfies BlockType;
