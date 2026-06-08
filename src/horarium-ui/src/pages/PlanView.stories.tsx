import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanViewContent } from './PlanView';
import type { ParseResult } from '../types/plan';

const meta: Meta<typeof PlanViewContent> = {
  title: 'Pages/PlanView',
  component: PlanViewContent,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
};

export default meta;
type Story = StoryObj<typeof PlanViewContent>;

const validResult: ParseResult = {
  status: 'Success',
  rawContent: null,
  plan: {
    title: 'Product Roadmap 2025',
    description: 'High-level engineering and product milestones for FY2025.',
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
        start: '2025-Q2',
        end: '2025-Q2',
        dependsOn: ['auth'],
        enables: ['dashboard'],
        dependencyAt: { auth: '2025-Q1' },
        description: null,
      },
      {
        id: 'dashboard',
        title: 'Dashboard',
        laneId: 'frontend',
        start: '2025-Q3',
        end: '2025-Q4',
        dependsOn: ['ui-auth'],
        enables: [],
        description: 'Main product dashboard with analytics.',
      },
    ],
    errors: [],
  },
};

const partialResult: ParseResult = {
  status: 'Partial',
  rawContent: null,
  plan: {
    title: 'Ops Plan Q2',
    description: null,
    start: '2025-Q1',
    end: '2025-Q2',
    timeslice: 'Quarter',
    lanes: [
      { id: 'ops', label: 'Ops', color: '#f8d7da', description: null },
    ],
    stages: [
      {
        id: 'deploy',
        title: 'Deploy pipeline',
        laneId: 'ops',
        start: '2025-Q1',
        end: '2025-Q1',
        dependsOn: [],
        enables: [],
        description: null,
      },
    ],
    errors: [
      { field: 'stages[1].laneId', message: 'Unknown lane "infra"' },
      { field: 'lanes[0].color', message: 'Expected a valid CSS colour, got "redd"' },
    ],
  },
};

const unrecognisableResult: ParseResult = {
  status: 'Unrecognisable',
  rawContent: `# Random Markdown File

This file does not follow the horarium plan format.

- Item one
- Item two
- Item three

Some paragraph text that doesn't match any known frontmatter schema.`,
  plan: null,
};

export const ValidPlan: Story = {
  args: { result: validResult },
  render: (args) => (
    <div style={{ height: '100vh' }}>
      <PlanViewContent {...args} />
    </div>
  ),
};

export const WithErrors: Story = {
  args: { result: partialResult },
  render: (args) => (
    <div style={{ height: '100vh' }}>
      <PlanViewContent {...args} />
    </div>
  ),
};

export const Unrecognisable: Story = {
  args: { result: unrecognisableResult },
  render: (args) => (
    <div style={{ height: '100vh' }}>
      <PlanViewContent {...args} />
    </div>
  ),
};
