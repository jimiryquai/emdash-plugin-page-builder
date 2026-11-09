import type { SiteBlockType, Section } from 'emdash-plugin-page-builder/blocks';
import { example } from './example.ts';
const section: Section = () => '';
export const siteBlock: SiteBlockType = { ...example, sections: { default: section } };
// @ts-expect-error A site must supply a default, even when it maps a variant.
export const missingDefault: SiteBlockType = { ...example, sections: { featured: section } };
