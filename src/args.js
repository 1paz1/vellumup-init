import { parseArgs } from 'node:util';

export const HELP_TEXT = `
  vellumup-init - scaffold a VellumUp-powered blog into your Next.js project

  Usage
    npx vellumup-init [flags]

  Flags
    --yes            Skip all prompts and accept defaults
                     (full blog on App Router, language "en", skip existing
                     files, install missing dependencies)
    --route-only     Set up only the webhook receiver route (no blog pages,
                     components, or dependency install)
    --ui-only        Set up only the blog pages and components, with sample
                     posts - no webhook route, database, or env vars
    --lang <code>    Language code the full blog filters articles by, e.g.
                     en, fr, he. Defaults to "en" and is never asked
                     interactively - each generated filter line carries a
                     comment showing multi-language sites exactly what to
                     swap. Has no effect with --ui-only (the sample posts
                     have no language).
    --no-install     Never run the package manager, even for missing deps
    --help           Show this message
    --version        Show the CLI version
`;

/**
 * Parse raw argv into a normalized options object.
 * Throws on unknown flags so typos fail loudly instead of being ignored, and
 * on flags that contradict each other.
 */
export function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      yes: { type: 'boolean', default: false },
      'route-only': { type: 'boolean', default: false },
      'ui-only': { type: 'boolean', default: false },
      lang: { type: 'string' },
      'no-install': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
      version: { type: 'boolean', default: false },
    },
    strict: true,
  });

  if (values['route-only'] && values['ui-only']) {
    throw new Error('--route-only and --ui-only cannot be used together - pick one.');
  }

  return {
    yes: values.yes,
    routeOnly: values['route-only'],
    uiOnly: values['ui-only'],
    lang: values.lang,
    noInstall: values['no-install'],
    help: values.help,
    version: values.version,
  };
}
