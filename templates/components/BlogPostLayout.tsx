// SYNC-RULE: mirrored from lucidseo lib/catalog-items/blog-post-layout/component-template.ts (BLOG_POST_LAYOUT_TEMPLATE).
// Edit both in the same commit - see templates/SYNC.md for the extraction recipe.
// Known deltas here: this header, and em-dashes replaced with plain hyphens.
// components/BlogPostLayout.tsx

interface BlogPostLayoutProps {
  title: string;
  coverImage?: string | null;
  coverImageAlt?: string | null; // falls back to title if omitted
  authorName?: string;
  authorAvatar?: string | null;
  /** ISO 8601 date string, e.g. "2026-05-28T00:00:00.000Z" */
  publishedAt: string;
  /** Estimated reading time in minutes - omit to hide */
  readingTimeMinutes?: number;
  accentColor?: string;
  /** Link back to the blog index - set to null to hide it entirely */
  backHref?: string | null;
  backLabel?: string;
  /** Hide the lg+ floating back link in the gutter beside the title - pass
   *  false when it's already shown elsewhere on the page (e.g. a ToC
   *  sidebar with its own back link). The lg:hidden mobile back link above
   *  the title is unaffected - it still needs to show somewhere on small
   *  screens where there's no ToC sidebar taking over that job. */
  showBackLinkDesktop?: boolean;
  /** Article body - plain JSX, markdown-rendered output, or raw HTML, whatever you already have */
  children: React.ReactNode;
}

function Byline({
  authorName,
  authorAvatar,
  accentColor,
  publishDate,
  formattedDate,
  readingTimeMinutes,
}: {
  authorName: string;
  authorAvatar?: string | null;
  accentColor: string;
  publishDate: Date;
  formattedDate: string;
  readingTimeMinutes?: number;
}) {
  return (
    <div className="flex items-center gap-2.5 mt-4 flex-wrap">
      {authorAvatar ? (
        <img
          src={authorAvatar}
          alt={authorName}
          loading="lazy"
          className="w-6 h-6 rounded-full object-cover"
        />
      ) : (
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        >
          {authorName.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="text-[13px] font-semibold text-slate-600">{authorName}</span>
      <span className="w-px h-3.5 bg-slate-200 shrink-0" aria-hidden="true" />
      <time dateTime={publishDate.toISOString()} className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">
        {formattedDate}
      </time>
      {readingTimeMinutes ? (
        <>
          <span className="w-px h-3.5 bg-slate-200 shrink-0" aria-hidden="true" />
          <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">
            {readingTimeMinutes} min read
          </span>
        </>
      ) : null}
    </div>
  );
}

export function BlogPostLayout({
  title,
  coverImage,
  coverImageAlt,
  authorName = 'Editorial Team',
  authorAvatar,
  publishedAt,
  readingTimeMinutes,
  accentColor = '#4A68E5',
  backHref = '/blog',
  backLabel = 'Back to blog',
  showBackLinkDesktop = true,
  children,
}: BlogPostLayoutProps) {
  const publishDate = new Date(publishedAt);
  const formattedDate = publishDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const byline = (
    <Byline
      authorName={authorName}
      authorAvatar={authorAvatar}
      accentColor={accentColor}
      publishDate={publishDate}
      formattedDate={formattedDate}
      readingTimeMinutes={readingTimeMinutes}
    />
  );
  // Always present regardless of whether the page has a table of contents -
  // readers need a way back to the blog index no matter how the article is
  // structured, not just when a ToC happens to be shown. Sits beside the
  // text column (outside the title/content area) on wide screens, where
  // there's room in the gutter; falls back to sitting above the title on
  // narrow screens, where there's no side space for it at all.
  const backIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
  // topClass matches the title's own padding-top in each hero variant below,
  // so the link lines up with the title's line instead of floating above it.
  function backLinkDesktop(topClass: string) {
    return backHref && showBackLinkDesktop ? (
      <a
        href={backHref}
        className={`hidden lg:flex items-center gap-1.5 absolute ${topClass} end-full me-8 whitespace-nowrap text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors`}
      >
        {backIcon}
        {backLabel}
      </a>
    ) : null;
  }
  const backLinkMobile = backHref ? (
    <a
      href={backHref}
      className="lg:hidden inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors mb-4"
    >
      {backIcon}
      {backLabel}
    </a>
  ) : null;

  return (
    <article className="bg-white">
      {/* Hero */}
      {coverImage ? (
        <div className="relative">
          <div className="relative w-full h-[clamp(240px,30vw,420px)] overflow-hidden bg-slate-50">
            <img
              src={coverImage}
              alt={coverImageAlt || title}
              loading="eager"
              className="absolute inset-0 w-full h-full object-cover opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 to-transparent" />
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to bottom, transparent 70%, white 100%)' }} />
          </div>

          <div className="relative max-w-3xl mx-auto px-6 pt-9 pb-11 border-b border-slate-100">
            {backLinkDesktop('top-9')}
            {backLinkMobile}
            <h1 className="text-[clamp(26px,3.6vw,44px)] font-extrabold text-slate-900 leading-[1.13] tracking-tight">
              {title}
            </h1>
            {byline}
          </div>
        </div>
      ) : (
        <div className="border-b border-slate-100">
          <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-11">
            {backLinkDesktop('top-16')}
            {backLinkMobile}
            <h1 className="text-[clamp(26px,3.8vw,48px)] font-extrabold text-slate-900 leading-[1.13] tracking-tight">
              {title}
            </h1>
            {byline}
          </div>
        </div>
      )}

      {/* Body */}
      <div
        className="blog-post-body max-w-3xl mx-auto px-6 py-12 text-[16px] leading-[1.8] text-slate-700
                       [&_h2]:text-[26px] [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:tracking-tight [&_h2]:leading-snug
                       [&_h3]:text-[20px] [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:tracking-tight
                       [&_p]:mb-5 [&_p]:leading-[1.8]
                       [&_ul]:mb-5 [&_ul]:ps-6 [&_ul]:list-disc
                       [&_ol]:mb-5 [&_ol]:ps-6 [&_ol]:list-decimal
                       [&_li]:mb-2
                       [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2
                       [&_img]:rounded-2xl [&_img]:my-8 [&_img]:w-full [&_img]:h-auto
                       [&_blockquote]:my-7 [&_blockquote]:ps-5 [&_blockquote]:italic [&_blockquote]:text-slate-600"
        style={{ ['--accent' as string]: accentColor } as React.CSSProperties}
      >
        <style>{`.blog-post-body a { color: var(--accent); } .blog-post-body blockquote { border-inline-start: 3px solid var(--accent); }`}</style>
        {children}
      </div>
    </article>
  );
}
