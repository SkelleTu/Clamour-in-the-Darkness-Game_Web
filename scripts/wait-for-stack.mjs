const US_URL = 'http://127.0.0.1:8080/api/healthz';
const CLAMOUR_URL = 'http://127.0.0.1:5173/';
const US_TIMEOUT_MS = 180_000;
const CLAMOUR_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 1000;

async function waitForHttp(url, timeoutMs, label, requireOk = true) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!requireOk || response.ok) {
        console.log(`[wait-for-stack] ${label} ONLINE.`);
        return true;
      }
    } catch {
      // still booting
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  console.error(`[wait-for-stack] [ERROR] ${label} nao ficou online em ${timeoutMs / 1000} segundos.`);
  return false;
}

(async () => {
  console.log('[wait-for-stack] Aguardando Universal Server...');
  const usReady = await waitForHttp(US_URL, US_TIMEOUT_MS, 'Universal Server', true);
  if (!usReady) {
    process.exitCode = 1;
    process.exit(1);
  }

  console.log('[wait-for-stack] Aguardando Clamour...');
  const clamourReady = await waitForHttp(CLAMOUR_URL, CLAMOUR_TIMEOUT_MS, 'Clamour', false);
  if (!clamourReady) {
    process.exitCode = 1;
    process.exit(1);
  }

  console.log('[wait-for-stack] TUDO PRONTO!');
  process.exit(0);
})();
