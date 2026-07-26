// SYNC-RULE: mirrored from lucidseo lib/catalog-items/full-article-page/wired-example.ts (WIRED_BLOG_INDEX_PAGE).
// Edit both in the same commit - see templates/SYNC.md for the extraction recipe.
// Known deltas here: this header, em-dashes replaced with hyphens, and the language-filter placeholder line (replaced by the CLI at install time).
// app/blog/page.tsx
//
// Lists published articles as a paginated card grid, using the same
// BlogSection component the article page uses for its "related posts" - one
// component, two places.
//
// Only the card grid + pagination are wrapped in <Suspense> here, not the
// header (tagline/heading/description) - so switching pages shows a card
// skeleton in place of the grid while the header stays put and never
// re-renders or flashes. This needs the Suspense boundary to own its own
// data fetch, so BlogGrid (not the page itself) is the async component.
//
// Already have a Supabase client elsewhere in your project? Delete the
// createClient(...) line below and import yours instead - see the note in
// app/blog/[slug]/page.tsx (this page's sibling) for why this one is inline.
import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const PAGE_SIZE = 9;
const ACCENT = '#4A68E5';

interface BlogPost {
  slug: string;
  title: string;
  cover_image: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  created_at: string;
}

// One query returns both the page of rows (via range) and the total count
// (via count: 'exact'), so pagination needs no second round-trip.
async function getPosts(page: number): Promise<{ posts: BlogPost[]; totalPages: number }> {
  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await supabase
    .from('articles')
    .select('slug, title, cover_image, meta_description, focus_keyword, created_at', { count: 'exact' })
    .eq('status', 'published')
    // __VELLUMUP_LANG_FILTER__
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  return {
    posts: data ?? [],
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  };
}

export const metadata = {
  title: 'Blog',
  description: 'Guides and updates.',
};

// Page 1 gets the clean /blog URL; every other page gets ?page=N.
function pageHref(page: number): string {
  return page === 1 ? '/blog' : `/blog?page=${page}`;
}

// The page numbers to show: always 1 and the last page, plus the current
// page and its direct neighbors - null marks a gap rendered as "…", so long
// blogs get "1 … 4 5 6 … 12" instead of a wall of numbers.
function getPageNumbers(current: number, total: number): (number | null)[] {
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...wanted].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

// Skeleton cards - same grid layout and card proportions as the real cards
// below (aspect-video image, title lines, footer row), so the layout doesn't
// jump when real cards swap in. This is the ONLY thing Suspense's fallback
// replaces - the header above stays mounted and never re-renders.
function CardsSkeleton() {
  return (
    <div
      className="grid gap-6 w-full justify-center animate-pulse"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
      aria-hidden="true"
    >
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden w-full">
          <div className="aspect-video bg-slate-100" />
          <div className="flex flex-col gap-3 p-5">
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// The only async piece on this page - everything Suspense blocks on lives
// here, so CardsSkeleton is exactly what's shown while this is loading.
async function BlogGrid({ page }: { page: number }) {
  const { posts, totalPages } = await getPosts(page);

  const arrowClass = 'w-9 h-9 rounded-lg flex items-center justify-center text-[15px] font-semibold transition-colors';
  const numberClass = 'w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-semibold transition-colors';

  return (
    <>
      <div
        className="grid gap-6 w-full justify-center"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
      >
        {posts.map(post => (
          <article key={post.slug} className="h-full">
            <a
              href={`/blog/${post.slug}`}
              className="group flex flex-col h-full rounded-2xl border border-slate-200 bg-white overflow-hidden w-full
                         transition-all hover:shadow-lg cursor-pointer"
              onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
            >
              <div className="relative aspect-video bg-slate-100">
                {post.cover_image ? (
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-50" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-col gap-2 p-5 flex-1">
                <h3 className="text-[16px] font-bold text-slate-900 leading-snug line-clamp-2">{post.title}</h3>
                {post.meta_description && (
                  <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-2 flex-1">{post.meta_description}</p>
                )}
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100 text-[12px]">
                  <time dateTime={post.created_at} className="text-slate-400">
                    {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </time>
                  <span className="font-semibold" style={{ color: ACCENT }}>Read more</span>
                </div>
              </div>
            </a>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Blog pages" className="flex items-center justify-center gap-1.5 pt-4">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} aria-label="Previous page"
              className={`${arrowClass} text-slate-600 hover:bg-slate-100`}>
              ←
            </Link>
          ) : (
            <span aria-hidden="true" className={`${arrowClass} text-slate-300 select-none`}>←</span>
          )}

          {getPageNumbers(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} aria-hidden="true" className="w-9 text-center text-slate-400 select-none">
                …
              </span>
            ) : p === page ? (
              <span key={p} aria-current="page"
                className={`${numberClass} font-bold text-white`}
                style={{ backgroundColor: ACCENT }}>
                {p}
              </span>
            ) : (
              <Link key={p} href={pageHref(p)}
                className={`${numberClass} text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900`}>
                {p}
              </Link>
            )
          )}

          {page < totalPages ? (
            <Link href={pageHref(page + 1)} aria-label="Next page"
              className={`${arrowClass} text-slate-600 hover:bg-slate-100`}>
              →
            </Link>
          ) : (
            <span aria-hidden="true" className={`${arrowClass} text-slate-300 select-none`}>→</span>
          )}
        </nav>
      )}
    </>
  );
}

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);

  return (
    <main className="min-h-screen bg-white">
      <section className="py-20" aria-label="From the blog">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-12">
          {/* Header renders instantly and never re-renders on page change -
              only BlogGrid below (inside Suspense) reacts to `page`. */}
          <div className="text-center max-w-2xl">
            <span
              className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
              style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
            >
              Our blog
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">From the blog</h2>
            <p className="mt-3 text-[13px] text-slate-500 leading-relaxed">Guides and updates.</p>
          </div>

          {/* key={page} forces a fresh Suspense boundary per page, so
              navigating always shows the skeleton instead of stale cards. */}
          <Suspense key={page} fallback={<CardsSkeleton />}>
            <BlogGrid page={page} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
