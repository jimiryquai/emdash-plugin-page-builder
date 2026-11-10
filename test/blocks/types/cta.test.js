import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from '../astro-harness.js';
import { cta, linksField, variantField } from 'emdash-plugin-page-builder/blocks';

test('cta is a version 1 seed definition', () => {
  assert.equal(cta.definition.slug, 'cta');
  assert.equal(cta.definition.label, 'Call to action');
  assert.equal(cta.definition.category, 'Sections');
  assert.equal(cta.definition.currentVersion, 1);
  assert.deepEqual(cta.definition.versions.map((version) => version.version), [1]);
  assert.deepEqual(cta.migrations, {});
  assert.deepEqual(cta.variants, ['start', 'centered']);
  assert.deepEqual(cta.definition.versions[0].fields, [
    { ...variantField(['start', 'centered']), defaultValue: 'start' },
    { slug: 'heading', label: 'Heading', type: 'string' },
    { slug: 'body', label: 'Body', type: 'text' },
    linksField(),
  ]);
});

test('the cta description says when to use each variant', () => {
  const description = cta.definition.description;
  for (const variant of ['start', 'centered']) {
    assert.match(description, new RegExp(String.raw`\b${variant} when\b`, 'i'));
  }
  assert.match(description, /not the opening/i);
});

describe('cta sections', () => {
  let server, container, PageBuilder, sections;
  before(async () => {
    server = await createAstroServer();
    container = await experimental_AstroContainer.create();
    ({ default: PageBuilder } = await server.ssrLoadModule('emdash-plugin-page-builder/blocks/PageBuilder.astro'));
    sections = { default: await marker(server, 'default') };
    for (const variant of cta.variants) sections[variant] = await marker(server, variant);
  });
  after(async () => { await server?.close(); });

  test('an empty block renders through its section rather than throwing', async () => {
    // Every field is optional so the admin's first autosave of a new block
    // succeeds (ADR 0003); an empty block must still render.
    const html = await container.renderToString(PageBuilder, { props: {
      value: [{ _type: 'cta', _version: 1, _key: 'cta-empty' }],
      blocks: [{ ...cta, sections }],
    } });
    assert.match(html, /data-section="default"/);
    assert.match(html, /data-key="cta-empty"/);
  });

  test('each cta variant renders through its mapped section', async () => {
    for (const variant of cta.variants) {
      const html = await container.renderToString(PageBuilder, { props: {
        value: [{ _type: 'cta', _version: 1, _key: 'cta-1', variant, heading: 'Act' }],
        blocks: [{ ...cta, sections }],
      } });
      assert.match(html, new RegExp(`data-section="${variant}"`));
      assert.match(html, /data-key="cta-1"/);
      assert.match(html, /Act/);
      assert.doesNotMatch(html, /data-section="default"/);
    }
  });
});

function marker(server, name) {
  return server.ssrLoadModule(`/test/blocks/fixtures/markers/${name}.astro`).then((loaded) => loaded.default);
}
