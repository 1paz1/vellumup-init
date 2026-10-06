// app/blog/page.tsx
//
// Lists published articles as a paginated card grid, using the same
// BlogCard component the article page's "related posts" section uses - one
// component, two places.
//
// Data: the posts come from getPosts in lib/blog-data.ts - change that file,
// not this one, to point the blog at a different source.
//
// Only the card grid + pagination are wrapped in <Suspense> here, not the
// header (tagline/heading/description) - so switching pages shows a card
// skeleton in place of the grid while the header stays put and never
// re-renders or flashes. This needs the Suspense boundary to own its own
// data fetch, so BlogGrid (not the page itself) is the async component.
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPosts } from '@/lib/blog-data';
import { BLOG_ACCENT, BLOG_DESCRIPTION, DEFAULT_CARD_VARIANT, SITE_NAME, SITE_URL } from '@/lib/blog-theme';
import { BlogCard } from '@/components/BlogCard';

const PAGE_SIZE = 9;

type SearchParams = Promise<{ page?: string }>;

// Anything that isn't a positive whole number (missing, 0, 'abc') is page 1.
function parsePage(param: string | undefined): number {
  return Math.max(1, Number.parseInt(param ?? '1', 10) || 1);
}

// Page 1 gets the clean /blog URL; every other page gets ?page=N.
function pageHref(page: number): string {
  return page === 1 ? '/blog' : `/blog?page=${page}`;
}

// Each page of the list is its own canonical URL - Google advises against
// pointing page 2+ at page 1. With SITE_URL set (lib/blog-theme.ts),
// metadataBase turns these relative URLs into full ones.
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const page = parsePage((await searchParams).page);
  const title = page === 1 ? 'Blog' : `Blog - Page ${page}`;
  return {
    metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
    title,
    description: BLOG_DESCRIPTION,
    alternates: { canonical: pageHref(page) },
    openGraph: {
      title,
      description: BLOG_DESCRIPTION,
      type: 'website',
      url: pageHref(page),
      siteName: SITE_NAME || undefined,
    },
  };
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

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      className={direction === 'left' ? 'rotate-180' : ''}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  );
}

// The only async piece on this page - everything Suspense blocks on lives
// here, so CardsSkeleton is exactly what's shown while this is loading.
async function BlogGrid({ page }: { page: number }) {
  const { posts, totalPages } = await getPosts(page, PAGE_SIZE);
  // A page past the end (e.g. ?page=99) shows Next's not-found page instead
  // of an empty grid, which search engines would flag as a "soft 404". This
  // runs inside the streamed Suspense boundary, so the status stays 200 and
  // Next marks the page noindex instead - checking earlier would cost the
  // skeleton above. Pagination links never point past the last page.
  if (page > totalPages) notFound();

  const arrowClass = 'w-9 h-9 rounded-lg flex items-center justify-center transition-colors';
  const numberClass = 'w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-semibold transition-colors';

  return (
    <>
      <div
        className="grid gap-6 w-full justify-center"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
      >
        {posts.map(post => (
          <article key={post.slug} className="h-full">
            <BlogCard post={post} variant={DEFAULT_CARD_VARIANT} accentColor={BLOG_ACCENT} />
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Blog pages" className="flex items-center justify-center gap-1.5 pt-4">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} aria-label="Previous page"
              className={`${arrowClass} text-slate-600 hover:bg-slate-100`}>
              <ArrowIcon direction="left" />
            </Link>
          ) : (
            <span aria-hidden="true" className={`${arrowClass} text-slate-300 select-none`}><ArrowIcon direction="left" /></span>
          )}

          {getPageNumbers(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} aria-hidden="true" className="w-9 text-center text-slate-400 select-none">
                …
              </span>
            ) : p === page ? (
              <span key={p} aria-current="page"
                className={`${numberClass} font-bold text-white`}
                style={{ backgroundColor: BLOG_ACCENT }}>
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
              <ArrowIcon direction="right" />
            </Link>
          ) : (
            <span aria-hidden="true" className={`${arrowClass} text-slate-300 select-none`}><ArrowIcon direction="right" /></span>
          )}
        </nav>
      )}
    </>
  );
}

export default async function BlogIndexPage({ searchParams }: { searchParams: SearchParams }) {
  const page = parsePage((await searchParams).page);

  return (
    <main className="min-h-screen bg-white">
      <section className="py-20" aria-label="From the blog">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-12">
          {/* Header renders instantly and never re-renders on page change -
              only BlogGrid below (inside Suspense) reacts to `page`. */}
          <div className="text-center max-w-2xl">
            <span
              className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
              style={{ backgroundColor: `${BLOG_ACCENT}14`, color: BLOG_ACCENT }}
            >
              Blog
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">All our articles</h1>
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
