// components/BlogCard.tsx
//
// Single card used everywhere a post preview is shown - the blog index
// (app/blog/page.tsx) and "related posts" (BlogSection.tsx). Plain Server
// Component: hover accent is done with a CSS variable + Tailwind arbitrary
// value (hover:border-[var(--accent)]), not onMouseEnter/onMouseLeave, so
// nothing here needs 'use client' - both callers can render it directly,
// including the Server Component blog index page.

import { BLOG_ACCENT, DEFAULT_CARD_VARIANT, type CardVariant } from '@/lib/blog-theme';

/** Outer card shell classes per CardVariant - see CardVariant in
 *  lib/blog-theme.ts for what each variant looks like. */
const CARD_VARIANT_CLASSES: Record<CardVariant, string> = {
  elevated: 'border border-slate-200 transition-all hover:shadow-lg',
  framed: 'border border-slate-200 transition-colors hover:border-slate-300',
  minimal: 'border-0 transition-opacity hover:opacity-90',
};

export interface BlogCardPost {
  slug: string;
  title: string;
  cover_image?: string | null;
  cover_image_alt?: string | null; // falls back to title if omitted
  meta_description?: string | null;
  focus_keyword?: string | null;
  created_at?: string; // ISO 8601 - format for display, e.g. toLocaleDateString()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CardImage({ post, rounded, aspect = 'aspect-video' }: { post: BlogCardPost; rounded: string; aspect?: string }) {
  return (
    <div className={`relative ${aspect} bg-slate-100 shrink-0 overflow-hidden ${rounded}`}>
      {post.cover_image ? (
        // Plain <img>, not next/image: cover images can come from any host,
        // and next/image would need each one listed in next.config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image}
          alt={post.cover_image_alt || post.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-slate-50 flex items-center justify-center" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-slate-300">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

function ReadMore({ accentColor }: { accentColor: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold" style={{ color: accentColor }}>
      Read more
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        className="transition-transform duration-200 group-hover:translate-x-0.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}

// Fixed-height footer row (date + Read more) shared by every variant, so
// switching variants never changes the card's overall height.
function CardFooter({ post, accentColor }: { post: BlogCardPost; accentColor: string }) {
  return (
    <div className="flex items-center justify-between mt-auto pt-3 text-[12px] h-9">
      {post.created_at ? (
        <time dateTime={post.created_at} className="text-slate-400">{formatDate(post.created_at)}</time>
      ) : <span />}
      <ReadMore accentColor={accentColor} />
    </div>
  );
}

export interface BlogCardProps {
  post: BlogCardPost;
  /** Card look - see CardVariant in lib/blog-theme.ts for what each one does. */
  variant?: CardVariant;
  accentColor?: string;
}

export function BlogCard({ post, variant = DEFAULT_CARD_VARIANT, accentColor = BLOG_ACCENT }: BlogCardProps) {
  const shellClass = `group flex flex-col h-full rounded-2xl bg-white overflow-hidden w-full
                       hover:border-[var(--accent)] cursor-pointer ${CARD_VARIANT_CLASSES[variant]}`;
  const shellStyle = { ['--accent' as string]: accentColor };

  // Minimal: image, title, footer row - no excerpt, the leanest card.
  if (variant === 'minimal') {
    return (
      <a href={`/blog/${post.slug}`} className={shellClass} style={shellStyle}>
        <CardImage post={post} rounded="rounded-t-2xl" />
        <div className="flex flex-col gap-2 p-4 flex-1">
          <h3 className="text-[16px] font-bold text-slate-900 leading-snug line-clamp-2 min-h-11">{post.title}</h3>
          <CardFooter post={post} accentColor={accentColor} />
        </div>
      </a>
    );
  }

  // Framed: image inset within a padded rounded frame, bold title, same
  // footer row as the other variants.
  if (variant === 'framed') {
    return (
      <a href={`/blog/${post.slug}`} className={shellClass} style={shellStyle}>
        <div className="p-3">
          <CardImage post={post} rounded="rounded-xl" />
        </div>
        <div className="flex flex-col gap-2 px-5 pb-5 flex-1">
          <h3 className="text-[16px] font-bold text-slate-900 leading-snug line-clamp-2 min-h-11">{post.title}</h3>
          <CardFooter post={post} accentColor={accentColor} />
        </div>
      </a>
    );
  }

  // Elevated (default): full image, excerpt, footer row.
  return (
    <a href={`/blog/${post.slug}`} className={shellClass} style={shellStyle}>
      <CardImage post={post} rounded="" />
      <div className="flex flex-col gap-2 p-5 flex-1">
        <h3 className="text-[16px] font-bold text-slate-900 leading-snug line-clamp-2 min-h-11">{post.title}</h3>
        {post.meta_description && (
          <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-2 flex-1">{post.meta_description}</p>
        )}
        <CardFooter post={post} accentColor={accentColor} />
      </div>
    </a>
  );
}
