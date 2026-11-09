import type { BlockType } from '../index.js';
import { variantField } from '../variant.js';

const variants = ['start', 'centered'] as const;

const links = {
  slug: 'links',
  label: 'Links',
  type: 'repeater' as const,
  validation: {
    subFields: [
      { slug: 'label', label: 'Label', type: 'string' as const, required: true },
      { slug: 'url', label: 'URL', type: 'url' as const, required: true },
    ],
  },
};

export const cta = {
  definition: {
    slug: 'cta',
    label: 'Call to action',
    category: 'Sections',
    description:
      'Use a cta for a later prompt to act, not the opening section. It has a heading, an optional plain-text body, and links. Choose start when the heading, body and links line up with the start of the section. Choose centered when they sit in the middle. The first link is the primary action and the second is an optional alternative.',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        fields: [
          { ...variantField(variants), defaultValue: 'start' },
          { slug: 'heading', label: 'Heading', type: 'string', required: true },
          { slug: 'body', label: 'Body', type: 'text' },
          links,
        ],
      },
    ],
  },
  variants,
  migrations: {},
} satisfies BlockType;
