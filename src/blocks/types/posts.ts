import type { ApplySeedBlockTypeInput, MediaValue, SeedCollection } from 'emdash';
import { getEmDashCollection } from 'emdash';
import {
  blockFieldDefault,
  COUNT_FIELD_SLUG,
  countField,
  markdownText,
  variantField,
} from '../core.js';
import type {
  BlockType,
  CollectionEntry,
  QueryApi,
  QueryListResult,
  Source,
  SourceContext,
  StoredBlock,
} from '../core.js';

export interface PostTag {
  slug: string;
  label: string;
}

export interface PostByline {
  byline: {
    id?: string;
    slug?: string;
    displayName: string;
    bio?: string | null;
    websiteUrl?: string | null;
    avatarMediaId?: string | null;
    avatarStorageKey?: string | null;
    avatarAlt?: string | null;
    avatarBlurhash?: string | null;
    avatarDominantColor?: string | null;
  };
  sortOrder?: number;
  roleLabel?: string | null;
  source?: 'explicit' | 'inferred';
}

/** The shape a posts source produces and a posts section renders. */
export interface Post {
  title: string;
  url: string;
  excerpt?: string;
  date?: Date | string;
  image?: MediaValue;
  tags?: readonly PostTag[];
  bylines?: readonly PostByline[];
}

/** One entry of a posts collection, as the query API returns it. */
export type PostEntry = CollectionEntry;

/** One page of a posts collection query, as the query API returns it. */
export type PostsQueryListResult = QueryListResult;

/**
 * The supported runtime query API for posts, injectable so tests use a fake
 * (CODING_STANDARDS rule 7). The default wraps `getEmDashCollection`.
 */
export type PostsQueryApi = Pick<QueryApi, 'list'>;

export interface PostsSourceOptions {
  collection?: string;
  categoryTaxonomy?: string;
  tagTaxonomy?: string;
  orderBy?: Record<string, 'asc' | 'desc'>;
  mapEntry?: (entry: PostEntry) => Post;
  query?: PostsQueryApi;
}

export const STARTER_POSTS_COLLECTION = 'posts';
export const POST_CATEGORY_FIELD_SLUG = 'category';
export const POST_TAG_TAXONOMY = 'tag';

const defaultPostsQuery: PostsQueryApi = {
  async list(collection, filter) {
    return getEmDashCollection(collection, filter);
  },
};

/**
 * The starter posts collection, in EmDash's seed `collections` shape.
 * Posts classify entries through taxonomies rather than a page-group reference,
 * so the group collection parameter accepted by `BlockType['starter']` is unused.
 */
export function starterPostsCollection(_groupCollection?: string): SeedCollection {
  return {
    slug: STARTER_POSTS_COLLECTION,
    label: 'Posts',
    labelSingular: 'Post',
    description: 'Articles and updates shown by the posts block.',
    supports: ['drafts', 'revisions', 'search'],
    urlPattern: '/posts/{slug}',
    titleField: 'title',
    fields: [
      { slug: 'title', label: 'Title', type: 'string', required: true, searchable: true },
      { slug: 'featured_image', label: 'Featured Image', type: 'image' },
      { slug: 'content', label: 'Content', type: 'portableText', searchable: true },
      { slug: 'excerpt', label: 'Excerpt', type: 'text' },
    ],
  };
}

function toPostTags(terms: unknown, tagTaxonomy: string): PostTag[] | undefined {
  if (typeof terms !== 'object' || terms === null) return undefined;
  const raw = (terms as Record<string, unknown>)[tagTaxonomy];
  if (!Array.isArray(raw)) return undefined;
  const tags = raw.flatMap((item): PostTag[] => {
    if (typeof item !== 'object' || item === null) return [];
    const { slug, label } = item as Record<string, unknown>;
    return typeof slug === 'string' && typeof label === 'string' ? [{ slug, label }] : [];
  });
  return tags.length > 0 ? tags : undefined;
}

function toPostBylines(value: unknown): PostByline[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const bylines = value.filter((item): item is PostByline => {
    if (typeof item !== 'object' || item === null) return false;
    const { byline } = item as Record<string, unknown>;
    return typeof byline === 'object' && byline !== null &&
      typeof (byline as Record<string, unknown>).displayName === 'string';
  });
  return bylines.length > 0 ? bylines : undefined;
}

