// components/BlogSection.tsx

import { BLOG_ACCENT, DEFAULT_CARD_VARIANT, type CardVariant } from '@/lib/blog-theme';
import { BlogCard, type BlogCardPost } from '@/components/BlogCard';

interface BlogSectionProps {
  tagline?: string;
  heading?: string;
  accentColor?: string;
  /** Card look - see CardVariant in lib/blog-theme.ts for what each one does. */
  variant?: CardVariant;
  posts: BlogCardPost[];
  /** Tailwind width + horizontal-padding classes for the section's own
   *  container - lets a caller match this section's width to a layout it
   *  sits underneath (e.g. a page's own wider grid) instead of always using
   *  the max-w-6xl px-6 default. */
  containerClassName?: string;
}

export function BlogSection({
  tagline = 'Latest updates',
  heading = 'More from the blog',
  accentColor = BLOG_ACCENT,
  variant = DEFAULT_CARD_VARIANT,
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
            <BlogCard key={post.slug} post={post} variant={variant} accentColor={accentColor} />
          ))}
        </div>
      </div>
    </section>
  );
}
