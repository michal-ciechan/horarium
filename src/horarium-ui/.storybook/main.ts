import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],

  framework: { name: '@storybook/react-vite', options: {} },

  // Allow the Caddy-fronted public host (storybook.horarium.desktop.codeperf.net);
  // Storybook's own dev server validates the Host header and returns 403 "Invalid
  // host" otherwise. This is core.allowedHosts (Storybook's check), NOT Vite's
  // server.allowedHosts — Vite runs in middleware mode here so that wouldn't apply.
  // Leading-dot matches any subdomain.
  core: { allowedHosts: ['.desktop.codeperf.net'] },
};

export default config;
