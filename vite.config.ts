import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const universalServerTarget = process.env.UNIVERSAL_SERVER_INTERNAL_URL ?? 'http://127.0.0.1:8080';

const universalServerProxy = {
  '/us/api/game/status': {
    target: universalServerTarget,
    changeOrigin: true,
    rewrite: () => '/healthz',
  },
  '/us': {
    target: universalServerTarget,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/us/, '') || '/',
  },
  '/api': {
    target: universalServerTarget,
    changeOrigin: true,
  },
  '/assets': {
    target: universalServerTarget,
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 5173),
    strictPort: true,
    proxy: universalServerProxy,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 5173),
    proxy: universalServerProxy,
  },
});
