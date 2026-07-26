import { spawn } from 'node:child_process';

/** The exact command string per package manager, also shown to the user on failure. */
export function installCommand(packageManager, deps) {
  const joined = deps.join(' ');
  switch (packageManager) {
    case 'pnpm':
      return `pnpm add ${joined}`;
    case 'yarn':
      return `yarn add ${joined}`;
    case 'bun':
      return `bun add ${joined}`;
    default:
      return `npm install ${joined}`;
  }
}

/**
 * Run the install. Resolves { ok, command } - never rejects and never crashes
 * the CLI: a failed install just downgrades to a manual step in the outro.
 * Output is captured (not inherited) so the clack spinner stays intact.
 */
export function runInstall(packageManager, deps, cwd) {
  const command = installCommand(packageManager, deps);
  // On Windows the package-manager shims are .cmd files, which need a shell.
  // When shell mode is on, pass the whole command string (args arrays are
  // only concatenated there anyway and trigger DEP0190); package names come
  // from our own constant list, never from user input, so this is safe.
  const useShell = process.platform === 'win32';
  const [bin, ...args] = command.split(' ');

  return new Promise((resolve) => {
    const child = useShell
      ? spawn(command, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
      : spawn(bin, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', () => resolve({ ok: false, command, stderr }));
    child.on('close', (code) => resolve({ ok: code === 0, command, stderr }));
  });
}
