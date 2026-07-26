import fs from 'node:fs';
import path from 'node:path';
import { applyLangFilter, rewriteAliasImports } from './transform.js';

/**
 * Split a file plan into entries whose target already exists vs new ones,
 * so the conflict prompt can be shown BEFORE anything is written.
 */
export function partitionConflicts(filePlan) {
  const conflicts = [];
  const fresh = [];
  for (const entry of filePlan) {
    (fs.existsSync(entry.targetPath) ? conflicts : fresh).push(entry);
  }
  return { conflicts, fresh };
}

/**
 * Execute the plan. All prompting has already happened - this only performs
 * mechanical copy + transform work and reports what it did per file.
 *
 * @param {Array} filePlan        entries from buildFilePlan()
 * @param {'skip' | 'overwrite'}  conflictPolicy what to do with existing targets
 * @param {{ lang: string, aliasOk: boolean, componentsDir: string }} ctx
 * @returns {Array<{ label: string, relPath: string, action: 'created' | 'overwritten' | 'skipped' }>}
 */
export function writeFilePlan(filePlan, conflictPolicy, ctx, cwd) {
  const results = [];

  for (const entry of filePlan) {
    const exists = fs.existsSync(entry.targetPath);
    const relPath = path.relative(cwd, entry.targetPath).split(path.sep).join('/');

    if (exists && conflictPolicy === 'skip') {
      results.push({ label: entry.label, relPath, action: 'skipped' });
      continue;
    }

    let content = fs.readFileSync(entry.templatePath, 'utf8');
    if (entry.transforms.langFilter) {
      content = applyLangFilter(content, ctx.lang);
    }
    if (entry.transforms.aliasRewrite && !ctx.aliasOk) {
      content = rewriteAliasImports(content, entry.targetPath, ctx.componentsDir);
    }

    fs.mkdirSync(path.dirname(entry.targetPath), { recursive: true });
    fs.writeFileSync(entry.targetPath, content);
    results.push({ label: entry.label, relPath, action: exists ? 'overwritten' : 'created' });
  }

  return results;
}

/**
 * Write the SQL schema file. Idempotent by design (content is static), so an
 * existing copy is silently refreshed rather than treated as a conflict.
 */
export function writeSqlFile(sqlPlan, cwd) {
  const relPath = path.relative(cwd, sqlPlan.targetPath).split(path.sep).join('/');
  const exists = fs.existsSync(sqlPlan.targetPath);
  fs.mkdirSync(path.dirname(sqlPlan.targetPath), { recursive: true });
  fs.copyFileSync(sqlPlan.templatePath, sqlPlan.targetPath);
  return { label: sqlPlan.label, relPath, action: exists ? 'overwritten' : 'created' };
}
