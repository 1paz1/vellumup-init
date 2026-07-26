// SYNC-RULE: mirrored from lucidseo lib/catalog-items/full-article-page/wired-example.ts (WIRED_ARTICLE_PAGE).
// Edit both in the same commit - see templates/SYNC.md for the extraction recipe.
// Known deltas here: this header, em-dashes replaced with hyphens, and two language-filter placeholder lines (replaced by the CLI at install time).
//
// Data layer: this is Supabase-based code by default - a starting point, not
// a requirement. Using another database or an ORM? Delete the inline
// createClient(...) block and rewrite the small data-access functions below
// (getArticle, getRelatedPosts) to return the same fields from whatever
// store you have - the rest of the page works unchanged.
// app/blog/[slug]/page.tsx
//
// Renders one article fetched from the "articles" table your vellumup-webhook
// route saved to (see the "Webhook Route" and "Database Table" tabs), using
// the same catalog components as the standalone demo - fed real data instead
// of hardcoded sample content.
//
// Already have a Supabase client elsewhere in your project? Delete the
// createClient(...) line below and import yours instead - this inline
// version exists so this file runs with zero other files if you don't.
//
// Everything lives in this one file, same as VellumUp's own production blog
// page (app/[locale]/blog/[slug]/page.tsx) - no separate client wrapper.
// PillTableOfContents is already its own 'use client' component, so a plain
// async Server Component (this page) can render it directly as a child;
// there's no need for this page (or anything around it) to be 'use client'
// itself, same as VellumUp's own page does with BlogToc/BlogTocMobile.
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogPostLayout } from '@/components/BlogPostLayout';
import { BlogSection } from '@/components/BlogSection';
import { BlogKeyTakeaways } from '@/components/BlogKeyTakeaways';
import { PillTableOfContents } from '@/components/PillTableOfContents';

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
  reading_time_minutes: number | null;
  created_at: string;
  key_takeaways: { takeaway: string; _heading?: string }[] | null;
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
    .select('slug, title, content, cover_image, meta_description, reading_time_minutes, created_at, key_takeaways')
    .eq('slug', slug)
    .eq('status', 'published')
    // __VELLUMUP_LANG_FILTER__
    .single();
  return data;
});

async function getRelatedPosts(excludeSlug: string): Promise<RelatedPost[]> {
  const { data } = await supabase
    .from('articles')
    .select('slug, title, cover_image, meta_description, focus_keyword, created_at')
    .eq('status', 'published')
    // __VELLUMUP_LANG_FILTER__
    .neq('slug', excludeSlug)
    .order('created_at', { ascending: false })
    .limit(2);
  return data ?? [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.meta_description ?? undefined,
    openGraph: {
      title: article.title,
      description: article.meta_description ?? undefined,
      type: 'article',
      images: article.cover_image ? [article.cover_image] : undefined,
    },
  };
}

// Endpoints set to HTML content format deliver ready HTML; the default is
// Markdown. Same detection VellumUp's own blog uses.
function isHtmlContent(content: string): boolean {
  return /<(p|h[1-6]|ul|ol|li|blockquote|figure|div|table|strong|em|a)\b/i.test(content.trimStart());
}

