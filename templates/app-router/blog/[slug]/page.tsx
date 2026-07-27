// app/blog/[slug]/page.tsx
//
// Renders one article fetched from the "articles" table your webhook route
// saves to.
//
// Data layer: this is Supabase-based code by default - a starting point, not
// a requirement. Using another database or an ORM? Delete the inline
// createClient(...) block and rewrite the small data-access functions below
// (getArticle, getRelatedPosts) to return the same fields from whatever
// store you have - the rest of the page works unchanged.
//
// Everything lives in this one file - no separate client wrapper.
// PillTableOfContents is already its own 'use client' component, so a plain
// async Server Component (this page) can render it directly as a child;
// there's no need for this page (or anything around it) to be 'use client'
// itself.
import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogSection } from '@/components/BlogSection';
import { BlogKeyTakeaways } from '@/components/BlogKeyTakeaways';
import { PillTableOfContents } from '@/components/PillTableOfContents';
import { BLOG_ACCENT, DEFAULT_HERO_VARIANT, type HeroVariant } from '@/lib/blog-theme';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface Article {
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
  created_at: string;
  updated_at: string | null;
  key_takeaways: { takeaway: string; _heading?: string }[] | null;
  // Slugs of other articles the AI linked to inline, from the webhook
  // payload's internal_link_slugs - see getRelatedPosts below for how these
  // drive "Related articles" instead of just showing the newest posts.
  internal_link_slugs: string[] | null;
}

interface RelatedPost {
  slug: string;
  title: string;
  cover_image: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  created_at: string;
}

// cache() dedupes the fetch between generateMetadata and the page itself -
// one DB query per request, not two.
const getArticle = cache(async (slug: string): Promise<Article | null> => {
  const { data } = await supabase
    .from('articles')
    .select('slug, title, content, cover_image, meta_description, focus_keyword, secondary_keywords, og_title, og_description, word_count, reading_time_minutes, created_at, updated_at, key_takeaways, internal_link_slugs')
    .eq('slug', slug)
    .eq('status', 'published')
    // __VELLUMUP_LANG_FILTER__
    .single();
  return data;
});

const RELATED_POSTS_LIMIT = 3;

// Prefers the specific articles the AI actually linked to from within this
// article's body (internal_link_slugs on the webhook payload) - these are
// genuinely related by content, not just recent. If that gives fewer than
// RELATED_POSTS_LIMIT (or none at all - e.g. a brand-new site too small yet
// for the AI to link between articles), tops the list up with the newest
// other articles so the section still shows a full row whenever enough
// published articles exist, instead of stopping short at 1-2 posts.
async function getRelatedPosts(excludeSlug: string, internalLinkSlugs: string[]): Promise<RelatedPost[]> {
  const linked: RelatedPost[] = [];

  if (internalLinkSlugs.length > 0) {
    const { data } = await supabase
      .from('articles')
      .select('slug, title, cover_image, meta_description, focus_keyword, created_at')
      .eq('status', 'published')
      // __VELLUMUP_LANG_FILTER__
      .neq('slug', excludeSlug)
      .in('slug', internalLinkSlugs)
      .order('created_at', { ascending: false })
      .limit(RELATED_POSTS_LIMIT);
    linked.push(...(data ?? []));
  }

  if (linked.length >= RELATED_POSTS_LIMIT) return linked;

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
    .limit(RELATED_POSTS_LIMIT + alreadyIncluded.size);

  const filler = (fillerData ?? []).filter(post => !alreadyIncluded.has(post.slug));
  return [...linked, ...filler.slice(0, RELATED_POSTS_LIMIT - linked.length)];
}

