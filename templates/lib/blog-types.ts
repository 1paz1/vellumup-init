// lib/blog-types.ts
//
// The shapes the blog pages render. lib/blog-data.ts returns these, and the
// pages never look past them - so any data source works, as long as it
// returns the same fields. Nullable fields can always be null: the pages
// skip whatever is missing.

/** One full article, as rendered by app/blog/[slug]/page.tsx. */
export interface Article {
  slug: string;
  title: string;
  content: string; // Markdown by default, or HTML if the endpoint's content format was set to HTML
  cover_image: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  secondary_keywords: string[] | null;
  og_title: string | null;
  og_description: string | null;
  word_count: number | null;
  reading_time_minutes: number | null;
  created_at: string; // ISO 8601
  updated_at: string | null; // ISO 8601
  key_takeaways: { takeaway: string; _heading?: string }[] | null;
  // Slugs of other articles this one links to inline (VellumUp sends these
  // as internal_link_slugs) - getRelatedPosts in lib/blog-data.ts shows
  // these first under "More from the blog", before the newest posts.
  internal_link_slugs: string[] | null;
}

/** The card-sized subset of an Article - the blog index and related posts. */
export interface BlogPostSummary {
  slug: string;
  title: string;
  cover_image: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  created_at: string; // ISO 8601
}
