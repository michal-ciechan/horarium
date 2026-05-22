import type { Meta, StoryObj } from '@storybook/react';
import { FileTree } from './FileTree';
import type { FileTreeNode } from '../types/plan';

const meta: Meta<typeof FileTree> = {
  title: 'Components/FileTree',
  component: FileTree,
  args: {
    onSelect: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof FileTree>;

const planNodes: FileTreeNode[] = [
  { name: 'alpha.md', path: '/plans/alpha.md', kind: 'Plan', children: [] },
  { name: 'beta.md', path: '/plans/beta.md', kind: 'Plan', children: [] },
  { name: 'gamma.md', path: '/plans/gamma.md', kind: 'Plan', children: [] },
];

export const Empty: Story = {
  args: {
    nodes: [],
    selectedPath: null,
  },
  render: (args) => (
    <div style={{ height: '100vh', background: '#f8f8f8', width: 240 }}>
      <FileTree {...args} />
    </div>
  ),
};

export const FlatList: Story = {
  args: {
    nodes: planNodes,
    selectedPath: null,
  },
  render: (args) => (
    <div style={{ height: '100vh', background: '#f8f8f8', width: 240 }}>
      <FileTree {...args} />
    </div>
  ),
};

export const WithSelected: Story = {
  args: {
    nodes: planNodes,
    selectedPath: '/plans/beta.md',
  },
  render: (args) => (
    <div style={{ height: '100vh', background: '#f8f8f8', width: 240 }}>
      <FileTree {...args} />
    </div>
  ),
};

export const WithErrors: Story = {
  args: {
    nodes: [
      { name: 'good.md', path: '/plans/good.md', kind: 'Plan', children: [] },
      { name: 'partial.md', path: '/plans/partial.md', kind: 'PartialPlan', children: [] },
      { name: 'weird.txt', path: '/plans/weird.txt', kind: 'Unrecognised', children: [] },
    ],
    selectedPath: null,
  },
  render: (args) => (
    <div style={{ height: '100vh', background: '#f8f8f8', width: 240 }}>
      <FileTree {...args} />
    </div>
  ),
};

export const Nested: Story = {
  args: {
    nodes: [
      {
        name: 'q1',
        path: '/plans/q1',
        kind: 'Directory',
        children: [
          { name: 'roadmap.md', path: '/plans/q1/roadmap.md', kind: 'Plan', children: [] },
          { name: 'ops.md', path: '/plans/q1/ops.md', kind: 'PartialPlan', children: [] },
        ],
      },
      { name: 'unknown.xml', path: '/plans/unknown.xml', kind: 'Unrecognised', children: [] },
    ],
    selectedPath: null,
  },
  render: (args) => (
    <div style={{ height: '100vh', background: '#f8f8f8', width: 240 }}>
      <FileTree {...args} />
    </div>
  ),
};
