import type { ComparisonColumn, ComparisonRow, ComparisonSectionProps } from 'emdash-plugin-page-builder/blocks';

// An empty block value must typecheck: every field, sub-field and repeater is
// optional so a new, empty block autosaves as a draft (ADR 0003).
export const emptyColumn: ComparisonColumn = {};
export const emptyRow: ComparisonRow = {};

export const emptyProps: ComparisonSectionProps = {
  value: { _type: 'comparison', _version: 1, _key: 'cmp-empty' },
  index: 0,
  blockKey: 'cmp-empty',
};
