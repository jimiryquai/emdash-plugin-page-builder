import type { MediaValue } from 'emdash';
import type { Source, Testimonial } from 'emdash-plugin-page-builder/blocks';

// A test site's own collection type, standing in for EmDash's generated types.
export interface SiteTestimonialData {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatar?: MediaValue;
}
export interface SiteTestimonialEntry {
  id: string;
  data: SiteTestimonialData;
}

declare function fetchSiteTestimonials(context: {
  scope: 'page' | 'all';
  group?: string;
  count?: number;
}): Promise<readonly SiteTestimonialEntry[]>;

// The site's source maps its own collection to the shared Testimonial shape.
export const siteTestimonialsSource: Source<Testimonial> = async (context) => {
  const entries = await fetchSiteTestimonials(context);
  return entries.map((entry) => ({
    quote: entry.data.quote,
    author: entry.data.author,
    role: entry.data.role,
    company: entry.data.company,
    avatar: entry.data.avatar,
  }));
};

export const driftedSource: Source<Testimonial> = async (context) => {
  const entries = await fetchSiteTestimonials(context);
  // @ts-expect-error A renamed field in the site's collection type must fail typecheck:
  // `quotation` does not exist on SiteTestimonialData, so this mapping cannot compile.
  return entries.map((entry) => ({ quote: entry.data.quotation, author: entry.data.author }));
};
