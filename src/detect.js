import fs from 'node:fs';
import path from 'node:path';

// Only the packages every full-blog user needs regardless of their database.
// @supabase/supabase-js is deliberately NOT here: the generated code is
// wired for Supabase by default, but Supabase itself is optional - users on
// another database swap the data-access functions instead, so forcing the
// client on everyone would be wrong. Supabase users are told to install it
// in the next-steps outro (see steps.js).
const BLOG_DEPENDENCIES = ['react-markdown', 'remark-gfm'];

/**
 * Inspect the target project once, up front. Every downstream decision
 * (prompts shown, file paths, import style, install command) keys off the
 * object this returns - no other module touches the filesystem to "ask
 * questions" about the project.
 *
 * @param {string} cwd absolute path of the project being scaffolded
 * @returns {{
 *   isNext: boolean,
 *   nextMajor: number | null,
 *   router: 'app' | 'pages' | null,
 *   srcDir: boolean,
 *   baseDir: string,
 *   typescript: boolean,
 *   aliasOk: boolean,
 *   i18n: boolean,
 *   packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun',
 *   missingDeps: string[],
 *   hasSupabaseClient: boolean,
 * }}
 */
export function detectProject(cwd) {
  const pkg = readJsonSafe(path.join(cwd, 'package.json'));
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };

  const isNext = Boolean(pkg && deps.next);
  const nextMajor = isNext ? parseMajor(deps.next) : null;

  // Router + src/ convention. App Router wins when both exist - it is the
  // Next.js default and the only router our blog pages support.
  const hasDir = (...segments) => fs.existsSync(path.join(cwd, ...segments));
  const srcApp = hasDir('src', 'app');
  const srcPages = hasDir('src', 'pages');
  const rootApp = hasDir('app');
  const rootPages = hasDir('pages');

  let router = null;
  let srcDir = false;
  if (rootApp || srcApp) {
    router = 'app';
    srcDir = !rootApp && srcApp;
  } else if (rootPages || srcPages) {
    router = 'pages';
    srcDir = !rootPages && srcPages;
  }
  const baseDir = srcDir ? path.join(cwd, 'src') : cwd;

  const typescript = fs.existsSync(path.join(cwd, 'tsconfig.json'));

  return {
    isNext,
    nextMajor,
    router,
    srcDir,
    baseDir,
    typescript,
    aliasOk: detectAlias(cwd, srcDir),
    i18n: detectI18n(cwd, baseDir, deps),
    packageManager: detectPackageManager(cwd),
    missingDeps: BLOG_DEPENDENCIES.filter((dep) => !deps[dep]),
    // Not auto-installed (see BLOG_DEPENDENCIES) - tracked so the run can
    // end by telling the user to either add it or swap the generated
    // Supabase calls for their own database.
    hasSupabaseClient: Boolean(deps['@supabase/supabase-js']),
  };
}

/**
 * True when the project's "@/*" path alias exists AND resolves such that
 * "@/components/X" lands in our components target dir (baseDir/components).
 * Anything ambiguous or unparseable counts as false: the fallback (relative
 * imports) is always correct, merely less pretty, so false negatives are
 * harmless while false positives would produce broken imports.
 */
function detectAlias(cwd, srcDir) {
  const configPath = ['tsconfig.json', 'jsconfig.json']
    .map((name) => path.join(cwd, name))
    .find((candidate) => fs.existsSync(candidate));
  if (!configPath) return false;

  const config = readJsonSafe(configPath, { stripComments: true });
  const aliasTargets = config?.compilerOptions?.paths?.['@/*'];
  if (!Array.isArray(aliasTargets) || aliasTargets.length === 0) return false;

  // "./src/*" when the project uses src/, "./*" otherwise - accept both
  // with or without the leading "./".
  const expected = srcDir ? 'src/*' : '*';
  return aliasTargets.some((target) => target.replace(/^\.\//, '') === expected);
}

/**
 * Presence-only i18n detection - we never try to enumerate the project's
 * locales (next.config can be TS/ESM/a function; evaluating it is not worth
 * the fragility). A hit here only decides whether the language question is
 * asked; the answer itself is free-text.
 */
function detectI18n(cwd, baseDir, deps) {
  if (deps['next-intl'] || deps['next-i18next']) return true;

  const localeDirNames = ['[locale]', '[lang]'];
  const appDir = path.join(baseDir, 'app');
  if (localeDirNames.some((name) => fs.existsSync(path.join(appDir, name)))) {
    return true;
  }

  for (const name of ['next.config.js', 'next.config.mjs', 'next.config.ts']) {
    const configPath = path.join(cwd, name);
    if (!fs.existsSync(configPath)) continue;
    try {
      if (/\bi18n\s*:/.test(fs.readFileSync(configPath, 'utf8'))) return true;
    } catch {
      // Unreadable config - treat as no i18n rather than failing the run.
    }
  }
  return false;
}

/** Lockfile wins; npm is the safe default when none is found. */
function detectPackageManager(cwd) {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (
    fs.existsSync(path.join(cwd, 'bun.lockb')) ||
    fs.existsSync(path.join(cwd, 'bun.lock'))
  ) {
    return 'bun';
  }
  return 'npm';
}

function parseMajor(versionRange) {
  // "^15.2.3", "~14.0.0", "15", "latest" - take the first number we find.
  const match = String(versionRange).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function readJsonSafe(filePath, { stripComments = false } = {}) {
  try {
    let raw = fs.readFileSync(filePath, 'utf8');
    if (stripComments) raw = stripJsonComments(raw);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Remove // and multi-line comments from JSONC (tsconfig-style) without
 * touching string contents. A regex is NOT enough here: tsconfig values like
 * "@/*" and "**\/*.ts" contain comment-looking sequences, and a naive strip
 * would splice the file apart mid-string.
 */
function stripJsonComments(raw) {
  let out = '';
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const pair = raw[i] + (raw[i + 1] ?? '');
    if (inString) {
      out += raw[i];
      if (raw[i] === '\\') {
        // Copy the escaped character verbatim so \" does not end the string.
        out += raw[i + 1] ?? '';
        i += 1;
      } else if (raw[i] === '"') {
        inString = false;
      }
    } else if (raw[i] === '"') {
      inString = true;
      out += raw[i];
    } else if (pair === '//') {
      while (i < raw.length && raw[i] !== '\n') i += 1;
      out += '\n';
    } else if (pair === '/*') {
      i += 2;
      while (i < raw.length && raw[i] + (raw[i + 1] ?? '') !== '*/') i += 1;
      i += 1; // skip the closing "*/" (loop increment covers the second char)
    } else {
      out += raw[i];
    }
  }
  return out;
}
