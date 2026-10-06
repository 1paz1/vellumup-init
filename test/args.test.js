import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliArgs } from '../src/args.js';

test('no flags: every mode flag is off', () => {
  const options = parseCliArgs([]);
  assert.equal(options.routeOnly, false);
  assert.equal(options.uiOnly, false);
});

test('--ui-only is parsed', () => {
  assert.equal(parseCliArgs(['--ui-only']).uiOnly, true);
});

test('--route-only and --ui-only together are rejected', () => {
  assert.throws(() => parseCliArgs(['--route-only', '--ui-only']), /cannot be used together/);
});

test('unknown flags are rejected', () => {
  assert.throws(() => parseCliArgs(['--ui-onyl']));
});
