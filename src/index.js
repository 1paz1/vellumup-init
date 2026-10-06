import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { parseCliArgs, HELP_TEXT } from './args.js';
import { detectProject } from './detect.js';
import { buildFilePlan, sqlFilePlan } from './plan.js';
import { partitionConflicts, writeFilePlan, writeSqlFile } from './write.js';
import { ensureEnvVars } from './env.js';
import { runInstall, installCommand } from './install.js';
import { renderNextSteps } from './steps.js';

const DEFAULT_LANG = 'en';

export async function run(argv) {
  // A bad flag is a usage mistake, not a crash - print the reason and the
  // help text instead of the bin's "crashed unexpectedly" stack trace.
  let options;
  try {
    options = parseCliArgs(argv);
  } catch (err) {
    console.error(`\n${pc.red(err.message)}`);
    console.log(HELP_TEXT);
    process.exit(1);
  }

  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }
  if (options.version) {
    const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
    console.log(JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version);
    return;
  }

  const cwd = process.cwd();
  p.intro(pc.bgBlue(pc.white(' vellumup-init ')));

  // ── Detection ────────────────────────────────────────────────────────────
  const spinner = p.spinner();
  spinner.start('Looking at your project...');
  const detection = detectProject(cwd);
  spinner.stop('Project inspected');

  if (!detection.isNext) {
    p.cancel(
      "This doesn't look like a Next.js project (no \"next\" in package.json).\n" +
        'Run vellumup-init inside your Next.js app - or create one first with:\n' +
        `  ${pc.cyan('npx create-next-app@latest')}`,
    );
    process.exit(1);
  }
  if (!detection.router) {
    p.cancel(
      'Could not find an app/ or pages/ directory (looked in the project root and src/).\n' +
        'Run vellumup-init from your Next.js project root.',
    );
    process.exit(1);
  }

  p.note(summarizeDetection(detection), 'Detected');

  // ── Mode ─────────────────────────────────────────────────────────────────
  // The blog pages are App Router server components; a Pages-Router-only
  // project silently gets route-only mode with an explanation instead of a
  // choice it cannot actually take. Asking for the pages alone (--ui-only)
  // on such a project is an error, since that is exactly what it can't have.
  let mode;
  if (options.routeOnly) {
    mode = 'route-only';
  } else if (options.uiOnly && detection.router === 'pages') {
    p.cancel(
      'The blog pages need the App Router (an app/ directory), and this project\n' +
        'uses the Pages Router. Adopt the app/ directory, then re-run with --ui-only.',
    );
    process.exit(1);
  } else if (options.uiOnly) {
    mode = 'ui-only';
  } else if (detection.router === 'pages') {
    mode = 'route-only';
    p.note(
      'The blog pages use the App Router, so this sets up the webhook route only.\n' +
        'Adopt the app/ directory later and re-run vellumup-init for the full blog.',
      'Pages Router detected',
    );
  } else if (options.yes) {
    mode = 'full';
  } else {
    mode = guard(
      await p.select({
        message: 'What should we set up?',
        options: [
          {
            value: 'full',
            label: 'Full blog (recommended)',
            hint: 'webhook route + blog pages + components + SQL schema',
          },
          {
            value: 'route-only',
            label: 'Webhook route only',
            hint: 'just the receiver endpoint - for projects with their own blog',
          },
          {
            value: 'ui-only',
            label: 'Blog UI only',
            hint: 'pages + components with sample posts - no database, no webhook',
          },
        ],
        initialValue: 'full',
      }),
    );
  }

  // ── Language ─────────────────────────────────────────────────────────────
  // Never asked interactively. The filter is always injected (see
  // transform.js for why) with "en" as the default - and the injected line
  // itself carries a comment telling multi-language sites exactly what to
  // swap, so the generated code is the documentation. Power users can still
  // pick a different code up front with --lang.
  const lang = options.lang ?? DEFAULT_LANG;

  // ── Conflicts ────────────────────────────────────────────────────────────
  const filePlan = buildFilePlan(detection, { mode, lang });
  const { conflicts } = partitionConflicts(filePlan);

  let conflictPolicy = 'skip';
  if (conflicts.length > 0 && !options.yes) {
    const conflictList = conflicts
      .map((entry) => path.relative(cwd, entry.targetPath).split(path.sep).join('/'))
      .join('\n');
    p.note(conflictList, 'These files already exist');

    conflictPolicy = guard(
      await p.select({
        message: 'How should existing files be handled?',
        options: [
          {
            value: 'skip',
            label: 'Skip existing files (recommended)',
            hint: 'keep yours, write only the missing ones',
          },
          {
            value: 'overwrite',
            label: 'Overwrite all',
            hint: 'replace them with fresh VellumUp versions',
          },
          { value: 'cancel', label: 'Cancel', hint: 'exit without writing anything' },
        ],
        initialValue: 'skip',
      }),
    );
    if (conflictPolicy === 'cancel') {
      p.cancel('Nothing was written.');
      process.exit(0);
    }
  }

  // ── Write ────────────────────────────────────────────────────────────────
  // Everything below this line mutates the project; every prompt that could
  // cancel the run has already happened.
  spinner.start('Writing files...');
  const results = writeFilePlan(filePlan, conflictPolicy, {
    lang,
    aliasOk: detection.aliasOk,
    componentsDir: path.join(detection.baseDir, 'components'),
    libDir: path.join(detection.baseDir, 'lib'),
  }, cwd);

  // UI-only stores nothing, so it gets no schema and no env vars.
  // SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix - it must stay
  // server-side) is what lets the webhook route write through the table's
  // row-level security. The two public keys cover the blog pages' reads.
  let envResults = [];
  if (mode !== 'ui-only') {
    results.push(writeSqlFile(sqlFilePlan(cwd), cwd));
    const envKeys =
      mode === 'full'
        ? [
            'VELLUMUP_WEBHOOK_SECRET',
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
          ]
        : ['VELLUMUP_WEBHOOK_SECRET'];
    envResults = ensureEnvVars(cwd, envKeys);
  }
  spinner.stop('Files written');

  p.note(
    [
      ...results.map((r) => `${actionIcon(r.action)} ${r.relPath}`),
      ...envResults.map((r) =>
        r.action === 'added'
          ? `${pc.green('+')} .env.local  ${r.key}=`
          : `${pc.dim('=')} .env.local  ${r.key} (already set, untouched)`,
      ),
    ].join('\n'),
    'Result',
  );

  if (!detection.typescript) {
    p.note(
      'Your project is JavaScript - we still wrote TypeScript files.\n' +
        'Next.js configures TypeScript automatically on your next dev/build\n' +
        '(it may ask to install "typescript" and "@types/react" - say yes).',
      'TypeScript',
    );
  }
  if (detection.nextMajor !== null && detection.nextMajor < 15) {
    p.note(
      `Detected Next.js ${detection.nextMajor}. The generated pages type params as a\n` +
        'Promise (the Next 15 convention). They run fine on 14, but if next build\n' +
        'complains about the params type, remove the "await" and Promise wrapper.',
      'Next.js version',
    );
  }
  // The generated route and lib/blog-data.ts import @supabase/supabase-js.
  // It is not installed automatically because Supabase is the default
  // wiring, not a requirement - so say plainly what to do either way.
  if (mode === 'full' && !detection.hasSupabaseClient) {
    p.note(
      'The generated route and blog data file are written against Supabase, which\n' +
        `is not installed here yet. Either add it:\n` +
        `  ${pc.cyan(installCommand(detection.packageManager, ['@supabase/supabase-js']))}\n` +
        'or, if you use a different database, replace the Supabase calls with\n' +
        'your own: upsertArticle()/markArticleDraft() in the route, and the\n' +
        'three functions in lib/blog-data.ts. Each file marks the spot.',
      'Database client',
    );
  }
  // Detected i18n but lib/blog-data.ts filters by one fixed language code -
  // each injected filter line carries a comment marking exactly where to
  // make it dynamic (e.g. keyed off a [locale] route segment).
  if (mode === 'full' && detection.i18n) {
    p.note(
      'Your project looks multi-language, but the blog filters articles\n' +
        `by a single fixed language ('${lang}'). Want articles in every language?\n` +
        "Swap that filter for your locale - lib/blog-data.ts marks each line\n" +
        '("swap \'' + lang + '\' for your locale param").',
      'Multiple languages',
    );
  }

  // ── Dependencies ─────────────────────────────────────────────────────────
  // Both blog modes render Markdown, so both need the same two packages.
  const needsBlogDeps = mode === 'full' || mode === 'ui-only';
  let installFailedCommand;
  if (needsBlogDeps && detection.missingDeps.length > 0 && !options.noInstall) {
    const command = installCommand(detection.packageManager, detection.missingDeps);
    const shouldInstall = options.yes
      ? true
      : guard(
          await p.confirm({
            message: `Install ${detection.missingDeps.join(', ')} with ${detection.packageManager}?`,
            initialValue: true,
          }),
        );

    if (shouldInstall) {
      spinner.start(`Installing with ${detection.packageManager}...`);
      const install = await runInstall(detection.packageManager, detection.missingDeps, cwd);
      if (install.ok) {
        spinner.stop('Dependencies installed');
      } else {
        spinner.stop(pc.yellow('Install failed - continuing anyway'));
        installFailedCommand = install.command;
      }
    } else {
      installFailedCommand = command;
    }
  } else if (needsBlogDeps && detection.missingDeps.length > 0) {
    installFailedCommand = installCommand(detection.packageManager, detection.missingDeps);
  }

  // ── Next steps ───────────────────────────────────────────────────────────
  const routePath = '/api/vellumup';
  console.log(`\n${pc.bold('Next steps')}\n`);
  console.log(
    renderNextSteps({
      mode,
      installFailedCommand,
      routePath,
      hasSupabaseClient: detection.hasSupabaseClient,
    }),
  );
  console.log();
  const outro = {
    full: 'Your VellumUp blog is scaffolded. Happy publishing!',
    'ui-only': 'Your blog is scaffolded with sample posts.',
    'route-only': 'Your VellumUp webhook route is ready.',
  };
  p.outro(pc.green(outro[mode]));
}

/** Shared cancel guard - Ctrl-C at any prompt exits cleanly, nothing half-written. */
function guard(value) {
  if (p.isCancel(value)) {
    p.cancel('Nothing was written.');
    process.exit(0);
  }
  return value;
}

function summarizeDetection(d) {
  const parts = [
    d.nextMajor ? `Next.js ${d.nextMajor}` : 'Next.js',
    d.router === 'app' ? 'App Router' : 'Pages Router',
    d.srcDir ? 'src/ directory' : null,
    d.typescript ? 'TypeScript' : 'JavaScript',
    d.i18n ? 'i18n' : null,
    d.packageManager,
  ];
  return parts.filter(Boolean).join(' · ');
}

function actionIcon(action) {
  if (action === 'created') return pc.green('+');
  if (action === 'overwritten') return pc.yellow('~');
  return pc.dim('>');
}
