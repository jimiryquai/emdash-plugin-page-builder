import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  layoutToMarkdown,
  portableTextToMarkdown,
  hero,
  cta,
  features,
  testimonials,
  pricing,
  comparison,
  team,
  faq,
  stats,
  prose,
} from 'emdash-plugin-page-builder/blocks';

const blocks = [hero, cta, features, testimonials, pricing, comparison, team, faq, stats, prose];

describe('portableTextToMarkdown', () => {
  const span = (text, marks) => ({ _type: 'span', _key: text, text, ...(marks ? { marks } : {}) });

  test('renders paragraphs, headings, blockquotes and lists with levels', () => {
    assert.equal(
      portableTextToMarkdown([
        { _type: 'block', _key: 'h', style: 'h3', children: [span('Heading three')] },
        { _type: 'block', _key: 'p1', style: 'normal', children: [span('First paragraph.')] },
        { _type: 'block', _key: 'q', style: 'blockquote', children: [span('A quoted line.')] },
        { _type: 'block', _key: 'b1', style: 'normal', listItem: 'bullet', level: 1, children: [span('Top bullet')] },
        { _type: 'block', _key: 'b2', style: 'normal', listItem: 'bullet', level: 2, children: [span('Nested bullet')] },
        { _type: 'block', _key: 'n1', style: 'normal', listItem: 'number', level: 1, children: [span('First step')] },
        { _type: 'block', _key: 'n2', style: 'normal', listItem: 'number', level: 1, children: [span('Second step')] },
        { _type: 'block', _key: 'p2', style: 'normal', children: [span('Last paragraph.')] },
      ]),
      '### Heading three\n\n' +
        'First paragraph.\n\n' +
        '> A quoted line.\n\n' +
        '- Top bullet\n' +
        '  - Nested bullet\n\n' +
        '1. First step\n' +
        '2. Second step\n\n' +
        'Last paragraph.',
    );
  });

  test('keeps ordered parent numbering and child indentation across nested items', () => {
    assert.equal(
      portableTextToMarkdown([
        { _type: 'block', listItem: 'number', level: 1, children: [span('Parent A')] },
        { _type: 'block', listItem: 'number', level: 2, children: [span('Child A')] },
        { _type: 'block', listItem: 'number', level: 2, children: [span('Child B')] },
        { _type: 'block', listItem: 'number', level: 1, children: [span('Parent B')] },
      ]),
      '1. Parent A\n   1. Child A\n   2. Child B\n2. Parent B',
    );
  });

  test('renders strong, em, code and link marks from mark definitions', () => {
    assert.equal(
      portableTextToMarkdown([
        {
          _type: 'block',
          _key: 'p',
          style: 'normal',
          markDefs: [{ _type: 'link', _key: 'l1', href: 'https://example.com' }],
          children: [
            span('Plain '),
            span('bold', ['strong']),
            span(' and '),
            span('italic', ['em']),
            span(' and '),
            span('code', ['code']),
            span(' and '),
            span('linked', ['l1']),
            span(' and '),
            span('all of it', ['strong', 'em', 'code', 'l1']),
          ],
        },
      ]),
      'Plain **bold** and *italic* and `code` and [linked](https://example.com)' +
        ' and [***`all of it`***](https://example.com)',
    );
  });

  test('keeps mixed child lists inside their parent and restarts lists after prose', () => {
    assert.equal(
      portableTextToMarkdown([
        { _type: 'block', listItem: 'number', level: 1, children: [span('First')] },
        { _type: 'block', listItem: 'bullet', level: 2, children: [span('A bullet')] },
        { _type: 'block', listItem: 'number', level: 3, children: [span('A step')] },
        { _type: 'block', listItem: 'bullet', level: 2, children: [span('Another bullet')] },
        { _type: 'block', listItem: 'number', level: 1, children: [span('Second')] },
        { _type: 'block', style: 'normal', children: [span('A paragraph.')] },
        { _type: 'block', listItem: 'number', level: 1, children: [span('Restarted')] },
      ]),
      '1. First\n   - A bullet\n     1. A step\n   - Another bullet\n2. Second\n\nA paragraph.\n\n1. Restarted',
    );
  });

  test('skips unknown block and span types and empty content instead of throwing', () => {
    assert.equal(
      portableTextToMarkdown([
        { _type: 'image', _key: 'img', asset: { _ref: 'x' } },
        'not a block',
        {
          _type: 'block',
          _key: 'p',
          style: 'normal',
          children: [
            span(''),
            span('Kept '),
            { _type: 'divider', _key: 'd' },
            { _key: 'typeless', text: 'typeless span kept' },
          ],
        },
        { _type: 'block', _key: 'm', style: 'mystery', children: [span('Unknown style is a paragraph.')] },
        { _type: 'block', _key: 'empty', style: 'normal', children: [] },
      ]),
      'Kept typeless span kept\n\nUnknown style is a paragraph.',
    );
    assert.equal(portableTextToMarkdown(undefined), '');
    assert.equal(portableTextToMarkdown('no'), '');
  });
});

