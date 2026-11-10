import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from '../astro-harness.js';
import {
  comparison,
  comparisonColumnKeys,
  VARIANT_FIELD_SLUG,
} from 'emdash-plugin-page-builder/blocks';

let server, container, PageBuilder, ComparisonSection;

before(async () => {
  server = await createAstroServer();
  container = await experimental_AstroContainer.create();
  ({ default: PageBuilder } = await server.ssrLoadModule(
    'emdash-plugin-page-builder/blocks/PageBuilder.astro',
  ));
  ({ default: ComparisonSection } = await server.ssrLoadModule(
    '/test/blocks/fixtures/comparison/ComparisonSection.astro',
  ));
});

after(async () => {
  await server?.close();
});

const columns = [
  { key: 'first', label: 'Basic' },
  { key: 'second', label: 'Team' },
  { key: 'third', label: 'Enterprise' },
];

const rows = [
  {
    group_name: 'Collaboration',
    name: 'Shared workspaces',
    first_value: '1',
    second_value: '5',
    third_value: 'Unlimited',
  },
];

function render(value) {
  return container.renderToString(PageBuilder, {
    props: {
      value,
      blocks: [
        {
          ...comparison,
          sections: { default: ComparisonSection, table: ComparisonSection },
        },
      ],
    },
  });
}

test('comparison defines a block with typed row and column repeaters', () => {
  assert.equal(comparison.definition.slug, 'comparison');
  assert.equal(comparison.definition.label, 'Comparison');
  assert.equal(comparison.definition.currentVersion, 1);
  assert.deepEqual(comparison.variants, ['table']);
  assert.deepEqual(comparison.migrations, {});

  const fields = comparison.definition.versions[0].fields;
  assert.equal(fields.find((field) => field.slug === VARIANT_FIELD_SLUG).type, 'select');
  assert.deepEqual(
    fields.find((field) => field.slug === VARIANT_FIELD_SLUG).validation.options,
    ['table'],
  );

  const columnsField = fields.find((field) => field.slug === 'columns');
  assert.equal(columnsField.type, 'repeater');
  assert.equal(columnsField.validation.maxItems, 3);
  assert.deepEqual(comparisonColumnKeys, ['first', 'second', 'third']);
  assert.deepEqual(
    columnsField.validation.subFields.map((field) => [field.slug, field.type]),
    [
      ['key', 'select'],
      ['label', 'string'],
    ],
  );

  const rowsField = fields.find((field) => field.slug === 'rows');
  assert.equal(rowsField.type, 'repeater');
  assert.deepEqual(
    rowsField.validation.subFields.map((field) => [field.slug, field.type]),
    [
      ['group_name', 'string'],
      ['name', 'string'],
      ['first_value', 'text'],
      ['second_value', 'text'],
      ['third_value', 'text'],
    ],
  );
});

test('the comparison block renders through a test sections map for every variant', async () => {
  for (const variant of comparison.variants) {
    const html = await render([{
      _type: 'comparison',
      _version: 1,
      _key: `comparison-${variant}`,
      variant,
      columns,
      rows,
    }]);

    assert.match(html, new RegExp(`data-variant="${variant}"`));
    assert.match(html, /data-column="first"[^>]*>Basic</);
    assert.match(html, /data-column="second"[^>]*>Team</);
    assert.match(html, /data-column="third"[^>]*>Enterprise</);
    assert.match(html, /data-row="Shared workspaces"/);
    assert.match(html, /data-group="Collaboration"/);
    assert.match(html, /data-values="1\|5\|Unlimited"/);
  }
});

test('an empty block renders through its section rather than throwing', async () => {
  // Every field and repeater is optional so the admin's first autosave of a
  // new block succeeds (ADR 0003); an empty block must still render.
  const html = await render([{ _type: 'comparison', _version: 1, _key: 'comparison-empty' }]);
  assert.match(html, /data-variant="default"/);
  assert.match(html, /data-key="comparison-empty"/);
});

test('rows and columns reach the section as typed props', async () => {
  const html = await render([{
    _type: 'comparison',
    _version: 1,
    _key: 'comparison-props',
    columns,
    rows,
  }]);

  assert.match(html, /data-variant="default"/);
  assert.match(html, /Basic/);
  assert.match(html, /Shared workspaces/);
  assert.match(html, /data-values="1\|5\|Unlimited"/);
});
