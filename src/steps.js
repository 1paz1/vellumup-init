import pc from 'picocolors';

// Shared by both blog modes. The comment at the top of lib/blog-theme.ts
// covers the rest (sitemap, robots.txt, Search Console), so this stays one
// step.
const SITE_DETAILS_STEP =
  `Fill in your site details - URL, name and author - at the top of\n     ${pc.cyan('lib/blog-theme.ts')}. Search engines, AI search and share previews\n     use them. The comment there also lists what to add to your sitemap\n     and robots.txt. The same file sets your brand color and styles.`;

/**
 * Render the numbered "next steps" block shown in the outro. This is the
 * user's entire remaining onboarding, so it must be complete and copy-paste
 * friendly - every value they need (paths, URL shape, env var name) appears
 * literally. Order matters: database ready, then webhook wired up, then
 * deploy, then test - each step needs the one before it to already work.
 *
 * @param {{ mode: 'full' | 'route-only' | 'ui-only', installFailedCommand?: string, routePath: string, hasSupabaseClient?: boolean }} opts
 */
export function renderNextSteps({ mode, installFailedCommand, routePath, hasSupabaseClient }) {
  const steps = [];

  if (installFailedCommand) {
    steps.push(
      `Install the blog dependencies manually:\n     ${pc.cyan(installFailedCommand)}`,
    );
  }

  // UI-only has no webhook or database, so none of the steps below apply.
  // The VellumUp mention stays one unnumbered line after the list - it is
  // an option, not a step.
  if (mode === 'ui-only') {
    steps.push(
      `Start your dev server and open ${pc.cyan('/blog')} - four sample posts are\n     already there.`,
      SITE_DETAILS_STEP,
      `Replace the sample posts in ${pc.cyan('lib/blog-data.ts')} with your own source\n     (a database, a CMS, Markdown files, an API). The pages read only\n     through that file.`,
    );
    return (
      formatSteps(steps) +
      `\n\n  ${pc.dim(`Want posts written and delivered automatically? See ${pc.cyan('https://vellumup.com')}.`)}`
    );
  }

  if (mode === 'full') {
    steps.push(
      `Run ${pc.cyan('vellumup/articles.sql')} against your database to create the\n     ${pc.bold('articles')} table (Supabase SQL Editor, psql, or any client).`,
      hasSupabaseClient
        ? `Fill ${pc.cyan('NEXT_PUBLIC_SUPABASE_URL')}, ${pc.cyan('NEXT_PUBLIC_SUPABASE_ANON_KEY')} and\n     ${pc.cyan('SUPABASE_SERVICE_ROLE_KEY')} in ${pc.cyan('.env.local')} (Supabase dashboard: Project\n     Settings > API) - the webhook route needs these to write.`
        : `Install Supabase's client (${pc.cyan('npm install @supabase/supabase-js')}) and\n     fill ${pc.cyan('NEXT_PUBLIC_SUPABASE_URL')}, ${pc.cyan('NEXT_PUBLIC_SUPABASE_ANON_KEY')} and\n     ${pc.cyan('SUPABASE_SERVICE_ROLE_KEY')} in ${pc.cyan('.env.local')}. Using another database\n     instead? Replace ${pc.cyan('upsertArticle()')}/${pc.cyan('markArticleDraft()')} in the route and\n     the functions in ${pc.cyan('lib/blog-data.ts')} - each file marks the spot.`,
      SITE_DETAILS_STEP,
    );
  }

  steps.push(
    `In the VellumUp dashboard open ${pc.bold('Integrations > Next.js > Add endpoint')}\n     and set the URL to ${pc.cyan(`https://your-domain.com${routePath}`)}.`,
    `Copy the secret (shown only once) into ${pc.cyan('VELLUMUP_WEBHOOK_SECRET')} in ${pc.cyan('.env.local')}\n     ${pc.bold('and')} in your hosting provider's environment variables.`,
    `Deploy your site (or run your dev server with a public tunnel for testing).`,
    mode === 'full'
      ? `Click ${pc.bold('Test connection')} in the dashboard - then publish an article\n     and visit ${pc.cyan('/blog')} on your site.`
      : `Click ${pc.bold('Test connection')} in the dashboard, then fill in the two\n     empty functions in your route - ${pc.cyan('upsertArticle()')} and\n     ${pc.cyan('markArticleDraft()')} - with calls to your own database.\n     (${pc.cyan('vellumup/articles.sql')} has a ready-made PostgreSQL schema if\n     you want one - adapt it freely for any other database.)`,
  );

  return formatSteps(steps);
}

function formatSteps(steps) {
  return steps
    .map((step, index) => `  ${pc.bold(pc.green(`${index + 1}.`))} ${step}`)
    .join('\n\n');
}
