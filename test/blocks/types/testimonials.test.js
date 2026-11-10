import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from '../astro-harness.js';
import {
  testimonials,
  createTestimonialsSource,
  starterTestimonialsCollection,
  scopeField,
  SCOPE_FIELD_SLUG,
  variantField,
  VARIANT_FIELD_SLUG,
  countField,
  COUNT_FIELD_SLUG,
  mergeCacheHints,
} from 'emdash-plugin-page-builder/blocks';

// ---------------------------------------------------------------------------
// Unit seam: the default source against a fake query (CODING_STANDARDS rule 7).

const starterEntry = (id, data, groups = []) => ({
  id,
  data,
  references: { group: { entries: groups.map((groupId) => ({ id: groupId, data: { id: groupId } })) } },
});

function fakeQuery(entries) {
  const calls = { list: [], get: [] };
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return {
    calls,
    list: async (collection, filter) => {
      calls.list.push({ collection, filter });
      return {
        entries: filter?.limit ? entries.slice(0, filter.limit) : entries,
        cacheHint: { tags: [`list:${collection}`] },
      };
    },
    get: async (collection, id, options) => {
      calls.get.push({ collection, id, options });
      return { entry: byId.get(id) ?? null, cacheHint: { tags: [`get:${id}`] } };
    },
  };
}

const entries = [
  starterEntry('t1', { quote: 'Superb', author: 'Ann', role: 'CTO', company: 'Acme' }, ['svc-1']),
  starterEntry('t2', { quote: 'Delightful', author: 'Bo' }, ['svc-2']),
  starterEntry('t3', { quote: 'Reliable', author: 'Cy' }, ['svc-1', 'svc-2']),
];

test('scope page returns only entries in the page\'s group', async () => {
  const source = createTestimonialsSource({ query: fakeQuery(entries) });
  const items = await source({ scope: 'page', group: 'svc-1' });
  assert.deepEqual(items.items.map((item) => item.author), ['Ann', 'Cy']);
});

test('scope all returns every entry', async () => {
  const source = createTestimonialsSource({ query: fakeQuery(entries) });
  const items = await source({ scope: 'all' });
  assert.equal(items.items.length, 3);
});

test('scope page with no group behaves as all', async () => {
  const source = createTestimonialsSource({ query: fakeQuery(entries) });
  const items = await source({ scope: 'page' });
  assert.equal(items.items.length, 3);
});

test('count limits the entries for all scope (pushed into the query) and page scope', async () => {
  const all = fakeQuery(entries);
  await createTestimonialsSource({ query: all })({ scope: 'all', count: 2 });
  assert.deepEqual(all.calls.list, [{ collection: 'testimonials', filter: { limit: 2 } }]);
  const page = fakeQuery(entries);
  const items = await createTestimonialsSource({ query: page })({ scope: 'page', group: 'svc-1', count: 1 });
  assert.deepEqual(items.items.map((item) => item.author), ['Ann']);
});

test('page scope follows the query cursor until a match is found and stops once count is reached', async () => {
  const pageOne = starterEntry('t1', { quote: 'Off group', author: 'Ann' }, ['svc-2']);
  const pageTwo = starterEntry('t2', { quote: 'On group', author: 'Bo' }, ['svc-1']);
  const calls = [];
  const paged = {
    list: async (collection, filter) => {
      calls.push(filter ?? {});
      return filter?.cursor === 'page-2'
        ? { entries: [pageTwo] }
        : { entries: [pageOne], nextCursor: 'page-2' };
    },
    get: async (collection, id) => ({ entry: id === 't1' ? pageOne : pageTwo }),
  };
  const items = await createTestimonialsSource({ query: paged })({ scope: 'page', group: 'svc-1', count: 1 });
  assert.deepEqual(items.items.map((item) => item.author), ['Bo']);
  assert.deepEqual(calls, [{}, { cursor: 'page-2' }]);
  // A satisfied count stops paging: page two is not requested again.
  const calls2 = [];
  const firstMatch = starterEntry('m1', { quote: 'Here', author: 'Cy' }, ['svc-1']);
  const single = {
    list: async () => {
      calls2.push('list');
      return { entries: [firstMatch], nextCursor: 'never' };
    },
    get: async () => ({ entry: firstMatch }),
  };
  await createTestimonialsSource({ query: single })({ scope: 'page', group: 'svc-1', count: 1 });
  assert.deepEqual(calls2, ['list']);
});