// Title/description prefer the webhook's dedicated OG fields (og_title,
// og_description) over the general title/meta_description, since those are
// tuned for how the article reads when shared/linked rather than on-page.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};

  const title = article.og_title ?? article.title;
  const description = article.og_description ?? article.meta_description ?? undefined;
  // Relative, not absolute - Next.js emits this as a relative <link
  // rel="canonical">, which is valid without needing a site-wide base URL
  // (metadataBase) configured. Same reasoning for openGraph.url below.
  const canonical = `/blog/${article.slug}`;
  const keywords = [article.focus_keyword, ...(article.secondary_keywords ?? [])].filter(
    (k): k is string => !!k,
  );

  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      publishedTime: article.created_at,
      modifiedTime: article.updated_at ?? article.created_at,
      images: article.cover_image ? [article.cover_image] : undefined,
    },
    twitter: {
      card: article.cover_image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: article.cover_image ? [article.cover_image] : undefined,
    },
  };
}

// Endpoints set to HTML content format deliver ready HTML; the default is
// Markdown.
function isHtmlContent(content: string): boolean {
  return /<(p|h[1-6]|ul|ol|li|blockquote|figure|div|table|strong|em|a)\b/i.test(content.trimStart());
}

// Deterministic slugify, so the id a heading gets here always matches the id
// extractHeadings() below assigns the same heading text, with zero extra
// data needed from the webhook.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u0080-\uFFFF\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Scans raw Markdown for "## "/"### " lines and turns each into a
// { id, label } pill entry - no reliance on any webhook field beyond content.
function extractHeadings(markdown: string): { id: string; label: string }[] {
  const headings: { id: string; label: string }[] = [];
  for (const line of markdown.split('\n')) {
    const match = line.match(/^#{2,3}\s+(.+)/);
    if (match) headings.push({ id: slugify(match[1].trim()), label: match[1].trim() });
  }
  return headings;
}

// Splits off the first prose paragraph so BlogKeyTakeaways can sit between
// it and the rest of the article - right after the opening paragraph reads
// better than before it. Skips titles/images/blank lines while looking for
// that first paragraph; if a "## " heading shows up before any paragraph
// text, there's no intro to split off, so the takeaways box falls back to
// going before everything.
function splitIntroMarkdown(markdown: string): { intro: string; rest: string } {
  const lines = markdown.split('\n');
  const paraLines: string[] = [];
  let started = false;
  let endIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!started) {
      if (!trimmed || /^#\s/.test(trimmed) || /^!\[/.test(trimmed)) continue;
      if (/^#{2,}\s/.test(trimmed)) return { intro: '', rest: markdown };
      started = true;
    }
    if (started && trimmed === '') { endIdx = i; break; }
    paraLines.push(lines[i]);
    endIdx = i + 1;
  }

  if (!paraLines.length) return { intro: '', rest: markdown };
  return {
    intro: paraLines.join('\n'),
    rest: lines.slice(endIdx).join('\n').trimStart(),
  };
}

// Table styling react-markdown doesn't apply on its own - without this,
// tables render as unstyled, borderless native HTML. The wrapping div also
// makes wide tables scroll horizontally instead of breaking the layout.
// h2/h3 get slugify()'d ids here so PillTableOfContents can scroll to them.
const mdComponents: Components = {
  h2: ({ children, ...props }) => (
    <h2 id={slugify(String(children))} style={{ scrollMarginTop: 96 }} {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 id={slugify(String(children))} style={{ scrollMarginTop: 96 }} {...props}>{children}</h3>
  ),
  table: ({ children, ...props }) => (
    <div style={{ overflowX: 'auto', marginBottom: 24 }}>
      <table style={{ minWidth: '100%', width: 'max-content', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }} {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }} {...props}>{children}</thead>
  ),
  th: ({ children, ...props }) => (
    <th style={{ padding: '12px 16px', textAlign: 'start', fontWeight: 600, color: '#0f172a', fontSize: 14 }} {...props}>{children}</th>
  ),
  tr: ({ children, ...props }) => (
    <tr style={{ borderBottom: '1px solid #e2e8f0' }} {...props}>{children}</tr>
  ),
  td: ({ children, ...props }) => (
    <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151', lineHeight: 1.6, textAlign: 'start' }} {...props}>{children}</td>
  ),
};

// Desktop only (lg+) - small screens show no "Back to blog" link at all.
// Only rendered when there's no ToC sidebar taking up that gutter space.
function BackToBlogLink({ hasToc }: { hasToc: boolean }) {
  return !hasToc ? (
    <a href="/blog" className="hidden lg:flex items-center gap-1.5 absolute top-16 end-full me-8 whitespace-nowrap text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back to blog
    </a>
  ) : null;
}

// Full-page-width hero image + title/byline block, rendered above the
// three-column ToC/body grid (not inside it - the ToC only makes sense
// beside the article text, not floating alongside the title).
function ArticleHero({ article, hasToc, variant }: { article: Article; hasToc: boolean; variant: HeroVariant }) {
  const longDate = new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Sidebar: matches components/BlogPostLayoutSidebar from the catalog -
  // hero in a bordered rounded card, title left-aligned directly below it
  // (not overlapping), then a divider, then a byline "info row" (avatar +
  // three labeled mini-groups: Written by / Published / Reading time) laid
  // out horizontally, not stacked into a column. max-w-3xl matches the
  // article text column's own width (same as the elevated variant) so the
  // header lines up with the body below it instead of looking wider/narrower.
  if (variant === 'sidebar') {
    return (
      <>
        <div className="max-w-3xl mx-auto px-6 pt-14">
          {article.cover_image && (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}
          <h1 className="text-[clamp(24px,3.4vw,40px)] font-extrabold text-slate-900 leading-[1.15] tracking-tight mt-8">
            {article.title}
          </h1>
        </div>
        <div className="max-w-3xl mx-auto px-6 pt-6 border-t border-slate-100 mt-6">
          <div className="relative">
            <BackToBlogLink hasToc={hasToc} />
            <div className="flex items-center gap-5 flex-wrap">
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                style={{ backgroundColor: BLOG_ACCENT }}
                aria-hidden="true"
              >
                E
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-slate-400">Written by</span>
                <span className="text-[13px] font-semibold text-slate-800">Editorial Team</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-slate-400">Published</span>
                <time dateTime={article.created_at} className="text-[13px] font-medium text-slate-600">{longDate}</time>
              </div>
              {article.reading_time_minutes ? (
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400">Reading time</span>
                  <span className="text-[13px] font-medium text-slate-600">{article.reading_time_minutes} min</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Minimal: matches components/BlogPostLayoutMinimal from the catalog -
  // hero in a rounded card (no scrim), title centered below it, byline
  // centered with small dot separators - a plain, editorial-neutral
  // presentation with no card chrome around the header itself. max-w-3xl
  // matches the article text column's own width (same as the elevated
  // variant) so the header lines up with the body below it.
  if (variant === 'minimal') {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-16">
        {article.cover_image && (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}
        <div className="relative">
          <BackToBlogLink hasToc={hasToc} />
        </div>
        <h1 className="text-[clamp(26px,3.8vw,44px)] font-bold text-slate-900 leading-[1.2] tracking-tight text-center mt-10">
          {article.title}
        </h1>
        <div className="flex items-center justify-center gap-2 sm:gap-3 mt-6">
          <span
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-[12px] font-bold text-white shrink-0"
            style={{ backgroundColor: BLOG_ACCENT }}
            aria-hidden="true"
          >
            E
          </span>
          <span className="text-[13px] sm:text-[14px] font-semibold text-slate-700">Editorial Team</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
          <time dateTime={article.created_at} className="text-[13px] sm:text-[14px] text-slate-500">{longDate}</time>
          {article.reading_time_minutes ? (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
              <span className="text-[13px] sm:text-[14px] text-slate-500">{article.reading_time_minutes} min read</span>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // Elevated (default): unchanged original design - full-bleed hero image
  // with a dark-to-white gradient scrim, colored avatar-initial circle,
  // "|" separators, uppercase date/read-time, border under the header.
  return (
    <>
      {article.cover_image && (
        <div className="relative w-full h-[clamp(200px,25vw,360px)] overflow-hidden bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.cover_image}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover opacity-95"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 to-transparent" />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to bottom, transparent 70%, white 100%)' }} />
        </div>
      )}
      <div>
        <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-11 border-b border-slate-100">
          <BackToBlogLink hasToc={hasToc} />
          <h1 className="text-[clamp(26px,3.8vw,48px)] font-extrabold text-slate-900 leading-[1.13] tracking-tight">
            {article.title}
          </h1>
          <div className="flex items-center gap-2.5 mt-4 flex-wrap">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: BLOG_ACCENT }}
              aria-hidden="true"
            >
              E
            </span>
            <span className="text-[13px] font-semibold text-slate-600">Editorial Team</span>
            <span className="w-px h-3.5 bg-slate-200 shrink-0" aria-hidden="true" />
            <time dateTime={article.created_at} className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">
              {longDate}
            </time>
            {article.reading_time_minutes ? (
              <>
                <span className="w-px h-3.5 bg-slate-200 shrink-0" aria-hidden="true" />
                <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">
                  {article.reading_time_minutes} min read
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const relatedPosts = await getRelatedPosts(slug, article.internal_link_slugs ?? []);
  const contentIsHtml = isHtmlContent(article.content);
  // HTML-format content has no Markdown "## " lines to scan, so there's
  // nothing to build a ToC from. The 3+ heading threshold keeps a one- or
  // two-heading article from getting a near-empty pill.
  const headings = contentIsHtml ? [] : extractHeadings(article.content);
  const hasToc = headings.length >= 3;

  // The webhook stores key_takeaways as { takeaway, _heading? }[] -
  // BlogKeyTakeaways just wants the plain strings.
  const takeawayStrings = (article.key_takeaways ?? []).map(k => k.takeaway);

  // Takeaways sit right after the intro paragraph, not before it. Only
  // applies to Markdown - HTML content has no paragraph structure to split
  // this way.
  const { intro, rest } = takeawayStrings.length > 0 && !contentIsHtml
    ? splitIntroMarkdown(article.content)
    : { intro: '', rest: article.content };

  // Article structured data - lets search engines and AI answer engines
  // parse the article's shape directly instead of guessing from prose. No
  // author/publisher/url fields: the webhook payload has no author concept,
  // and url/mainEntityOfPage need an absolute site URL this template
  // deliberately doesn't assume (see generateMetadata's canonical comment) -
  // both are optional in the Article schema, so omitting them is valid.
  const jsonLdKeywords = [article.focus_keyword, ...(article.secondary_keywords ?? [])].filter(
    (k): k is string => !!k,
  );
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.meta_description ?? article.og_description ?? undefined,
    image: article.cover_image ? [article.cover_image] : undefined,
    datePublished: article.created_at,
    dateModified: article.updated_at ?? article.created_at,
    keywords: jsonLdKeywords.length > 0 ? jsonLdKeywords.join(', ') : undefined,
    wordCount: article.word_count ?? undefined,
  };

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <ArticleHero article={article} hasToc={hasToc} variant={DEFAULT_HERO_VARIANT} />

      {/* THREE-column grid at lg: [280px ToC] [minmax(0,720px) article text]
          [1fr empty spacer]. The empty third
          column exists ONLY to balance the ToC column's width, so the
          article text reads as centered on the page instead of shifted
          toward the ToC - a plain [280px_1fr] two-column grid would leave
          the text looking off-center, shifted right by the ToC's width with
          nothing balancing it on the other side. Below lg the grid is
          inactive (single column) and the pill variant (nested inside the
          body below) takes over instead. ToC column comes FIRST (both in
          the grid template and in source order below) so it renders to the
          left of the article text, not the right. Starts here (below the
          title block above) so the ToC sits beside the body text only. */}
      <div className="max-w-[1440px] mx-auto px-7 lg:grid lg:grid-cols-[280px_minmax(0,720px)_1fr] lg:gap-x-10 lg:items-start">
        {/* lg+ sidebar - its own grid column so it sits beside the article
            text instead of shrinking it. Same component/data as the pill
            below (see this file's top comment for why it's two call sites
            instead of one component doing both). Placed first so it lands
            in the grid's first (left) column. */}
        {hasToc && (
          <PillTableOfContents variant="sidebar" items={headings} accentColor={BLOG_ACCENT} />
        )}

        {/* Body - same typography classes as BlogPostLayout's own body div,
            but WITHOUT its max-w-3xl/mx-auto/px-6 - this div already sits in
            the grid's own minmax(0,720px) middle column, so those would
            double-constrain it and shrink the text narrower than the column
            it's meant to fill. BlogPostLayout itself isn't used here (see
            the title block above for why), so these classes are duplicated
            rather than inherited. */}
        <div
          className="blog-post-body py-12 text-[16px] leading-[1.8] text-slate-700
                         [&_h2]:text-[26px] [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:tracking-tight [&_h2]:leading-snug
                         [&_h3]:text-[20px] [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:tracking-tight
                         [&_p]:mb-5 [&_p]:leading-[1.8]
                         [&_ul]:mb-5 [&_ul]:ps-6 [&_ul]:list-disc
                         [&_ol]:mb-5 [&_ol]:ps-6 [&_ol]:list-decimal
                         [&_li]:mb-2
                         [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2
                         [&_img]:rounded-2xl [&_img]:my-8 [&_img]:w-full [&_img]:h-auto
                         [&_blockquote]:my-7 [&_blockquote]:ps-5 [&_blockquote]:italic [&_blockquote]:text-slate-600"
          style={{ ['--accent' as string]: BLOG_ACCENT } as React.CSSProperties}
        >
          <style>{`.blog-post-body a { color: var(--accent); } .blog-post-body blockquote { border-inline-start: 3px solid var(--accent); }`}</style>
          {contentIsHtml ? (
            <>
              {takeawayStrings.length > 0 && (
                <BlogKeyTakeaways items={takeawayStrings} accentColor={BLOG_ACCENT} />
              )}
              <div dangerouslySetInnerHTML={{ __html: article.content }} />
            </>
          ) : takeawayStrings.length > 0 && intro ? (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{intro}</ReactMarkdown>
              <BlogKeyTakeaways items={takeawayStrings} accentColor={BLOG_ACCENT} />
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{rest}</ReactMarkdown>
            </>
          ) : (
            <>
              {takeawayStrings.length > 0 && (
                <BlogKeyTakeaways items={takeawayStrings} accentColor={BLOG_ACCENT} />
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{article.content}</ReactMarkdown>
            </>
          )}

          {/* Bottom pill, small screens only - the lg+ sidebar (above)
              takes over at that breakpoint. It's its own 'use client'
              component, so it can render directly here even though this
              page has no 'use client' itself. Rendered as the last child
              inside this div so its plain `position: sticky` sticks only
              while scrolling through this div, then scrolls away normally once
              past its end (related posts, footer). */}
          {hasToc && (
            <PillTableOfContents variant="pill" items={headings} accentColor={BLOG_ACCENT} />
          )}
        </div>

        {/* Empty spacer column - balances the ToC column's width so the
            article text column above lands centered on the page. Only
            needs to exist at lg (matches the grid's own breakpoint). */}
        <div className="hidden lg:block" />
      </div>

      {relatedPosts.length > 0 && (
        // containerClassName matches the grid above (max-w-[1440px] px-7)
        // exactly, so "Related articles" spans the full page width - ToC
        // column included - instead of BlogSection's own narrower max-w-6xl
        // default, which would make it look like only the article text
        // column's width.
        <BlogSection
          tagline="Keep reading"
          heading="More from the blog"
          accentColor={BLOG_ACCENT}
          posts={relatedPosts}
          containerClassName="max-w-[1440px] px-7"
        />
      )}
    </div>
  );
}
