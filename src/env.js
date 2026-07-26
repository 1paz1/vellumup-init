import fs from 'node:fs';
import path from 'node:path';

const BLOCK_HEADER = '# Added by vellumup-init - see "next steps" in your terminal';

/**
 * Ensure the given keys exist in .env.local, append-only. Existing values are
 * never modified or reordered - a user's real secret must survive any number
 * of re-runs. Creates the file when missing.
 *
 * @param {string} cwd     project root
 * @param {string[]} keys  env var names to ensure (appended as `KEY=`)
 * @returns {Array<{ key: string, action: 'added' | 'exists' }>}
 */
export function ensureEnvVars(cwd, keys) {
  const envPath = path.join(cwd, '.env.local');
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  const results = keys.map((key) => ({
    key,
    // Match "KEY=" at line start (allowing leading whitespace), not substrings -
    // VELLUMUP_WEBHOOK_SECRET must not match MY_VELLUMUP_WEBHOOK_SECRET.
    action: new RegExp(`^\\s*${key}\\s*=`, 'm').test(existing) ? 'exists' : 'added',
  }));

  const missing = results.filter((r) => r.action === 'added').map((r) => r.key);
  if (missing.length === 0) return results;

  const lines = [];
  // Separate our block from existing content, and only emit the header once
  // across re-runs.
  if (existing.length > 0 && !existing.endsWith('\n')) lines.push('');
  if (existing.length > 0) lines.push('');
  if (!existing.includes(BLOCK_HEADER)) lines.push(BLOCK_HEADER);
  lines.push(...missing.map((key) => `${key}=`), '');

  fs.appendFileSync(envPath, lines.join('\n'));
  return results;
}
