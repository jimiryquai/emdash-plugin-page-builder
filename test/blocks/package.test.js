import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, symlink, copyFile, readdir, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from './astro-harness.js';

test('packed Astro export imports and renders in an installed consumer', async (t) => {
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
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync('npm', ['install', '--offline', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund', join(consumer, packed[0].filename)], { cwd: consumer, env });
  // Reuse the exact installed peer versions; the package itself is installed from its tarball.
  // Copy EmDash so Vite's Astro CSS module IDs stay inside the consumer root.
  await cp(resolve('node_modules/emdash'), join(consumer, 'node_modules/emdash'), { recursive: true });
  for (const dependency of await readdir('node_modules')) {
    if (dependency.startsWith('.') || dependency === 'emdash' || dependency === 'emdash-plugin-page-builder') continue;
    await symlink(resolve('node_modules', dependency), join(consumer, 'node_modules', dependency), 'dir');
  }
  await mkdir(join(consumer, 'src'));
  await copyFile('test/blocks/fixtures/Section.astro', join(consumer, 'src/Section.astro'));
  await copyFile('test/blocks/fixtures/example.ts', join(consumer, 'src/example.ts'));
  await writeFile(join(consumer, 'src/Consumer.astro'), `---
import PageBuilder from 'emdash-plugin-page-builder/blocks/PageBuilder.astro';
import Section from './Section.astro';
import { example } from './example';
---
<PageBuilder value={[{ _type: 'example', _key: 'packed', _version: 1, heading: 'Packed hello' }]}
  blocks={[{ ...example, sections: { default: Section } }]} />`);
  const server = await createAstroServer(consumer);
  try {
    const { default: Consumer } = await server.ssrLoadModule(join(consumer, 'src/Consumer.astro'));
    const container = await experimental_AstroContainer.create();
    const html = await container.renderToString(Consumer);
    assert.match(html, /data-key="packed" data-version="2"/);
    assert.match(html, /<h2>Packed hello<\/h2>/);
  } finally {
    await server.close();
  }
  passed = true;
});
