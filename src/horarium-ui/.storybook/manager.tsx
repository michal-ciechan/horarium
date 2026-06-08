import React from 'react';
import { addons, types } from 'storybook/manager-api';

addons.register('horarium-app-link', () => {
  addons.add('horarium-app-link/tool', {
    type: types.TOOL,
    title: 'Open App',
    render: () => (
      <a
        href="http://localhost:17001"
        target="_blank"
        rel="noreferrer"
        style={{
          padding: '0 10px',
          fontSize: '12px',
          fontWeight: 600,
          textDecoration: 'none',
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          opacity: 0.7,
        }}
        title="Open Horarium app"
      >
        ← App
      </a>
    ),
  });
});
