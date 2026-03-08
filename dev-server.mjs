/**
 * Dev server launcher — spawns Vite with the correct CWD so PostCSS/Tailwind
 * resolve configs relative to the project root, not the caller's directory.
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const viteScript = projectRoot + '/node_modules/.bin/vite';

const child = spawn(process.execPath, [viteScript, '--port', '5173'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env },
});

child.on('exit', (code) => process.exit(code ?? 0));
