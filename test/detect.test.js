import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectProject } from '../src/detect.js';

/** Build a throwaway fake project from a { relativePath: content } map. */
function fixture(files) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vellumup-detect-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(cwd, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return cwd;
}

const NEXT_PKG = JSON.stringify({ dependencies: { next: '^15.2.0', react: '^19.0.0' } });

test('not a Next project: no package.json', () => {
  const d = detectProject(fixture({}));
  assert.equal(d.isNext, false);
});

test('not a Next project: package.json without next', () => {
  const d = detectProject(fixture({ 'package.json': '{"dependencies":{"react":"19"}}' }));
  assert.equal(d.isNext, false);
});

test('app router, root layout, typescript, default alias', () => {
  const cwd = fixture({
    'package.json': NEXT_PKG,
    'tsconfig.json': '{"compilerOptions":{"paths":{"@/*":["./*"]}}}',
    'app/layout.tsx': '',
  });
  const d = detectProject(cwd);
  assert.equal(d.isNext, true);
  assert.equal(d.nextMajor, 15);
  assert.equal(d.router, 'app');
  assert.equal(d.srcDir, false);
  assert.equal(d.typescript, true);
  assert.equal(d.aliasOk, true);
  assert.equal(d.i18n, false);
});

test('src/ layout adjusts baseDir and alias expectation', () => {
  const cwd = fixture({
    'package.json': NEXT_PKG,
    'tsconfig.json': '{"compilerOptions":{"paths":{"@/*":["./src/*"]}}}',
    'src/app/layout.tsx': '',
  });
  const d = detectProject(cwd);
  assert.equal(d.router, 'app');
  assert.equal(d.srcDir, true);
  assert.equal(d.baseDir, path.join(cwd, 'src'));
  assert.equal(d.aliasOk, true);
});

test('alias pointing somewhere unusable is rejected', () => {
  const cwd = fixture({
    'package.json': NEXT_PKG,
    'tsconfig.json': '{"compilerOptions":{"paths":{"@/*":["./app/*"]}}}',
    'app/layout.tsx': '',
  });
  assert.equal(detectProject(cwd).aliasOk, false);
});

test('tsconfig with comments still parses', () => {
  const cwd = fixture({
    'package.json': NEXT_PKG,
    'tsconfig.json': '{\n  // path alias\n  "compilerOptions": {"paths": {"@/*": ["./*"]}}\n}',
    'app/layout.tsx': '',
  });
  assert.equal(detectProject(cwd).aliasOk, true);
});

// Regression: a realistic create-next-app tsconfig mixes comment-looking
// sequences inside strings ("@/*", "**/*.ts") with real comments. A naive
// comment stripper spliced the file mid-string and silently disabled the
// alias, downgrading every project to relative imports.
test('realistic create-next-app tsconfig (glob strings + comments) keeps alias', () => {
  const tsconfig = `{
  // Next.js generated config
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  },
  /* include globs contain star-slash sequences */
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`;
  const cwd = fixture({
    'package.json': NEXT_PKG,
    'tsconfig.json': tsconfig,
    'app/layout.tsx': '',
  });
  assert.equal(detectProject(cwd).aliasOk, true);
});

test('pages router detected when app/ is absent', () => {
  const cwd = fixture({ 'package.json': NEXT_PKG, 'pages/index.tsx': '' });
  const d = detectProject(cwd);
  assert.equal(d.router, 'pages');
});

test('app router wins when both routers exist', () => {
  const cwd = fixture({
    'package.json': NEXT_PKG,
    'app/layout.tsx': '',
    'pages/legacy.tsx': '',
  });
  assert.equal(detectProject(cwd).router, 'app');
});

test('i18n detected from next.config i18n key', () => {
  const cwd = fixture({
    'package.json': NEXT_PKG,
    'app/layout.tsx': '',
    'next.config.js': 'module.exports = { i18n: { locales: ["en", "he"] } }',
  });
  assert.equal(detectProject(cwd).i18n, true);
});

test('i18n detected from next-intl dependency', () => {
  const cwd = fixture({
    'package.json': JSON.stringify({ dependencies: { next: '15', 'next-intl': '3' } }),
    'app/layout.tsx': '',
  });
  assert.equal(detectProject(cwd).i18n, true);
});

test('i18n detected from app/[locale] directory', () => {
  const cwd = fixture({
    'package.json': NEXT_PKG,
    'app/[locale]/layout.tsx': '',
  });
  assert.equal(detectProject(cwd).i18n, true);
});

test('package manager from lockfile, pnpm wins', () => {
  const cwd = fixture({
    'package.json': NEXT_PKG,
    'app/layout.tsx': '',
    'pnpm-lock.yaml': '',
  });
  assert.equal(detectProject(cwd).packageManager, 'pnpm');
});

test('missing deps lists only absent blog dependencies', () => {
  const cwd = fixture({
    'package.json': JSON.stringify({
      dependencies: { next: '15', 'react-markdown': '9' },
    }),
    'app/layout.tsx': '',
  });
  assert.deepEqual(detectProject(cwd).missingDeps, ['remark-gfm']);
});

// @supabase/supabase-js must never be auto-installed - Supabase is the
// default wiring of the generated pages, not a requirement, so the client is
// a manual step for Supabase users only (communicated in the outro).
test('supabase client is not part of the auto-installed dependencies', () => {
  const cwd = fixture({ 'package.json': NEXT_PKG, 'app/layout.tsx': '' });
  assert.ok(!detectProject(cwd).missingDeps.includes('@supabase/supabase-js'));
});
