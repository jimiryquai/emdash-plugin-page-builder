import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { experimental_AstroContainer } from 'astro/container';
import {
  posts,
  createPostsSource,
  starterPostsCollection,
  countField,
  COUNT_FIELD_SLUG,
  mergeCacheHints,
  variantField,
  VARIANT_FIELD_SLUG,
} from 'emdash-plugin-page-builder/blocks';
import { createAstroServer } from '../astro-harness.js';

function fakePostsQuery(entries, cacheHint = { tags: ['posts'], lastModified: new Date('2026-11-10T00:00:00Z') }) {
  const calls = [];
  return {
    calls,
    list: async (collection, filter) => {
      calls.push({ collection, filter });
      const categorySlug = filter?.where ? Object.values(filter.where)[0] : undefined;
      const taxonomyName = filter?.where ? Object.keys(filter.where)[0] : undefined;
      const filtered = categorySlug && taxonomyName
        ? entries.filter((entry) =>
            (entry.data.terms?.[taxonomyName] ?? []).some((term) => term.slug === categorySlug))
        : entries;
      return {
        entries: filter?.limit ? filtered.slice(0, filter.limit) : filtered,
        cacheHint,
      };
    },
  };
}

const sampleEntries = [
  {
    id: 'post-1',
    data: {
      title: 'First Post',
      excerpt: 'Lead summary.',
      publishedAt: new Date('2026-11-01T12:00:00Z'),
      featured_image: { id: 'img-1', src: '/img/post-1.webp', alt: 'Cover one' },
      terms: {
        category: [{ id: 'c1', name: 'category', slug: 'engineering', label: 'Engineering' }],
        tag: [
          { id: 't1', name: 'tag', slug: 'astro', label: 'Astro', children: [], locale: 'en', translationGroup: 'tg1' },
          { id: 't2', name: 'tag', slug: 'emdash', label: 'EmDash', children: [], locale: 'en', translationGroup: 'tg2' },
        ],
      },
      bylines: [
        {
          byline: { displayName: 'Ada Lovelace', slug: 'ada' },
          sortOrder: 0,
          roleLabel: 'Author',
          source: 'explicit',
        },
      ],
    },
  },
  {
    id: 'post-2',
    data: {
      title: 'Second Post',
      terms: { category: [{ id: 'c2', name: 'category', slug: 'design', label: 'Design' }] },
      bylines: [],
    },
  },
  {
    id: 'post-3',
    data: {
      title: 'Third Post',
      terms: { category: [{ id: 'c1', name: 'category', slug: 'engineering', label: 'Engineering' }] },
    },
  },
  {
    id: 'post-4',
    data: { title: 'Fourth Post' },
  },
  {
    id: 'post-5',
    data: { title: 'Fifth Post' },
  },
];

test('posts defines version 1 with variant, optional heading, count default 4, optional category, starter and variant descriptions', () => {
  assert.equal(posts.definition.slug, 'posts');
  assert.equal(posts.definition.label, 'Posts');
  assert.equal(posts.definition.currentVersion, 1);
  assert.deepEqual(posts.variants, ['featured-grid', 'grid', 'list']);
  assert.deepEqual(posts.migrations, {});
  assert.deepEqual(posts.requiredToPublish, []);
  assert.equal(posts.starter, starterPostsCollection);

  const fields = posts.definition.versions[0].fields;
  assert.deepEqual(fields, [
    variantField(posts.variants),
    { slug: 'heading', label: 'Heading', type: 'string' },
    countField({ defaultValue: 4 }),
    { slug: 'category', label: 'Category', type: 'string' },
  ]);
  assert.equal(fields[0].slug, VARIANT_FIELD_SLUG);
  assert.equal(fields[2].slug, COUNT_FIELD_SLUG);
  assert.equal(fields[2].defaultValue, 4);

  const description = posts.definition.description;
  for (const variant of posts.variants) {
    assert.match(description, new RegExp(String.raw`\b${variant} when\b`, 'i'));
  }

  const collection = starterPostsCollection('services');
  assert.equal(collection.slug, 'posts');
  assert.deepEqual(
    collection.fields.map((field) => field.slug),
    ['title', 'featured_image', 'content', 'excerpt'],
  );
});