describe('layoutToMarkdown', () => {
  test('dispatches to each block module after migrating, joining with one blank line and skipping unknown types', () => {
    const migrating = {
      definition: {
        slug: 'migrating',
        label: 'Migrating',
        description: 'A block with a version step.',
        currentVersion: 2,
        versions: [{ version: 2, fields: [{ slug: 'heading', label: 'Heading', type: 'string' }] }],
      },
      variants: [],
      requiredToPublish: [],
      migrations: { 1: (block) => ({ ...block, heading: 'Upgraded', _version: 2 }) },
      toMarkdown: (block) => `# ${block.heading}`,
    };
    const withoutRenderer = {
      definition: {
        slug: 'plain',
        label: 'Plain',
        description: 'A block with no Markdown rendering.',
        currentVersion: 1,
        versions: [{ version: 1, fields: [] }],
      },
      variants: [],
      requiredToPublish: [],
      migrations: {},
    };
    assert.equal(
      layoutToMarkdown(
        [
          { _type: 'migrating', _version: 1, _key: 'a' },
          { _type: 'unknown', _version: 1, _key: 'b' },
          { _type: 'plain', _version: 1, _key: 'c' },
          { _type: 'migrating', _version: 1, _key: 'd' },
        ],
        [migrating, withoutRenderer],
      ),
      '# Upgraded\n\n# Upgraded',
    );
    assert.equal(layoutToMarkdown([], [migrating]), '');
  });

  test('hero renders its announcement, heading, body, image and links', () => {
    const markdown = layoutToMarkdown(
      [{
        _type: 'hero',
        _version: 1,
        _key: 'hero-1',
        eyebrow: 'New in 2.0',
        eyebrow_action: 'Read the changelog',
        eyebrow_url: '/changelog',
        heading: 'Build pages fast',
        body: 'Compose sections from versioned blocks.',
        image: { id: 'hero.png', alt: 'The page builder', meta: { storageKey: 'abc123.png' } },
        links: [
          { label: 'Start free', url: '/signup' },
          { label: 'Book a demo', url: '/demo' },
          { label: 'Broken link' },
        ],
      }],
      blocks,
    );
    assert.equal(
      markdown,
      '[New in 2.0 — Read the changelog](/changelog)\n\n' +
        '# Build pages fast\n\n' +
        'Compose sections from versioned blocks.\n\n' +
        '![The page builder](/_emdash/api/media/file/abc123.png)\n\n' +
        '- [Start free](/signup)\n' +
        '- [Book a demo](/demo)',
    );
  });

  test('cta renders its heading, body and links', () => {
    assert.equal(
      layoutToMarkdown(
        [{
          _type: 'cta',
          _version: 1,
          _key: 'cta-1',
          heading: 'Ready to build?',
          body: 'Start your page today.',
          links: [{ label: 'Start free', url: '/signup' }],
        }],
        blocks,
      ),
      '## Ready to build?\n\nStart your page today.\n\n- [Start free](/signup)',
    );
  });

  test('features renders its heading, subheadline and items with images and CTAs', () => {
    assert.equal(
      layoutToMarkdown(
        [{
          _type: 'features',
          _version: 1,
          _key: 'features-1',
          eyebrow: 'Why here',
          heading: 'Everything a page needs',
          subheadline: 'Ten blocks, one layout.',
          items: [
            {
              title: 'Versioned blocks',
              description: 'Schemas migrate forward.',
              icon: 'layers',
              image: { src: '/img/demos.png', alt: 'Demos' },
              cta_label: 'See how',
              cta_url: '/docs',
            },
            { title: 'Agent-native', description: 'The same fields serve people and agents.' },
            { title: 'Only a title' },
          ],
        }],
        blocks,
      ),
      'Why here\n\n' +
        '## Everything a page needs\n\n' +
        'Ten blocks, one layout.\n\n' +
        '### Versioned blocks\n\nSchemas migrate forward.\n\n![Demos](/img/demos.png)\n\n[See how](/docs)\n\n' +
        '### Agent-native\n\nThe same fields serve people and agents.\n\n' +
        '### Only a title',
    );
  });

  test('stats renders its heading, body and value-label pairs', () => {
    assert.equal(
      layoutToMarkdown(
        [{
          _type: 'stats',
          _version: 1,
          _key: 'stats-1',
          eyebrow: 'By the numbers',
          heading: 'Proof it works',
          body: 'Measured across sites.',
          items: [
            { value: '99.9%', label: 'Uptime' },
            { value: '2 min', label: 'To first page' },
            { value: '10' },
          ],
        }],
        blocks,
      ),
      'By the numbers\n\n## Proof it works\n\nMeasured across sites.\n\n' +
        '- **99.9%** — Uptime\n' +
        '- **2 min** — To first page\n' +
        '- **10**',
    );
  });

  test('comparison renders a grouped Markdown table from its columns and rows', () => {
    assert.equal(
      layoutToMarkdown(
        [{
          _type: 'comparison',
          _version: 1,
          _key: 'comparison-1',
          columns: [
            { key: 'first', label: 'Page builder' },
            { key: 'second', label: 'marketing-blocks' },
            { key: 'third', label: 'Raw HTML' },
          ],
          rows: [
            { group_name: 'Authoring' },
            { name: 'Versioned schemas', first_value: 'Yes', second_value: 'No', third_value: 'No' },
            { name: 'Pipe | in value', first_value: 'a|b' },
            { name: 'Only a name' },
          ],
        }],
        blocks,
      ),
      '| Feature | Page builder | marketing-blocks | Raw HTML |\n' +
        '| --- | --- | --- | --- |\n' +
        '| **Authoring** |  |  |  |\n' +
        '| Versioned schemas | Yes | No | No |\n' +
        '| Pipe \\| in value | a\\|b |  |  |\n' +
        '| Only a name |  |  |  |',
    );
  });

  test('prose renders its heading, body and Portable Text content', () => {
    assert.equal(
      layoutToMarkdown(
        [{
          _type: 'prose',
          _version: 1,
          _key: 'prose-1',
          heading: 'Privacy Policy',
          body: 'Last updated on December 19, 2025.',
          content: [
            {
              _type: 'block',
              _key: 'p1',
              style: 'normal',
              children: [{ _type: 'span', _key: 's1', text: 'We respect your privacy.' }],
            },
            {
              _type: 'block',
              _key: 'h1',
              style: 'h2',
              children: [{ _type: 'span', _key: 's2', text: 'What we collect' }],
            },
            {
              _type: 'block',
              _key: 'p2',
              style: 'normal',
              markDefs: [{ _type: 'link', _key: 'ld1', href: '/policy' }],
              children: [
                { _type: 'span', _key: 's3', text: 'Read the ' },
                { _type: 'span', _key: 's4', text: 'full policy', marks: ['strong', 'ld1'] },
                { _type: 'span', _key: 's5', text: ' for details.' },
              ],
            },
          ],
        }],
        blocks,
      ),
      '## Privacy Policy\n\n' +
        'Last updated on December 19, 2025.\n\n' +
        'We respect your privacy.\n\n' +
        '## What we collect\n\n' +
        'Read the [**full policy**](/policy) for details.',
    );
  });

  test('testimonials renders its own heading plus the items passed for its _key', () => {
    assert.equal(
      layoutToMarkdown(
        [
          { _type: 'testimonials', _version: 1, _key: 'quotes-1', variant: 'grid', scope: 'all' },
          { _type: 'testimonials', _version: 1, _key: 'quotes-2' },
        ],
        blocks,
        {
          items: {
            'quotes-1': [
              {
                quote: 'The page builder cut our rebuild to days.',
                author: 'Ada Lovelace',
                role: 'CTO',
                company: 'Analytical Engines',
              },
              { quote: 'Agents and editors finally share one source.', author: 'Grace Hopper' },
            ],
          },
        },
      ),
      '## Testimonials\n\n' +
        '> "The page builder cut our rebuild to days."\n' +
        '> — **Ada Lovelace**, CTO (Analytical Engines)\n\n' +
        '> "Agents and editors finally share one source."\n' +
        '> — **Grace Hopper**\n\n' +
        '## Testimonials',
    );
  });

  test('pricing renders its own heading plus the tiers passed for its _key', () => {
    assert.equal(
      layoutToMarkdown(
        [{ _type: 'pricing', _version: 1, _key: 'pricing-1', variant: 'toggle' }],
        blocks,
        {
          items: {
            'pricing-1': [
              {
                name: 'Free',
                price: '$0',
                period: '/mo',
                description: 'For one page.',
                features: 'One page\nCommunity support',
                cta_label: 'Start free',
                cta_url: '/signup',
              },
              {
                name: 'Pro',
                price_monthly: '$20/mo',
                price_yearly: '$190/yr',
                badge: 'Most popular',
                description: 'Everything, unlimited.',
                features: 'Unlimited pages\nPriority support',
                highlighted: true,
              },
            ],
          },
        },
      ),
      '## Pricing\n\n' +
        '### Free\n\n**$0**/mo\n\nFor one page.\n\n- One page\n- Community support\n\n[Start free](/signup)\n\n' +
        '### Pro — Most popular\n\n- **Monthly**: $20/mo\n- **Yearly**: $190/yr\n\n' +
        'Everything, unlimited.\n\n- Unlimited pages\n- Priority support',
    );
  });

  test('faq renders its own heading plus question and answer pairs passed for its _key', () => {
    assert.equal(
      layoutToMarkdown(
        [{ _type: 'faq', _version: 1, _key: 'faq-1', variant: 'two-column' }],
        blocks,
        {
          items: {
            'faq-1': [
              {
                question: 'Does it version blocks?',
                answer: 'Yes, every block type is versioned with migrations.',
              },
              { question: 'Only a question?' },
            ],
          },
        },
      ),
      '## FAQ\n\n' +
        '### Does it version blocks?\n\nYes, every block type is versioned with migrations.\n\n' +
        '### Only a question?',
    );
  });

  test('team renders its own heading plus the members passed for its _key', () => {
    assert.equal(
      layoutToMarkdown(
        [{ _type: 'team', _version: 1, _key: 'team-1', variant: 'three-column' }],
        blocks,
        {
          items: {
            'team-1': [
              { name: 'James Ryan', role: 'Everything', avatar: { id: 'j.png' } },
              { name: 'No Role' },
            ],
          },
        },
      ),
      '## Team\n\n- **James Ryan** — Everything\n- **No Role**',
    );
  });

  test('an empty hero renders nothing rather than throwing', () => {
    // Every field is optional so the first autosave of a new block succeeds
    // (ADR 0003); an empty block has no Markdown.
    assert.equal(layoutToMarkdown([{ _type: 'hero', _version: 1, _key: 'hero-empty' }], blocks), '');
  });
});
