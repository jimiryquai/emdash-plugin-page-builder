import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('packed Astro export imports and renders with Astro 6.4.8', async (t) => {
  await testPackedConsumer(t, '6.4.8');
});

test('packed Astro export imports and renders with Astro 7.4.4', async (t) => {
  await testPackedConsumer(t, '7.4.4');
});

async function testPackedConsumer(t, astroVersion) {
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
    'emdash@1.5.0',
    join(consumer, packed[0].filename),
  ], { cwd: consumer, env, encoding: 'utf8' });
  await mkdir(join(consumer, 'src'));
  await copyFile('test/blocks/astro-harness.js', join(consumer, 'astro-harness.js'));
  await copyFile('test/blocks/fixtures/Section.astro', join(consumer, 'src/Section.astro'));
  await copyFile('test/blocks/fixtures/example.ts', join(consumer, 'src/example.ts'));
  await writeFile(join(consumer, 'src/Consumer.astro'), `---
import PageBuilder from 'emdash-plugin-page-builder/blocks/PageBuilder.astro';
import Section from './Section.astro';
import { example } from './example';
---
<PageBuilder value={[{ _type: 'example', _key: 'packed', _version: 1, heading: 'Packed hello' }]}
  blocks={[{ ...example, sections: { default: Section } }]} />`);
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
assert.equal(Object.values(blocks).filter(blocks.isBlockType).length, 10);
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
  const html = await container.renderToString(Consumer);
  assert.match(html, /data-key="packed" data-version="2"/);
  assert.match(html, /<h2>Packed hello<\\/h2>/);
} finally {
  await server.close();
}
`);
  execFileSync(process.execPath, ['verify.mjs'], { cwd: consumer, env, encoding: 'utf8' });
  passed = true;
}
