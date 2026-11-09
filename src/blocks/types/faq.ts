import type { ApplySeedBlockTypeInput, SeedCollection } from 'emdash';
import {
  countField,
  createCollectionSource,
  GROUP_FIELD_SLUG,
  scopeField,
  variantField,
} from '../core.js';
import type {
  BlockType,
  CollectionEntry,
  CollectionSourceOptions,
  Source,
} from '../core.js';

/** The shape an FAQ source produces and an FAQ section renders. */
export interface Faq {
  question: string;
  answer: string;
}

export const STARTER_FAQ_COLLECTION = 'faqs';
export const FAQ_GROUP_FIELD = GROUP_FIELD_SLUG;

/**
 * The starter FAQs collection, in EmDash's seed `collections` shape.
 * `groupCollection` names the site's own grouping collection; the `group`
 * reference matches entries against the page's group.
 */
export function starterFaqCollection(groupCollection: string): SeedCollection {
  return {
    slug: STARTER_FAQ_COLLECTION,
    label: 'FAQs',
    labelSingular: 'FAQ',
    description: 'Questions and answers shown by the FAQ block.',
    titleField: 'question',
    fields: [
      { slug: 'question', label: 'Question', type: 'string', required: true },
      { slug: 'answer', label: 'Answer', type: 'text', required: true },
      {
        slug: FAQ_GROUP_FIELD,
        label: 'Group',
        type: 'reference',
        validation: { targetCollection: groupCollection },
      },
    ],
  };
}

function toFaq(entry: CollectionEntry): Faq {
  const { question, answer } = entry.data;
  return {
    question: String(question ?? ''),
    answer: String(answer ?? ''),
  };
}

/**
 * The default FAQ source. It reads the starter collection (or another
 * collection with the same field names, via `collection`); a site whose fields
 * differ writes its own `Source<Faq>` against its own generated types.
 */
export function createFaqSource(options: CollectionSourceOptions = {}): Source<Faq> {
  return createCollectionSource({
    collection: options.collection ?? STARTER_FAQ_COLLECTION,
    groupField: options.groupField ?? FAQ_GROUP_FIELD,
    query: options.query,
    mapEntry: toFaq,
  });
}

const variants = ['two-column', 'centered'] as const;

export const faq = {
  definition: {
    slug: 'faq',
    label: 'FAQ',
    description:
      'Frequently asked questions pulled from a shared FAQs collection rather than written inline. ' +
      'Scope picks whether the questions come from the page\'s group or the whole collection; ' +
      'count caps how many. Variant two-column shows the questions beside a heading and ' +
      'supporting copy; centered shows them under a centered heading.',
    currentVersion: 1,
    versions: [{ version: 1, fields: [variantField(variants), scopeField(), countField()] }],
  } satisfies ApplySeedBlockTypeInput & { description: string },
  variants,
  migrations: {},
  starter: starterFaqCollection,
} satisfies BlockType;
