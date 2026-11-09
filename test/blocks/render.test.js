import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from './astro-harness.js';
import { example } from './fixtures/example.ts';

let server, container, PageBuilder, Section, Featured, Fallback, Blocks;
before(async () => {
  server = await createAstroServer();
  container = await experimental_AstroContainer.create();
  ({ default: PageBuilder } = await server.ssrLoadModule('emdash-plugin-page-builder/blocks/PageBuilder.astro'));
  ({ Blocks } = await server.ssrLoadModule('emdash/ui'));
  ({ default: Section } = await server.ssrLoadModule('/test/blocks/fixtures/Section.astro'));
  ({ default: Featured } = await server.ssrLoadModule('/test/blocks/fixtures/Featured.astro'));
  ({ default: Fallback } = await server.ssrLoadModule('/test/blocks/fixtures/Fallback.astro'));
});
after(async () => { await server?.close(); });
const stored = { _type: 'example', _version: 1, _key: 'stable', heading: 'Hello' };
function render(value, extra = {}) {
  return container.renderToString(PageBuilder, { props: {
    value, blocks: [{ ...example, sections: { default: Section, featured: Featured } }], ...extra,
  } });
}

test('stored v1 renders through its v2 section with the key unchanged', async () => {
  const html = await render([stored]);
  assert.match(html, /data-key="stable" data-version="2" data-index="0"/);
  assert.match(html, /<h2>Hello<\/h2>/);
});

test('an unmapped variant uses the default section and a mapped variant uses its section', async () => {
  assert.match(await render([{ ...stored, variant: 'plain' }]), /<h2>Hello<\/h2>/);
  assert.match(await render([{ ...stored, variant: 'featured' }]), /<aside>Hello<\/aside>/);
});

test('unknown blocks use the same fallback as EmDash Blocks', async () => {
  const value = [{ _type: 'unknown', _version: 1, _key: 'other' }];
  const direct = await container.renderToString(Blocks, { props: { value, fallback: Fallback } });
  assert.match(direct, /Unknown: unknown/);
  assert.equal(await render(value, { fallback: Fallback }), direct);
  assert.equal(await render(value), await container.renderToString(Blocks, { props: { value } }));
});

test('shared sources receive scope and group after migration and their items reach the section', async () => {
  const source = async ({ scope, group }) => [`${scope}:${group ?? 'none'}`];
  const sources = { example: source };
  assert.match(await render([{ ...stored, scope: 'page' }], { sources, group: 'group-1' }), /<p>page:group-1<\/p>/);
  assert.match(await render([{ ...stored, scope: 'all' }], { sources, group: 'group-1' }), /<p>all:group-1<\/p>/);
  assert.match(await render([{ ...stored, scope: 'page' }], { sources }), /<p>all:none<\/p>/);
});

test('empty and null layouts render nothing', async () => {
  assert.equal(await render([]), '');
  assert.equal(await render(null), '');
});
