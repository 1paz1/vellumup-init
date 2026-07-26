import pc from 'picocolors';

/**
 * Render the numbered "next steps" block shown in the outro. This is the
 * user's entire remaining onboarding, so it must be complete and copy-paste
 * friendly - every value they need (paths, URL shape, env var name) appears
 * literally.
 *
 * @param {{ mode: 'full' | 'route-only', installFailedCommand?: string, routePath: string }} opts
 */
export function renderNextSteps({ mode, installFailedCommand, routePath }) {
  const steps = [];

  if (installFailedCommand) {
    steps.push(
      `Install the blog dependencies manually:\n     ${pc.cyan(installFailedCommand)}`,
    );
  }

  if (mode === 'full') {
    steps.push(
      `Run ${pc.cyan('vellumup/articles.sql')} against your database to create the\n     ${pc.bold('articles')} table. It is standard PostgreSQL - use the Supabase SQL\n     Editor, psql, or any client. Different database? Adapt the schema -\n     any store with the same columns works.`,
      `Using Supabase (the default wiring)? Install its client:\n     ${pc.cyan('npm install @supabase/supabase-js')}\n     then fill ${pc.cyan('NEXT_PUBLIC_SUPABASE_URL')} and ${pc.cyan('NEXT_PUBLIC_SUPABASE_ANON_KEY')}\n     in ${pc.cyan('.env.local')} (Supabase dashboard: Project Settings > API).\n     Using your own database instead? Skip all of this and swap the\n     ${pc.cyan('createClient(...)')} block + data-access functions in the two blog\n     pages for your own data layer - the pages are Supabase-based code you\n     are free to adapt to whatever you have.`,
    );
  }

  steps.push(
    `Deploy your site (or run your dev server with a public tunnel for testing).`,
    `In the VellumUp dashboard open ${pc.bold('Integrations > Next.js > Add endpoint')}\n     and set the URL to ${pc.cyan(`https://<your-domain>${routePath}`)}.`,
    `Copy the secret (shown only once) into ${pc.cyan('VELLUMUP_WEBHOOK_SECRET')} in ${pc.cyan('.env.local')}\n     ${pc.bold('and')} in your hosting provider's environment variables.`,
    mode === 'full'
      ? `Click ${pc.bold('Test connection')} in the dashboard - then publish an article\n     and visit ${pc.cyan('/blog')} on your site.`
      : `Click ${pc.bold('Test connection')} in the dashboard. Your route logs each event -\n     see the TODO block inside it for mapping articles into your database\n     (${pc.cyan('vellumup/articles.sql')} has a ready-made PostgreSQL schema if\n     you want one - adapt it freely for any other database).`,
  );

  return steps
    .map((step, index) => `  ${pc.bold(pc.green(`${index + 1}.`))} ${step}`)
    .join('\n\n');
}
