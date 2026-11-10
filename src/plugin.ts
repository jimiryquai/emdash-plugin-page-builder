import metadata from '../package.json' with { type: 'json' };
import { definePlugin, type PluginDescriptor } from 'emdash';
import * as blocks from './blocks/index.js';
import { findMissingToPublish, isBlockType, type MissingPublishField, type StoredBlock } from './blocks/core.js';

const identity = { id: 'page-builder', version: metadata.version };
const capabilities = ['hooks.content-policy:register'] as const;
const exports: unknown[] = Object.values(blocks);
const blockTypes = exports.filter(isBlockType);
const slugs = new Set(blockTypes.map(type => type.definition.slug));

/** Register the native runtime from the site's Astro configuration. */
export default function pageBuilderPlugin(): PluginDescriptor {
  return {
    ...identity,
    format: 'native',
    entrypoint: 'emdash-plugin-page-builder/plugin',
    capabilities: [...capabilities],
  };
}

function isPackageBlock(value: unknown): value is StoredBlock {
  return typeof value === 'object' && value !== null &&
    '_type' in value && typeof value._type === 'string' && slugs.has(value._type) &&
    '_key' in value && typeof value._key === 'string' && '_version' in value;
}

/** Collection field names and nesting belong to sites, so inspect their values. */
function findMissingInData(value: unknown): MissingPublishField[] {
  if (Array.isArray(value)) {
    return [
      ...findMissingToPublish(value.filter(isPackageBlock), blockTypes),
      ...value.flatMap(findMissingInData),
    ];
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(findMissingInData);
  }
  return [];
}

function rejectionReason(missing: readonly MissingPublishField[]): string {
  // Stored keys are editor input. Keep the policy response plain text even if
  // a key contains markup or control characters.
  const plain = (value: string): string => value.replace(/[<>\u0000-\u001f\u007f]/g, ' ');
  const details = missing.map(({ blockType, blockKey, field }) =>
    `${plain(blockType)} (${plain(blockKey).slice(0, 80)}): ${plain(field)}`);
  const prefix = 'Missing required block fields: ';
  const full = prefix + details.join('; ');
  if (full.length <= 500) return full;
  const suffix = `; ${missing.length} missing fields total. Fix these and retry.`;
  return full.slice(0, 500 - suffix.length) + suffix;
}

/** EmDash's native loader calls this named factory at runtime. */
export function createPlugin() {
  return definePlugin({
    ...identity,
    capabilities: [...capabilities],
    hooks: {
      'content:beforePublish': async (event) => {
        const missing = findMissingInData(event.content.data);
        if (missing.length) return { cancel: true, reason: rejectionReason(missing) };
      },
    },
  });
}