test('createPostsSource honours explicit count, defaults absent count to 4, filters by category, maps Post fields and forwards cache hints in one read', async () => {
  const defaultQuery = fakePostsQuery(sampleEntries);
  const defaultResult = await createPostsSource({ query: defaultQuery })({ scope: 'all' });
  assert.equal(defaultQuery.calls.length, 1);
  assert.deepEqual(defaultQuery.calls[0], {
    collection: 'posts',
    filter: { limit: 4, orderBy: { published_at: 'desc' } },
  });
  assert.deepEqual(
    defaultResult.items.map((post) => post.title),
    ['First Post', 'Second Post', 'Third Post', 'Fourth Post'],
  );
  assert.deepEqual(defaultResult.items[0], {
    title: 'First Post',
    url: '/posts/post-1',
    excerpt: 'Lead summary.',
    date: new Date('2026-11-01T12:00:00Z'),
    image: { id: 'img-1', src: '/img/post-1.webp', alt: 'Cover one' },
    tags: [
      { slug: 'astro', label: 'Astro' },
      { slug: 'emdash', label: 'EmDash' },
    ],
    bylines: [
      {
        byline: { displayName: 'Ada Lovelace', slug: 'ada' },
        sortOrder: 0,
        roleLabel: 'Author',
        source: 'explicit',
      },
    ],
  });
  assert.deepEqual(defaultResult.items[1], {
    title: 'Second Post',
    url: '/posts/post-2',
  });
  assert.deepEqual(defaultResult.cacheHints, [
    { tags: ['posts'], lastModified: new Date('2026-11-10T00:00:00Z') },
  ]);

  const filteredQuery = fakePostsQuery(sampleEntries, { tags: ['posts', 'taxonomies'] });
  const filteredResult = await createPostsSource({ query: filteredQuery })({
    scope: 'all',
    count: 1,
    category: 'engineering',
  });
  assert.equal(filteredQuery.calls.length, 1);
  assert.deepEqual(filteredQuery.calls[0], {
    collection: 'posts',
    filter: {
      limit: 1,
      where: { category: 'engineering' },
      orderBy: { published_at: 'desc' },
    },
  });
  assert.deepEqual(filteredResult.items.map((post) => post.title), ['First Post']);
  assert.deepEqual(filteredResult.cacheHints, [{ tags: ['posts', 'taxonomies'] }]);

  const customQuery = fakePostsQuery([
    {
      id: 'custom-1',
      data: {
        headline: 'Custom Article',
        terms: { topic: [{ id: 'tp1', name: 'topic', slug: 'releases', label: 'Releases' }] },
      },
    },
  ]);
  const customResult = await createPostsSource({
    collection: 'articles',
    categoryTaxonomy: 'topic',
    query: customQuery,
    mapEntry: (entry) => ({
      title: String(entry.data.headline),
      url: `/articles/${entry.id}`,
    }),
  })({ scope: 'all', count: 2, category: 'releases' });
  assert.deepEqual(customQuery.calls, [
    {
      collection: 'articles',
      filter: {
        limit: 2,
        where: { topic: 'releases' },
        orderBy: { published_at: 'desc' },
      },
    },
  ]);
  assert.deepEqual(customResult.items, [{ title: 'Custom Article', url: '/articles/custom-1' }]);
});

test('typed Post sources compile against EmDash generated collection types and fail on field drift', () => {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'test/blocks/tsconfig.json'], { stdio: 'pipe' });
});

let server, container, PageBuilder, PostsFeaturedGrid, PostsGrid, PostsList;
before(async () => {
  server = await createAstroServer();
  container = await experimental_AstroContainer.create();
  ({ default: PageBuilder } = await server.ssrLoadModule('emdash-plugin-page-builder/blocks/PageBuilder.astro'));
  ({ default: PostsFeaturedGrid } = await server.ssrLoadModule('/test/blocks/fixtures/PostsFeaturedGrid.astro'));
  ({ default: PostsGrid } = await server.ssrLoadModule('/test/blocks/fixtures/PostsGrid.astro'));
  ({ default: PostsList } = await server.ssrLoadModule('/test/blocks/fixtures/PostsList.astro'));
});
after(async () => { await server?.close(); });

