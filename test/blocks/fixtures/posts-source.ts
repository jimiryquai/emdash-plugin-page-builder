import type { BylineSummary, ContentBylineCredit, ImageValue, TaxonomyTerm } from 'emdash';
import type { Post, Source } from 'emdash-plugin-page-builder/blocks';
import { createPostsSource } from 'emdash-plugin-page-builder/blocks';

// Mirrors the interface EmDash's zod-generator writes to emdash-env.d.ts for `posts`.
export interface GeneratedSitePostData {
  id: string;
  slug: string | null;
  status: string;
  title: string;
  featured_image?: ImageValue;
  excerpt?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  byline?: BylineSummary | null;
  bylines?: ContentBylineCredit[];
  terms?: Record<string, TaxonomyTerm[]>;
}

export interface GeneratedSitePostEntry {
  id: string;
  data: GeneratedSitePostData;
}

declare function fetchSitePosts(options: {
  limit?: number;
  category?: string;
}): Promise<readonly GeneratedSitePostEntry[]>;

// A site's custom Source<Post> receives count and category and maps EmDash's generated types.
export const sitePostsSource: Source<Post> = async ({ count, category }) => {
  const entries = await fetchSitePosts({ limit: count, category });
  return entries.map((entry) => ({
    title: entry.data.title,
    url: `/writing/${entry.id}`,
    excerpt: entry.data.excerpt,
    date: entry.data.publishedAt ?? entry.data.createdAt,
    image: entry.data.featured_image,
    tags: entry.data.terms?.tag,
    bylines: entry.data.bylines,
  }));
};

export const configuredPostsSource: Source<Post> = createPostsSource({
  collection: 'articles',
  categoryTaxonomy: 'topic',
  mapEntry: (entry) => ({
    title: String(entry.data.headline ?? ''),
    url: `/articles/${entry.id}`,
  }),
});

export const driftedPostsSource: Source<Post> = async ({ count }) => {
  const entries = await fetchSitePosts({ limit: count });
  // @ts-expect-error A renamed field in the site's post type must fail typecheck.
  return entries.map((entry) => ({ title: entry.data.headline, url: `/posts/${entry.id}` }));
};
