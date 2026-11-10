import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from '../astro-harness.js';
import {
  features,
  featureVariants,
  featureVariantDescriptions,
  VARIANT_FIELD_SLUG,
} from 'emdash-plugin-page-builder/blocks';

let server, container, PageBuilder;
let DefaultSection,
  TwoColumnSection,
  ThreeColumnSection,
  ThreeColumnDemosSection,
  AlternatingSection;

before(async () => {
  server = await createAstroServer();
  container = await experimental_AstroContainer.create();
  ({ default: PageBuilder } = await server.ssrLoadModule(
    'emdash-plugin-page-builder/blocks/PageBuilder.astro',
  ));
  ({ default: DefaultSection } = await server.ssrLoadModule(
    '/test/blocks/fixtures/features/DefaultFeatures.astro',
  ));
  ({ default: TwoColumnSection } = await server.ssrLoadModule(
    '/test/blocks/fixtures/features/TwoColumnFeatures.astro',
  ));
  ({ default: ThreeColumnSection } = await server.ssrLoadModule(
    '/test/blocks/fixtures/features/ThreeColumnFeatures.astro',
  ));
  ({ default: ThreeColumnDemosSection } = await server.ssrLoadModule(
    '/test/blocks/fixtures/features/ThreeColumnDemosFeatures.astro',
  ));
  ({ default: AlternatingSection } = await server.ssrLoadModule(
    '/test/blocks/fixtures/features/AlternatingFeatures.astro',
  ));
});

after(async () => {
  await server?.close();
});

const sampleItems = [
  {
    title: 'Shared Inbox',
    description: 'Keep every customer conversation in one clean, collaborative inbox.',
    image: { url: '/img/screenshots/inbox.webp' },
    icon: 'mail',
    cta_label: 'See how it works',
    cta_url: '/features/inbox',
  },
  {
    title: 'Automated Routing',
    description: 'Direct tickets to the right team instantly.',
    image: { url: '/img/screenshots/routing.webp' },
    icon: 'zap',
    cta_label: 'Learn more',
    cta_url: '/features/routing',
  },
];

function createSections() {
  return {
    default: DefaultSection,
    'two-column': TwoColumnSection,
    'three-column': ThreeColumnSection,
    'three-column-demos': ThreeColumnDemosSection,
    alternating: AlternatingSection,
  };
}

function render(value) {
  return container.renderToString(PageBuilder, {
    props: {
      value,
      blocks: [
        {
          ...features,
          sections: createSections(),
        },
      ],
    },
  });
}

test('features block satisfies BlockType and exports expected metadata', () => {
  assert.equal(features.definition.slug, 'features');
  assert.equal(features.definition.label, 'Features');
  assert.equal(features.definition.currentVersion, 1);
  assert.equal(typeof features.definition.description, 'string');
  assert.ok(features.definition.description.length > 20);

  // Each variant is described in the description for MCP agents
  for (const variant of featureVariants) {
    assert.ok(
      features.definition.description.includes(variant),
      `features.definition.description must mention variant "${variant}"`,
    );
    assert.ok(
      typeof featureVariantDescriptions[variant] === 'string' &&
        featureVariantDescriptions[variant].length > 0,
      `variant "${variant}" must have an entry in featureVariantDescriptions`,
    );
  }

  // Variants array matches exported featureVariants
  assert.deepEqual(features.variants, featureVariants);
  assert.deepEqual(features.migrations, {});

  // V1 fields
  const v1 = features.definition.versions.find((v) => v.version === 1);
  assert.ok(v1, 'version 1 must be present');
  const fields = v1.fields;

  // Heading field
  const heading = fields.find((f) => f.slug === 'heading');
  assert.ok(heading, 'heading field must be present');
  assert.equal(heading.type, 'string');

  // Eyebrow field
  const eyebrow = fields.find((f) => f.slug === 'eyebrow');
  assert.ok(eyebrow, 'eyebrow field must be present');
  assert.equal(eyebrow.type, 'string');

  // Subheadline field
  const subheadline = fields.find((f) => f.slug === 'subheadline');
  assert.ok(subheadline, 'subheadline field must be present');
  assert.equal(subheadline.type, 'text');

  // Variant field
  const variantField = fields.find((f) => f.slug === VARIANT_FIELD_SLUG);
  assert.ok(variantField, 'variant field must be present');
  assert.equal(variantField.type, 'select');
  assert.deepEqual(variantField.validation?.options, [...featureVariants]);

  // Repeater field for items
  const items = fields.find((f) => f.slug === 'items');
  assert.ok(items, 'items repeater field must be present');
  assert.equal(items.type, 'repeater');
  assert.ok(Array.isArray(items.validation?.subFields), 'repeater must have subFields');

  const subFields = items.validation?.subFields ?? [];
  const titleSub = subFields.find((f) => f.slug === 'title');
  assert.ok(titleSub, 'item title subfield must be present');
  assert.equal(titleSub.type, 'string');

  const descSub = subFields.find((f) => f.slug === 'description');
  assert.ok(descSub, 'item description subfield must be present');
  assert.equal(descSub.type, 'text');

  const imageSub = subFields.find((f) => f.slug === 'image');
  assert.ok(imageSub, 'item image subfield must be present');
  assert.equal(imageSub.type, 'image');

  const iconSub = subFields.find((f) => f.slug === 'icon');
  assert.ok(iconSub, 'item icon subfield must be present');
  assert.equal(iconSub.type, 'string');

  const ctaLabelSub = subFields.find((f) => f.slug === 'cta_label');
  assert.ok(ctaLabelSub, 'item cta_label subfield must be present');
  assert.equal(ctaLabelSub.type, 'string');

  const ctaUrlSub = subFields.find((f) => f.slug === 'cta_url');
  assert.ok(ctaUrlSub, 'item cta_url subfield must be present');
  assert.equal(ctaUrlSub.type, 'url');
});