function createDefaultPostMapper(collection: string, tagTaxonomy: string): (entry: PostEntry) => Post {
  return (entry) => {
    const { title, excerpt, publishedAt, featured_image, terms, bylines } = entry.data;
    const date = publishedAt instanceof Date || (typeof publishedAt === 'string' && publishedAt.length > 0)
      ? publishedAt
      : undefined;
    const image = typeof featured_image === 'object' && featured_image !== null
      ? (featured_image as MediaValue)
      : undefined;
    const mappedTags = toPostTags(terms, tagTaxonomy);
    const mappedBylines = toPostBylines(bylines);
    return {
      title: String(title ?? ''),
      url: `/${collection}/${entry.id}`,
      ...(typeof excerpt === 'string' && excerpt.length > 0 ? { excerpt } : {}),
      ...(date !== undefined ? { date } : {}),
      ...(image !== undefined ? { image } : {}),
      ...(mappedTags !== undefined ? { tags: mappedTags } : {}),
      ...(mappedBylines !== undefined ? { bylines: mappedBylines } : {}),
    };
  };
}

/**
 * The default posts source. It reads the starter `posts` collection (or another
 * collection via `collection`), orders recent posts first (`published_at: 'desc'`),
 * filters by taxonomy slug when `category` is given, caps results to `count`
 * (falling back to the block definition's default `4`), and forwards cache hints
 * from a single collection list read.
 */
export function createPostsSource(options: PostsSourceOptions = {}): Source<Post> {
  const {
    collection = STARTER_POSTS_COLLECTION,
    categoryTaxonomy = POST_CATEGORY_FIELD_SLUG,
    tagTaxonomy = POST_TAG_TAXONOMY,
    orderBy = { published_at: 'desc' },
    query = defaultPostsQuery,
  } = options;
  const mapEntry = options.mapEntry ?? createDefaultPostMapper(collection, tagTaxonomy);
  const defaultCount = blockFieldDefault(posts, COUNT_FIELD_SLUG);
  return async ({ count, category }) => {
    const limit = typeof count === 'number' && count > 0
      ? count
      : typeof defaultCount === 'number' && defaultCount > 0
        ? defaultCount
        : undefined;
    const trimmedCategory = typeof category === 'string' ? category.trim() : '';
    const page = await query.list(collection, {
      ...(limit !== undefined ? { limit } : {}),
      ...(trimmedCategory.length > 0 ? { where: { [categoryTaxonomy]: trimmedCategory } } : {}),
      orderBy,
    });
    const cacheHints = page.cacheHint ? [page.cacheHint] : [];
    return { items: page.entries.map(mapEntry), cacheHints };
  };
}

function sourceContext(block: Readonly<StoredBlock>): Partial<SourceContext> {
  const raw = block[POST_CATEGORY_FIELD_SLUG];
  const category = typeof raw === 'string' ? raw.trim() : '';
  return category.length > 0 ? { category } : {};
}

/** The block's optional heading, then a Markdown link list of passed posts. */
function toMarkdown(block: Readonly<StoredBlock>, items?: readonly unknown[]): string {
  const heading = markdownText(block.heading);
  const links = (items ?? []).flatMap((stored): string[] => {
    if (typeof stored !== 'object' || stored === null) return [];
    const { title, url } = stored as Record<string, unknown>;
    const titleText = markdownText(title);
    const urlText = markdownText(url);
    return titleText !== undefined && urlText !== undefined ? [`- [${titleText}](${urlText})`] : [];
  });
  return [
    heading !== undefined ? `## ${heading}` : undefined,
    links.length > 0 ? links.join('\n') : undefined,
  ]
    .filter((part): part is string => part !== undefined)
    .join('\n\n');
}

const variants = ['featured-grid', 'grid', 'list'] as const;

export const posts = {
  definition: {
    slug: 'posts',
    label: 'Posts',
    description:
      'Recent posts pulled from a shared posts collection rather than written inline, ' +
      'with an optional heading, a count (4 by default), and an optional category taxonomy ' +
      'slug to filter by. Choose featured-grid when the first post with an image is featured ' +
      'and the remaining posts sit in a grid. Choose grid when posts sit side by side as equal ' +
      'cards. Choose list when posts sit in a vertical list of entries.',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        fields: [
          variantField(variants),
          { slug: 'heading', label: 'Heading', type: 'string' },
          countField({ defaultValue: 4 }),
          { slug: POST_CATEGORY_FIELD_SLUG, label: 'Category', type: 'string' },
        ],
      },
    ],
  } satisfies ApplySeedBlockTypeInput & { description: string },
  variants,
  migrations: {},
  requiredToPublish: [],
  starter: starterPostsCollection,
  sourceContext,
  toMarkdown,
} satisfies BlockType;
