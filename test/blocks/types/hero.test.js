import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from '../astro-harness.js';
import { hero, variantField } from 'emdash-plugin-page-builder/blocks';

const links = {
  slug: 'links',
  label: 'Links',
  type: 'repeater',
  validation: {
    subFields: [
      { slug: 'label', label: 'Label', type: 'string', required: true },
      { slug: 'url', label: 'URL', type: 'url', required: true },
    ],
  },
};

test('hero is a version 1 seed definition', () => {
  assert.equal(hero.definition.slug, 'hero');
  assert.equal(hero.definition.label, 'Hero');
  assert.equal(hero.definition.category, 'Sections');
  assert.equal(hero.definition.currentVersion, 1);
  assert.deepEqual(hero.definition.versions.map((version) => version.version), [1]);
  assert.deepEqual(hero.migrations, {});
  assert.deepEqual(hero.variants, ['centered', 'photo', 'demo']);
  assert.deepEqual(hero.definition.versions[0].fields, [
    { ...variantField(['centered', 'photo', 'demo']), defaultValue: 'centered' },
    { slug: 'eyebrow', label: 'Eyebrow', type: 'string' },
    { slug: 'eyebrow_url', label: 'Eyebrow URL', type: 'url' },
    { slug: 'eyebrow_action', label: 'Eyebrow action', type: 'string' },
    { slug: 'heading', label: 'Heading', type: 'string', required: true },
    { slug: 'body', label: 'Body', type: 'text' },
    { slug: 'image', label: 'Image', type: 'image', options: { darkVariant: true } },
    links,
  ]);
});

test('the hero description says when to use each variant', () => {
  const description = hero.definition.description;
  for (const variant of ['centered', 'photo', 'demo']) {
    assert.match(description, new RegExp(String.raw`\b${variant} when\b`, 'i'));
  }
  assert.match(description, /opening/i);
});

describe('hero sections', () => {
  let server, container, PageBuilder, sections;
  before(async () => {
    server = await createAstroServer();
    container = await experimental_AstroContainer.create();
    ({ default: PageBuilder } = await server.ssrLoadModule('emdash-plugin-page-builder/blocks/PageBuilder.astro'));
    sections = { default: await marker(server, 'default') };
    for (const variant of hero.variants) sections[variant] = await marker(server, variant);
  });
  after(async () => { await server?.close(); });

  test('each hero variant renders through its mapped section', async () => {
    for (const variant of hero.variants) {
      const html = await container.renderToString(PageBuilder, { props: {
        value: [{ _type: 'hero', _version: 1, _key: 'hero-1', variant, heading: 'Open' }],
        blocks: [{ ...hero, sections }],
      } });
      assert.match(html, new RegExp(`data-section="${variant}"`));
      assert.match(html, /data-key="hero-1"/);
      assert.match(html, /Open/);
      assert.doesNotMatch(html, /data-section="default"/);
    }
  });
});

function marker(server, name) {
  return server.ssrLoadModule(`/test/blocks/fixtures/markers/${name}.astro`).then((loaded) => loaded.default);
}
