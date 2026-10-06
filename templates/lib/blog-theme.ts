// lib/blog-theme.ts
//
// Single place to configure the blog: your site details first, then colors
// and style variants. Every page and component reads from here, so no
// other file needs to change.

// ── Site details ─────────────────────────────────────────────────────────
// Fill these in once. Search engines, AI search and share previews use
// them. Anything left empty is simply left out - nothing breaks.
//
// A few one-time steps outside this file, in your site's own settings:
// - Sitemap: add /blog and every post (/blog/<slug>) to your site's
//   sitemap, using each post's updated_at as its lastmod, so search
//   engines find new posts quickly.
// - robots.txt: to appear in search and AI answers, don't block Googlebot,
//   Bingbot, OAI-SearchBot (ChatGPT search), PerplexityBot or
//   Claude-SearchBot. Blocking only the AI training crawlers (GPTBot,
//   ClaudeBot) keeps you in those answers.
// - Submit your sitemap in Google Search Console and Bing Webmaster Tools
//   (Bing also powers Microsoft Copilot).

/**
 * Your site's public address, e.g. 'https://example.com'. With it, canonical
 * URLs, share links and structured data use full URLs. Without it they stay
 * relative.
 *
 * Read from NEXT_PUBLIC_SITE_URL, or on Vercel from your production domain
 * automatically. You can also replace the whole expression with your URL.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
    : '')
).replace(/\/+$/, '');

/**
 * Your site or brand name, e.g. 'Acme'. Shown as the site name in share
 * previews and given to search engines as the publisher. Leave '' to omit.
 */
export const SITE_NAME: string = '';

/** The blog index page's description - shown in search results. */
export const BLOG_DESCRIPTION: string = 'Guides and updates.';

/**
 * Who writes the posts - shown in the article byline and given to search
 * engines as the author. Use a real person or your organization; Google
 * treats made-up names as a trust problem. Leave null to show no name.
 *
 * Example: { type: 'Person', name: 'Jane Doe', url: 'https://example.com/about' }
 * (url is optional - a page about the author helps search engines.)
 */
export const BLOG_AUTHOR: BlogAuthor | null = null;

export interface BlogAuthor {
  type: 'Person' | 'Organization';
  name: string;
  url?: string;
}

// ── Look ─────────────────────────────────────────────────────────────────

/** The blog's one accent color - used for links, badges, active states, icons. */
export const BLOG_ACCENT = '#4A68E5';

/** Accent at ~8% opacity - tagline badge backgrounds. */
export const BLOG_ACCENT_SOFT = `${BLOG_ACCENT}14`;

/** Accent at ~3% opacity - Key Takeaways box background (soft variant). */
export const BLOG_ACCENT_FAINT = `${BLOG_ACCENT}08`;

/** Accent at ~10% opacity - active table-of-contents pill background. */
export const BLOG_ACCENT_ACTIVE = `${BLOG_ACCENT}1a`;

/**
 * Article/related-post card look, used by BlogSection. All three share the
 * same title height and footer row (date + "Read more"), so switching
 * variants never changes a card's overall height.
 * - 'elevated': full-width image, title, excerpt, footer row.
 *   Border + shadow, lifts on hover.
 * - 'framed' (default): image inset within a padded rounded frame, bold
 *   title, footer row - no excerpt.
 * - 'minimal': full-width image, title, footer row only - no excerpt. No
 *   border or shadow, the quietest card of the three.
 */
export type CardVariant = 'elevated' | 'framed' | 'minimal';
export const DEFAULT_CARD_VARIANT: CardVariant = 'framed';

/**
 * Key Takeaways box look, used by BlogKeyTakeaways. Each point keeps a
 * different marker per variant, so the visual language stays consistent
 * with the container style rather than reusing the same dot everywhere.
 * - 'soft' (default): tinted background, numbered accent badges per point -
 *   reads as a curated list of points.
 * - 'bordered': no fill, a left accent rail beside the heading and list -
 *   quieter, editorial look. Plain dot markers.
 * - 'plain': no box at all, points get accent-colored checkmarks - the
 *   leanest, most minimal presentation.
 * - 'numbered': no box, same heading as the other variants, understated
 *   accent-colored digits (01, 02, ...) as the marker, rows separated by
 *   thin divider lines - spacious, editorial list.
 */
export type KeyTakeawaysVariant = 'soft' | 'bordered' | 'plain' | 'numbered';
export const DEFAULT_KEY_TAKEAWAYS_VARIANT: KeyTakeawaysVariant = 'soft';

/**
 * Article hero/title/byline block look, used by the article page's own
 * header (hero image + title + byline row above the article body).
 * - 'elevated' (default): full-bleed hero image, "|" separators. Border
 *   under the whole header block.
 * - 'minimal': image in a rounded card, everything centered, "•" bullet
 *   separators, no border under the header.
 * - 'sidebar': compact byline "info table" instead of one inline row -
 *   labeled mini-columns (Written by / Date / Reading
 *   time), closer to a byline card than a sentence.
 * All three show the author's initial and name only when BLOG_AUTHOR is
 * set. The single date shown is the last update when the article was
 * edited later, otherwise the publish date.
 */
export type HeroVariant = 'elevated' | 'minimal' | 'sidebar';
export const DEFAULT_HERO_VARIANT: HeroVariant = 'elevated';

/**
 * "Summarize with AI" buttons in the article byline (ChatGPT, Claude,
 * Perplexity) - each opens the reader's own assistant with a ready prompt
 * pointing at the article. Styled to match whichever hero variant is active.
 * Set to false to hide them. The prompt itself lives in
 * components/BlogAiSummary.tsx.
 */
export const SHOW_AI_SUMMARY = true;
