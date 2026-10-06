// app/blog/[slug]/page.tsx
//
// Renders one article.
//
// Data: the article and its related posts come from getArticle and
// getRelatedPosts in lib/blog-data.ts - change that file, not this one, to
// point the blog at a different source.
//
// Everything else lives in this one file - no separate client wrapper.
// PillTableOfContents is already its own 'use client' component, so a plain
// async Server Component (this page) can render it directly as a child;
// there's no need for this page (or anything around it) to be 'use client'
// itself.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogSection } from '@/components/BlogSection';
import { BlogKeyTakeaways } from '@/components/BlogKeyTakeaways';
import { PillTableOfContents } from '@/components/PillTableOfContents';
import { BlogAiSummary } from '@/components/BlogAiSummary';
import { getArticle, getRelatedPosts } from '@/lib/blog-data';
import type { Article } from '@/lib/blog-types';
import {
  BLOG_ACCENT,
  BLOG_AUTHOR,
  DEFAULT_HERO_VARIANT,
  SHOW_AI_SUMMARY,
  SITE_NAME,
  SITE_URL,
  type HeroVariant,
} from '@/lib/blog-theme';

const RELATED_POSTS_LIMIT = 3;

// Title/description prefer the dedicated OG fields (og_title,
// og_description) over the general title/meta_description, since those are
// tuned for how the article reads when shared/linked rather than on-page.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};

  const title = article.og_title ?? article.title;
  const description = article.og_description ?? article.meta_description ?? undefined;
  // Written relative; with SITE_URL set (lib/blog-theme.ts), metadataBase
  // makes the canonical and openGraph.url full URLs, which share previews
  // need. Without it they stay relative, which search engines still accept.
  const canonical = `/blog/${article.slug}`;
  const keywords = [article.focus_keyword, ...(article.secondary_keywords ?? [])].filter(
    (k): k is string => !!k,
  );

  return {
    metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    authors: BLOG_AUTHOR ? [{ name: BLOG_AUTHOR.name, url: BLOG_AUTHOR.url }] : undefined,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      siteName: SITE_NAME || undefined,
      publishedTime: article.created_at,
      modifiedTime: article.updated_at ?? article.created_at,
      authors: BLOG_AUTHOR ? [BLOG_AUTHOR.name] : undefined,
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
// extractHeadings() below assigns the same heading text, with no extra
// data needed beyond the content.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u0080-\uFFFF\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Scans raw Markdown for "## "/"### " lines and turns each into a
// { id, label } pill entry - no field needed beyond the content.
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
    <Link href="/blog" className="hidden lg:flex items-center gap-1.5 absolute top-16 end-full me-8 whitespace-nowrap text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back to blog
    </Link>
  ) : null;
}

