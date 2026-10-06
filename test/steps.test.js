import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderNextSteps } from '../src/steps.js';

// Colors off, so the assertions read plain text.
const plain = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');

const render = (opts) => plain(renderNextSteps({ routePath: '/api/vellumup', ...opts }));

test('ui-only steps mention no webhook, schema or env vars', () => {
  const steps = render({ mode: 'ui-only' });
  assert.ok(steps.includes('/blog'));
  assert.ok(steps.includes('lib/blog-data.ts'));
  assert.ok(steps.includes('lib/blog-theme.ts'));
  for (const absent of ['webhook', 'articles.sql', 'VELLUMUP_WEBHOOK_SECRET', '.env.local', 'Test connection']) {
    assert.ok(!steps.includes(absent), `should not mention ${absent}`);
  }
});

test('ui-only keeps the install step when the install did not run', () => {
  const steps = render({ mode: 'ui-only', installFailedCommand: 'npm install react-markdown remark-gfm' });
  assert.match(steps, /1\. Install the blog dependencies manually/);
  assert.ok(steps.includes('npm install react-markdown remark-gfm'));
});

test('full steps point other databases at lib/blog-data.ts', () => {
  const steps = render({ mode: 'full', hasSupabaseClient: false });
  assert.ok(steps.includes('lib/blog-data.ts'));
  assert.ok(steps.includes('articles.sql'));
  assert.ok(steps.includes('VELLUMUP_WEBHOOK_SECRET'));
});
