import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildFilePlan } from '../src/plan.js';

const APP_DETECTION = {
  router: 'app',
  baseDir: path.join('/proj'),
};
const PAGES_DETECTION = {
  router: 'pages',
  baseDir: path.join('/proj'),
};

function routeEntry(plan) {
  return plan.find((entry) => entry.label === 'Webhook route');
}

test('full mode writes the storage-wired route, route-only writes the agnostic one', () => {
  const full = routeEntry(buildFilePlan(APP_DETECTION, { mode: 'full', lang: 'en' }));
  const routeOnly = routeEntry(buildFilePlan(APP_DETECTION, { mode: 'route-only', lang: 'en' }));

  assert.ok(full.templatePath.includes(`app-router${path.sep}api`));
  assert.ok(routeOnly.templatePath.includes('app-router-route-only'));
  // Both land at the same place in the user's project.
  assert.equal(full.targetPath, routeOnly.targetPath);
});

test('the route variants exist on disk and differ in Supabase usage', () => {
  const full = routeEntry(buildFilePlan(APP_DETECTION, { mode: 'full', lang: 'en' }));
  const routeOnly = routeEntry(buildFilePlan(APP_DETECTION, { mode: 'route-only', lang: 'en' }));

  const fullSource = fs.readFileSync(full.templatePath, 'utf8');
  const routeOnlySource = fs.readFileSync(routeOnly.templatePath, 'utf8');

  // Full mode is wired to Supabase so the blog works with no code to write.
  assert.ok(fullSource.includes("from '@supabase/supabase-js'"));
  // Route-only must not import a client the CLI never installs.
  assert.ok(!routeOnlySource.includes('@supabase/supabase-js'));
  // Both expose the same two extension points.
  for (const source of [fullSource, routeOnlySource]) {
    assert.ok(source.includes('async function upsertArticle'));
    assert.ok(source.includes('async function markArticleDraft'));
  }
});

test('pages router picks its own route variants', () => {
  const full = routeEntry(buildFilePlan(PAGES_DETECTION, { mode: 'full', lang: 'en' }));
  const routeOnly = routeEntry(buildFilePlan(PAGES_DETECTION, { mode: 'route-only', lang: 'en' }));

  assert.ok(full.templatePath.includes(`pages-router${path.sep}api`));
  assert.ok(routeOnly.templatePath.includes('pages-router-route-only'));
  assert.ok(fs.existsSync(full.templatePath));
  assert.ok(fs.existsSync(routeOnly.templatePath));
});

test('each mode writes the expected number of files', () => {
  const routeOnly = buildFilePlan(APP_DETECTION, { mode: 'route-only', lang: 'en' });
  const full = buildFilePlan(APP_DETECTION, { mode: 'full', lang: 'en' });
  const uiOnly = buildFilePlan(APP_DETECTION, { mode: 'ui-only', lang: 'en' });

  assert.equal(routeOnly.length, 1);
  // route + 2 pages + 6 components + theme + types + data
  assert.equal(full.length, 12);
  // the same minus the route
  assert.equal(uiOnly.length, 11);
});

test('ui-only mode writes no webhook route', () => {
  const uiOnly = buildFilePlan(APP_DETECTION, { mode: 'ui-only', lang: 'en' });
  assert.equal(routeEntry(uiOnly), undefined);
  assert.ok(uiOnly.every((entry) => !entry.targetPath.includes(`${path.sep}api${path.sep}`)));
});

test('full and ui-only write the same files apart from the route and the data source', () => {
  const full = buildFilePlan(APP_DETECTION, { mode: 'full', lang: 'en' });
  const uiOnly = buildFilePlan(APP_DETECTION, { mode: 'ui-only', lang: 'en' });

  const targets = (plan) => plan.filter((entry) => entry.label !== 'Webhook route').map((entry) => entry.targetPath);
  assert.deepEqual(targets(full), targets(uiOnly));

  const differing = full.filter((entry) => {
    const other = uiOnly.find((candidate) => candidate.targetPath === entry.targetPath);
    return other && other.templatePath !== entry.templatePath;
  });
  assert.deepEqual(
    differing.map((entry) => entry.targetPath),
    [path.join('/proj', 'lib', 'blog-data.ts')],
  );
});

test('lib/blog-data.ts comes from the Supabase or sample template, by mode', () => {
  const dataEntry = (mode) =>
    buildFilePlan(APP_DETECTION, { mode, lang: 'en' }).find((entry) =>
      entry.targetPath.endsWith(`${path.sep}blog-data.ts`),
    );

  const full = dataEntry('full');
  const uiOnly = dataEntry('ui-only');

  assert.ok(full.templatePath.endsWith('blog-data.supabase.ts'));
  assert.ok(uiOnly.templatePath.endsWith('blog-data.sample.ts'));
  // Only the Supabase queries get a language filter.
  assert.equal(full.transforms.langFilter, true);
  assert.ok(!uiOnly.transforms.langFilter);
  for (const entry of [full, uiOnly]) assert.ok(fs.existsSync(entry.templatePath));
});

test('both data files export the three functions the pages call', () => {
  const plan = buildFilePlan(APP_DETECTION, { mode: 'full', lang: 'en' });
  const templates = path.dirname(plan.find((entry) => entry.label === 'Blog theme config').templatePath);
  const supabase = fs.readFileSync(path.join(templates, 'blog-data.supabase.ts'), 'utf8');
  const sample = fs.readFileSync(path.join(templates, 'blog-data.sample.ts'), 'utf8');

  for (const source of [supabase, sample]) {
    assert.match(source, /export async function getPosts\(/);
    assert.match(source, /export (const getArticle =|async function getArticle\()/);
    assert.match(source, /export async function getRelatedPosts\(/);
    assert.ok(source.includes("from './blog-types'"));
  }
  // The sample must run with nothing installed - it imports only its own types.
  assert.doesNotMatch(sample, /^import .* from '(?!\.\/)/m);
});

test('the blog pages read only through lib/blog-data.ts', () => {
  const plan = buildFilePlan(APP_DETECTION, { mode: 'full', lang: 'en' });
  for (const label of ['Blog index page', 'Article page']) {
    const source = fs.readFileSync(plan.find((entry) => entry.label === label).templatePath, 'utf8');
    assert.ok(source.includes("from '@/lib/blog-data'"), label);
    assert.ok(!source.includes('@supabase/supabase-js'), label);
    assert.ok(!source.includes(".from('articles')"), label);
  }
});
