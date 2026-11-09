import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from '../astro-harness.js';
import {
  team,
  createTeamSource,
  starterTeamCollection,
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
  const calls = { list: [] };
  return {
    calls,
    list: async (collection, filter) => {
      calls.list.push({ collection, filter });
      return {
        entries: filter?.limit ? entries.slice(0, filter.limit) : entries,
        cacheHint: { tags: [`list:${collection}`] },
      };
    },
    get: async (collection, id) => ({
      entry: entries.find((entry) => entry.id === id) ?? null,
      cacheHint: { tags: [`get:${id}`] },
    }),
  };
}

const entries = [
  starterEntry('m1', { name: 'Leslie Alexander', role: 'Co-Founder / CEO' }, ['svc-1']),
  starterEntry('m2', { name: 'Michael Foster', role: 'Co-Founder / CTO' }, ['svc-2']),
  starterEntry('m3', { name: 'Kim Scott', role: 'Head of Support' }, ['svc-1', 'svc-2']),
];

test('scope page returns only members in the page\'s group; scope all or a missing group returns every member', async () => {
  const source = createTeamSource({ query: fakeQuery(entries) });
  const scoped = await source({ scope: 'page', group: 'svc-1' });
  assert.deepEqual(scoped.items.map((member) => member.name), ['Leslie Alexander', 'Kim Scott']);

  const all = await source({ scope: 'all' });
  assert.equal(all.items.length, 3);

  const ungrouped = await source({ scope: 'page' });
  assert.equal(ungrouped.items.length, 3);
});

test('count caps the members for all scope (pushed into the query) and page scope', async () => {
  const all = fakeQuery(entries);
  const items = await createTeamSource({ query: all })({ scope: 'all', count: 2 });
  assert.deepEqual(all.calls.list, [{ collection: 'team', filter: { limit: 2 } }]);
  assert.deepEqual(items.items.map((member) => member.name), ['Leslie Alexander', 'Michael Foster']);

  const page = fakeQuery(entries);
  const scoped = await createTeamSource({ query: page })({ scope: 'page', group: 'svc-1', count: 1 });
  assert.deepEqual(scoped.items.map((member) => member.name), ['Leslie Alexander']);
});

test('the default source works with the starter collection with no mapping', async () => {
  const image = { id: 'media-1', src: '/leslie.webp' };
  const starterEntries = [starterEntry('m1', { name: 'Leslie Alexander', role: 'Co-Founder / CEO', image }, ['svc-1'])];
  const result = await createTeamSource({ query: fakeQuery(starterEntries) })({
    scope: 'page',
    group: 'svc-1',
  });
  assert.deepEqual(result.items, [{ name: 'Leslie Alexander', role: 'Co-Founder / CEO', image }]);
  assert.deepEqual(result.cacheHints, [
    { tags: ['list:team'] },
    { tags: ['get:m1'] },
  ]);
});

test('the starter collection matches the TeamMember shape and points its group reference at the site\'s groups', () => {
  const collection = starterTeamCollection('services');
  assert.equal(collection.slug, 'team');
  assert.deepEqual(
    collection.fields.map((field) => field.slug),
    ['name', 'role', 'image', 'group'],
  );
  const group = collection.fields.at(-1);
  assert.equal(group.type, 'reference');
  assert.deepEqual(group.validation, { targetCollection: 'services' });
});

test('the block definition carries variant, scope and count fields from their shared builders', () => {
  assert.equal(team.definition.slug, 'team');
  assert.equal(team.definition.currentVersion, 1);
  const fields = team.definition.versions[0].fields;
  assert.deepEqual(fields, [
    variantField(team.variants),
    scopeField(),
    countField(),
  ]);
  assert.deepEqual(team.variants, ['four-column', 'three-column']);
  assert.deepEqual(team.migrations, {});
  assert.equal(team.starter, starterTeamCollection);
  assert.equal(fields[0].slug, VARIANT_FIELD_SLUG);
  assert.equal(fields[1].slug, SCOPE_FIELD_SLUG);
  assert.equal(fields[2].slug, COUNT_FIELD_SLUG);
});

test('the blocks entry imports in plain Node, as the apply CLI needs', async () => {
  const module = await import('emdash-plugin-page-builder/blocks');
  assert.equal(module.team.definition.slug, 'team');
});

// ---------------------------------------------------------------------------
// Render seam: PageBuilder resolving scope, count and variants for the block.

let server, container, PageBuilder, TeamFourColumn, TeamThreeColumn;
before(async () => {
  server = await createAstroServer();
  container = await experimental_AstroContainer.create();
  ({ default: PageBuilder } = await server.ssrLoadModule('emdash-plugin-page-builder/blocks/PageBuilder.astro'));
  ({ default: TeamFourColumn } = await server.ssrLoadModule('/test/blocks/fixtures/TeamFourColumn.astro'));
  ({ default: TeamThreeColumn } = await server.ssrLoadModule('/test/blocks/fixtures/TeamThreeColumn.astro'));
});
after(async () => { await server?.close(); });

const stored = { _type: 'team', _version: 1, _key: 'team-1' };
function render(value, extra = {}) {
  const blocks = [
    {
      ...team,
      sections: { default: TeamFourColumn, 'three-column': TeamThreeColumn },
    },
  ];
  return container.renderToString(PageBuilder, { props: { value: [value], blocks, ...extra } });
}

test('the block renders team members from a source through a test sections map for every variant, honouring scope', async () => {
  const sources = { team: createTeamSource({ query: fakeQuery(entries) }) };

  const scopedHtml = await render({ ...stored, variant: 'four-column', scope: 'page' }, { sources, group: 'svc-1' });
  assert.match(scopedHtml, /data-section="four-column"/);
  assert.match(scopedHtml, /data-name="Leslie Alexander"/);
  assert.match(scopedHtml, /data-name="Kim Scott"/);
  assert.doesNotMatch(scopedHtml, /data-name="Michael Foster"/);

  const allHtml = await render({ ...stored, variant: 'four-column', scope: 'all' }, { sources, group: 'svc-1' });
  assert.match(allHtml, /data-name="Michael Foster"/);

  // A missing group turns page scope into all.
  const ungroupedHtml = await render({ ...stored, variant: 'four-column', scope: 'page' }, { sources });
  assert.match(ungroupedHtml, /data-name="Michael Foster"/);

  const threeColumnHtml = await render({ ...stored, variant: 'three-column', scope: 'page' }, {
    sources,
    group: 'svc-2',
  });
  assert.match(threeColumnHtml, /data-section="three-column"/);
  assert.match(threeColumnHtml, /data-name="Michael Foster"/);
  assert.doesNotMatch(threeColumnHtml, /data-name="Leslie Alexander"/);
});
