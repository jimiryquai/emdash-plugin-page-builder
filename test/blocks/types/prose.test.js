import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer } from 'astro/container';
import { createAstroServer } from '../astro-harness.js';
import { prose, variantField } from 'emdash-plugin-page-builder/blocks';

function htmlToPortableTextBlocks(html) {
  let counter = 0;
  const nextKey = () => `pt-${++counter}`;
  const blocks = [];

  const decode = (text) =>
    text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');

  const parseInline = (fragment) => {
    const children = [];
    const markDefs = [];
    const linkKeys = new Map();
    const tokenPattern = /<(strong|b|em|i|code)\b[^>]*>([\s\S]*?)<\/\1>|<a\b([^>]*)>([\s\S]*?)<\/a>|<br\s*\/?>/gi;
    const markMap = { strong: 'strong', b: 'strong', em: 'em', i: 'em', code: 'code' };

    const pushSpan = (raw, marks, isRawNewline = false) => {
      const text = isRawNewline ? '\n' : decode(raw);
      if (!text) return;
      const normMarks = marks.length > 0 ? [...marks] : undefined;
      const prev = children.at(-1);
      if (prev && JSON.stringify(prev.marks) === JSON.stringify(normMarks)) {
        prev.text += text;
        return;
      }
      children.push({
        _type: 'span',
        _key: nextKey(),
        text,
        ...(normMarks ? { marks: normMarks } : {}),
      });
    };

    const walk = (input, activeMarks) => {
      let lastIndex = 0;
      const regex = new RegExp(tokenPattern.source, 'gi');
      let match;
      while ((match = regex.exec(input)) !== null) {
        if (match.index > lastIndex) {
          pushSpan(input.slice(lastIndex, match.index), activeMarks);
        }
        lastIndex = regex.lastIndex;
        const [full, tag, tagContent, linkAttrs, linkContent] = match;
        if (tag) {
          const mark = markMap[tag.toLowerCase()];
          walk(tagContent ?? '', mark && !activeMarks.includes(mark) ? [...activeMarks, mark] : activeMarks);
        } else if (linkAttrs !== undefined) {
          const href = decode(linkAttrs.match(/\bhref=["']([^"']*)["']/i)?.[1] ?? '');
          let markKey = linkKeys.get(href);
          if (!markKey) {
            markKey = nextKey();
            linkKeys.set(href, markKey);
            markDefs.push({ _type: 'link', _key: markKey, href });
          }
          walk(linkContent ?? '', activeMarks.includes(markKey) ? activeMarks : [...activeMarks, markKey]);
        } else if (/^<br/i.test(full)) {
          pushSpan('\n', activeMarks, true);
        }
      }
      if (lastIndex < input.length) {
        pushSpan(input.slice(lastIndex), activeMarks);
      }
    };

    walk(fragment, []);
    return { children, markDefs };
  };

  const pushBlock = (style, innerHtml, listItem) => {
    const { children, markDefs } = parseInline(innerHtml.trim());
    if (children.length === 0) return;
    blocks.push({
      _type: 'block',
      _key: nextKey(),
      style,
      ...(listItem ? { listItem, level: 1 } : {}),
      children,
      ...(markDefs.length > 0 ? { markDefs } : {}),
    });
  };

  const blockRegex = /<(p|h[1-6]|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[2];
    if (tag === 'ul' || tag === 'ol') {
      const listItem = tag === 'ol' ? 'number' : 'bullet';
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liRegex.exec(content)) !== null) {
        pushBlock('normal', liMatch[1], listItem);
      }
    } else if (/^h[1-6]$/.test(tag)) {
      pushBlock(tag, content);
    } else {
      pushBlock('normal', content);
    }
  }

  return blocks;
}

function convertMarketingDocument(node) {
  return {
    _type: 'prose',
    _version: 1,
    _key: node._key ?? 'prose',
    variant: node.variant ?? 'centered',
    heading: node.headline,
    ...(node.subheadline !== undefined ? { body: node.subheadline } : {}),
    content: Array.isArray(node.content) ? node.content : htmlToPortableTextBlocks(node.content ?? ''),
  };
}

