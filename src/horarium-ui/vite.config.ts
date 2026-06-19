import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Workaround for @vitejs/plugin-react 6.0.2 + Vite 8.0.x: the plugin rewrites
// component modules to call $RefreshSig$/$RefreshReg$ but its transformIndexHtml
// hook fails to inject the React Fast Refresh preamble that defines them, so the
// first component import throws "$RefreshSig$ is not defined" and the app renders
// a blank page. Inject the preamble ourselves in dev only (the production build
// doesn't use Fast Refresh, so apply: 'serve' keeps it out of `vite build`).
const reactRefreshPreamble: Plugin = {
  name: 'react-refresh-preamble-fallback',
  apply: 'serve',
  transformIndexHtml() {
    return [
      {
        tag: 'script',
        injectTo: 'head-prepend',
        attrs: { type: 'module' },
        children: [
          'import RefreshRuntime from "/@react-refresh"',
          'RefreshRuntime.injectIntoGlobalHook(window)',
          'window.$RefreshReg$ = () => {}',
          'window.$RefreshSig$ = () => (type) => type',
          'window.__vite_plugin_react_preamble_installed__ = true',
        ].join('\n'),
      },
    ];
  },
};

export default defineConfig({
  plugins: [react(), reactRefreshPreamble],
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
