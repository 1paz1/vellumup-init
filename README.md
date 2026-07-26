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
│   ├── api/vellumup/route.ts     # webhook receiver (HMAC-verified)
│   └── blog/
│       ├── page.tsx              # paginated blog index
│       └── [slug]/page.tsx       # article page (ToC, key takeaways, related posts)
├── components/
│   ├── BlogPostLayout.tsx        # hero, byline, typography
│   ├── BlogSection.tsx           # card grid (index + related posts)
│   ├── BlogKeyTakeaways.tsx      # callout box
│   └── PillTableOfContents.tsx   # responsive ToC (sidebar / bottom pill)
├── vellumup/articles.sql         # Supabase schema - run once in the SQL Editor
└── .env.local                    # VELLUMUP_WEBHOOK_SECRET= and Supabase keys appended
```

"Webhook route only" mode writes just the receiver route, the SQL file, and the
`VELLUMUP_WEBHOOK_SECRET=` placeholder - for projects that already have their own blog.

## Requirements

- Node.js 18.3+
- A Next.js project (App Router for the full blog; Pages Router gets the
  webhook route)
- A [Supabase](https://supabase.com) project (free tier is fine) for article
  storage - full blog mode only

## The prompts

The CLI asks at most three questions, each only when it applies:

1. **What should we set up?** Full blog (recommended) or webhook route only.
   Skipped for Pages Router projects (route only, with an explanation).
2. **Which language code should the blog show?** Asked only when your project
   already uses i18n (`next-intl`, `next-i18next`, an `i18n` key in
   `next.config`, or an `app/[locale]` directory). Everyone else silently gets
   `en`.
3. **How should existing files be handled?** Asked only when a target file
   already exists: skip (default), overwrite all, or cancel.

Missing dependencies (`@supabase/supabase-js`, `react-markdown`, `remark-gfm`)
are installed for you after a confirm, using your project's own package manager
(detected from the lockfile).

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

1. Run `vellumup/articles.sql` in your Supabase SQL Editor.
2. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
   `.env.local`.
3. Deploy your site.
4. In the VellumUp dashboard open **Integrations > Next.js > Add endpoint**
   and point it at `https://your-domain.com/api/vellumup`.
5. Copy the secret (shown once) into `VELLUMUP_WEBHOOK_SECRET` - in `.env.local` and in
   your hosting provider's env vars.
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

**Pages Router?**
The webhook route works on both routers. The blog pages are App Router server
components, so full blog mode needs an `app/` directory - adopt it and re-run.

## Contributing / template sync

The templates under `templates/` mirror the VellumUp product repo - see
[`templates/SYNC.md`](templates/SYNC.md) for the mapping and re-extraction
recipe before editing them.

## License

[MIT](LICENSE)