test('the default source works with the starter collection with no mapping', async () => {
  const avatar = { id: 'media-1', src: '/ann.webp' };
  const withAvatar = [
    starterEntry('t1', { quote: 'Superb', author: 'Ann', role: 'CTO', company: 'Acme', avatar }, ['svc-1']),
  ];
  const items = await createTestimonialsSource({ query: fakeQuery(withAvatar) })({ scope: 'page', group: 'svc-1' });
  assert.deepEqual(items.items, [{ quote: 'Superb', author: 'Ann', role: 'CTO', company: 'Acme', avatar }]);
});

test('a source reports the cache hints of every list and get it read', async () => {
  const source = createTestimonialsSource({ query: fakeQuery(entries) });
  const { items, cacheHints } = await source({ scope: 'page', group: 'svc-1' });
  assert.equal(items.length, 2);
  // One list page plus one get per entry, each carrying its hint.
  assert.deepEqual(cacheHints, [
    { tags: ['list:testimonials'] },
    ...entries.map(({ id }) => ({ tags: [`get:${id}`] })),
  ]);
});

test('the starter collection matches the Testimonial shape and points its group reference at the site\'s groups', () => {
  const collection = starterTestimonialsCollection('services');
  assert.equal(collection.slug, 'testimonials');
  assert.deepEqual(
    collection.fields.map((field) => field.slug),
    ['quote', 'author', 'role', 'company', 'avatar', 'group'],
  );
  const group = collection.fields.at(-1);
  assert.equal(group.type, 'reference');
  assert.deepEqual(group.validation, { targetCollection: 'services' });
});

test('the block definition carries variant, scope and count fields from their shared builders', () => {
  assert.equal(testimonials.definition.slug, 'testimonials');
  assert.equal(testimonials.definition.currentVersion, 1);
  const fields = testimonials.definition.versions[0].fields;
  assert.deepEqual(fields, [
    variantField(testimonials.variants),
    scopeField(),
    countField(),
  ]);
  assert.deepEqual(testimonials.variants, ['single', 'grid', 'split']);
  assert.deepEqual(testimonials.migrations, {});
  assert.equal(fields[0].slug, VARIANT_FIELD_SLUG);
  assert.equal(fields[1].slug, SCOPE_FIELD_SLUG);
  assert.equal(fields[2].slug, COUNT_FIELD_SLUG);
});

test('the blocks entry imports in plain Node, as the apply CLI needs', async () => {
  const module = await import('emdash-plugin-page-builder/blocks');
  assert.equal(module.testimonials.definition.slug, 'testimonials');
});

test('merged hints union tags and keep the latest lastModified', () => {
  const earlier = new Date('2026-01-01T00:00:00Z');
  const later = new Date('2026-02-02T00:00:00Z');
  assert.deepEqual(
    mergeCacheHints([
      { tags: ['a'], lastModified: later },
      { tags: ['a', 'b'], lastModified: earlier },
    ]),
    { tags: ['a', 'b'], lastModified: later },
  );
  assert.deepEqual(mergeCacheHints([]), {});
});

test('scope fields use the shared slug and the fixed vocabulary', () => {
  assert.deepEqual(scopeField(), {
    slug: 'scope',
    label: 'Scope',
    type: 'select',
    defaultValue: 'all',
    validation: { options: ['page', 'all'] },
  });
});

