import { variantField, type BlockType } from '../core.js';

const variants = ['centered', 'start'] as const;

export const prose = {
  definition: {
    slug: 'prose',
    label: 'Prose',
    category: 'Sections',
    description:
      'Use a prose block for long-form Portable Text document sections such as privacy policies, legal terms, or editorial copy: a heading, an optional plain-text body (such as a last-updated note or lead), and Portable Text content. Choose centered when the heading, body and prose column are centered on the page. Choose start when the heading, body and prose column line up with the start of the section.',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        fields: [
          { ...variantField(variants), defaultValue: 'centered' },
          { slug: 'heading', label: 'Heading', type: 'string' },
          { slug: 'body', label: 'Body', type: 'text' },
          { slug: 'content', label: 'Content', type: 'portableText' },
        ],
      },
    ],
  },
  variants,
  migrations: {},
  requiredToPublish: ['heading', 'content'],
} satisfies BlockType;
