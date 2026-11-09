import { variantField, type BlockType, type StoredBlock } from '../index.js';

export const featureVariants = [
  'two-column',
  'three-column',
  'three-column-demos',
  'alternating',
] as const;

export type FeatureVariant = (typeof featureVariants)[number];

export const featureVariantDescriptions: Readonly<Record<FeatureVariant, string>> = {
  'two-column':
    'Two-column card grid with visual demo screenshots or graphics',
  'three-column':
    'Compact three-column grid highlighting values or capabilities with icons and text',
  'three-column-demos':
    'Three-column grid showcasing features alongside screenshots or demo assets',
  alternating:
    'Full-width stacked rows alternating between feature description and visual demo assets',
};

export interface FeatureItem {
  title: string;
  description?: string;
  image?: unknown;
  icon?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  [key: string]: unknown;
}

export interface FeaturesBlockValue extends StoredBlock {
  _type: 'features';
  _version: 1;
  eyebrow?: string;
  heading: string;
  subheadline?: string;
  variant?: FeatureVariant;
  items?: readonly FeatureItem[];
}

export interface FeaturesSectionProps {
  value: FeaturesBlockValue;
  index: number;
  blockKey: string;
  items?: readonly unknown[];
}

let cachedDefinition: BlockType['definition'] | undefined;

export const features = {
  get definition(): BlockType['definition'] {
    if (!cachedDefinition) {
      cachedDefinition = {
        slug: 'features',
        label: 'Features',
        description:
          'Grid or alternating list of product features, capabilities, or value propositions with optional images, icons, and links. Use "two-column" for a two-column card grid with visual demos, "three-column" for a compact three-column grid with text and icons, "three-column-demos" for three columns with screenshots, or "alternating" for stacked rows alternating between description and media.',
        currentVersion: 1,
        versions: [
          {
            version: 1,
            fields: [
              { slug: 'eyebrow', label: 'Eyebrow', type: 'string' },
              { slug: 'heading', label: 'Heading', type: 'string', required: true },
              { slug: 'subheadline', label: 'Subheadline', type: 'text' },
              variantField(featureVariants),
              {
                slug: 'items',
                label: 'Items',
                type: 'repeater',
                validation: {
                  minItems: 1,
                  subFields: [
                    { slug: 'title', label: 'Title', type: 'string', required: true },
                    { slug: 'description', label: 'Description', type: 'text' },
                    { slug: 'image', label: 'Image', type: 'image' },
                    { slug: 'icon', label: 'Icon', type: 'string' },
                    { slug: 'ctaLabel', label: 'CTA label', type: 'string' },
                    { slug: 'ctaUrl', label: 'CTA URL', type: 'url' },
                  ],
                },
              },
            ],
          },
        ],
      };
    }
    return cachedDefinition;
  },
  variants: featureVariants,
  migrations: {},
} satisfies BlockType;