test('a site source whose collection field is renamed fails typecheck', () => {
  // The fixture maps `entry.data.quotation`, which no longer exists on its
  // collection type; the @ts-expect-error there is used, so this compile passes.
  // Remove the rename (or the directive) and this run fails instead.
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'test/blocks/tsconfig.json'], { stdio: 'pipe' });
});

// ---------------------------------------------------------------------------
// Render seam: PageBuilder resolving scope, count and variants for the block.

let server, container, PageBuilder, QuoteGrid, QuoteSingle;
before(async () => {
  server = await createAstroServer();
  container = await experimental_AstroContainer.create();
  ({ default: PageBuilder } = await server.ssrLoadModule('emdash-plugin-page-builder/blocks/PageBuilder.astro'));
  ({ default: QuoteGrid } = await server.ssrLoadModule('/test/blocks/fixtures/QuoteGrid.astro'));
  ({ default: QuoteSingle } = await server.ssrLoadModule('/test/blocks/fixtures/QuoteSingle.astro'));
});
after(async () => { await server?.close(); });

const stored = { _type: 'testimonials', _version: 1, _key: 'stable' };
function render(value, extra = {}) {
  const blocks = [{ ...testimonials, sections: { default: QuoteGrid, single: QuoteSingle } }];
  return container.renderToString(PageBuilder, { props: { value, blocks, ...extra } });
}

test('the section receives the source\'s items and count reaches the source', async () => {
  const calls = [];
  const sources = {
    testimonials: async ({ scope, group, count }) => {
      calls.push({ scope, group, count });
      return Array.from({ length: count ?? 0 }, (_, i) => ({ quote: `Q${i}`, author: `A${i}` }));
    },
  };
  const html = await render([{ ...stored, scope: 'all', count: 2 }], { sources });
  assert.deepEqual(calls, [{ scope: 'all', group: undefined, count: 2 }]);
  assert.equal(html.match(/<li /g).length, 2);
});

test('scope page with a group stays page; without a group it becomes all', async () => {
  const calls = [];
  const sources = {
    testimonials: async (context) => {
      calls.push(context);
      return [{ quote: 'q', author: 'a' }];
    },
  };
  await render([{ ...stored, scope: 'page' }], { sources, group: 'svc-1' });
  await render([{ ...stored, scope: 'page' }], { sources });
  assert.deepEqual(calls.map(({ scope, group }) => ({ scope, group })), [
    { scope: 'page', group: 'svc-1' },
    { scope: 'all', group: undefined },
  ]);
});

test('the single variant uses its section and an unmapped variant falls back to default', async () => {
  const items = [{ quote: 'Solo', author: 'Ann' }];
  const sources = { testimonials: async () => items };
  assert.match(await render([{ ...stored, variant: 'single' }], { sources }), /data-section="single"/);
  assert.match(await render([{ ...stored, variant: 'grid' }], { sources }), /data-section="grid"/);
});

test('an empty block renders through its section rather than throwing', async () => {
  // Every field is optional so the admin's first autosave of a new block
  // succeeds (ADR 0003); an empty block must still render, with no source.
  const html = await render([{ _type: 'testimonials', _version: 1, _key: 'testimonials-empty' }]);
  assert.match(html, /data-section="grid"/);
});

test('a source may return { items, cacheHints } and both forms render the items', async () => {
  const items = [{ quote: 'Hinted', author: 'Ann' }];
  const sources = {
    testimonials: async () => ({ items, cacheHints: [{ tags: ['testimonials'] }] }),
  };
  // The container harness never enables Astro.cache, so applying the hints to
  // the page cache is covered by the mergeCacheHints unit test above and the
  // Astro.cache?.enabled guard in PageBuilder; here we prove the seam accepts
  // the result form and its items still reach the section.
  const html = await render([stored], { sources });
  assert.match(html, /data-section="grid"/);
  assert.match(html, /<li data-author="Ann">Hinted<\/li>/);
});
