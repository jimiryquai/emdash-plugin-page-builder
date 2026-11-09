import type { ApplySeedBlockTypeInput } from 'emdash';

export { VARIANT_FIELD_SLUG, variantField } from './variant.js';

export interface StoredBlock {
  _type: string;
  _version: number;
  _key: string;
  [field: string]: unknown;
}

/** A block module owns the seed definition and every upgrade step. */
export interface BlockType {
  definition: ApplySeedBlockTypeInput & { description: string };
  variants: readonly string[];
  /** Keyed by the version being upgraded; each step returns version N + 1. */
  migrations: Readonly<Record<number, (block: Readonly<StoredBlock>) => StoredBlock>>;
}

export type Section = (props: { value: StoredBlock; index: number; blockKey: string; items?: readonly unknown[] }) => unknown;

export interface Sections {
  default: Section;
  [variant: string]: Section;
}

/** Sites attach their sections to each package block module. */
export interface SiteBlockType extends BlockType {
  sections: Sections;
}

export type Source = (context: {
  scope: 'page' | 'all';
  group?: string;
}) => readonly unknown[] | Promise<readonly unknown[]>;

/** The same pure chain serves stored-content migration and render-time upgrades. */
export function migrateBlocks(
  value: readonly StoredBlock[],
  blockTypes: readonly BlockType[],
): StoredBlock[] {
  const types = new Map(blockTypes.map((block) => [block.definition.slug, block]));
  return value.map((stored) => {
    const type = types.get(stored._type);
    if (!type) return stored;
    const target = type.definition.currentVersion;
    if (!Number.isInteger(stored._version) || stored._version < 1 || stored._version > target) {
      throw new Error(`Unsupported version ${stored._version} for block ${stored._type} (${stored._key})`);
    }
    let block = stored;
    while (block._version < target) {
      const migrate = type.migrations[block._version];
      if (!migrate) throw new Error(`Missing migration for ${block._type} v${block._version}`);
      const next = migrate(block);
      if (next._key !== block._key || next._type !== block._type || next._version !== block._version + 1) {
        throw new Error(`Invalid migration for ${block._type} v${block._version}: preserve _key and _type and advance one version`);
      }
      block = next;
    }
    return block;
  });
}

export { hero } from './types/hero.js';
export { cta } from './types/cta.js';
