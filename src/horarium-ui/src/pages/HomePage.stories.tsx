import type { Meta, StoryObj } from '@storybook/react';
import { HomePageContent } from './HomePage';
import type { FileTreeNode, ParseResult } from '../types/plan';

const meta: Meta<typeof HomePageContent> = {
  title: 'Pages/HomePage',
  component: HomePageContent,
};

export default meta;
type Story = StoryObj<typeof HomePageContent>;

const populatedTree: FileTreeNode[] = [
  { name: 'roadmap.md', path: '/plans/roadmap.md', kind: 'Plan', children: [] },
  { name: 'ops.md', path: '/plans/ops.md', kind: 'PartialPlan', children: [] },
  {
    name: 'archive',
    path: '/plans/archive',
    kind: 'Directory',
    children: [
      { name: '2024-plan.md', path: '/plans/archive/2024-plan.md', kind: 'Plan', children: [] },
    ],
  },
  { name: 'notes.txt', path: '/plans/notes.txt', kind: 'Unrecognised', children: [] },
];

const roadmapPlanResult: ParseResult = {
  status: 'Success',
  rawContent: null,
  plan: {
    title: 'Product Roadmap 2025',
    description: 'Engineering and product milestones for FY2025.',
    start: '2025-Q1',
    end: '2025-Q4',
    timeslice: 'Quarter',
    lanes: [
      { id: 'frontend', label: 'Frontend', color: '#d4edda', description: null },
      { id: 'backend', label: 'Backend', color: '#cce5ff', description: null },
    ],
    stages: [
      {
        id: 'auth',
        title: 'Auth service',
        laneId: 'backend',
        start: '2025-Q1',
        end: '2025-Q2',
        dependsOn: [],
        enables: ['ui-auth'],
        description: 'JWT-based auth with refresh tokens.',
      },
      {
        id: 'ui-auth',
        title: 'Login UI',
        laneId: 'frontend',
        start: '2025-Q3',
        end: '2025-Q4',
        dependsOn: ['auth'],
        enables: [],
        description: null,
      },
    ],
    errors: [],
  },
};

const planResults: Record<string, ParseResult> = {
  '/plans/roadmap.md': roadmapPlanResult,
  '/plans/ops.md': {
    status: 'Partial',
    rawContent: null,
    plan: {
      title: 'Ops Plan',
      description: null,
      start: '2025-Q1',
      end: '2025-Q2',
      timeslice: 'Quarter',
      lanes: [{ id: 'ops', label: 'Ops', color: '#f8d7da', description: null }],
      stages: [
        {
          id: 's1',
          title: 'Infra setup',
          laneId: 'ops',
          start: '2025-Q1',
          end: '2025-Q1',
          dependsOn: [],
          enables: [],
          description: null,
        },
      ],
      errors: [{ field: 'lanes[0].color', message: 'Invalid colour "redd"' }],
    },
  },
  '/plans/archive/2024-plan.md': {
    status: 'Success',
    rawContent: null,
    plan: {
      title: '2024 Annual Plan',
      description: null,
      start: '2024-Q1',
      end: '2024-Q4',
      timeslice: 'Quarter',
      lanes: [{ id: 'eng', label: 'Engineering', color: '#fff3cd', description: null }],
      stages: [
        {
          id: 'legacy',
          title: 'Legacy migration',
          laneId: 'eng',
          start: '2024-Q1',
          end: '2024-Q3',
          dependsOn: [],
          enables: [],
          description: null,
        },
      ],
      errors: [],
    },
  },
  '/plans/notes.txt': {
    status: 'Unrecognisable',
    rawContent: 'Just some notes.\nNot a plan file.',
    plan: null,
  },
};

export const Empty: Story = {
  args: {
    tree: [],
    loading: false,
    initialSelectedPath: null,
    getPlanResult: undefined,
  },
  render: (args) => (
    <div style={{ height: '100vh' }}>
      <HomePageContent {...args} />
    </div>
  ),
};

export const Populated: Story = {
  args: {
    tree: populatedTree,
    loading: false,
    initialSelectedPath: null,
    getPlanResult: (path) => planResults[path] ?? null,
  },
  render: (args) => (
    <div style={{ height: '100vh' }}>
      <HomePageContent {...args} />
    </div>
  ),
};

export const WithPlanSelected: Story = {
  args: {
    tree: populatedTree,
    loading: false,
    initialSelectedPath: '/plans/roadmap.md',
    getPlanResult: (path) => planResults[path] ?? null,
  },
  render: (args) => (
    <div style={{ height: '100vh' }}>
      <HomePageContent {...args} />
    </div>
  ),
};
