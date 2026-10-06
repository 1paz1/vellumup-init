# vellumup-init

Scaffold a complete, custom-styled blog powered by [VellumUp](https://vellumup.com)
into your existing Next.js project - with one command.

```bash
npx vellumup-init
```

The CLI inspects your project (App Router vs Pages Router, `src/` layout,
TypeScript, path aliases, i18n, package manager), asks only what it cannot
detect, and writes everything for you.

Don't use VellumUp? The **Blog UI only** mode gives you the same blog with
sample posts and no database, and you connect your own content.

## Modes

| Mode | What you get | For |
| --- | --- | --- |
| **Full blog** (default) | Webhook route + blog pages + components + SQL schema | Publishing from VellumUp |
| **Blog UI only** | Blog pages + components with sample posts | Any Next.js site, any content source |
| **Webhook route only** | Just the receiver route + SQL schema | Sites that already have a blog |

### Full blog

App Router only. Writes:

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
│   └── blog-theme.ts             # accent color + style variants - the one file to re-theme the blog
├── vellumup/articles.sql         # articles schema (standard PostgreSQL - Supabase, psql, any client)
└── .env.local                    # VELLUMUP_WEBHOOK_SECRET= and Supabase keys appended
```

This runs end to end with no code left to write: the route upserts each
delivered article into the `articles` table, and `lib/blog-data.ts` reads it
back for the pages. Run the SQL, fill in the keys, and publishing in VellumUp
puts a post on your site.

### Blog UI only

App Router only. Writes the same `app/blog/`, `components/` and `lib/` files
as the full blog - nothing else. No route, no SQL file, no `.env.local`
changes, and no new dependencies beyond the two the pages render Markdown
with (`react-markdown`, `remark-gfm`).

The difference is `lib/blog-data.ts`: instead of querying a database, it
returns four sample posts written in the file itself, so `/blog` works the
moment the CLI finishes. The samples show every part of the design (table
of contents, key takeaways, related posts, tables) and explain how the blog
works.

To publish your own posts, replace the three functions in that file -
`getPosts`, `getArticle` and `getRelatedPosts` - with reads from your own
source: a database, a headless CMS, Markdown files or an API. They must
return the fields in `lib/blog-types.ts`. Only `slug`, `title`, `content`
and `created_at` need a value; any other field can be `null`, and the page
leaves that part out. The pages and components stay as they are.

### Webhook route only

Writes just the receiver route, the SQL file, and the
`VELLUMUP_WEBHOOK_SECRET=` placeholder - for projects that already have their
own blog. That route is database-agnostic: it verifies the signature and hands
you two empty functions (`upsertArticle`, `markArticleDraft`) to point at
whatever store you already use. Works with both the App Router and the Pages
Router.

## Theming

The blog's accent color lives in `lib/blog-theme.ts` - change `BLOG_ACCENT`
there and it propagates everywhere (cards, ToC, key takeaways, hero), along
with the lighter tints derived from it, with no other file to touch. The same file also picks the **style
variant** for three parts of the blog, each with its own look documented
inline:

- **Cards** (`CardVariant`): `elevated`, `framed`, `minimal`
- **Key Takeaways box** (`KeyTakeawaysVariant`): `soft`, `bordered`, `plain`, `numbered`
- **Article hero** (`HeroVariant`): `elevated`, `minimal`, `sidebar`

Set the `DEFAULT_*` constant for whichever one you want, or override per
instance via the component's `variant` prop.

## Summarize with AI

Every article byline gets a small "Summarize with AI" row: ChatGPT, Claude
and Perplexity buttons, each in its own brand color, styled to match the
active hero variant. A click opens the reader's own assistant in a new tab
with a ready prompt pointing at the article - just links, no API keys or
server calls. Only assistants that accept a prompt in the URL are included.

The prompt asks for a summary only (overview, key points, practical steps,
in the article's language) - edit `PROMPT_TEMPLATE` in
`components/BlogAiSummary.tsx` to change it. It deliberately does not tell
the assistant to "remember" your site: Microsoft documented that pattern as
"AI Recommendation Poisoning". Set `SHOW_AI_SUMMARY = false` in
`lib/blog-theme.ts` to hide the row. The assistant reads the article from
its public URL, so the buttons produce a summary only once your site is
live.

## Requirements

- Node.js 18.3+
- A Next.js project (App Router for the blog pages; a Pages Router project
  gets the webhook route only)
- A database for article storage (full blog mode only). The generated code
  is wired for [Supabase](https://supabase.com) out of the box (free tier is
  fine), but any database works: the SQL schema is standard PostgreSQL, and if
  you use something else entirely you only swap the three functions in
  `lib/blog-data.ts` - see the FAQ below

## The prompts

The CLI asks up to three questions, each only when it applies:

1. **What should we set up?** Full blog (recommended), webhook route only,
   or blog UI only. Skipped for Pages Router projects (route only, with an
   explanation).
2. **How should existing files be handled?** Asked only when a target file
   already exists: skip (default), overwrite all, or cancel.
3. **Install the missing rendering dependencies?** (`react-markdown`,
   `remark-gfm`) Asked only in the two blog modes when either is missing;
   installed with your project's own package manager (detected from the
   lockfile) if you say yes. Route-only mode installs nothing.

Language is never asked: in full blog mode, `lib/blog-data.ts` always
filters articles by `language_code` (default `en`, or whatever you pass with
`--lang`), and each filter line carries a comment showing multi-language
sites exactly what to swap for a dynamic locale - see the FAQ. The sample
posts in blog UI only mode have no language, so `--lang` does nothing there.

`@supabase/supabase-js` is never installed for you. Full blog mode generates
Supabase code as its default wiring, so if you use Supabase you install the
client yourself; if you use anything else you replace those calls instead.
Either way the CLI ends by telling you which one you still need to do.

## Flags

| Flag | Effect |
| --- | --- |
| `--yes` | Non-interactive: full blog, language `en`, skip existing files, install deps |
| `--route-only` | Webhook route only, no blog pages or dependency install |
| `--ui-only` | Blog pages and components with sample posts - no route, SQL or env vars. Cannot be combined with `--route-only` |
| `--lang <code>` | Language the blog filters by in full blog mode (e.g. `en`, `fr`, `he`) |
| `--no-install` | Never run the package manager |
| `--help` / `--version` | The usual |

## After running

The CLI prints these as numbered next steps, with your exact paths.

Full blog:

1. Run `vellumup/articles.sql` against your database (Supabase SQL Editor,
   psql, or any client) to create the `articles` table.
2. Already have `@supabase/supabase-js`? Just fill `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in
   `.env.local` (Supabase dashboard: Project Settings > API) - the route
   needs these to write. Don't have it? Install it first
   (`npm install @supabase/supabase-js`), or if you use a different
   database, replace the route's two functions and the three functions in
   `lib/blog-data.ts` instead - see the FAQ.
3. In the VellumUp dashboard open **Integrations > Next.js > Add endpoint**
   and point it at `https://your-domain.com/api/vellumup`.
4. Copy the secret (shown once) into `VELLUMUP_WEBHOOK_SECRET` - in `.env.local` and in
   your hosting provider's env vars.
5. Deploy your site.
6. Click **Test connection**, publish an article, visit `/blog`.

Blog UI only:

1. Start your dev server and open `/blog` - the sample posts are already
   there.
2. Set your brand color and styles in `lib/blog-theme.ts`.
3. Replace the sample posts in `lib/blog-data.ts` with your own source.

Webhook route only: steps 3-5 of the full blog list, then click **Test
connection** and fill in `upsertArticle()` and `markArticleDraft()` in your
route with calls to your own database.

## FAQ

**My project is JavaScript, not TypeScript.**
The generated files are TypeScript. Next.js configures TypeScript automatically
the next time you run `next dev` or `next build` (it will offer to install
`typescript` and `@types/react` - accept). Mixed JS/TS projects are fully
supported by Next.js.

**I already have some of these files.**
Nothing is overwritten without asking. The default conflict answer keeps your
files and writes only the missing ones. `.env.local` is append-only - existing
values are never touched, on any run.

**I publish in several languages.**
Every translation VellumUp sends is stored in your `articles` table (one row
per slug + language). `lib/blog-data.ts` filters by one language so the blog
never shows duplicates; each filter line carries a comment showing exactly
what to swap to make it dynamic per locale.

**I already have a Supabase client in my project.**
`lib/blog-data.ts` creates its own client so it works with zero other files.
Swap its `createClient(...)` block for your own import if you prefer.

**I started with blog UI only and now want posts from VellumUp.**
Run `npx vellumup-init` again, pick **Full blog**, and answer **Overwrite
all** when asked about existing files - that replaces the sample
`lib/blog-data.ts` with the Supabase version. It also replaces the pages,
components and `lib/blog-theme.ts`, so copy any changes you made to those
first.

**I don't use Supabase at all.**
That's fine - the generated code is Supabase-based by default, but that is a
starting point, not a requirement (which is also why the CLI never
auto-installs `@supabase/supabase-js`). Three small adaptations:

1. The schema: `vellumup/articles.sql` is standard PostgreSQL, so it runs
   as-is on any Postgres (Neon, RDS, self-hosted, ...). For MySQL/SQLite/an
   ORM, recreate the same columns - the important part is the
   `unique (slug, language_code)` key the webhook upserts against.
2. The route: `app/api/vellumup/route.ts` has `upsertArticle()` and
   `markArticleDraft()` in a clearly marked block. Point them at your own
   database and drop the `createClient` import. Everything above that block -
   signature verification, the event switch, the responses - is
   database-agnostic and stays as-is.
3. The blog data: `lib/blog-data.ts` has `getPosts`, `getArticle` and
   `getRelatedPosts`. Replace their Supabase queries with your own
   ORM/driver calls returning the same fields (see `lib/blog-types.ts`), and
   delete the file's `createClient(...)` block. The pages don't change.

If you pick "webhook route only" instead, the route you get is already
database-agnostic: the same two functions are there, empty, waiting for your
implementation - no Supabase code to remove.

**Pages Router?**
The webhook route works on both routers. The blog pages are App Router server
components, so full blog and blog UI only modes need an `app/` directory -
adopt it and re-run.

## License

[MIT](LICENSE)
