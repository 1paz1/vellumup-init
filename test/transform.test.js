import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyLangFilter,
  countLangPlaceholders,
  rewriteAliasImports,
} from '../src/transform.js';

const TEMPLATES = fileURLToPath(new URL('../templates/', import.meta.url));

test('lang filter: placeholder replaced with same-indentation filter + comment', () => {
  const input = [
    'const q = supabase',
    "  .eq('status', 'published')",
    '  // __VELLUMUP_LANG_FILTER__',
    '  .order(1);',
  ].join('\n');

  const output = applyLangFilter(input, 'fr');
  assert.match(output, /^ {2}\.eq\('language_code', 'fr'\) \/\/ multi-language\?/m);
  assert.ok(!output.includes('__VELLUMUP_LANG_FILTER__'));
});

test('lang filter: language code is quote-escaped', () => {
  const output = applyLangFilter("// __VELLUMUP_LANG_FILTER__", "x'y");
  assert.ok(output.includes("\\'"));
});

// Sync guard: an edit that loses (or duplicates) the placeholder lines must
// fail the test run, not silently ship a broken filter.
test('lang placeholders live only in the Supabase data file, exactly 4 of them', () => {
  const read = (...segments) => fs.readFileSync(path.join(TEMPLATES, ...segments), 'utf8');

  // getPosts (1) + getArticle (1) + getRelatedPosts's two query branches -
  // preferred (internal_link_slugs) and fallback (latest posts) - one each (2).
  assert.equal(countLangPlaceholders(read('lib', 'blog-data.supabase.ts')), 4);

  // The pages don't query anything, and the sample data has no language.
  assert.equal(countLangPlaceholders(read('app-router', 'blog', 'page.tsx')), 0);
  assert.equal(countLangPlaceholders(read('app-router', 'blog', '[slug]', 'page.tsx')), 0);
  assert.equal(countLangPlaceholders(read('lib', 'blog-data.sample.ts')), 0);
});

test('alias rewrite: article page depth resolves to ../../../components', () => {
  const source = "import { BlogPostLayout } from '@/components/BlogPostLayout';";
  const output = rewriteAliasImports(
    source,
    path.join('/proj', 'app', 'blog', '[slug]', 'page.tsx'),
    path.join('/proj', 'components'),
  );
  assert.ok(output.includes("from '../../../components/BlogPostLayout'"));
});

test('alias rewrite: src/ layout resolves identically (shared parent)', () => {
  const output = rewriteAliasImports(
    "from '@/components/BlogSection'",
    path.join('/proj', 'src', 'app', 'blog', '[slug]', 'page.tsx'),
    path.join('/proj', 'src', 'components'),
  );
  assert.ok(output.includes("from '../../../components/BlogSection'"));
});

test('alias rewrite: no-op on files without alias imports', () => {
  const source = "import fs from 'node:fs';";
  const output = rewriteAliasImports(source, '/proj/app/blog/page.tsx', '/proj/components');
  assert.equal(output, source);
});

test('alias rewrite: @/lib imports resolve alongside @/components imports', () => {
  const source = [
    "import { BlogSection } from '@/components/BlogSection';",
    "import { BLOG_ACCENT } from '@/lib/blog-theme';",
  ].join('\n');
  const output = rewriteAliasImports(
    source,
    path.join('/proj', 'app', 'blog', '[slug]', 'page.tsx'),
    path.join('/proj', 'components'),
    path.join('/proj', 'lib'),
  );
  assert.ok(output.includes("from '../../../components/BlogSection'"));
  assert.ok(output.includes("from '../../../lib/blog-theme'"));
});

test('alias rewrite: @/lib left untouched when no libAbsDir is passed', () => {
  const source = "import { BLOG_ACCENT } from '@/lib/blog-theme';";
  const output = rewriteAliasImports(source, '/proj/app/blog/page.tsx', '/proj/components');
  assert.equal(output, source);
});
