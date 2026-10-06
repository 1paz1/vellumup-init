// lib/blog-data.ts
//
// Every read the blog pages make, in one place. The pages call these three
// functions and nothing else, so this is the only file to change to give
// the blog real content.
//
// Right now they return the sample posts below, so the blog works the
// moment it is installed. To publish your own posts, replace the bodies of
// getPosts, getArticle and getRelatedPosts with reads from your own source
// (a database, a headless CMS, Markdown files, an API) and return the same
// fields - see lib/blog-types.ts. Only slug, title, content and created_at
// are required; every other field can be null and the pages leave that
// part out.
//
// Want posts written and delivered here automatically? That is what
// VellumUp does (https://vellumup.com) - run `npx vellumup-init` again,
// pick "Full blog", and let it overwrite this file.
import type { Article, BlogPostSummary } from './blog-types';

type SamplePost = Omit<Article, 'word_count' | 'reading_time_minutes'>;

const SAMPLE_POSTS: SamplePost[] = [
  {
    slug: 'welcome-to-your-blog',
    title: 'Welcome to your new blog',
    meta_description:
      'A quick tour of the blog you just added: where the pages live, where the posts come from, and what to change first.',
    focus_keyword: 'Next.js blog',
    secondary_keywords: ['App Router', 'blog setup'],
    cover_image: null,
    og_title: null,
    og_description: null,
    created_at: '2026-03-12T09:00:00.000Z',
    updated_at: null,
    key_takeaways: [
      { takeaway: 'The blog is plain code in your project: two pages in app/blog and a few components.' },
      { takeaway: 'Posts come from lib/blog-data.ts, which returns these sample posts for now.' },
      { takeaway: 'Your site details, colors and styles are set in lib/blog-theme.ts.' },
    ],
    internal_link_slugs: ['connect-your-own-content', 'match-your-site'],
    content: `This blog was added to your project by vellumup-init. Everything on this page is regular code in your own repository, so you can read it, change it or delete it like any other file.

## What was added

| File | What it does |
| --- | --- |
| \`app/blog/page.tsx\` | The blog index: post cards with pagination |
| \`app/blog/[slug]/page.tsx\` | One article: header, table of contents, takeaways, related posts |
| \`components/\` | The cards, takeaways box, table of contents and AI summary buttons |
| \`lib/blog-data.ts\` | Where the posts come from |
| \`lib/blog-types.ts\` | The fields a post has |
| \`lib/blog-theme.ts\` | Your site details, accent color and style variants |

## Where the posts come from

The pages never fetch anything themselves. They call three functions in \`lib/blog-data.ts\`. Right now those functions return four sample posts written in that same file, this one included.

When you are ready for real content, swap the sample posts for your own source. [Connect your own content](/blog/connect-your-own-content) shows how.

## What to change first

1. Fill in your site details - URL, name and author - at the top of \`lib/blog-theme.ts\`. Search engines and share previews use them. See [What an article page includes](/blog/inside-an-article-page).
2. Set your brand color in the same file - see [Make the blog match your site](/blog/match-your-site).
3. Replace the sample posts with your own.`,
  },
  {
    slug: 'connect-your-own-content',
    title: 'Connect your own content',
    meta_description:
      'The blog reads every post through three functions in one file. Point them at your own source and the pages keep working.',
    focus_keyword: 'blog data source',
    secondary_keywords: ['headless CMS', 'database'],
    cover_image: null,
    og_title: null,
    og_description: null,
    created_at: '2026-03-10T09:00:00.000Z',
    updated_at: null,
    // No takeaways on this one, to show the page without the box.
    key_takeaways: null,
    internal_link_slugs: ['welcome-to-your-blog'],
    content: `The sample posts live in \`lib/blog-data.ts\`. To show real posts you only change that file - the pages and components stay as they are.

## The three functions

| Function | Returns |
| --- | --- |
| \`getPosts(page, pageSize)\` | One page of posts for the index, and the total number of pages |
| \`getArticle(slug)\` | One full article, or \`null\` if there is no post with that slug |
| \`getRelatedPosts(slug, linkedSlugs, limit)\` | Up to \`limit\` other posts for "More from the blog" |

Keep the names and return types, and the pages work with any source: a database, a headless CMS, Markdown files or an API.

## The fields

The types are in \`lib/blog-types.ts\`. Only \`slug\`, \`title\`, \`content\` and \`created_at\` are required. Every other field can be \`null\`, and the page leaves that part out - no cover image, no takeaways box, no reading time.

\`content\` is Markdown. Its \`##\` and \`###\` headings become the table of contents. HTML content works too, but gets no table of contents.

## An example

Reading articles from your own API could look like this:

\`\`\`ts
export async function getArticle(slug: string): Promise<Article | null> {
  const res = await fetch('https://api.example.com/posts/' + encodeURIComponent(slug));
  if (!res.ok) return null;
  return res.json(); // must return the fields in lib/blog-types.ts
}
\`\`\``,
  },
  {
    slug: 'match-your-site',
    title: 'Make the blog match your site',
    meta_description:
      'One file holds every color and style choice for the blog. Here is what each setting does.',
    focus_keyword: 'blog theme',
    secondary_keywords: ['accent color', 'style variants'],
    cover_image: null,
    og_title: null,
    og_description: null,
    created_at: '2026-03-06T09:00:00.000Z',
    updated_at: null,
    key_takeaways: [
      { takeaway: 'Change BLOG_ACCENT once and the whole blog follows.' },
      { takeaway: 'Cards, the takeaways box and the article header each have several looks to pick from.' },
      { takeaway: 'SHOW_AI_SUMMARY turns the "Summarize with AI" buttons on or off.' },
    ],
    internal_link_slugs: ['inside-an-article-page'],
    content: `Every color and style choice for the blog is in one file, \`lib/blog-theme.ts\`. Change a value there and the pages and components pick it up - no other file needs to change.

## Accent color

\`BLOG_ACCENT\` is the one color the blog uses for links, badges, active states and icons. Set it to your brand color. The lighter tints used for backgrounds are derived from it.

## Style variants

Three parts of the blog come in more than one look. Pick one by changing the matching constant:

| Part | Constant | Options |
| --- | --- | --- |
| Post cards | \`DEFAULT_CARD_VARIANT\` | \`elevated\`, \`framed\`, \`minimal\` |
| Key takeaways box | \`DEFAULT_KEY_TAKEAWAYS_VARIANT\` | \`soft\`, \`bordered\`, \`plain\`, \`numbered\` |
| Article header | \`DEFAULT_HERO_VARIANT\` | \`elevated\`, \`minimal\`, \`sidebar\` |

The comment above each constant describes what every option looks like.

## Summarize with AI

The buttons in the article header open ChatGPT, Claude or Perplexity with a prompt that asks for a summary of the article. The assistant reads the article from its public URL, so the buttons only produce a summary once your site is live. Set \`SHOW_AI_SUMMARY\` to \`false\` to hide them, or edit the prompt in \`components/BlogAiSummary.tsx\`.`,
  },
  {
    slug: 'inside-an-article-page',
    title: 'What an article page includes',
    meta_description:
      'Table of contents, key takeaways, related posts and search metadata - what each part does and when it shows up.',
    focus_keyword: 'article page',
    secondary_keywords: ['table of contents', 'structured data'],
    cover_image: null,
    og_title: null,
    og_description: null,
    created_at: '2026-03-02T09:00:00.000Z',
    // Edited after publishing, so its byline shows this date.
    updated_at: '2026-03-14T09:00:00.000Z',
    key_takeaways: [
      { takeaway: 'The table of contents appears once an article has three or more headings.' },
      { takeaway: 'Related posts prefer the articles a post links to, then fill up with the newest ones.' },
      { takeaway: 'Search metadata and structured data are built for you from the post fields and your site details.' },
    ],
    internal_link_slugs: ['welcome-to-your-blog', 'match-your-site'],
    content: `An article page is built from the post's fields, plus a few parts worked out from its content. This post shows all of them.

## Table of contents

Every \`##\` and \`###\` heading becomes a link in the table of contents. It appears once an article has at least three headings: in a sidebar on wide screens, and as a pill at the bottom of the screen on smaller ones.

## Key takeaways

If a post has \`key_takeaways\`, they appear in a box right after the first paragraph. Posts without them skip the box.

## Related posts

Below the article, "More from the blog" shows up to three other posts. Posts listed in \`internal_link_slugs\` come first, and the newest posts fill any spots left.

## Dates

The header shows one date: when the post was published, or - when it was edited at least a day later - when it was last updated, as on this post. Search engines and AI search both look at how recent a page is, so the date is shown only for real edits.

## Search and sharing

The page sets its title, description, canonical URL, and Open Graph and Twitter tags from the post's fields. It adds structured data (JSON-LD) with the title, dates, keywords and - once you set them in \`lib/blog-theme.ts\` - the author, publisher and breadcrumbs.

With your site URL set, all of these use full URLs, which share previews need. Without it everything still works, with relative URLs. Remember to add your posts to your site's sitemap, so search engines find new ones quickly.

## Writing for AI search

Google says AI answers need nothing beyond normal good SEO, and that is what the page above provides. The rest is the writing. A study of generative search engines (Princeton, KDD 2024) found that adding quotations, statistics and cited sources made content noticeably more visible in AI answers, while keyword stuffing did not help. A first paragraph that answers the question directly, clear headings and a short list of takeaways all make a post easier to quote.`,
  },
];

