# Template sync protocol

The files in this directory are 1:1 mirrors of template-string constants that live in
the `lucidseo` repo (the VellumUp product codebase). **lucidseo is the source of
truth.** When a template changes there, re-extract it here in the same commit cycle.

## Mapping

| Template file (here) | lucidseo source file | Exported constant |
| --- | --- | --- |
| `app-router/api/vellumup/route.ts` | `lib/catalog-items/webhook-route/route-template.ts` | `NEXTJS_APP_ROUTER_TEMPLATE` |
| `pages-router/api/vellumup.ts` | `lib/catalog-items/webhook-route/route-template.ts` | `NEXTJS_PAGES_ROUTER_TEMPLATE` |
| `app-router/blog/page.tsx` | `lib/catalog-items/full-article-page/wired-example.ts` | `WIRED_BLOG_INDEX_PAGE` |
| `app-router/blog/[slug]/page.tsx` | `lib/catalog-items/full-article-page/wired-example.ts` | `WIRED_ARTICLE_PAGE` |
| `components/BlogKeyTakeaways.tsx` | `lib/catalog-items/full-article-page/wired-example.ts` | `WIRED_BLOG_KEY_TAKEAWAYS` |
| `components/BlogPostLayout.tsx` | `lib/catalog-items/blog-post-layout/component-template.ts` | `BLOG_POST_LAYOUT_TEMPLATE` |
| `components/BlogSection.tsx` | `lib/catalog-items/blog-section/component-template.ts` | `BLOG_SECTION_TEMPLATE` |
| `components/PillTableOfContents.tsx` | `lib/catalog-items/table-of-contents-pill/component-template.ts` | `TABLE_OF_CONTENTS_PILL_TEMPLATE` |
| `sql/articles.sql` | `lib/catalog-items/webhook-route/db-snippets.ts` | `ARTICLES_TABLE_SQL` |

## Extraction recipe

The lucidseo constants are escaped template literals; their **runtime string values**
are the correct file contents. Never hand-transcribe or regex-unescape - evaluate them.
From inside the lucidseo repo root:

```bash
npx tsx -e "import {NEXTJS_APP_ROUTER_TEMPLATE} from './lib/catalog-items/webhook-route/route-template'; process.stdout.write(NEXTJS_APP_ROUTER_TEMPLATE)" \
  > ../vellumup-init/templates/app-router/api/vellumup/route.ts
```

One command per constant (adjust import + output path per the mapping table).

## Allowed deltas (the ONLY intentional differences from lucidseo)

1. A `SYNC-RULE` header comment at the top of every file, pointing back at its source.
2. Em-dash characters replaced with plain hyphens throughout.
3. In the two blog pages only: `// __VELLUMUP_LANG_FILTER__` placeholder lines inserted
   directly after each `.eq('status', 'published')` call - exactly **3 total**
   (index `getPosts`; article `getArticle` + `getRelatedPosts`). The CLI replaces each
   with `.eq('language_code', '<code>')` at install time. A unit test in `test/`
   asserts the count is exactly 3, so a bad re-extraction fails the test run.

After re-extracting, re-apply all three deltas before committing.
