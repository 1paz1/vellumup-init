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
      `Run ${pc.cyan('vellumup/articles.sql')} in your Supabase SQL Editor\n     (creates the ${pc.bold('articles')} table with its RLS policy).`,
      `Fill ${pc.cyan('NEXT_PUBLIC_SUPABASE_URL')} and ${pc.cyan('NEXT_PUBLIC_SUPABASE_ANON_KEY')}\n     in ${pc.cyan('.env.local')} (Supabase dashboard: Project Settings > API).`,
    );
  }

  steps.push(
    `Deploy your site (or run your dev server with a public tunnel for testing).`,
    `In the VellumUp dashboard open ${pc.bold('Integrations > Next.js > Add endpoint')}\n     and set the URL to ${pc.cyan(`https://<your-domain>${routePath}`)}.`,
    `Copy the secret (shown only once) into ${pc.cyan('VELLUMUP_WEBHOOK_SECRET')} in ${pc.cyan('.env.local')}\n     ${pc.bold('and')} in your hosting provider's environment variables.`,
    mode === 'full'
      ? `Click ${pc.bold('Test connection')} in the dashboard - then publish an article\n     and visit ${pc.cyan('/blog')} on your site.`
      : `Click ${pc.bold('Test connection')} in the dashboard. Your route logs each event -\n     see the TODO block inside it for mapping articles into your database\n     (${pc.cyan('vellumup/articles.sql')} has a ready-made schema if you want one).`,
  );

  return steps
    .map((step, index) => `  ${pc.bold(pc.green(`${index + 1}.`))} ${step}`)
    .join('\n\n');
}
