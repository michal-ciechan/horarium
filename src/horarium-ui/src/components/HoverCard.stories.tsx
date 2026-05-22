import type { Meta, StoryObj } from '@storybook/react';
import { HoverCard } from './HoverCard';
import type { Lane, Stage } from '../types/plan';

const meta: Meta<typeof HoverCard> = {
  title: 'Components/HoverCard',
  component: HoverCard,
};

export default meta;
type Story = StoryObj<typeof HoverCard>;

const lanes: Lane[] = [
  { id: 'frontend', label: 'Frontend', color: '#d4edda', description: null },
  { id: 'backend', label: 'Backend', color: '#cce5ff', description: null },
];

const fullStage: Stage = {
  id: 'stage-1',
  title: 'Build auth service',
  laneId: 'backend',
  start: '2025-Q1',
  end: '2025-Q2',
  dependsOn: ['stage-0'],
  enables: ['stage-2', 'stage-3'],
  description: 'Implement JWT-based authentication with refresh tokens.',
};

const descOnlyStage: Stage = {
  id: 'stage-2',
  title: 'Design system setup',
  laneId: 'frontend',
  start: '2025-Q1',
  end: '2025-Q1',
  dependsOn: [],
  enables: [],
  description: 'Establish component library, tokens, and Figma handoff process.',
};

const minimalStage: Stage = {
  id: 'stage-3',
  title: 'CI pipeline',
  laneId: 'backend',
  start: '2025-Q2',
  end: '2025-Q2',
  dependsOn: [],
  enables: [],
  description: null,
};

export const WithDependencies: Story = {
  args: {
    stage: fullStage,
    lanes,
  },
  render: (args) => (
    <div style={{ height: '100vh', padding: 40, background: '#f0f0f0' }}>
      <HoverCard {...args} />
    </div>
  ),
};

export const WithoutDependencies: Story = {
  args: {
    stage: descOnlyStage,
    lanes,
  },
  render: (args) => (
    <div style={{ height: '100vh', padding: 40, background: '#f0f0f0' }}>
      <HoverCard {...args} />
    </div>
  ),
};

export const MinimalStage: Story = {
  args: {
    stage: minimalStage,
    lanes,
  },
  render: (args) => (
    <div style={{ height: '100vh', padding: 40, background: '#f0f0f0' }}>
      <HoverCard {...args} />
    </div>
  ),
};
