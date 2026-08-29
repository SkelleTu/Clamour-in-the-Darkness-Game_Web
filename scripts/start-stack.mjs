import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const usDir = join(root, 'universal-server');
const usEnvPath = join(usDir, '.env');
const isWindows = process.platform === 'win32';
const pnpm = isWindows ? 'pnpm.cmd' : 'pnpm';

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;

  const text = readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

if (!existsSync(usDir)) {
  console.error('[Clamour] Embedded Universal Server is missing. Sync the repository before running the stack.');
  process.exit(1);
}

loadDotEnv(usEnvPath);

if (!process.env.DASHBOARD_PASSWORD?.trim()) {
  console.error('[Clamour] DASHBOARD_PASSWORD is required for the integrated Universal Server dashboard.');
  console.error(`[Clamour] Expected environment file: ${usEnvPath}`);
  process.exit(1);
}

const usEnv = {
  PORT: '8080',
  NODE_ENV: 'production',
  CORS_ORIGINS: '',
  GAME_VERSION: process.env.GAME_VERSION ?? '0.1.0',
  SERVER_VERSION: process.env.SERVER_VERSION ?? '1.0.0',
  SERVER_EXPIRATION_AT: process.env.SERVER_EXPIRATION_AT ?? '2026-09-19T00:00:00-03:00',
  BACKUP_GITHUB_REPO: process.env.BACKUP_GITHUB_REPO ?? 'SkelleTu/universal-server-backups',
};

function run(command, args, extraEnv = {}) {
  return spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
    shell: isWindows,
  });
}

async function runAndWait(command, args, extraEnv = {}) {
  const child = run(command, args, extraEnv);
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? 'unknown'}${signal ? ` (${signal})` : ''}`));
    });
  });
}

async function waitForHttp(url, timeoutMs = 120_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          ...(process.env.VITE_UNIVERSAL_SERVER_API_KEY
            ? { 'x-api-key': process.env.VITE_UNIVERSAL_SERVER_API_KEY }
            : {}),
        },
      });
      if (response.ok || response.status === 401 || response.status === 403) return;
    } catch {
      // The server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Universal Server did not become reachable at ${url} within ${timeoutMs}ms`);
}

console.log('[Clamour] Installing embedded Universal Server dependencies...');
await runAndWait(pnpm, ['--dir', 'universal-server', 'install']);

console.log('[Clamour] Building embedded Universal Server dashboard...');
await runAndWait(pnpm, ['--dir', 'universal-server', '--filter', '@workspace/dashboard', 'run', 'build'], {
  PORT: '3000',
  BASE_PATH: '/us/',
  NODE_ENV: 'production',
});

console.log('[Clamour] Building embedded Universal Server API...');
await runAndWait(pnpm, ['--dir', 'universal-server', '--filter', '@workspace/api-server', 'run', 'build'], usEnv);

console.log('[Clamour] Starting Universal Server on internal port 8080...');
const universalServer = run(pnpm, ['--dir', 'universal-server', 'start'], usEnv);

try {
  await waitForHttp('http://127.0.0.1:8080/api/healthz');
} catch (error) {
  universalServer.kill('SIGTERM');
  throw error;
}

console.log('[Clamour] Universal Server is ready. Starting Clamour web app...');
const clamour = run(pnpm, ['run', 'dev:clamour'], {
  PORT: process.env.PORT ?? '5173',
  UNIVERSAL_SERVER_INTERNAL_URL: 'http://127.0.0.1:8080',
});

function shutdown(signal) {
  for (const child of [clamour, universalServer]) {
    if (!child.killed) child.kill(signal);
  }
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

clamour.once('exit', (code) => {
  if (code && code !== 0) process.exitCode = code;
  shutdown('SIGTERM');
});

universalServer.once('exit', (code) => {
  if (code && code !== 0) process.exitCode = code;
  shutdown('SIGTERM');
});