test('prose is a version 1 seed definition', () => {
  assert.equal(prose.definition.slug, 'prose');
  assert.equal(prose.definition.label, 'Prose');
  assert.equal(prose.definition.category, 'Sections');
  assert.equal(prose.definition.currentVersion, 1);
  assert.deepEqual(
    prose.definition.versions.map((version) => version.version),
    [1],
  );
  assert.deepEqual(prose.migrations, {});
  assert.deepEqual(prose.variants, ['centered', 'start']);
  assert.deepEqual(prose.definition.versions[0].fields, [
    { ...variantField(['centered', 'start']), defaultValue: 'centered' },
    { slug: 'heading', label: 'Heading', type: 'string' },
    { slug: 'body', label: 'Body', type: 'text' },
    { slug: 'content', label: 'Content', type: 'portableText' },
  ]);
});

test('the prose description says when to use each variant', () => {
  const description = prose.definition.description;
  for (const variant of ['centered', 'start']) {
    assert.match(description, new RegExp(String.raw`\b${variant} when\b`, 'i'));
  }
  assert.match(description, /portable text|long-form|policy|legal/i);
});

describe('prose sections', () => {
  let server, container, PageBuilder, sections;
  before(async () => {
    server = await createAstroServer();
    container = await experimental_AstroContainer.create();
    ({ default: PageBuilder } = await server.ssrLoadModule(
      'emdash-plugin-page-builder/blocks/PageBuilder.astro',
    ));
    sections = {
      default: (await server.ssrLoadModule('/test/blocks/fixtures/prose/DefaultProse.astro')).default,
      centered: (await server.ssrLoadModule('/test/blocks/fixtures/prose/CenteredProse.astro')).default,
      start: (await server.ssrLoadModule('/test/blocks/fixtures/prose/StartProse.astro')).default,
    };
  });
  after(async () => {
    await server?.close();
  });

  test('The block renders Portable Text through a test sections map for every variant.', async () => {
    const portableTextBody = [
      {
        _type: 'block',
        _key: 'p1',
        style: 'normal',
        children: [{ _type: 'span', _key: 's1', text: 'First paragraph of rich text.' }],
      },
      {
        _type: 'block',
        _key: 'h1',
        style: 'h2',
        children: [{ _type: 'span', _key: 's2', text: 'Terms and Conditions' }],
      },
    ];

    for (const variant of prose.variants) {
      const html = await container.renderToString(PageBuilder, {
        props: {
          value: [
            {
              _type: 'prose',
              _version: 1,
              _key: `prose-${variant}`,
              variant,
              heading: `Heading for ${variant}`,
              body: 'Last updated today.',
              content: portableTextBody,
            },
          ],
          blocks: [{ ...prose, sections }],
        },
      });
      assert.match(html, new RegExp(`data-section="${variant}"`));
      assert.match(html, new RegExp(`data-key="prose-${variant}"`));
      assert.match(html, new RegExp(`Heading for ${variant}`));
      assert.match(html, /Last updated today\./);
      assert.match(html, /<p\b[^>]*>First paragraph of rich text\.<\/p>/);
      assert.match(html, /<h2\b[^>]*>Terms and Conditions<\/h2>/);
      assert.doesNotMatch(html, /data-section="default"/);
    }

    const fallbackHtml = await container.renderToString(PageBuilder, {
      props: {
        value: [
          {
            _type: 'prose',
            _version: 1,
            _key: 'prose-unmapped',
            variant: 'unmapped',
            heading: 'Fallback Heading',
            content: portableTextBody,
          },
        ],
        blocks: [{ ...prose, sections }],
      },
    });
    assert.match(fallbackHtml, /data-section="default"/);
    assert.match(fallbackHtml, /Fallback Heading/);
    assert.match(fallbackHtml, /<p\b[^>]*>First paragraph of rich text\.<\/p>/);
  });

  test('an empty block renders through its section rather than throwing', async () => {
    // Every field is optional so the admin's first autosave of a new block
    // succeeds (ADR 0003); an empty block must still render.
    const html = await container.renderToString(PageBuilder, {
      props: {
        value: [{ _type: 'prose', _version: 1, _key: 'prose-empty' }],
        blocks: [{ ...prose, sections }],
      },
    });
    assert.match(html, /data-section="default"/);
    assert.match(html, /data-key="prose-empty"/);
  });

  test('A stored `marketing.document` body can be carried into the block without loss (a fixture conversion test).', async () => {
    const storedMarketingDocument = {
      _type: 'marketing.document',
      _key: 'document',
      headline: 'Privacy Policy',
      subheadline: 'Last updated on December 19, 2025.',
      content:
        '<p>Company Inc. ("<strong>Company</strong>," "<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>") respects your privacy and is committed to protecting your personal information. This Privacy Policy describes, in general terms, how we collect, use, store, and protect information when you interact with our websites, products, or services (collectively, the "<strong>Services</strong>"). This policy is provided for informational purposes and is intended to be a general example only.</p>' +
        '<h2>Information We Collect and How We Use It</h2>' +
        '<p>We may collect information that you voluntarily provide to us when you interact with the Services, such as when you contact us, create an account, or otherwise communicate with us. This information may include basic personal or account details, such as your name, email address, or similar contact information.</p>' +
        '<p>We may also automatically collect limited technical or usage information when you use the Services. This may include information such as browser type, device or operating system details, IP address, and general usage data.</p>' +
        '<p>Information we collect may be used for purposes such as:</p>' +
        '<ul><li>Providing and maintaining the Services</li><li>Responding to inquiries and communications</li><li>Improving features and functionality</li><li>Complying with applicable legal obligations</li></ul>' +
        '<h2>Sharing, Retention, and Security of Information</h2>' +
        '<p>We do not sell your personal information. We may share information with third-party service providers who perform services on our behalf, such as hosting or technical support, and only to the extent necessary for them to perform those services. We may also disclose information if required to do so by law or in response to valid legal requests.</p>' +
        '<p>We retain information only for as long as reasonably necessary to fulfill the purposes described in this Privacy Policy, unless a longer retention period is required or permitted by law.</p>' +
        '<p>We take reasonable administrative, technical, and organizational measures designed to protect information from unauthorized access, use, alteration, or disclosure. However, no method of transmission over the internet or method of electronic storage is completely secure, and we cannot guarantee absolute security.</p>' +
        '<h2>Your Choices, Updates, and Contact Information</h2>' +
        '<p>You may choose not to provide certain information to us, though doing so may limit your ability to use some features of the Services. Depending on your location, you may have certain rights regarding your personal information under applicable laws.</p>' +
        '<p>We may update this Privacy Policy from time to time. Any changes will be reflected by updating the "<strong>Last updated</strong>" date at the top of this page. Continued use of the Services after any changes indicates acceptance of the updated policy.</p>' +
        '<p>If you have any questions about this Privacy Policy, please contact us at:</p>' +
        '<p><strong>Company Inc.</strong><br />Email: <a href="mailto:privacy@company.example">privacy@company.example</a><br />Address: 123 Demo Street, Example City, Country</p>',
    };

    const converted = convertMarketingDocument(storedMarketingDocument);

    assert.equal(converted._type, 'prose');
    assert.equal(converted._version, 1);
    assert.equal(converted._key, 'document');
    assert.equal(converted.variant, 'centered');
    assert.equal(converted.heading, 'Privacy Policy');
    assert.equal(converted.body, 'Last updated on December 19, 2025.');
    assert.ok(Array.isArray(converted.content));

    const html = await container.renderToString(PageBuilder, {
      props: {
        value: [converted],
        blocks: [{ ...prose, sections }],
      },
    });

    assert.match(html, /data-section="centered"/);
    assert.match(html, /data-key="document"/);
    assert.match(html, /<h1>Privacy Policy<\/h1>/);
    assert.match(html, /Last updated on December 19, 2025\./);
    assert.match(html, /<strong>Company<\/strong>/);
    assert.match(html, /<strong>Services<\/strong>/);
    assert.match(html, /<h2\b[^>]*>Information We Collect and How We Use It<\/h2>/);
    assert.match(html, /<h2\b[^>]*>Sharing, Retention, and Security of Information<\/h2>/);
    assert.match(html, /<h2\b[^>]*>Your Choices, Updates, and Contact Information<\/h2>/);
    assert.match(html, /<ul>[\s\S]*<li>Providing and maintaining the Services<\/li>[\s\S]*<li>Complying with applicable legal obligations<\/li>[\s\S]*<\/ul>/);
    assert.match(html, /<a\b[^>]*href="mailto:privacy@company\.example"[^>]*>\s*privacy@company\.example\s*<\/a>/);
    assert.match(html, /Address: 123 Demo Street, Example City, Country/);
  });
});
