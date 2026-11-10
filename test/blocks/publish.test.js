import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as blocks from 'emdash-plugin-page-builder/blocks';

const types = Object.values(blocks).filter(blocks.isBlockType);
const stored = (type, data = {}) => ({ _type: type, _key: `${type}-key`, _version: 1, ...data });

test('publish requirements restore required fields and repeater minimums for every block', () => {
  assert.equal(types.length, 10);
  for (const type of types) assert.ok(Array.isArray(type.requiredToPublish));
  assert.deepEqual(blocks.findMissingToPublish(types.map(type => stored(type.definition.slug)), types).sort((a, b) => a.blockType.localeCompare(b.blockType)), [
    { blockKey: 'features-key', blockType: 'features', field: 'heading' },
    { blockKey: 'features-key', blockType: 'features', field: 'items' },
    { blockKey: 'hero-key', blockType: 'hero', field: 'heading' },
    { blockKey: 'cta-key', blockType: 'cta', field: 'heading' },
    { blockKey: 'comparison-key', blockType: 'comparison', field: 'columns' },
    { blockKey: 'comparison-key', blockType: 'comparison', field: 'rows' },
    { blockKey: 'stats-key', blockType: 'stats', field: 'heading' },
    { blockKey: 'stats-key', blockType: 'stats', field: 'items' },
    { blockKey: 'prose-key', blockType: 'prose', field: 'heading' },
    { blockKey: 'prose-key', blockType: 'prose', field: 'content' },
  ].sort((a, b) => a.blockType.localeCompare(b.blockType)));
});

test('publish check reports indexed repeater fields, blanks, and empty Portable Text without mutation', () => {
  const value = [
    stored('hero', { heading: '  ', links: [{ label: '', url: null }, { label: 'Go' }] }),
    stored('features', { heading: 'Features', items: [{}, { title: 'Ready' }] }),
    stored('comparison', { columns: [{}], rows: [{ name: ' ' }] }),
    stored('stats', { heading: 'Stats', items: [{ label: 'Optional' }] }),
    stored('prose', { heading: 'Prose', content: [] }),
    stored('foreign'),
  ];
  const original = structuredClone(value);
  assert.deepEqual(blocks.findMissingToPublish(value, types), [
    ['hero', 'heading'], ['hero', 'links[0].label'], ['hero', 'links[0].url'], ['hero', 'links[1].url'],
    ['features', 'items[0].title'], ['comparison', 'columns[0].key'],
    ['comparison', 'columns[0].label'], ['comparison', 'rows[0].name'],
    ['stats', 'items[0].value'], ['prose', 'content'],
  ].map(([blockType, field]) => ({ blockKey: `${blockType}-key`, blockType, field })));
  assert.deepEqual(value, original);
});

test('publish check upgrades old blocks before checking current rules', () => {
  const type = {
    ...blocks.hero,
    definition: { ...blocks.hero.definition, currentVersion: 2 },
    migrations: { 1: block => ({ ...block, _version: 2, heading: block.oldHeading }) },
  };
  const value = [stored('hero', { oldHeading: 'Migrated' })];
  assert.deepEqual(blocks.findMissingToPublish(value, [type]), []);
  assert.equal(value[0]._version, 1);
  assert.throws(() => blocks.findMissingToPublish([stored('hero', { _version: 3 })], [type]), /Unsupported version/);
});

test('complete layouts and optional empty links pass the publish check', () => {
  assert.deepEqual(blocks.findMissingToPublish([
    stored('hero', { heading: 'Hero' }), stored('cta', { heading: 'Act', links: [] }),
    stored('features', { heading: 'Features', items: [{ title: 'One' }] }),
    stored('stats', { heading: 'Stats', items: [{ value: '10' }] }),
    stored('comparison', { columns: [{ key: 'first', label: 'Us' }], rows: [{ name: 'Feature' }] }),
    stored('prose', { heading: 'Terms', content: [{ _type: 'block', children: [{ text: 'Terms' }] }] }),
    stored('pricing'), stored('team'), stored('testimonials'), stored('faq'),
  ], types), []);
});
