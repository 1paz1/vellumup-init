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

test('route-only mode writes just the route, full mode adds pages and components', () => {
  const routeOnly = buildFilePlan(APP_DETECTION, { mode: 'route-only', lang: 'en' });
  const full = buildFilePlan(APP_DETECTION, { mode: 'full', lang: 'en' });

  assert.equal(routeOnly.length, 1);
  // route + 2 pages + 5 components + 1 theme config
  assert.equal(full.length, 9);
});
