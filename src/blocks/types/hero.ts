import { linksField, variantField, type BlockType } from '../core.js';

const variants = ['centered', 'photo', 'demo'] as const;

export const hero = {
  definition: {
    slug: 'hero',
    label: 'Hero',
    category: 'Sections',
    description:
      'Use a hero for the opening section of a page: a heading, an optional plain-text body, an optional image, and links. Choose centered when the heading, body and links sit in a centered stack and no image is shown. Choose photo when the copy is aligned to the start and the image is a photograph shown with it. Choose demo when the copy is aligned to the start and the image is a product screenshot or interface shown as a demo. The first link is the primary action and the second is an optional quieter action. Set the eyebrow, its URL and its action together when a short linked announcement sits above the heading. Priced plans belong on the pricing block.',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        fields: [
          { ...variantField(variants), defaultValue: 'centered' },
          { slug: 'eyebrow', label: 'Eyebrow', type: 'string' },
          { slug: 'eyebrow_url', label: 'Eyebrow URL', type: 'url' },
          { slug: 'eyebrow_action', label: 'Eyebrow action', type: 'string' },
          { slug: 'heading', label: 'Heading', type: 'string' },
          { slug: 'body', label: 'Body', type: 'text' },
          { slug: 'image', label: 'Image', type: 'image', options: { darkVariant: true } },
          linksField(),
        ],
      },
    ],
  },
  variants,
  migrations: {},
  requiredToPublish: ['heading', { field: 'links', fields: ['label', 'url'] }],
} satisfies BlockType;
