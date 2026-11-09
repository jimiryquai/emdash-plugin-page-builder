import type { ApplySeedBlockTypeInput } from 'emdash';
import { variantField } from '../core.js';
import type { BlockType, StoredBlock } from '../core.js';

export const comparisonVariants = ['table'] as const;
export type ComparisonVariant = (typeof comparisonVariants)[number];

export const comparisonColumnKeys = ['first', 'second', 'third'] as const;
export type ComparisonColumnKey = (typeof comparisonColumnKeys)[number];

export interface ComparisonColumn {
  key: ComparisonColumnKey;
  label: string;
}

export interface ComparisonRow {
  group_name?: string;
  name: string;
  first_value?: string;
  second_value?: string;
  third_value?: string;
}

export interface ComparisonBlockValue extends StoredBlock {
  _type: 'comparison';
  _version: 1;
  variant?: ComparisonVariant;
  columns?: readonly ComparisonColumn[];
  rows?: readonly ComparisonRow[];
}

export interface ComparisonSectionProps {
  value: ComparisonBlockValue;
  index: number;
  blockKey: string;
}

export const comparison = {
  definition: {
    slug: 'comparison',
    label: 'Comparison',
    category: 'Sections',
    description:
      'Use a comparison block to compare features across up to three options. ' +
      'Each column has a label and a fixed position; each row gives the feature name, ' +
      'an optional group name, and a value for each position. Choose table for the ' +
      'grouped comparison table.',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        fields: [
          { ...variantField(comparisonVariants), defaultValue: 'table' },
          {
            slug: 'columns',
            label: 'Columns',
            type: 'repeater',
            validation: {
              minItems: 1,
              maxItems: comparisonColumnKeys.length,
              subFields: [
                {
                  slug: 'key',
                  label: 'Position',
                  type: 'select',
                  required: true,
                  options: [...comparisonColumnKeys],
                },
                { slug: 'label', label: 'Label', type: 'string', required: true },
              ],
            },
          },
          {
            slug: 'rows',
            label: 'Rows',
            type: 'repeater',
            validation: {
              minItems: 1,
              subFields: [
                { slug: 'group_name', label: 'Group name', type: 'string' },
                { slug: 'name', label: 'Feature name', type: 'string', required: true },
                { slug: 'first_value', label: 'First column value', type: 'text' },
                { slug: 'second_value', label: 'Second column value', type: 'text' },
                { slug: 'third_value', label: 'Third column value', type: 'text' },
              ],
            },
          },
        ],
      },
    ],
  } satisfies ApplySeedBlockTypeInput & { description: string },
  variants: comparisonVariants,
  migrations: {},
} satisfies BlockType;
