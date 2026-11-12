import type { ApplySeedBlockTypeInput } from 'emdash';
import { markdownText, variantField } from '../core.js';
import type { BlockType, StoredBlock } from '../core.js';

export const comparisonVariants = ['table'] as const;
export type ComparisonVariant = (typeof comparisonVariants)[number];

export const comparisonColumnKeys = ['first', 'second', 'third'] as const;
export type ComparisonColumnKey = (typeof comparisonColumnKeys)[number];

export interface ComparisonColumn {
  key?: ComparisonColumnKey;
  label?: string;
}

export interface ComparisonRow {
  group_name?: string;
  name?: string;
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

/** One table cell: pipes escaped and newlines flattened, empty when blank. */
function cell(value: unknown): string {
  const text = markdownText(value);
  return text !== undefined ? text.replaceAll('|', '\\|').replaceAll('\n', ' ') : '';
}

/** The block's content is the comparison table itself. */
function toMarkdown(block: Readonly<StoredBlock>): string {
  const storedColumns = Array.isArray(block.columns) ? block.columns : [];
  const columns = comparisonColumnKeys
    .map((key) => storedColumns.find(
      (column): boolean =>
        typeof column === 'object' && column !== null &&
        (column as Record<string, unknown>).key === key,
    ))
    .filter((column): column is NonNullable<typeof column> => column !== undefined)
    .map((column) => {
      const { key, label } = column as Record<string, unknown>;
      return { key: key as ComparisonColumnKey, label: markdownText(label) ?? '' };
    });
  if (columns.length === 0) return '';
  const lines = [
    `| Feature | ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${['---', ...columns.map(() => '---')].join(' | ')} |`,
  ];
  const storedRows = Array.isArray(block.rows) ? block.rows : [];
  for (const storedRow of storedRows) {
    if (typeof storedRow !== 'object' || storedRow === null) continue;
    const row = storedRow as Record<string, unknown>;
    const name = markdownText(row.name);
    const group = markdownText(row.group_name);
    const cells = columns.map(({ key }) => cell(row[`${key}_value`]));
    if (name === undefined && group === undefined && cells.every((value) => value === '')) continue;
    if (name === undefined) {
      lines.push(`| **${group}** | ${columns.map(() => '').join(' | ')} |`);
      continue;
    }
    lines.push(`| ${cell(name)} | ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
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
              maxItems: comparisonColumnKeys.length,
              subFields: [
                {
                  slug: 'key',
                  label: 'Position',
                  type: 'select',
                  options: [...comparisonColumnKeys],
                },
                { slug: 'label', label: 'Label', type: 'string' },
              ],
            },
          },
          {
            slug: 'rows',
            label: 'Rows',
            type: 'repeater',
            validation: {
              subFields: [
                { slug: 'group_name', label: 'Group name', type: 'string' },
                { slug: 'name', label: 'Feature name', type: 'string' },
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
  requiredToPublish: [{ field: 'columns', minItems: 1, fields: ['key', 'label'] }, { field: 'rows', minItems: 1, fields: ['name'] }],
  toMarkdown,
} satisfies BlockType;
