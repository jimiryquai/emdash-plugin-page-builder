import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from '../astro-harness.js';
import { stats, variantField } from 'emdash-plugin-page-builder/blocks';

const variants = ['graph'];

test('stats is a version 1 seed definition', () => {
  assert.equal(stats.definition.slug, 'stats');
  assert.equal(stats.definition.label, 'Stats');
  assert.equal(stats.definition.category, 'Sections');
  assert.equal(stats.definition.currentVersion, 1);
  assert.deepEqual(stats.definition.versions.map((version) => version.version), [1]);
  assert.deepEqual(stats.migrations, {});
  assert.deepEqual(stats.variants, variants);
  assert.deepEqual(stats.definition.versions[0].fields, [
    { ...variantField(variants), defaultValue: 'graph' },
    { slug: 'eyebrow', label: 'Eyebrow', type: 'string' },
    { slug: 'heading', label: 'Heading', type: 'string', required: true },
    { slug: 'body', label: 'Body', type: 'text' },
    {
      slug: 'items',
      label: 'Items',
      type: 'repeater',
      validation: {
        minItems: 1,
        subFields: [
          { slug: 'value', label: 'Value', type: 'string', required: true },
          { slug: 'label', label: 'Label', type: 'string' },
        ],
      },
    },
  ]);
});

test('the stats description says when to use each variant', () => {
  const description = stats.definition.description;
  for (const variant of variants) {
    assert.match(description, new RegExp(String.raw`\b${variant} when\b`, 'i'));
  }
  assert.match(description, /figures/i);
});

describe('stats sections', () => {
  let server, container, PageBuilder, sections;
  before(async () => {
    server = await createAstroServer();
    container = await experimental_AstroContainer.create();
    ({ default: PageBuilder } = await server.ssrLoadModule('emdash-plugin-page-builder/blocks/PageBuilder.astro'));
    sections = {
      default: await section(server, 'Default'),
      graph: await section(server, 'Graph'),
    };
  });
  after(async () => { await server?.close(); });

  test('the block renders through a test sections map for every variant', async () => {
    for (const variant of stats.variants) {
      const html = await container.renderToString(PageBuilder, { props: {
        value: [{
          _type: 'stats',
          _version: 1,
          _key: 'stats-1',
          variant,
          eyebrow: 'Built for scale',
          heading: 'Figures',
          body: 'Across every team.',
          items: [{ value: '2M+', label: 'Emails processed' }],
        }],
        blocks: [{ ...stats, sections }],
      } });
      assert.match(html, new RegExp(`data-section="${variant}"`));
      assert.match(html, /data-key="stats-1"/);
      assert.match(html, /Built for scale/);
      assert.match(html, /Figures/);
      assert.match(html, /Across every team\./);
      assert.doesNotMatch(html, /data-section="default"/);
    }
  });

  test('repeater items reach the section as typed props', async () => {
    const html = await container.renderToString(PageBuilder, { props: {
      value: [{
        _type: 'stats',
        _version: 1,
        _key: 'stats-items',
        heading: 'Scale',
        items: [
          { value: '2M+', label: 'Emails processed' },
          { value: '99.98%', label: 'Uptime' },
        ],
      }],
      blocks: [{ ...stats, sections }],
    } });
    assert.match(html, /data-section="default"/);
    assert.match(html, /data-value="2M\+"/);
    assert.match(html, /Emails processed/);
    assert.match(html, /data-value="99\.98%"/);
    assert.match(html, /Uptime/);
    assert.match(html, /Scale/);
  });
});

function section(server, name) {
  return server.ssrLoadModule(`/test/blocks/fixtures/stats/${name}.astro`).then((loaded) => loaded.default);
}
