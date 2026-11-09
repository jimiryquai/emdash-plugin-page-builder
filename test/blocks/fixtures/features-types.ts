import type { FeatureItem, FeaturesSectionProps } from 'emdash-plugin-page-builder/blocks';

export const validItem: FeatureItem = {
  title: 'Valid Feature',
  description: 'Valid description',
  icon: 'star',
  image: '/img/feat.png',
  cta_label: 'Learn More',
  cta_url: 'https://example.com',
};

// @ts-expect-error Typo'd field on FeatureItem must be a type error
export const typoItem: FeatureItem = { title: 'Invalid Feature', typofield: 'oops' };

export const validProps: FeaturesSectionProps = {
  value: {
    _type: 'features',
    _version: 1,
    _key: 'feat-1',
    heading: 'Heading',
    items: [validItem],
  },
  index: 0,
  blockKey: 'feat-1',
};

// @ts-expect-error FeaturesSectionProps has no top-level items property
export const typoProps: FeaturesSectionProps = { ...validProps, items: [] };
