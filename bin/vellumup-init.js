#!/usr/bin/env node

// Thin bin shim: keep this file free of logic so everything interesting is
// importable (and therefore testable) from src/.
import { run } from '../src/index.js';

run(process.argv.slice(2)).catch((err) => {
  // Last-resort handler for genuinely unexpected failures. Expected flows
  // (cancel, invalid project, declined install) exit cleanly inside run().
  console.error('\nvellumup-init crashed unexpectedly:\n');
  console.error(err?.stack ?? err);
  console.error('\nPlease report this at https://github.com/1paz1/vellumup-init/issues');
  process.exit(1);
});
