import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateBlocks } from 'emdash-plugin-page-builder/blocks';
import { example } from './fixtures/example.ts';

test('v1 to v2 preserves the key and input while renaming heading', () => {
  const stored = Object.freeze({ _type: 'example', _key: 'stable', _version: 1, heading: 'Hello' });
  assert.deepEqual(migrateBlocks([stored], [example]), [
    { _type: 'example', _key: 'stable', _version: 2, title: 'Hello' },
  ]);
  assert.equal(stored.heading, 'Hello');
});

test('current and unknown blocks retain their content and layout order', () => {
  const current = { _type: 'example', _key: 'current', _version: 2, title: 'Now' };
  const unknown = { _type: 'other', _key: 'unknown', _version: 8 };
  assert.deepEqual(migrateBlocks([current, unknown], [example]), [current, unknown]);
});

test('migration chains advance every step and reject gaps or invalid transitions', () => {
  const stored = { _type: 'example', _key: 'stable', _version: 1, heading: 'Hello' };
  const thirdVersion = { ...example, definition: { ...example.definition, currentVersion: 3 },
    migrations: { ...example.migrations, 2: (block) => ({ ...block, _version: 3, title: `${block.title}!` }) } };
  assert.deepEqual(migrateBlocks([stored], [thirdVersion]), [
    { _type: 'example', _key: 'stable', _version: 3, title: 'Hello!' },
  ]);
  assert.throws(() => migrateBlocks([stored], [{ ...thirdVersion, migrations: example.migrations }]), /Missing migration.*v2/);
  for (const change of [{ _key: 'changed', _version: 2 }, { _type: 'changed', _version: 2 }, { _version: 1 }]) {
    assert.throws(() => migrateBlocks([stored], [{ ...example, migrations: { 1: (block) => ({ ...block, ...change }) } }]), /Invalid migration/);
  }
  assert.throws(() => migrateBlocks([{ ...stored, _version: 9 }], [example]), /Unsupported version 9/);
});
