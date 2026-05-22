import type { Meta, StoryObj } from '@storybook/react';
import { ErrorBanner } from './ErrorBanner';

const meta: Meta<typeof ErrorBanner> = {
  title: 'Components/ErrorBanner',
  component: ErrorBanner,
};

export default meta;
type Story = StoryObj<typeof ErrorBanner>;

export const SingleError: Story = {
  args: {
    errors: [{ field: 'lanes[0].color', message: 'Invalid hex colour value' }],
  },
  render: (args) => (
    <div style={{ height: '100vh', padding: 24 }}>
      <ErrorBanner {...args} />
    </div>
  ),
};

export const MultipleErrors: Story = {
  args: {
    errors: [
      { field: 'stages[0].start', message: 'Date must be within plan range' },
      { field: 'stages[1].laneId', message: 'Unknown lane "infra"' },
      { field: 'lanes[2].color', message: 'Expected a valid CSS colour' },
    ],
  },
  render: (args) => (
    <div style={{ height: '100vh', padding: 24 }}>
      <ErrorBanner {...args} />
    </div>
  ),
};

export const NoErrors: Story = {
  args: {
    errors: [],
  },
  render: (args) => (
    <div style={{ height: '100vh', padding: 24 }}>
      <ErrorBanner {...args} />
      <p style={{ color: '#666', fontSize: 14 }}>(Nothing rendered — empty errors array)</p>
    </div>
  ),
};
