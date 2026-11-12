import {
  markdownText,
  variantField,
  type BlockType,
  type StoredBlock,
} from '../core.js';

const variants = ['graph'] as const;

export type StatVariant = (typeof variants)[number];

export interface StatItem {
  value?: string;
  label?: string;
}

export interface StatsBlockValue extends StoredBlock {
  _type: 'stats';
  _version: 1;
  variant?: StatVariant;
  eyebrow?: string;
  heading?: string;
  body?: string;
  items?: readonly StatItem[];
}

export interface StatsSectionProps {
  value: StatsBlockValue;
  index: number;
  blockKey: string;
}

function toMarkdown(block: Readonly<StoredBlock>): string {
  const parts: string[] = [];
  const eyebrow = markdownText(block.eyebrow);
  if (eyebrow !== undefined) parts.push(eyebrow);
  const heading = markdownText(block.heading);
  if (heading !== undefined) parts.push(`## ${heading}`);
  const body = markdownText(block.body);
  if (body !== undefined) parts.push(body);
  const items = Array.isArray(block.items) ? block.items : [];
  const lines = items.flatMap((item): string[] => {
    if (typeof item !== 'object' || item === null) return [];
    const stat = item as Record<string, unknown>;
    const value = markdownText(stat.value);
    const label = markdownText(stat.label);
    const line = [
      value !== undefined ? `**${value}**` : undefined,
      label,
    ].filter((part): part is string => part !== undefined).join(' — ');
    return line.length > 0 ? [`- ${line}`] : [];
  });
  if (lines.length > 0) parts.push(lines.join('\n'));
  return parts.join('\n\n');
}

export const stats = {
  definition: {
    slug: 'stats',
    label: 'Stats',
    category: 'Sections',
    description:
      'Use a stats block for a row of figures that support a claim: a heading, optional supporting copy, and one or more value-and-label pairs. Choose graph when the figures sit over a graph and an optional eyebrow can sit above the heading. A quote belongs on the testimonials block.',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        fields: [
          { ...variantField(variants), defaultValue: 'graph' },
          { slug: 'eyebrow', label: 'Eyebrow', type: 'string' },
          { slug: 'heading', label: 'Heading', type: 'string' },
          { slug: 'body', label: 'Body', type: 'text' },
          {
            slug: 'items',
            label: 'Items',
            type: 'repeater',
            validation: {
              subFields: [
                { slug: 'value', label: 'Value', type: 'string' },
                { slug: 'label', label: 'Label', type: 'string' },
              ],
            },
          },
        ],
      },
    ],
  },
  variants,
  migrations: {},
  requiredToPublish: ['heading', { field: 'items', minItems: 1, fields: ['value'] }],
  toMarkdown,
} satisfies BlockType;
