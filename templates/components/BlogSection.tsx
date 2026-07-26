// components/BlogSection.tsx
'use client';

interface BlogPost {
  slug: string;
  title: string;
  cover_image?: string | null;
  cover_image_alt?: string | null; // falls back to title if omitted
  meta_description?: string | null;
  focus_keyword?: string | null;
  created_at?: string; // ISO 8601 - format for display, e.g. toLocaleDateString()
}

interface BlogSectionProps {
  tagline?: string;
  heading?: string;
  accentColor?: string;
  posts: BlogPost[];
  /** Tailwind width + horizontal-padding classes for the section's own
   *  container - lets a caller match this section's width to a layout it
   *  sits underneath (e.g. a page's own wider grid) instead of always using
   *  the max-w-6xl px-6 default. */
  containerClassName?: string;
}

export function BlogSection({
  tagline = 'Latest updates',
  heading = 'More from the blog',
  accentColor = '#4A68E5',
  posts,
  containerClassName = 'max-w-6xl px-6',
}: BlogSectionProps) {
  return (
    <section className="py-20 bg-white" aria-label={heading}>
      <div className={`${containerClassName} mx-auto flex flex-col items-center gap-12`}>
        <div className="text-center max-w-2xl">
          <span
            className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold mb-4"
            style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
          >
            {tagline}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">{heading}</h2>
        </div>

        <div
          className="grid gap-6 w-full justify-center"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(288px, 384px))' }}
        >
          {posts.map(post => (
            <article key={post.slug} className="h-full">
              <a
                href={`/blog/${post.slug}`}
                className="group flex flex-col h-full rounded-2xl border border-slate-200 bg-white overflow-hidden w-full
                           transition-all hover:shadow-lg cursor-pointer"
                onMouseEnter={e => (e.currentTarget.style.borderColor = accentColor)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
              >
                <div className="relative aspect-video bg-slate-100">
                  {post.cover_image ? (
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

                <div className="flex flex-col gap-2 p-5 flex-1">
                  <h3 className="text-[16px] font-bold text-slate-900 leading-snug line-clamp-2">
                    {post.title}
                  </h3>

                  {post.meta_description && (
                    <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-2 flex-1">
                      {post.meta_description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100 text-[12px]">
                    {post.created_at && (
                      <time dateTime={post.created_at} className="text-slate-400">
                        {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </time>
                    )}
                    <span className="font-semibold" style={{ color: accentColor }}>
                      Read more
                    </span>
                  </div>
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
