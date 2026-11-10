import type { StatItem, StatsSectionProps } from 'emdash-plugin-page-builder/blocks';

// An empty block value must typecheck: every field is optional so a new,
// empty block autosaves as a draft (ADR 0003).
export const emptyItem: StatItem = {};

export const emptyProps: StatsSectionProps = {
  value: { _type: 'stats', _version: 1, _key: 'stats-empty' },
  index: 0,
  blockKey: 'stats-empty',
};

export const validItem: StatItem = {
  value: '99%',
  label: 'Uptime',
};

// @ts-expect-error A stats item is a value and a label, not a title
export const typoItem: StatItem = { value: '99%', title: 'Uptime' };

export const validProps: StatsSectionProps = {
  value: {
    _type: 'stats',
    _version: 1,
    _key: 'stats-1',
    heading: 'Built for scale',
    items: [validItem],
  },
  index: 0,
  blockKey: 'stats-1',
};

// @ts-expect-error Repeater items live on value, not beside it
export const typoProps: StatsSectionProps = { ...validProps, items: [] };