// Structured data wants full URLs. A relative image path such as
// /images/cover.jpg gets SITE_URL in front once it's set.
function absoluteUrl(src: string): string {
  if (!SITE_URL || /^https?:\/\//i.test(src)) return src;
  return `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
}

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// The one date the byline shows: the last update when the article was
// edited at least a day after publishing, otherwise the publish date.
// updated_at is often equal to created_at, or seconds after it, when an
// article is first saved, so smaller gaps don't count as an update. Both
// dates still go to search engines in the structured data.
function bylineDate(article: Article): string {
  const oneDay = 24 * 60 * 60 * 1000;
  const editedLater =
    !!article.updated_at && Date.parse(article.updated_at) - Date.parse(article.created_at) >= oneDay;
  return editedLater ? article.updated_at! : article.created_at;
}

// Full-page-width hero image + title/byline block, rendered above the
// three-column ToC/body grid (not inside it - the ToC only makes sense
// beside the article text, not floating alongside the title).
function ArticleHero({ article, hasToc, variant }: { article: Article; hasToc: boolean; variant: HeroVariant }) {
  const shownDate = bylineDate(article);
  const longDate = formatLongDate(shownDate);
  // The author comes from BLOG_AUTHOR in lib/blog-theme.ts. Without one, the
  // byline shows no name and no avatar - never a made-up one.
  const authorInitial = BLOG_AUTHOR ? BLOG_AUTHOR.name.charAt(0).toUpperCase() : null;

  // Sidebar: hero in a bordered rounded card, title left-aligned directly below it
  // (not overlapping), then a divider, then a byline "info row" (avatar and
  // labeled mini-groups: Written by / Date / Reading time,
  // each only when there's a value) laid out horizontally, not stacked into
  // a column. max-w-3xl matches the
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
              {BLOG_AUTHOR && (
                <>
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                    style={{ backgroundColor: BLOG_ACCENT }}
                    aria-hidden="true"
                  >
                    {authorInitial}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium text-slate-400">Written by</span>
                    <span className="text-[13px] font-semibold text-slate-800">{BLOG_AUTHOR.name}</span>
                  </div>
                </>
              )}
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-slate-400">Date</span>
                <time dateTime={shownDate} className="text-[13px] font-medium text-slate-600">{longDate}</time>
              </div>
              {article.reading_time_minutes ? (
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-slate-400">Reading time</span>
                  <span className="text-[13px] font-medium text-slate-600">{article.reading_time_minutes} min</span>
                </div>
              ) : null}
              {/* Same label-over-value shape as the groups before it, pushed to the row's far end */}
              {SHOW_AI_SUMMARY && (
                <div className="sm:ms-auto">
                  <BlogAiSummary title={article.title} variant="sidebar" />
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Minimal: hero in a rounded card (no scrim), title centered below it, byline
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
        <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-3 mt-6">
          {BLOG_AUTHOR && (
            <>
              <span
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-[12px] font-bold text-white shrink-0"
                style={{ backgroundColor: BLOG_ACCENT }}
                aria-hidden="true"
              >
                {authorInitial}
              </span>
              <span className="text-[13px] sm:text-[14px] font-semibold text-slate-700">{BLOG_AUTHOR.name}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
            </>
          )}
          <time dateTime={shownDate} className="text-[13px] sm:text-[14px] text-slate-500">{longDate}</time>
          {article.reading_time_minutes ? (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
              <span className="text-[13px] sm:text-[14px] text-slate-500">{article.reading_time_minutes} min read</span>
            </>
          ) : null}
        </div>
        {/* Centered on its own line under the centered byline */}
        {SHOW_AI_SUMMARY && (
          <div className="mt-5">
            <BlogAiSummary title={article.title} variant="minimal" />
          </div>
        )}
      </div>
    );
  }

  // Elevated (default): full-bleed hero image with a dark-to-white gradient
  // scrim, small avatar-initial circle (with an author set), "|" separators,
  // border under the header.
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
        <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-6 border-b border-slate-100">
          <BackToBlogLink hasToc={hasToc} />
          <h1 className="text-[clamp(26px,3.8vw,48px)] font-extrabold text-slate-900 leading-[1.13] tracking-tight">
            {article.title}
          </h1>
          <div className="flex items-center gap-2.5 mt-4 flex-wrap">
            {BLOG_AUTHOR && (
              <>
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: BLOG_ACCENT }}
                  aria-hidden="true"
                >
                  {authorInitial}
                </span>
                <span className="text-[13px] font-semibold text-slate-600">{BLOG_AUTHOR.name}</span>
                <span className="w-px h-3.5 bg-slate-200 shrink-0" aria-hidden="true" />
              </>
            )}
            <time dateTime={shownDate} className="text-[13px] text-slate-500">
              {longDate}
            </time>
            {article.reading_time_minutes ? (
              <>
                <span className="w-px h-3.5 bg-slate-200 shrink-0" aria-hidden="true" />
                <span className="text-[13px] text-slate-500">
                  {article.reading_time_minutes} min read
                </span>
              </>
            ) : null}
            {/* End of the same row on sm+, wraps onto its own line on mobile */}
            {SHOW_AI_SUMMARY && (
              <div className="w-full sm:w-auto sm:ms-auto mt-2 sm:mt-0">
                <BlogAiSummary title={article.title} variant="elevated" />
              </div>
            )}
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

  const relatedPosts = await getRelatedPosts(slug, article.internal_link_slugs ?? [], RELATED_POSTS_LIMIT);
  const contentIsHtml = isHtmlContent(article.content);
  // HTML-format content has no Markdown "## " lines to scan, so there's
  // nothing to build a ToC from. The 3+ heading threshold keeps a one- or
  // two-heading article from getting a near-empty pill.
  const headings = contentIsHtml ? [] : extractHeadings(article.content);
  const hasToc = headings.length >= 3;

  // key_takeaways is { takeaway, _heading? }[] (the shape VellumUp sends) -
  // BlogKeyTakeaways just wants the plain strings.
  const takeawayStrings = (article.key_takeaways ?? []).map(k => k.takeaway);

  // Takeaways sit right after the intro paragraph, not before it. Only
  // applies to Markdown - HTML content has no paragraph structure to split
  // this way.
  const { intro, rest } = takeawayStrings.length > 0 && !contentIsHtml
    ? splitIntroMarkdown(article.content)
    : { intro: '', rest: article.content };

  // Structured data - lets search engines and AI answer engines read the
  // article's shape directly instead of guessing from prose. Everything here
  // comes from the article or from the Site details in lib/blog-theme.ts;
  // whatever isn't set there (author, site name, site URL) is left out
  // rather than guessed, since all of it is optional in schema.org.
  const jsonLdKeywords = [article.focus_keyword, ...(article.secondary_keywords ?? [])].filter(
    (k): k is string => !!k,
  );
  const articleUrl = SITE_URL ? `${SITE_URL}/blog/${article.slug}` : undefined;
  const blogPosting = {
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.meta_description ?? article.og_description ?? undefined,
    image: article.cover_image ? [absoluteUrl(article.cover_image)] : undefined,
    datePublished: article.created_at,
    dateModified: article.updated_at ?? article.created_at,
    keywords: jsonLdKeywords.length > 0 ? jsonLdKeywords.join(', ') : undefined,
    wordCount: article.word_count ?? undefined,
    url: articleUrl,
    mainEntityOfPage: articleUrl,
    author: BLOG_AUTHOR
      ? { '@type': BLOG_AUTHOR.type, name: BLOG_AUTHOR.name, url: BLOG_AUTHOR.url }
      : undefined,
    publisher: SITE_NAME ? { '@type': 'Organization', name: SITE_NAME, url: SITE_URL || undefined } : undefined,
  };
  // Breadcrumbs need full URLs, so they're only added once SITE_URL is set.
  const breadcrumbs = articleUrl
    ? {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME || 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
        ],
      }
    : undefined;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': breadcrumbs ? [blogPosting, breadcrumbs] : [blogPosting],
  };

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        // "<" is escaped so text from the article (a title containing
        // "</script>", say) can't close this tag early - the fix Next.js's
        // JSON-LD guide recommends.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
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
        // exactly, so "More from the blog" spans the full page width - ToC
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