test('the features block renders through a test sections map for every variant', async () => {
  for (const variant of featureVariants) {
    const block = {
      _type: 'features',
      _version: 1,
      _key: `features-${variant}`,
      heading: `Headline for ${variant}`,
      eyebrow: 'Powerful features',
      subheadline: 'All tools in one unified interface.',
      variant,
      items: sampleItems,
    };

    const html = await render([block]);
    assert.match(
      html,
      new RegExp(`data-variant="${variant}"`),
      `Expected HTML to contain data-variant="${variant}"`,
    );
    assert.match(
      html,
      new RegExp(`Headline for ${variant}`),
      `Expected HTML to contain heading for variant "${variant}"`,
    );
    assert.match(html, /Powerful features/);
    assert.match(html, /All tools in one unified interface\./);
  }
});

test('unmapped or omitted variant falls back to the default section', async () => {
  const withoutVariant = {
    _type: 'features',
    _version: 1,
    _key: 'features-no-variant',
    heading: 'Features Without Explicit Variant',
    items: sampleItems,
  };
  const htmlWithout = await render([withoutVariant]);
  assert.match(htmlWithout, /data-variant="default"/);
  assert.match(htmlWithout, /Features Without Explicit Variant/);

  const unmappedVariant = {
    _type: 'features',
    _version: 1,
    _key: 'features-unmapped',
    heading: 'Features With Unmapped Variant',
    variant: 'non-existent-layout',
    items: sampleItems,
  };
  const htmlUnmapped = await render([unmappedVariant]);
  assert.match(htmlUnmapped, /data-variant="default"/);
  assert.match(htmlUnmapped, /Features With Unmapped Variant/);
});

test('an empty block renders through its section rather than throwing', async () => {
  // Every field is optional so the admin's first autosave of a new block
  // succeeds (ADR 0003); an empty block must still render.
  const html = await render([{ _type: 'features', _version: 1, _key: 'features-empty' }]);
  assert.match(html, /data-variant="default"/);
  assert.match(html, /data-key="features-empty"/);
});

test('repeater items reach the section as typed props', async () => {
  const block = {
    _type: 'features',
    _version: 1,
    _key: 'features-items-test',
    heading: 'Platform Capabilities',
    items: [
      {
        title: 'Real-time Sync',
        description: 'Instant data synchronization across devices.',
        image: { url: '/img/sync.png' },
        icon: 'sync-icon',
        cta_label: 'Explore Sync',
        cta_url: 'https://example.com/sync',
      },
      {
        title: 'Team Permissions',
        description: 'Granular access control for every member.',
        image: '/img/permissions.png',
        icon: 'lock-icon',
        cta_label: 'View Roles',
        cta_url: 'https://example.com/roles',
      },
    ],
  };

  const html = await render([block]);

  // Section received items and rendered their subfields
  assert.match(html, /data-title="Real-time Sync"/);
  assert.match(html, /<h3>Real-time Sync<\/h3>/);
  assert.match(html, /Instant data synchronization across devices\./);
  assert.match(html, /src="\/img\/sync\.png"/);
  assert.match(html, /sync-icon/);
  assert.match(html, /href="https:\/\/example\.com\/sync"/);
  assert.match(html, /Explore Sync/);

  assert.match(html, /data-title="Team Permissions"/);
  assert.match(html, /<h3>Team Permissions<\/h3>/);
  assert.match(html, /Granular access control for every member\./);
  assert.match(html, /src="\/img\/permissions\.png"/);
  assert.match(html, /lock-icon/);
  assert.match(html, /href="https:\/\/example\.com\/roles"/);
  assert.match(html, /View Roles/);
});
