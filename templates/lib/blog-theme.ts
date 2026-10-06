// lib/blog-theme.ts
//
// Single place to re-theme the blog. Change BLOG_ACCENT and every page/
// component that imports from here picks it up automatically - no other
// file needs to change.

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
 * - 'elevated' (default): full-width image, title, excerpt, footer row.
 *   Border + shadow, lifts on hover.
 * - 'framed': image inset within a padded rounded frame, bold title, footer
 *   row - no excerpt.
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
 * - 'elevated' (default): full-bleed hero image, colored avatar-initial
 *   circle, "|" separators, uppercase date/read-time. Border under the
 *   whole header block.
 * - 'minimal': same shape, lighter touch - no avatar circle, "•" bullet
 *   separators, sentence-case date/read-time, no border under the header.
 * - 'sidebar': compact byline "info table" instead of one inline row - a
 *   small logo/avatar plus three labeled mini-columns (Written by /
 *   Published / Reading time), closer to a byline card than a sentence.
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
