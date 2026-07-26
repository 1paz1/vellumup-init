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

// Sync guard: a bad re-extraction from lucidseo that loses (or duplicates) the
// placeholder lines must fail the test run, not silently ship a broken filter.
test('templates contain exactly 3 lang placeholders across the two blog pages', () => {
  const index = fs.readFileSync(path.join(TEMPLATES, 'app-router', 'blog', 'page.tsx'), 'utf8');
  const article = fs.readFileSync(
    path.join(TEMPLATES, 'app-router', 'blog', '[slug]', 'page.tsx'),
    'utf8',
  );
  assert.equal(countLangPlaceholders(index), 1);
  assert.equal(countLangPlaceholders(article), 2);
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
