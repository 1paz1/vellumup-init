# vellumup-init

Scaffold a complete, custom-styled blog powered by [VellumUp](https://vellumup.com)
into your existing Next.js project - with one command.

```bash
npx vellumup-init
```

The CLI inspects your project (App Router vs Pages Router, `src/` layout,
TypeScript, path aliases, i18n, package manager), asks only what it cannot
detect, and writes everything for you.

## What it creates

Full blog mode (the default, App Router):

```text
your-project/
├── app/
│   ├── api/vellumup/route.ts     # webhook receiver: verifies HMAC, stores the article
│   └── blog/
│       ├── page.tsx              # paginated blog index
│       └── [slug]/page.tsx       # article page (ToC, key takeaways, related posts)
├── components/
│   ├── BlogPostLayout.tsx        # hero, byline, typography
│   ├── BlogSection.tsx           # card grid (index + related posts)
│   ├── BlogKeyTakeaways.tsx      # callout box
│   └── PillTableOfContents.tsx   # responsive ToC (sidebar / bottom pill)
├── vellumup/articles.sql         # articles schema (standard PostgreSQL - Supabase, psql, any client)
└── .env.local                    # VELLUMUP_WEBHOOK_SECRET= and Supabase keys appended
```

This runs end to end with no code left to write: the route upserts each
delivered article into the `articles` table, and the pages read from it. Run
the SQL, fill in the keys, and publishing in VellumUp puts a post on your site.

"Webhook route only" mode writes just the receiver route, the SQL file, and the
`VELLUMUP_WEBHOOK_SECRET=` placeholder - for projects that already have their
own blog. That route is database-agnostic: it verifies the signature and hands
you two empty functions (`upsertArticle`, `markArticleDraft`) to point at
whatever store you already use.

## Requirements

- Node.js 18.3+
- A Next.js project (App Router for the full blog; Pages Router gets the
  webhook route)
- A database for article storage (full blog mode only). The generated pages
  are wired for [Supabase](https://supabase.com) out of the box (free tier is
  fine), but any database works: the SQL schema is standard PostgreSQL, and if
  you use something else entirely you only swap the small data-access
  functions in the two blog pages - see the FAQ below

## The prompts

The CLI asks up to three questions, each only when it applies:

1. **What should we set up?** Full blog (recommended) or webhook route only.
   Skipped for Pages Router projects (route only, with an explanation).
2. **How should existing files be handled?** Asked only when a target file
   already exists: skip (default), overwrite all, or cancel.
3. **Install the missing rendering dependencies?** (`react-markdown`,
   `remark-gfm`) Asked only in full blog mode when either is missing;
   installed with your project's own package manager (detected from the
   lockfile) if you say yes. Route-only mode installs nothing.

Language is never asked: the blog pages always filter articles by
`language_code` (default `en`, or whatever you pass with `--lang`), and the
generated filter line carries a comment showing multi-language sites exactly
what to swap for a dynamic locale - see the FAQ.

`@supabase/supabase-js` is never installed for you. Full blog mode generates
Supabase code as its default wiring, so if you use Supabase you install the
client yourself; if you use anything else you replace those calls instead.
Either way the CLI ends by telling you which one you still need to do.

## Flags

| Flag | Effect |
| --- | --- |
| `--yes` | Non-interactive: full blog, language `en`, skip existing files, install deps |
| `--route-only` | Webhook route only, no blog pages or dependency install |
| `--lang <code>` | Language the blog filters by (e.g. `en`, `fr`, `he`) |
| `--no-install` | Never run the package manager |
| `--help` / `--version` | The usual |

## After running

The CLI prints these as numbered next steps, with your exact paths:

1. Run `vellumup/articles.sql` against your database (Supabase SQL Editor,
   psql, or any client) to create the `articles` table.
2. Already have `@supabase/supabase-js`? Just fill `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in
   `.env.local` (Supabase dashboard: Project Settings > API) - the route
   needs these to write. Don't have it? Install it first
   (`npm install @supabase/supabase-js`), or if you use a different
   database, replace the route's two functions and the pages' data-access
   functions instead - see the FAQ.
3. In the VellumUp dashboard open **Integrations > Next.js > Add endpoint**
   and point it at `https://your-domain.com/api/vellumup`.
4. Copy the secret (shown once) into `VELLUMUP_WEBHOOK_SECRET` - in `.env.local` and in
   your hosting provider's env vars.
5. Deploy your site.
6. Click **Test connection**, publish an article, visit `/blog`.

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
per slug + language). The generated pages filter by one language so the blog
never shows duplicates; the filter line carries a comment showing exactly what
to swap to make it dynamic per locale.

**I already have a Supabase client in my project.**
The generated pages create their own inline client so they work with zero other
files. Swap the `createClient(...)` block for your own import if you prefer -
each file has a comment marking the spot.

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
3. The pages: `app/blog/page.tsx` has `getPosts`; `app/blog/[slug]/page.tsx`
   has `getArticle` and `getRelatedPosts`. Replace their Supabase queries
   with your own ORM/driver calls returning the same fields, and delete each
   file's inline `createClient(...)` block.

If you pick "webhook route only" instead, the route you get is already
database-agnostic: the same two functions are there, empty, waiting for your
implementation - no Supabase code to remove.

**Pages Router?**
The webhook route works on both routers. The blog pages are App Router server
components, so full blog mode needs an `app/` directory - adopt it and re-run.

## License

[MIT](LICENSE)
