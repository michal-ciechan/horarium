import type { Meta, StoryObj } from '@storybook/react';
import { DependencyArrows } from './DependencyArrows';
import { getSlices } from '../utils/slices';
import type { Plan } from '../types/plan';

const meta: Meta<typeof DependencyArrows> = {
  title: 'Components/DependencyArrows',
  component: DependencyArrows,
};

export default meta;
type Story = StoryObj<typeof DependencyArrows>;

const LANE_COL_WIDTH = 160;
const SLICE_COL_WIDTH = 120;
const ROW_HEIGHT = 72;

// Two stages in the same lane — dependency within a row
const sameLanePlan: Plan = {
  title: 'Same Lane Plan',
  description: null,
  start: '2025-Q1',
  end: '2025-Q3',
  timeslice: 'Quarter',
  lanes: [
    { id: 'eng', label: 'Engineering', color: '#cce5ff', description: null },
  ],
  stages: [
    { id: 'a', title: 'Stage A', laneId: 'eng', start: '2025-Q1', end: '2025-Q1', dependsOn: [], enables: ['b'], description: null },
    { id: 'b', title: 'Stage B', laneId: 'eng', start: '2025-Q3', end: '2025-Q3', dependsOn: ['a'], enables: [], description: null },
  ],
  errors: [],
};

// Two stages in different lanes — cross-lane arrow
const crossLanePlan: Plan = {
  title: 'Cross Lane Plan',
  description: null,
  start: '2025-Q1',
  end: '2025-Q3',
  timeslice: 'Quarter',
  lanes: [
    { id: 'frontend', label: 'Frontend', color: '#d4edda', description: null },
    { id: 'backend', label: 'Backend', color: '#cce5ff', description: null },
  ],
  stages: [
    { id: 'api', title: 'API', laneId: 'backend', start: '2025-Q1', end: '2025-Q1', dependsOn: [], enables: ['ui'], description: null },
    { id: 'ui', title: 'UI', laneId: 'frontend', start: '2025-Q3', end: '2025-Q3', dependsOn: ['api'], enables: [], description: null },
  ],
  errors: [],
};

// Three stages chained A→B→C
const chainPlan: Plan = {
  title: 'Chain Plan',
  description: null,
  start: '2025-Q1',
  end: '2025-Q4',
  timeslice: 'Quarter',
  lanes: [
    { id: 'eng', label: 'Engineering', color: '#cce5ff', description: null },
    { id: 'ops', label: 'Ops', color: '#f8d7da', description: null },
  ],
  stages: [
    { id: 'a', title: 'Scaffold', laneId: 'eng', start: '2025-Q1', end: '2025-Q1', dependsOn: [], enables: ['b'], description: null },
    { id: 'b', title: 'Implement', laneId: 'ops', start: '2025-Q2', end: '2025-Q2', dependsOn: ['a'], enables: ['c'], description: null },
    { id: 'c', title: 'Deploy', laneId: 'eng', start: '2025-Q4', end: '2025-Q4', dependsOn: ['b'], enables: [], description: null },
  ],
  errors: [],
};

function ArrowStory({ plan }: { plan: Plan }) {
  const slices = getSlices(plan.start, plan.end, plan.timeslice);
  const totalWidth = LANE_COL_WIDTH + slices.length * SLICE_COL_WIDTH;
  const totalHeight = 44 + plan.lanes.length * ROW_HEIGHT;

  return (
    <div style={{ height: '100vh', padding: 24, background: '#f8f8f8' }}>
      <div style={{ position: 'relative', width: totalWidth, height: totalHeight, background: '#fff', border: '1px solid #d9d9d9', borderRadius: 8 }}>
        <DependencyArrows
          plan={plan}
          slices={slices}
          laneColWidth={LANE_COL_WIDTH}
          sliceColWidth={SLICE_COL_WIDTH}
          rowHeight={ROW_HEIGHT}
        />
      </div>
    </div>
  );
}

export const SameLane: Story = {
  render: () => <ArrowStory plan={sameLanePlan} />,
};

export const CrossLane: Story = {
  render: () => <ArrowStory plan={crossLanePlan} />,
};

export const Chain: Story = {
  render: () => <ArrowStory plan={chainPlan} />,
};
