import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    exclude: ['**/*.alignment.spec.ts', '**/*.smoke.spec.ts', 'node_modules/**'],
  },
  server: {
    port: 17001,
    host: true,
    allowedHosts: ['.desktop.codeperf.net'],
    proxy: {
      '/api': 'http://localhost:17002',
      '/ws': { target: 'ws://localhost:17002', ws: true },
    },
  },
  build: {
    outDir: '../Horarium.Api/wwwroot',
    emptyOutDir: true,
  },
});
