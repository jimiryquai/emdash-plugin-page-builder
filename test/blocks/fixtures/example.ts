import type { BlockType } from 'emdash-plugin-page-builder/blocks';

const variants = ['plain', 'featured'] as const;
const variant = { slug: 'variant', label: 'Variant', type: 'select' as const,
  validation: { options: [...variants] } };

export const example = {
  definition: {
    slug: 'example', label: 'Example', description: 'Test the versioned block layer.',
    currentVersion: 2,
    versions: [
      { version: 1, fields: [{ slug: 'heading', label: 'Heading', type: 'string' }, variant] },
      { version: 2, fields: [{ slug: 'title', label: 'Title', type: 'string' }, variant] },
    ],
  },
  variants,
  migrations: {
    1: (block) => {
      const { heading, ...rest } = block;
      return { ...rest, title: heading, _version: 2 };
    },
  },
} satisfies BlockType;
