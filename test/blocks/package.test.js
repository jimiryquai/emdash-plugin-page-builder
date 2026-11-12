import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, copyFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { devDependencies, peerDependencies } = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
);
const astro6Range = peerDependencies.astro.split(' || ').find((range) => range.startsWith('^6.'));
assert.ok(astro6Range, 'peerDependencies.astro includes an Astro 6 range');
const astro6Version = astro6Range.slice(1);
const astro7Version = devDependencies.astro;
const emdashVersion = devDependencies.emdash;

test(`packed Astro export imports and renders with Astro ${astro6Version}`, async (t) => {
  await testPackedConsumer(t, astro6Version, emdashVersion);
});

test(`packed Astro export imports and renders with Astro ${astro7Version}`, async (t) => {
  await testPackedConsumer(t, astro7Version, emdashVersion);
});

async function testPackedConsumer(t, astroVersion, emdashVersion) {
  const consumer = await mkdtemp(join(tmpdir(), 'page-builder-consumer-'));
  let passed = false;
  t.after(async () => {
    if (passed) {
      await rm(consumer, { recursive: true, force: true });
    } else {
      t.diagnostic(`Consumer retained at ${consumer}`);
    }
  });
  const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' };
  const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', consumer], { env, encoding: 'utf8' }));
  assert.ok(packed[0].files.some(({ path }) => path === 'src/blocks/PageBuilder.astro'));
  assert.ok(packed[0].files.some(({ path }) => path === 'dist/plugin.js'));
  assert.ok(packed[0].files.some(({ path }) => path === 'dist/plugin.d.ts'));
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync('npm', [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--no-save',
    `astro@${astroVersion}`,
    `emdash@${emdashVersion}`,
    join(consumer, packed[0].filename),
  ], { cwd: consumer, env, encoding: 'utf8' });
  await mkdir(join(consumer, 'src'));
  await copyFile('test/blocks/astro-harness.js', join(consumer, 'astro-harness.js'));
  await copyFile('test/blocks/fixtures/Section.astro', join(consumer, 'src/Section.astro'));
  await copyFile('test/blocks/fixtures/PostsGrid.astro', join(consumer, 'src/PostsGrid.astro'));
  await copyFile('test/blocks/fixtures/example.ts', join(consumer, 'src/example.ts'));
  await writeFile(join(consumer, 'src/Consumer.astro'), `---
import PageBuilder from 'emdash-plugin-page-builder/blocks/PageBuilder.astro';
import { posts } from 'emdash-plugin-page-builder/blocks';
import { createEditable } from 'emdash';
import Section from './Section.astro';
import PostsGrid from './PostsGrid.astro';
import { example } from './example';

const { sources } = Astro.props;
---
<PageBuilder value={[
    { _type: 'example', _key: 'packed', _version: 1, heading: 'Packed hello' },
    { _type: 'posts', _key: 'packed-posts', _version: 1, heading: 'Packed posts', category: ' news ' },
  ]}
  edit={createEditable('pages', 'packed-page').layout}
  sources={sources}
  blocks={[
    { ...example, sections: { default: Section } },
    { ...posts, sections: { default: PostsGrid } },
  ]} />`);
  await writeFile(join(consumer, 'verify.mjs'), `import { registerHooks } from 'node:module';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from './astro-harness.js';

const guard = registerHooks({ resolve(specifier, context, nextResolve) {
  const result = nextResolve(specifier, context);
  assert.ok(!result.url.endsWith('/dist/plugin.js'), 'blocks loaded the plugin');
  return result;
} });
const blocks = await import('emdash-plugin-page-builder/blocks');
assert.equal(Object.values(blocks).filter(blocks.isBlockType).length, 11);
guard.deregister();
const { default: descriptor, createPlugin } = await import('emdash-plugin-page-builder/plugin');
assert.equal(descriptor().entrypoint, 'emdash-plugin-page-builder/plugin');
const result = await createPlugin().hooks['content:beforePublish'].handler({
  content: { data: { layout: [{ _type: 'hero', _key: 'packed', _version: 1 }] } },
  collection: 'pages', origin: 'api',
}, {});
assert.equal(result.cancel, true);
assert.ok(result.reason.includes('hero (packed): heading'));

const server = await createAstroServer(process.cwd());
try {
  const { default: Consumer } = await server.ssrLoadModule(join(process.cwd(), 'src/Consumer.astro'));
  const container = await experimental_AstroContainer.create();
  const sourceCalls = [];
  const html = await container.renderToString(Consumer, {
    props: {
      sources: {
        posts: async (context) => {
          sourceCalls.push(context);
          return Array.from({ length: context.count ?? 0 }, (_, i) => ({
            title: \`Packed post \${i + 1}\`,
            url: \`/posts/packed-\${i + 1}\`,
          }));
        },
      },
    },
  });
  assert.deepEqual(sourceCalls, [{ scope: 'all', group: undefined, count: 4, category: 'news' }]);
  assert.match(html, /<div style="display:contents" data-emdash-ref=/);
  assert.match(html, /data-key="packed" data-version="2"/);
  assert.match(html, /<h2>Packed hello<\\/h2><\\/section><\\/div>/);
  assert.match(html, /<h2>Packed posts<\\/h2>/);
  assert.equal(html.match(/<li data-url="\\/posts\\/packed-/g)?.length, 4);
} finally {
  await server.close();
}
`);
  execFileSync(process.execPath, ['verify.mjs'], { cwd: consumer, env, encoding: 'utf8' });
  passed = true;
}
