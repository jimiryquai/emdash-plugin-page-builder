import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from '../astro-harness.js';
import {
  pricing,
  createPricingSource,
  starterPricingCollection,
  scopeField,
  SCOPE_FIELD_SLUG,
  variantField,
  VARIANT_FIELD_SLUG,
} from 'emdash-plugin-page-builder/blocks';

// ---------------------------------------------------------------------------
// Unit seam: the default source against a fake query (CODING_STANDARDS rule 7).

const starterEntry = (id, data, groups = []) => ({
  id,
  data,
  references: {
    group: { entries: groups.map((groupId) => ({ id: groupId, data: { id: groupId } })) },
  },
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
  starterEntry('p1', { name: 'Starter', price: '$19', period: '/mo' }, ['svc-1']),
  starterEntry('p2', { name: 'Scale', price: '$99', period: '/mo' }, ['svc-2']),
  starterEntry(
    'p3',
    { name: 'Growth', price: '$49', price_monthly: '$49', price_yearly: '$39', highlighted: true },
    ['svc-1', 'svc-2'],
  ),
];

test('scope page returns only tiers in the page\'s group, and scope all or missing group returns every tier', async () => {
  const source = createPricingSource({ query: fakeQuery(entries) });
  const scoped = await source({ scope: 'page', group: 'svc-1' });
  assert.deepEqual(scoped.items.map((tier) => tier.name), ['Starter', 'Growth']);

  const all = await source({ scope: 'all' });
  assert.equal(all.items.length, 3);

  const ungrouped = await source({ scope: 'page' });
  assert.equal(ungrouped.items.length, 3);
});

test('the default source works with the starter collection with no mapping', async () => {
  const tierData = {
    name: 'Growth',
    price: '$49',
    price_monthly: '$49',
    price_yearly: '$39',
    period: '/mo',
    description: 'For growing teams',
    features: 'Unlimited projects\nPriority support',
    cta_label: 'Start free trial',
    cta_url: '/signup?plan=growth',
    badge: 'Most popular',
    highlighted: true,
  };
  const starterEntries = [starterEntry('p1', tierData, ['svc-1'])];
  const result = await createPricingSource({ query: fakeQuery(starterEntries) })({
    scope: 'page',
    group: 'svc-1',
  });
  assert.deepEqual(result.items, [tierData]);
  assert.deepEqual(result.cacheHints, [
    { tags: ['list:pricing'] },
    { tags: ['get:p1'] },
  ]);
});

test('the starter collection matches the PricingTier shape and points its group reference at the site\'s groups', () => {
  const collection = starterPricingCollection('services');
  assert.equal(collection.slug, 'pricing');
  assert.deepEqual(
    collection.fields.map((field) => field.slug),
    [
      'name',
      'price',
      'price_monthly',
      'price_yearly',
      'period',
      'description',
      'features',
      'cta_label',
      'cta_url',
      'badge',
      'highlighted',
      'group',
    ],
  );
  const group = collection.fields.at(-1);
  assert.equal(group.type, 'reference');
  assert.deepEqual(group.validation, { targetCollection: 'services' });
});

test('the block definition carries variant and scope fields from their shared builders', () => {
  assert.equal(pricing.definition.slug, 'pricing');
  assert.equal(pricing.definition.currentVersion, 1);
  const fields = pricing.definition.versions[0].fields;
  assert.deepEqual(fields, [
    variantField(pricing.variants),
    scopeField(),
  ]);
  assert.deepEqual(pricing.variants, ['tiers', 'toggle', 'single']);
  assert.deepEqual(pricing.migrations, {});
  assert.equal(fields[0].slug, VARIANT_FIELD_SLUG);
  assert.equal(fields[1].slug, SCOPE_FIELD_SLUG);
});

test('the blocks entry imports in plain Node, as the apply CLI needs', async () => {
  const module = await import('emdash-plugin-page-builder/blocks');
  assert.equal(module.pricing.definition.slug, 'pricing');
});

// ---------------------------------------------------------------------------
// Render seam: PageBuilder resolving scope and variants for the pricing block.

let server, container, PageBuilder, PricingTiers, PricingToggle, PricingSingle;
before(async () => {
  server = await createAstroServer();
  container = await experimental_AstroContainer.create();
  ({ default: PageBuilder } = await server.ssrLoadModule('emdash-plugin-page-builder/blocks/PageBuilder.astro'));
  ({ default: PricingTiers } = await server.ssrLoadModule('/test/blocks/fixtures/PricingTiers.astro'));
  ({ default: PricingToggle } = await server.ssrLoadModule('/test/blocks/fixtures/PricingToggle.astro'));
  ({ default: PricingSingle } = await server.ssrLoadModule('/test/blocks/fixtures/PricingSingle.astro'));
});
after(async () => { await server?.close(); });

const stored = { _type: 'pricing', _version: 1, _key: 'pricing-1' };
function render(value, extra = {}) {
  const blocks = [
    {
      ...pricing,
      sections: { default: PricingTiers, toggle: PricingToggle, single: PricingSingle },
    },
  ];
  return container.renderToString(PageBuilder, { props: { value, blocks, ...extra } });
}

test('an empty block renders through its section rather than throwing', async () => {
  // Every field is optional so the admin's first autosave of a new block
  // succeeds (ADR 0003); an empty block must still render, with no source.
  const html = await render([{ _type: 'pricing', _version: 1, _key: 'pricing-empty' }]);
  assert.match(html, /data-section="tiers"/);
});

test('the block renders tiers from a source through a test sections map, honouring scope', async () => {
  const sources = { pricing: createPricingSource({ query: fakeQuery(entries) }) };

  const scopedHtml = await render([{ ...stored, scope: 'page' }], { sources, group: 'svc-1' });
  assert.match(scopedHtml, /data-section="tiers"/);
  assert.match(scopedHtml, /data-tier="Starter"/);
  assert.match(scopedHtml, /data-tier="Growth"/);
  assert.doesNotMatch(scopedHtml, /data-tier="Scale"/);

  const allHtml = await render([{ ...stored, scope: 'all' }], { sources, group: 'svc-1' });
  assert.match(allHtml, /data-tier="Starter"/);
  assert.match(allHtml, /data-tier="Scale"/);
  assert.match(allHtml, /data-tier="Growth"/);

  const ungroupedHtml = await render([{ ...stored, scope: 'page' }], { sources });
  assert.match(ungroupedHtml, /data-tier="Scale"/);

  const toggleHtml = await render([{ ...stored, variant: 'toggle', scope: 'page' }], {
    sources,
    group: 'svc-1',
  });
  assert.match(toggleHtml, /data-section="toggle"/);
  assert.match(toggleHtml, /data-monthly="\$49"/);
  assert.match(toggleHtml, /data-yearly="\$39"/);

  const singleHtml = await render([{ ...stored, variant: 'single', scope: 'page' }], {
    sources,
    group: 'svc-2',
  });
  assert.match(singleHtml, /data-section="single"/);
  assert.match(singleHtml, /Scale: \$99/);
});