// Word count and reading time are worked out from each post's content
// (at about 200 words a minute), so they stay right when you edit a sample.
const ARTICLES: Article[] = SAMPLE_POSTS.map((post) => {
  const wordCount = post.content.split(/\s+/).filter(Boolean).length;
  return { ...post, word_count: wordCount, reading_time_minutes: Math.max(1, Math.round(wordCount / 200)) };
});

// Newest first, the same order the index page shows.
const NEWEST_FIRST = [...ARTICLES].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

function toSummary({ slug, title, cover_image, meta_description, focus_keyword, created_at }: Article): BlogPostSummary {
  return { slug, title, cover_image, meta_description, focus_keyword, created_at };
}

export async function getPosts(
  page: number,
  pageSize: number,
): Promise<{ posts: BlogPostSummary[]; totalPages: number }> {
  const from = (page - 1) * pageSize;
  return {
    posts: NEWEST_FIRST.slice(from, from + pageSize).map(toSummary),
    totalPages: Math.max(1, Math.ceil(NEWEST_FIRST.length / pageSize)),
  };
}

export async function getArticle(slug: string): Promise<Article | null> {
  return ARTICLES.find((article) => article.slug === slug) ?? null;
}

// Posts this article links to (internal_link_slugs) come first, then the
// newest other posts fill the remaining spots, up to `limit`.
export async function getRelatedPosts(
  excludeSlug: string,
  internalLinkSlugs: string[],
  limit: number,
): Promise<BlogPostSummary[]> {
  const others = NEWEST_FIRST.filter((article) => article.slug !== excludeSlug);
  const linked = others.filter((article) => internalLinkSlugs.includes(article.slug));
  const filler = others.filter((article) => !internalLinkSlugs.includes(article.slug));
  return [...linked, ...filler].slice(0, limit).map(toSummary);
}

