import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from '../astro-harness.js';
import {
  faq,
  createFaqSource,
  starterFaqCollection,
  scopeField,
  SCOPE_FIELD_SLUG,
  variantField,
  VARIANT_FIELD_SLUG,
  countField,
  COUNT_FIELD_SLUG,
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
  starterEntry('f1', { question: 'Is there a free trial?', answer: 'Yes, 14 days.' }, ['svc-1']),
  starterEntry('f2', { question: 'Do you offer support?', answer: 'Around the clock.' }, ['svc-2']),
  starterEntry('f3', { question: 'Can I self-host?', answer: 'Yes, with a licence.' }, ['svc-1', 'svc-2']),
];

test('scope page returns only FAQs in the page\'s group, and scope all or missing group returns every FAQ', async () => {
  const source = createFaqSource({ query: fakeQuery(entries) });
  const scoped = await source({ scope: 'page', group: 'svc-1' });
  assert.deepEqual(scoped.items.map((item) => item.question), ['Is there a free trial?', 'Can I self-host?']);

  const all = await source({ scope: 'all' });
  assert.equal(all.items.length, 3);

  const ungrouped = await source({ scope: 'page' });
  assert.equal(ungrouped.items.length, 3);
});

test('count limits the FAQs for all scope (pushed into the query) and page scope', async () => {
  const scoped = fakeQuery(entries);
  const pageScoped = await createFaqSource({ query: scoped })({ scope: 'page', group: 'svc-1', count: 1 });
  // Page scope never pushes count into the query; it pages until count is reached.
  assert.deepEqual(pageScoped.items.map((item) => item.question), ['Is there a free trial?']);
  assert.deepEqual(scoped.calls.list, [{ collection: 'faqs', filter: undefined }]);

  const all = fakeQuery(entries);
  await createFaqSource({ query: all })({ scope: 'all', count: 2 });
  assert.deepEqual(all.calls.list, [{ collection: 'faqs', filter: { limit: 2 } }]);
});

test('the default source works with the starter collection with no mapping', async () => {
  const starterEntries = [starterEntry('f1', { question: 'Is there a free trial?', answer: 'Yes, 14 days.' }, ['svc-1'])];
  const result = await createFaqSource({ query: fakeQuery(starterEntries) })({ scope: 'page', group: 'svc-1' });
  assert.deepEqual(result.items, [{ question: 'Is there a free trial?', answer: 'Yes, 14 days.' }]);
  assert.deepEqual(result.cacheHints, [{ tags: ['list:faqs'] }, { tags: ['get:f1'] }]);
});

test('the starter collection matches the Faq shape and points its group reference at the site\'s groups', () => {
  const collection = starterFaqCollection('services');
  assert.equal(collection.slug, 'faqs');
  assert.deepEqual(
    collection.fields.map((field) => field.slug),
    ['question', 'answer', 'group'],
  );
  const group = collection.fields.at(-1);
  assert.equal(group.type, 'reference');
  assert.deepEqual(group.validation, { targetCollection: 'services' });
});

test('the block definition carries variant, scope and count fields from their shared builders', () => {
  assert.equal(faq.definition.slug, 'faq');
  assert.equal(faq.definition.currentVersion, 1);
  const fields = faq.definition.versions[0].fields;
  assert.deepEqual(fields, [
    variantField(faq.variants),
    scopeField(),
    countField(),
  ]);
  assert.deepEqual(faq.variants, ['two-column', 'centered']);
  assert.deepEqual(faq.migrations, {});
  assert.equal(fields[0].slug, VARIANT_FIELD_SLUG);
  assert.equal(fields[1].slug, SCOPE_FIELD_SLUG);
  assert.equal(fields[2].slug, COUNT_FIELD_SLUG);
});

test('the blocks entry imports in plain Node, as the apply CLI needs', async () => {
  const module = await import('emdash-plugin-page-builder/blocks');
  assert.equal(module.faq.definition.slug, 'faq');
});

// ---------------------------------------------------------------------------
// Render seam: PageBuilder resolving scope, count and variants for the block.

let server, container, PageBuilder, FaqTwoColumn, FaqCentered;
before(async () => {
  server = await createAstroServer();
  container = await experimental_AstroContainer.create();
  ({ default: PageBuilder } = await server.ssrLoadModule('emdash-plugin-page-builder/blocks/PageBuilder.astro'));
  ({ default: FaqTwoColumn } = await server.ssrLoadModule('/test/blocks/fixtures/FaqTwoColumn.astro'));
  ({ default: FaqCentered } = await server.ssrLoadModule('/test/blocks/fixtures/FaqCentered.astro'));
});
after(async () => { await server?.close(); });

const stored = { _type: 'faq', _version: 1, _key: 'faq-1' };
function render(value, extra = {}) {
  const blocks = [
    {
      ...faq,
      sections: { default: FaqTwoColumn, centered: FaqCentered },
    },
  ];
  return container.renderToString(PageBuilder, { props: { value, blocks, ...extra } });
}

test('the block renders FAQs from a source through a test sections map for every variant, honouring scope', async () => {
  const sources = { faq: createFaqSource({ query: fakeQuery(entries) }) };

  const scopedHtml = await render([{ ...stored, scope: 'page' }], { sources, group: 'svc-1' });
  assert.match(scopedHtml, /data-section="two-column"/);
  assert.match(scopedHtml, /data-question="Is there a free trial\?"/);
  assert.match(scopedHtml, /data-question="Can I self-host\?"/);
  assert.doesNotMatch(scopedHtml, /data-question="Do you offer support\?"/);

  const allHtml = await render([{ ...stored, scope: 'all' }], { sources, group: 'svc-1' });
  assert.match(allHtml, /data-question="Do you offer support\?"/);

  const ungroupedHtml = await render([{ ...stored, scope: 'page' }], { sources });
  assert.match(ungroupedHtml, /data-question="Do you offer support\?"/);

  const centeredHtml = await render([{ ...stored, variant: 'centered', scope: 'page' }], {
    sources,
    group: 'svc-1',
  });
  assert.match(centeredHtml, /data-section="centered"/);
  assert.match(centeredHtml, /Yes, 14 days\./);

  // An unmapped variant falls back to the default section.
  const fallbackHtml = await render([{ ...stored, variant: 'two-column', scope: 'page' }], {
    sources,
    group: 'svc-1',
  });
  assert.match(fallbackHtml, /data-section="two-column"/);
});

test('count reaches the source and caps the rendered FAQs', async () => {
  const calls = [];
  const sources = {
    faq: async ({ scope, group, count }) => {
      calls.push({ scope, group, count });
      return createFaqSource({ query: fakeQuery(entries) })({ scope, group, count });
    },
  };
  const html = await render([{ ...stored, scope: 'all', count: 2 }], { sources });
  assert.deepEqual(calls, [{ scope: 'all', group: undefined, count: 2 }]);
  assert.equal(html.match(/<details /g).length, 2);
});
