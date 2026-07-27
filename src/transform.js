import path from 'node:path';

export const LANG_PLACEHOLDER = '__VELLUMUP_LANG_FILTER__';

/**
 * Replace every `// __VELLUMUP_LANG_FILTER__` placeholder line with a real
 * language filter, preserving the line's indentation.
 *
 * The filter is ALWAYS injected (default language "en") - never stripped.
 * Articles are stored one row per (slug, language_code), so an unfiltered
 * query would show duplicate entries the moment the user enables translations
 * in VellumUp. Filtering by the default "en" costs nothing for single-language
 * users (untranslated articles default to language_code "en" in the schema).
 */
export function applyLangFilter(source, langCode) {
  const escaped = langCode.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const placeholderLine = new RegExp(`^([ \\t]*)// ${LANG_PLACEHOLDER}[ \\t]*$`, 'gm');
  return source.replace(
    placeholderLine,
    `$1.eq('language_code', '${escaped}') // multi-language? each translation is stored under its own language_code - swap '${escaped}' for your locale param`,
  );
}

/** Count placeholder lines - used by the write step and tests as a sync guard. */
export function countLangPlaceholders(source) {
  return (source.match(new RegExp(`// ${LANG_PLACEHOLDER}`, 'g')) ?? []).length;
}

/**
 * Rewrite `@/components/X` and `@/lib/X` imports to relative paths when the
 * project has no usable "@/*" alias. Relative imports resolve in every
 * project, so this is the safe fallback; the alias form is kept when
 * available purely because it reads better.
 *
 * @param {string} source        file content to transform
 * @param {string} targetAbsPath absolute path the file will be written to
 * @param {string} componentsAbsDir absolute path of the components directory
 * @param {string} libAbsDir     absolute path of the lib directory
 */
export function rewriteAliasImports(source, targetAbsPath, componentsAbsDir, libAbsDir) {
  function relativeFrom(absDir) {
    let relative = path
      .relative(path.dirname(targetAbsPath), absDir)
      .split(path.sep)
      .join('/');
    if (!relative.startsWith('.')) relative = `./${relative}`;
    return relative;
  }

  let result = source.replaceAll("from '@/components/", `from '${relativeFrom(componentsAbsDir)}/`);
  if (libAbsDir) {
    result = result.replaceAll("from '@/lib/", `from '${relativeFrom(libAbsDir)}/`);
  }
  return result;
}
