import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATES_DIR = fileURLToPath(new URL('../templates/', import.meta.url));

/**
 * Build the concrete list of files this run will write - resolved template
 * source, absolute target path, and which transforms apply. Pure planning:
 * nothing here touches the user's filesystem, so the conflict prompt can show
 * exactly what WOULD happen before a single byte is written.
 *
 * @param {import('./detect.js') extends never ? never : object} detection result of detectProject()
 * @param {{ mode: 'full' | 'route-only', lang: string }} answers
 * @returns {Array<{
 *   templatePath: string,
 *   targetPath: string,
 *   label: string,
 *   transforms: { langFilter?: boolean, aliasRewrite?: boolean },
 * }>}
 */
export function buildFilePlan(detection, answers) {
  const { router, baseDir } = detection;
  const template = (...segments) => path.join(TEMPLATES_DIR, ...segments);
  const target = (...segments) => path.join(baseDir, ...segments);
  const plan = [];

  // Webhook receiver route - always written; the path depends on the router
  // and the variant depends on the mode. Full blog gets a route that writes
  // straight into the articles table the blog pages read from, so the whole
  // thing works end to end with no code left to fill in. Route-only gets a
  // database-agnostic version with two empty functions to implement, since
  // those users are wiring the payload into a store we know nothing about.
  const routeVariant = answers.mode === 'full' ? '' : '-route-only';
  if (router === 'app') {
    plan.push({
      templatePath: template(`app-router${routeVariant}`, 'api', 'vellumup', 'route.ts'),
      targetPath: target('app', 'api', 'vellumup', 'route.ts'),
      label: 'Webhook route',
      transforms: {},
    });
  } else {
    plan.push({
      templatePath: template(`pages-router${routeVariant}`, 'api', 'vellumup.ts'),
      targetPath: target('pages', 'api', 'vellumup.ts'),
      label: 'Webhook route',
      transforms: {},
    });
  }

  if (answers.mode === 'full') {
    plan.push(
      {
        templatePath: template('app-router', 'blog', 'page.tsx'),
        targetPath: target('app', 'blog', 'page.tsx'),
        label: 'Blog index page',
        transforms: { langFilter: true },
      },
      {
        templatePath: template('app-router', 'blog', '[slug]', 'page.tsx'),
        targetPath: target('app', 'blog', '[slug]', 'page.tsx'),
        label: 'Article page',
        transforms: { langFilter: true, aliasRewrite: true },
      },
      ...['BlogPostLayout', 'BlogSection', 'BlogKeyTakeaways', 'PillTableOfContents'].map(
        (name) => ({
          templatePath: template('components', `${name}.tsx`),
          targetPath: target('components', `${name}.tsx`),
          label: `Component: ${name}`,
          transforms: {},
        }),
      ),
    );
  }

  return plan;
}

/** SQL always lands at the project root (never under src/) so it is easy to find. */
export function sqlFilePlan(cwd) {
  return {
    templatePath: path.join(TEMPLATES_DIR, 'sql', 'articles.sql'),
    targetPath: path.join(cwd, 'vellumup', 'articles.sql'),
    label: 'Database schema (run manually)',
  };
}