// Same slugify VellumUp's own blog page uses - deterministic, so the id a
// heading gets here always matches the id extractHeadings() below assigns
// the same heading text, with zero extra data needed from the webhook.
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
// it and the rest of the article - same placement VellumUp's own blog page
// uses (right after the opening paragraph reads better than before it).
// Skips titles/images/blank lines while looking for that first paragraph; if
// a "## " heading shows up before any paragraph text, there's no intro to
// split off, so the takeaways box falls back to going before everything.
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

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const relatedPosts = await getRelatedPosts(slug);
  const contentIsHtml = isHtmlContent(article.content);
  // HTML-format content has no Markdown "## " lines to scan, so there's
  // nothing to build a ToC from - same 3+ heading threshold VellumUp's own
  // page uses, so a one- or two-heading article doesn't get a near-empty pill.
  const headings = contentIsHtml ? [] : extractHeadings(article.content);
  const hasToc = headings.length >= 3;

  // The webhook stores key_takeaways as { takeaway, _heading? }[] -
  // BlogKeyTakeaways just wants the plain strings.
  const takeawayStrings = (article.key_takeaways ?? []).map(k => k.takeaway);

  // Same placement as VellumUp's own blog page: takeaways sit right after
  // the intro paragraph, not before it. Only applies to Markdown - HTML
  // content has no paragraph structure to split this way.
  const { intro, rest } = takeawayStrings.length > 0 && !contentIsHtml
    ? splitIntroMarkdown(article.content)
    : { intro: '', rest: article.content };

  return (
    <>
      {/* THREE-column grid at lg - same pattern as VellumUp's own production
          blog page (app/[locale]/blog/[slug]/page.tsx): [280px ToC]
          [minmax(0,720px) article text] [1fr empty spacer]. The empty third
          column exists ONLY to balance the ToC column's width, so the
          article text reads as centered on the page instead of shifted
          toward the ToC - a plain [280px_1fr] two-column grid would leave
          the text looking off-center, shifted right by the ToC's width with
          nothing balancing it on the other side. Below lg the grid is
          inactive (single column) and the pill variant (nested inside
          BlogPostLayout below) takes over instead. ToC column comes FIRST
          (both in the grid template and in source order below) so it
          renders to the left of the article text, not the right. */}
      <div className="max-w-[1440px] mx-auto px-7 lg:grid lg:grid-cols-[280px_minmax(0,720px)_1fr] lg:gap-x-10 lg:items-start">
        {/* lg+ sidebar - its own grid column so it sits beside the article
            text instead of shrinking it. Same component/data as the pill
            below (see this file's top comment for why it's two call sites
            instead of one component doing both). Placed first so it lands
            in the grid's first (left) column. */}
        {hasToc && (
          <PillTableOfContents variant="sidebar" items={headings} accentColor="#4A68E5" />
        )}

        <BlogPostLayout
          title={article.title}
          coverImage={article.cover_image}
          publishedAt={article.created_at}
          readingTimeMinutes={article.reading_time_minutes ?? undefined}
          accentColor="#4A68E5"
          // The ToC sidebar above already shows its own "Back to blog" link
          // (lg and up) when there's a ToC - showing BlogPostLayout's own
          // lg+ back link too would duplicate it. No ToC means no sidebar,
          // so BlogPostLayout's own back link is what's showing instead.
          showBackLinkDesktop={!hasToc}
        >
          <div>
            {contentIsHtml ? (
              <>
                {takeawayStrings.length > 0 && (
                  <BlogKeyTakeaways items={takeawayStrings} accentColor="#4A68E5" />
                )}
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              </>
            ) : takeawayStrings.length > 0 && intro ? (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{intro}</ReactMarkdown>
                <BlogKeyTakeaways items={takeawayStrings} accentColor="#4A68E5" />
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{rest}</ReactMarkdown>
              </>
            ) : (
              <>
                {takeawayStrings.length > 0 && (
                  <BlogKeyTakeaways items={takeawayStrings} accentColor="#4A68E5" />
                )}
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{article.content}</ReactMarkdown>
              </>
            )}

            {/* Bottom pill, small screens only - the lg+ sidebar (above,
                outside BlogPostLayout) takes over at that breakpoint. It's
                its own 'use client' component, so it can render directly
                here even though this page has no 'use client' itself - same
                as VellumUp's own blog page does with BlogTocMobile.
                Rendered as the last child inside this div so its plain
                `position: sticky` sticks only while scrolling through this
                div, then scrolls away normally once past its end (related
                posts, footer). */}
            {hasToc && (
              <PillTableOfContents variant="pill" items={headings} accentColor="#4A68E5" />
            )}
          </div>
        </BlogPostLayout>

        {/* Empty spacer column - balances the ToC column's width so the
            article text column above lands centered on the page. Only
            needs to exist at lg (matches the grid's own breakpoint). */}
        <div className="hidden lg:block" />
      </div>

      {relatedPosts.length > 0 && (
        <BlogSection
          tagline="Keep reading"
          heading="From the blog"
          viewAllHref="/blog"
          accentColor="#4A68E5"
          posts={relatedPosts}
        />
      )}
    </>
  );
}
