// lib/blog-data.ts
//
// Every read the blog pages make, in one place. The pages call these three
// functions and nothing else, so this is the only file to change to move
// the blog to a different data source.
//
// This version reads the "articles" table your webhook route saves to, via
// Supabase. That is a starting point, not a requirement: using another
// database or an ORM? Replace the createClient(...) block and the queries
// below with your own, returning the same fields (see lib/blog-types.ts) -
// the pages work unchanged.
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Article, BlogPostSummary } from './blog-types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// One query returns both the page of rows (via range) and the total count
// (via count: 'exact'), so pagination needs no second round-trip.
export async function getPosts(
  page: number,
  pageSize: number,
): Promise<{ posts: BlogPostSummary[]; totalPages: number }> {
  const from = (page - 1) * pageSize;
  const { data, count } = await supabase
    .from('articles')
    .select('slug, title, cover_image, meta_description, focus_keyword, created_at', { count: 'exact' })
    .eq('status', 'published')
    // __VELLUMUP_LANG_FILTER__
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return {
    posts: data ?? [],
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

// cache() dedupes the fetch between generateMetadata and the page itself -
// one DB query per request, not two.
export const getArticle = cache(async (slug: string): Promise<Article | null> => {
  const { data } = await supabase
    .from('articles')
    .select('slug, title, content, cover_image, meta_description, focus_keyword, secondary_keywords, og_title, og_description, word_count, reading_time_minutes, created_at, updated_at, key_takeaways, internal_link_slugs')
    .eq('slug', slug)
    .eq('status', 'published')
    // __VELLUMUP_LANG_FILTER__
    .single();
  return data;
});

// Prefers the specific articles the AI actually linked to from within this
// article's body (internal_link_slugs on the webhook payload) - these are
// genuinely related by content, not just recent. If that gives fewer than
// `limit` (or none at all - e.g. a brand-new site too small yet for the AI
// to link between articles), tops the list up with the newest other
// articles so the section still shows a full row whenever enough published
// articles exist, instead of stopping short at 1-2 posts.
export async function getRelatedPosts(
  excludeSlug: string,
  internalLinkSlugs: string[],
  limit: number,
): Promise<BlogPostSummary[]> {
  const linked: BlogPostSummary[] = [];

  if (internalLinkSlugs.length > 0) {
    const { data } = await supabase
      .from('articles')
      .select('slug, title, cover_image, meta_description, focus_keyword, created_at')
      .eq('status', 'published')
      // __VELLUMUP_LANG_FILTER__
      .neq('slug', excludeSlug)
      .in('slug', internalLinkSlugs)
      .order('created_at', { ascending: false })
      .limit(limit);
    linked.push(...(data ?? []));
  }

  if (linked.length >= limit) return linked;

  // Excluding already-included slugs client-side (rather than a `.not(...in...)`
  // filter built from a raw joined string) sidesteps any need to escape
  // slugs for a PostgREST filter - fetch a few extra so there's still enough
  // left after filtering out the current article and any already-linked ones.
  const alreadyIncluded = new Set([excludeSlug, ...linked.map(post => post.slug)]);
  const { data: fillerData } = await supabase
    .from('articles')
    .select('slug, title, cover_image, meta_description, focus_keyword, created_at')
    .eq('status', 'published')
    // __VELLUMUP_LANG_FILTER__
    .order('created_at', { ascending: false })
    .limit(limit + alreadyIncluded.size);

  const filler = (fillerData ?? []).filter(post => !alreadyIncluded.has(post.slug));
  return [...linked, ...filler.slice(0, limit - linked.length)];
}
