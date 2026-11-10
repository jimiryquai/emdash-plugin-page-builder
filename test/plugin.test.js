import { test } from 'node:test';
import assert from 'node:assert/strict';
import pageBuilderPlugin, { createPlugin } from 'emdash-plugin-page-builder/plugin';

const event = data => ({ content: { id: 'page', data }, collection: 'arbitrary', origin: 'api' });
const hero = { _type: 'hero', _key: 'intro', _version: 1 };

test('native publish policy rejects missing fields with a shared plain-text reason and minimal capability', async () => {
  const descriptor = pageBuilderPlugin();
  const plugin = createPlugin();
  assert.equal(descriptor.format, 'native');
  assert.equal(descriptor.entrypoint, 'emdash-plugin-page-builder/plugin');
  assert.equal(descriptor.id, plugin.id);
  assert.equal(descriptor.version, plugin.version);
  assert.deepEqual(descriptor.capabilities, ['hooks.content-policy:register']);
  assert.deepEqual(plugin.capabilities, ['hooks.content-policy:register']);
  assert.deepEqual(Object.keys(plugin.hooks), ['content:beforePublish']);
  const result = await plugin.hooks['content:beforePublish'].handler(event({ layout: [hero] }), {});
  assert.deepEqual(result, { cancel: true, reason: 'Missing required block fields: hero (intro): heading' });
});

test('publish policy walks multiple and nested layouts and ignores unrelated values', async () => {
  const hook = createPlugin().hooks['content:beforePublish'].handler;
  const result = await hook(event({
    first: [hero, { _type: 'foreign', _key: 'foreign', _version: 1 }],
    nested: { rows: [{ second: [{ _type: 'cta', _key: 'action', _version: 1, heading: 'Act', links: [{}] }] }] },
    body: [{ _type: 'block', _key: 'text', children: [{ text: 'Copy' }] }],
    title: 'Page', nullable: null,
  }), {});
  assert.equal(result.cancel, true);
  assert.match(result.reason, /hero \(intro\): heading/);
  assert.match(result.reason, /cta \(action\): links\[0\]\.label/);
  assert.match(result.reason, /cta \(action\): links\[0\]\.url/);
  assert.doesNotMatch(result.reason, /foreign/);
});

test('publish policy allows complete layouts, unknown blocks, and content without layouts', async () => {
  const hook = createPlugin().hooks['content:beforePublish'].handler;
  for (const data of [{}, { layout: null }, { layout: [] }, {
    layout: [{ ...hero, heading: 'Welcome' }, { _type: 'foreign', _key: 'other', _version: 1 }],
    nested: { layout: [{ _type: 'features', _key: 'features', _version: 1, heading: 'Features', items: [{ title: 'One' }] }] },
  }]) assert.equal(await hook(event(data), {}), undefined);
});

test('publish rejection stays plain text and within 500 characters for large layouts and hostile keys', async () => {
  const hook = createPlugin().hooks['content:beforePublish'].handler;
  const result = await hook(event({ layout: Array.from({ length: 100 }, (_, index) => ({
    ...hero, _key: `<b>\n${index}${'x'.repeat(600)}`,
  })) }), {});
  assert.equal(result.cancel, true);
  assert.ok(result.reason.length > 0 && result.reason.length <= 500);
  assert.doesNotMatch(result.reason, /[<>\u0000-\u001f\u007f]/);
  assert.match(result.reason, /100 missing fields total/);
});