function renderPosts(value, extra = {}) {
  return container.renderToString(PageBuilder, {
    props: {
      value,
      blocks: [
        {
          ...posts,
          sections: {
            default: PostsGrid,
            'featured-grid': PostsFeaturedGrid,
            grid: PostsGrid,
            list: PostsList,
          },
        },
      ],
      ...extra,
    },
  });
}

test('PageBuilder passes default count 4 when stored count is absent on a posts block', async () => {
  const calls = [];
  const sources = {
    posts: async (context) => {
      calls.push(context);
      return Array.from({ length: context.count ?? 0 }, (_, i) => ({
        title: `Post ${i + 1}`,
        url: `/posts/p-${i + 1}`,
      }));
    },
  };
  const html = await renderPosts(
    [{ _type: 'posts', _version: 1, _key: 'posts-default', heading: 'Latest' }],
    { sources },
  );
  assert.deepEqual(calls, [{ scope: 'all', group: undefined, count: 4 }]);
  assert.match(html, /<h2>Latest<\/h2>/);
  assert.equal(html.match(/<li /g)?.length, 4);
});

test('PageBuilder forwards explicit count and optional category to createPostsSource in one read and unpacks SourceResult cache hints', async () => {
  const lastModified = new Date('2026-11-11T08:30:00Z');
  const query = fakePostsQuery(sampleEntries, { tags: ['posts', 'category:engineering'], lastModified });
  const baseSource = createPostsSource({ query });
  const sourceResults = [];
  // Astro's container harness never enables Astro.cache (see testimonials.test.js),
  // so observe the SourceResult delivered into PageBuilder and verify mergeCacheHints.
  const sources = {
    posts: async (context) => {
      const result = await baseSource(context);
      sourceResults.push({ context, result });
      return result;
    },
  };

  const html = await renderPosts(
    [
      {
        _type: 'posts',
        _version: 1,
        _key: 'posts-eng',
        variant: 'featured-grid',
        heading: 'Engineering Notes',
        count: 2,
        category: ' engineering ',
      },
    ],
    { sources },
  );

  assert.equal(query.calls.length, 1);
  assert.deepEqual(query.calls[0], {
    collection: 'posts',
    filter: {
      limit: 2,
      where: { category: 'engineering' },
      orderBy: { published_at: 'desc' },
    },
  });
  assert.equal(sourceResults.length, 1);
  assert.deepEqual(sourceResults[0].context, {
    scope: 'all',
    group: undefined,
    count: 2,
    category: 'engineering',
  });
  assert.deepEqual(mergeCacheHints(sourceResults[0].result.cacheHints), {
    tags: ['posts', 'category:engineering'],
    lastModified,
  });
  assert.match(html, /data-section="featured-grid"/);
  assert.match(html, /<h2>Engineering Notes<\/h2>/);
  assert.match(html, /data-url="\/posts\/post-1" data-tags="astro,emdash" data-bylines="Ada Lovelace">First Post<\/li>/);
  assert.match(html, /data-url="\/posts\/post-3" data-tags(?:="")? data-bylines(?:="")?>Third Post<\/li>/);
  assert.doesNotMatch(html, /Second Post/);
});

test('PageBuilder dispatches featured-grid, grid and list variants, falls back to default, and renders an empty posts block', async () => {
  const sources = {
    posts: async () => [{ title: 'One', url: '/posts/one' }],
  };
  assert.match(
    await renderPosts([{ _type: 'posts', _version: 1, _key: 'p1', variant: 'featured-grid' }], { sources }),
    /data-section="featured-grid"/,
  );
  assert.match(
    await renderPosts([{ _type: 'posts', _version: 1, _key: 'p2', variant: 'grid' }], { sources }),
    /data-section="grid"/,
  );
  assert.match(
    await renderPosts([{ _type: 'posts', _version: 1, _key: 'p3', variant: 'list' }], { sources }),
    /data-section="list"/,
  );
  assert.match(
    await renderPosts([{ _type: 'posts', _version: 1, _key: 'p4', variant: 'unknown' }], { sources }),
    /data-section="grid"/,
  );
  const emptyHtml = await renderPosts([{ _type: 'posts', _version: 1, _key: 'posts-empty' }]);
  assert.match(emptyHtml, /data-section="grid"/);
});
