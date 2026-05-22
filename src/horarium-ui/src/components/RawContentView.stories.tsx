import type { Meta, StoryObj } from '@storybook/react';
import { RawContentView } from './RawContentView';

const meta: Meta<typeof RawContentView> = {
  title: 'Components/RawContentView',
  component: RawContentView,
};

export default meta;
type Story = StoryObj<typeof RawContentView>;

export const Short: Story = {
  args: {
    content: `# Not a plan
This file doesn't follow the horarium format.
Just some random markdown content.`,
  },
  render: (args) => (
    <div style={{ height: '100vh', padding: 24 }}>
      <RawContentView {...args} />
    </div>
  ),
};

export const Long: Story = {
  args: {
    content: Array.from({ length: 35 }, (_, i) =>
      `Line ${String(i + 1).padStart(2, '0')}: ${
        i % 5 === 0
          ? '# Section heading'
          : i % 3 === 0
          ? '## Subsection'
          : `Some content for line ${i + 1} — lorem ipsum dolor sit amet, consectetur adipiscing elit.`
      }`
    ).join('\n'),
  },
  render: (args) => (
    <div style={{ height: '100vh', padding: 24 }}>
      <RawContentView {...args} />
    </div>
  ),
};
