<div align="center">

# vellumup-init

**Add a complete, SEO-ready blog to your Next.js app with one command.**

[![npm version](https://img.shields.io/npm/v/vellumup-init?color=4A68E5)](https://www.npmjs.com/package/vellumup-init)
[![license](https://img.shields.io/npm/l/vellumup-init?color=4A68E5)](LICENSE)
[![node](https://img.shields.io/node/v/vellumup-init?color=4A68E5)](https://nodejs.org)

</div>

```bash
npx vellumup-init
```

https://github.com/user-attachments/assets/a991ef44-c079-4330-b6e9-30c85626b31e

vellumup-init looks at your Next.js project, asks only what it can't work out
on its own, and writes a finished blog into it: pages, components, a data
layer and one settings file. Everything it writes is plain TypeScript in your
repository - read it, change it, it's yours. The CLI itself is never added to
your project.

Use it with [VellumUp](https://vellumup.com) to have articles written and
published to your site automatically, or on its own with any content source.

## Contents

- [Quick start](#quick-start)
- [Highlights](#highlights)
- [Three modes](#three-modes)
- [The article page](#the-article-page)
- [Settings and theming](#settings-and-theming)
- [SEO and AI search](#seo-and-ai-search)
- [CLI reference](#cli-reference)
- [After running](#after-running)
- [FAQ](#faq)

## Quick start

1. Open a terminal in the root of your Next.js project.
2. Run `npx vellumup-init` and pick a mode.
3. Start your dev server and open `/blog`.

Just want to see the blog first? Blog UI only mode sets it up with four
sample posts - no database, no account, no environment variables:

```bash
npx vellumup-init --ui-only
```

**Requirements:** Node.js 18.3+ and a Next.js project. The blog pages need
the App Router (an `app/` directory); a Pages Router project gets the webhook
route only.

## Highlights

- **Fits your project as it is.** Detects the App Router or Pages Router, a
  `src/` folder, TypeScript, path aliases, i18n and your package manager
  (npm, pnpm, yarn or bun).
- **Three modes.** A full VellumUp-powered blog, the blog UI alone with
  sample posts, or just the webhook route.
- **A complete article page.** Table of contents, key takeaways, related
  posts and one-click "Summarize with AI".
- **SEO and AI search built in.** Canonical URLs, Open Graph tags and
  `BlogPosting` structured data on every post.
- **One settings file.** Site details, accent color and style variants all
  live in `lib/blog-theme.ts`.
- **Any data source.** The pages read only through `lib/blog-data.ts` -
  Supabase by default, easy to point at any database, CMS or API.
- **Safe to run.** Never overwrites a file without asking, and only ever
  appends to `.env.local`.

## Three modes

| Mode | What you get | Best for |
| --- | --- | --- |
| **Full blog** (default) | Webhook route + blog pages + components + SQL schema | Publishing from VellumUp |
| **Blog UI only** | Blog pages + components with sample posts | Any Next.js site, any content source |
| **Webhook route only** | Just the receiver route + SQL schema | Sites that already have a blog |

### Full blog

Runs end to end with no code left to write: the route saves each article
VellumUp delivers into an `articles` table, and `lib/blog-data.ts` reads it
back for the pages. Run the SQL, fill in the keys, and publishing in VellumUp
puts a post on your site. App Router only.

<details>
<summary>Files it writes</summary>

```text
your-project/
├── app/
│   ├── api/vellumup/route.ts     # webhook receiver: verifies HMAC, stores the article
│   └── blog/
│       ├── page.tsx              # paginated blog index
│       └── [slug]/page.tsx       # article page (ToC, key takeaways, related posts)
├── components/
│   ├── BlogPostLayout.tsx        # hero, byline, typography
│   ├── BlogSection.tsx           # card grid section (index + related posts)
│   ├── BlogCard.tsx              # the card itself - shared by index and related posts
│   ├── BlogKeyTakeaways.tsx      # callout box
│   ├── BlogAiSummary.tsx         # "Summarize with AI" buttons (ChatGPT, Claude, Perplexity)
│   └── PillTableOfContents.tsx   # responsive ToC (sidebar / bottom pill)
├── lib/
│   ├── blog-data.ts              # every read the pages make - the one file to change the data source
│   ├── blog-types.ts             # the fields an article has
│   └── blog-theme.ts             # site details, accent color + style variants - the one settings file
├── vellumup/articles.sql         # articles schema (standard PostgreSQL - Supabase, psql, any client)
└── .env.local                    # VELLUMUP_WEBHOOK_SECRET= and Supabase keys appended
```

</details>

### Blog UI only

Writes the same `app/blog/`, `components/` and `lib/` files as the full blog
and nothing else: no route, no SQL file, no `.env.local` changes, and no new
dependencies beyond the two the pages render Markdown with (`react-markdown`,
`remark-gfm`). App Router only.

The difference is `lib/blog-data.ts`. Instead of querying a database, it
returns four sample posts written in the file itself, so `/blog` works the
moment the CLI finishes. The samples show every part of the design and
explain how the blog works.

To publish your own posts, replace the three functions in that file -
`getPosts`, `getArticle` and `getRelatedPosts` - with reads from your own
source: a database, a headless CMS, Markdown files or an API. They must
return the fields in `lib/blog-types.ts`. Only `slug`, `title`, `content` and
`created_at` need a value; any other field can be `null`, and the page leaves
that part out.

### Webhook route only

Writes just the receiver route, the SQL file and the
`VELLUMUP_WEBHOOK_SECRET=` placeholder - for projects that already have their
own blog. The route verifies the signature and hands you two empty functions
(`upsertArticle`, `markArticleDraft`) to point at whatever store you already
use. Works with both the App Router and the Pages Router.

## The article page

Every post gets the same page, built from its fields. Anything a post doesn't
have is simply left out - a post without key takeaways gets no takeaways box.

<p align="center">
  <img src="https://raw.githubusercontent.com/1paz1/vellumup-init/main/.github/assets/article-page.png" alt="An article page generated by vellumup-init, with eight numbered parts: cover image, title and byline, Summarize with AI, table of contents, key takeaways, rich content, internal links and related posts" width="100%">
</p>

### Summarize with AI

The byline carries a small "Summarize with AI" row: ChatGPT, Claude and
Perplexity buttons, each in its own brand color. A click opens the reader's
own assistant in a new tab with a ready prompt pointing at the article - just
links, no API keys or server calls. Only assistants that accept a prompt in
the URL are included.

The prompt asks for a summary only (overview, key points, practical steps, in
the article's language) - edit `PROMPT_TEMPLATE` in
`components/BlogAiSummary.tsx` to change it. It deliberately does not tell
the assistant to "remember" your site: Microsoft documented that pattern as
"AI Recommendation Poisoning". Set `SHOW_AI_SUMMARY = false` in
`lib/blog-theme.ts` to hide the row. The assistant reads the article from its
public URL, so the buttons produce a summary only once your site is live.

## Settings and theming

`lib/blog-theme.ts` is the blog's one settings file. Every page and component
reads from it, so no other file needs to change.

**Site details** come first - fill them in once:

| Setting | What it does | If left empty |
| --- | --- | --- |
| `SITE_URL` | Full URLs for canonical links, share previews and structured data. Read from `NEXT_PUBLIC_SITE_URL`, or your production domain on Vercel | URLs stay relative |
| `SITE_NAME` | Site name in share previews, publisher in structured data | Left out |
| `BLOG_DESCRIPTION` | The blog index page's description in search results | "Guides and updates." |
| `BLOG_AUTHOR` | Author name in the byline and in structured data | No name shown - never a made-up one |

**Look:** `BLOG_ACCENT` is the blog's one accent color. Change it and it
propagates everywhere (cards, ToC, key takeaways, hero), along with the
lighter tints derived from it. Three parts of the blog also come in several
styles, each described in a comment in the file:

| Part | Constant | Styles |
| --- | --- | --- |
| Post cards | `DEFAULT_CARD_VARIANT` | `elevated`, `framed`, `minimal` |
| Key takeaways box | `DEFAULT_KEY_TAKEAWAYS_VARIANT` | `soft`, `bordered`, `plain`, `numbered` |
| Article header | `DEFAULT_HERO_VARIANT` | `elevated`, `minimal`, `sidebar` |

Set the constant to change the style everywhere, or override a single
instance with the component's `variant` prop.

## SEO and AI search

Google says its AI Overviews and AI Mode need no special files or markup -
just solid SEO, which the blog handles for you:

- Title, description, canonical URL, Open Graph and Twitter tags on every
  page. Each page of the blog index is its own canonical URL, and a page past
  the end shows the not-found page, marked `noindex`, instead of an empty
  list.
- `BlogPosting` and `BreadcrumbList` structured data (JSON-LD) with the
  title, dates, keywords, author and publisher - each field only when you
  have set it.
- One visible date in the byline: the last update when a post was edited at
  least a day after publishing, otherwise the publish date.

A few things only you can do, outside the blog (also listed at the top of
`lib/blog-theme.ts`):

1. Add `/blog` and every post (`/blog/<slug>`) to your site's sitemap, with
   each post's `updated_at` as its `lastmod`, so search engines find new
   posts quickly.
2. In `robots.txt`, don't block `Googlebot`, `Bingbot`, `OAI-SearchBot`
   (ChatGPT search), `PerplexityBot` or `Claude-SearchBot` if you want to
   appear in search and AI answers. Blocking only the training crawlers
   (`GPTBot`, `ClaudeBot`) keeps you in those answers.
3. Submit your sitemap in Google Search Console and Bing Webmaster Tools.

No `llms.txt` is generated: Google has said it doesn't use one.

## CLI reference

### The prompts

The CLI asks up to three questions, each only when it applies:

1. **What should we set up?** Full blog (recommended), webhook route only,
   or blog UI only. Skipped for Pages Router projects (route only, with an
   explanation).
2. **How should existing files be handled?** Asked only when a target file
   already exists: skip (default), overwrite all, or cancel.
3. **Install the missing rendering dependencies?** (`react-markdown`,
   `remark-gfm`) Asked only in the two blog modes when either is missing,
   and installed with your project's own package manager (detected from the
   lockfile). Route-only mode installs nothing.

Language is never asked. In full blog mode, `lib/blog-data.ts` filters
articles by `language_code` (default `en`, or whatever you pass with
`--lang`), and each filter line carries a comment showing multi-language
sites exactly what to swap for a dynamic locale. The sample posts in blog UI
only mode have no language, so `--lang` does nothing there.

`@supabase/supabase-js` is never installed for you. Full blog mode generates
Supabase code as its default wiring, so if you use Supabase you install the
client yourself; if you use anything else you replace those calls instead.
Either way the CLI ends by telling you which one you still need to do.

### Flags

| Flag | Effect |
| --- | --- |
| `--yes` | Non-interactive: full blog, language `en`, skip existing files, install deps |
| `--route-only` | Webhook route only, no blog pages or dependency install |
| `--ui-only` | Blog pages and components with sample posts - no route, SQL or env vars. Can't be combined with `--route-only` |
| `--lang <code>` | Language the blog filters by in full blog mode (e.g. `en`, `fr`, `he`) |
| `--no-install` | Never run the package manager |
| `--help` / `--version` | The usual |

## After running

The CLI ends with numbered next steps, using your exact paths.

**Full blog**

1. Run `vellumup/articles.sql` against your database (Supabase SQL Editor,
   psql, or any client) to create the `articles` table.
2. Already have `@supabase/supabase-js`? Just fill `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in
   `.env.local` (Supabase dashboard: Project Settings > API) - the route
   needs these to write. Don't have it? Install it first
   (`npm install @supabase/supabase-js`), or if you use a different
   database, replace the route's two functions and the functions in
   `lib/blog-data.ts` instead - see the FAQ.
3. Fill in your site details - URL, name and author - at the top of
   `lib/blog-theme.ts` (see [Settings and theming](#settings-and-theming)).
4. In the VellumUp dashboard open **Integrations > Next.js > Add endpoint**
   and point it at `https://your-domain.com/api/vellumup`.
5. Copy the secret (shown once) into `VELLUMUP_WEBHOOK_SECRET` - in
   `.env.local` and in your hosting provider's environment variables.
6. Deploy your site.
7. Click **Test connection**, publish an article, and visit `/blog`.

**Blog UI only**

1. Start your dev server and open `/blog` - the sample posts are already
   there.
2. Fill in your site details at the top of `lib/blog-theme.ts`; the same file
   sets your brand color and styles.
3. Replace the sample posts in `lib/blog-data.ts` with your own source.

**Webhook route only:** steps 4-6 of the full blog list, then click **Test
connection** and fill in `upsertArticle()` and `markArticleDraft()` in your
route with calls to your own database.

## FAQ

<details>
<summary><b>My project is JavaScript, not TypeScript.</b></summary>

The generated files are TypeScript. Next.js configures TypeScript
automatically the next time you run `next dev` or `next build` (it will offer
to install `typescript` and `@types/react` - accept). Mixed JS/TS projects
are fully supported by Next.js.

</details>

<details>
<summary><b>I already have some of these files.</b></summary>

Nothing is overwritten without asking. The default conflict answer keeps your
files and writes only the missing ones. `.env.local` is append-only -
existing values are never touched, on any run.

</details>

<details>
<summary><b>I publish in several languages.</b></summary>

Every translation VellumUp sends is stored in your `articles` table (one row
per slug + language). `lib/blog-data.ts` filters by one language so the blog
never shows duplicates; each filter line carries a comment showing exactly
what to swap to make it dynamic per locale.

</details>

<details>
<summary><b>I already have a Supabase client in my project.</b></summary>

`lib/blog-data.ts` creates its own client so it works with zero other files.
Swap its `createClient(...)` block for your own import if you prefer.

</details>

<details>
<summary><b>I started with blog UI only and now want posts from VellumUp.</b></summary>

Run `npx vellumup-init` again, pick **Full blog**, and answer **Overwrite
all** when asked about existing files - that replaces the sample
`lib/blog-data.ts` with the Supabase version. It also replaces the pages,
components and `lib/blog-theme.ts`, so copy any changes you made to those
first.

</details>

<details>
<summary><b>I don't use Supabase at all.</b></summary>

That's fine - the generated code is Supabase-based by default, but that is a
starting point, not a requirement (which is also why the CLI never
auto-installs `@supabase/supabase-js`). Three small adaptations:

1. **The schema:** `vellumup/articles.sql` is standard PostgreSQL, so it runs
   as-is on any Postgres (Neon, RDS, self-hosted, ...). For MySQL, SQLite or
   an ORM, recreate the same columns - the important part is the
   `unique (slug, language_code)` key the webhook upserts against.
2. **The route:** `app/api/vellumup/route.ts` has `upsertArticle()` and
   `markArticleDraft()` in a clearly marked block. Point them at your own
   database and drop the `createClient` import. Everything above that block -
   signature verification, the event switch, the responses - is
   database-agnostic and stays as-is.
3. **The blog data:** `lib/blog-data.ts` has `getPosts`, `getArticle` and
   `getRelatedPosts`. Replace their Supabase queries with your own ORM or
   driver calls returning the same fields (see `lib/blog-types.ts`), and
   delete the file's `createClient(...)` block. The pages don't change.

If you pick webhook route only instead, the route you get is already
database-agnostic: the same two functions are there, empty, waiting for your
implementation - no Supabase code to remove.

</details>

<details>
<summary><b>Does it work with the Pages Router?</b></summary>

The webhook route works on both routers. The blog pages are App Router server
components, so the full blog and blog UI only modes need an `app/` directory -
adopt it and re-run.

</details>

## License

[MIT](LICENSE)

<div align="center">
<sub>Built by <a href="https://vellumup.com">VellumUp</a></sub>
</div>
