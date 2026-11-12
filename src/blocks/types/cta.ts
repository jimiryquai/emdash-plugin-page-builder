import {
  LINKS_FIELD_SLUG,
  linksField,
  markdownLinks,
  markdownText,
  variantField,
  type BlockType,
  type StoredBlock,
} from '../core.js';

const variants = ['start', 'centered'] as const;

function toMarkdown(block: Readonly<StoredBlock>): string {
  const parts: string[] = [];
  const heading = markdownText(block.heading);
  if (heading !== undefined) parts.push(`## ${heading}`);
  const body = markdownText(block.body);
  if (body !== undefined) parts.push(body);
  const links = markdownLinks(block[LINKS_FIELD_SLUG]);
  if (links !== undefined) parts.push(links);
  return parts.join('\n\n');
}

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
          { slug: 'heading', label: 'Heading', type: 'string' },
          { slug: 'body', label: 'Body', type: 'text' },
          linksField(),
        ],
      },
    ],
  },
  variants,
  migrations: {},
  requiredToPublish: ['heading', { field: 'links', fields: ['label', 'url'] }],
  toMarkdown,
} satisfies BlockType;
