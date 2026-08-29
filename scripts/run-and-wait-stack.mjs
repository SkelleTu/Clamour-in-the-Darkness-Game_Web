import { spawn } from 'node:child_process';

const stackScript = new URL('start-stack.mjs', import.meta.url).pathname;

const child = spawn(process.execPath, [stackScript], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

function shutdown(signal) {
  if (!child.killed) child.kill(signal);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

child.once('exit', (code) => {
  if (code && code !== 0) process.exitCode = code;
  shutdown('SIGTERM');
});
