import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureEnvVars } from '../src/env.js';

function tmpProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vellumup-env-'));
}

test('creates .env.local when missing', () => {
  const cwd = tmpProject();
  const results = ensureEnvVars(cwd, ['WEBHOOK_SECRET']);
  assert.deepEqual(results, [{ key: 'WEBHOOK_SECRET', action: 'added' }]);
  const content = fs.readFileSync(path.join(cwd, '.env.local'), 'utf8');
  assert.match(content, /^WEBHOOK_SECRET=$/m);
});

test('never touches an existing value, even on re-run', () => {
  const cwd = tmpProject();
  const envPath = path.join(cwd, '.env.local');
  fs.writeFileSync(envPath, 'WEBHOOK_SECRET=whsec_real_secret\n');

  const results = ensureEnvVars(cwd, ['WEBHOOK_SECRET', 'NEXT_PUBLIC_SUPABASE_URL']);
  assert.deepEqual(results, [
    { key: 'WEBHOOK_SECRET', action: 'exists' },
    { key: 'NEXT_PUBLIC_SUPABASE_URL', action: 'added' },
  ]);

  const content = fs.readFileSync(envPath, 'utf8');
  assert.ok(content.includes('WEBHOOK_SECRET=whsec_real_secret'));
  // The real value must appear exactly once - no duplicate placeholder line.
  assert.equal(content.match(/^WEBHOOK_SECRET=/gm).length, 1);
});

test('key matching is exact, not substring', () => {
  const cwd = tmpProject();
  fs.writeFileSync(path.join(cwd, '.env.local'), 'MY_WEBHOOK_SECRET=abc\n');
  const results = ensureEnvVars(cwd, ['WEBHOOK_SECRET']);
  assert.deepEqual(results, [{ key: 'WEBHOOK_SECRET', action: 'added' }]);
});

test('handles a file without a trailing newline', () => {
  const cwd = tmpProject();
  fs.writeFileSync(path.join(cwd, '.env.local'), 'EXISTING=1');
  ensureEnvVars(cwd, ['WEBHOOK_SECRET']);
  const content = fs.readFileSync(path.join(cwd, '.env.local'), 'utf8');
  assert.match(content, /^EXISTING=1$/m);
  assert.match(content, /^WEBHOOK_SECRET=$/m);
});
