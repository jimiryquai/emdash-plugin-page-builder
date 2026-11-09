import { test } from 'node:test';

test('the blocks entry can be imported', async () => {
  await import('emdash-plugin-page-builder/blocks');
});
