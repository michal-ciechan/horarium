import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { Gantt } from './Gantt';
import type { Plan } from '../types/plan';

const meta: Meta<typeof Gantt> = {
  title: 'Components/Gantt',
  component: Gantt,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Gantt>;

const portfolioPlan: Plan = {
  title: 'Portfolio Grouping Programme Plan',
  description: 'Programme-level sequencing grouped by delivery stream.',
  start: '2026-Q1',
  end: '2028-Q4',
  timeslice: 'Quarter',
  lanes: [
    { id: 'TBS',    label: 'TBS',     color: '#e8eefc', description: null },
    { id: 'Quartz', label: 'Quartz',  color: '#ece8fc', description: null },
    { id: 'Cash',   label: 'Cash',    color: '#eaf7ef', description: null },
    { id: 'PnL',    label: 'PnL App', color: '#fcefdc', description: null },
    { id: 'Infra',  label: 'Infra',   color: '#fce8e8', description: null },
  ],
  stages: [
    { id: 'tbs-1', laneId: 'TBS',    title: 'Trading Book Service + UI', start: '2026-Q2', end: '2026-Q2', dependsOn: [],              enables: ['tbs-2'],          description: null },
    { id: 'tbs-2', laneId: 'TBS',    title: 'Reader Client + MatFac',    start: '2026-Q3', end: '2026-Q3', dependsOn: ['tbs-1'],       enables: ['tbs-3'],          description: null },
    { id: 'tbs-3', laneId: 'TBS',    title: 'Trade + Position Readers',  start: '2026-Q4', end: '2026-Q4', dependsOn: ['tbs-2'],       enables: ['pnl-2','quartz-3'], description: null },
    { id: 'quartz-1', laneId: 'Quartz', title: 'Event Driven PB Services',  start: '2027-Q1', end: '2027-Q1', dependsOn: [],              enables: ['quartz-2'],       description: null },
    { id: 'quartz-2', laneId: 'Quartz', title: 'Migrate All PB Services',   start: '2027-Q2', end: '2027-Q2', dependsOn: ['quartz-1'],   enables: ['quartz-3'],       description: null },
    { id: 'quartz-3', laneId: 'Quartz', title: 'Rec Engine Pos + Trade',    start: '2027-Q3', end: '2027-Q3', dependsOn: ['quartz-2','tbs-3'], enables: ['quartz-4'],  description: null },
    { id: 'quartz-4', laneId: 'Quartz', title: 'Rec Engine Full',           start: '2027-Q4', end: '2028-Q1', dependsOn: ['quartz-3'],   enables: [],                 description: null },
    { id: 'cash-1', laneId: 'Cash',   title: 'Cash Framework',            start: '2026-Q3', end: '2026-Q3', dependsOn: [],              enables: ['cash-2'],         description: null },
    { id: 'cash-2', laneId: 'Cash',   title: 'Cash Subportfolio',         start: '2026-Q4', end: '2026-Q4', dependsOn: ['cash-1'],     enables: ['cash-3'],         description: null },
    { id: 'cash-3', laneId: 'Cash',   title: 'Cash Reporting',            start: '2027-Q2', end: '2027-Q3', dependsOn: ['cash-2'],     enables: [],                 description: null },
    { id: 'pnl-1',  laneId: 'PnL',   title: 'Pricing Config Service',    start: '2026-Q4', end: '2026-Q4', dependsOn: [],              enables: ['pnl-2'],          description: null },
    { id: 'pnl-2',  laneId: 'PnL',   title: 'PnL App Engine',            start: '2027-Q1', end: '2027-Q2', dependsOn: ['pnl-1','tbs-3'], enables: ['pnl-3'],        description: null },
    { id: 'pnl-3',  laneId: 'PnL',   title: 'PnL UI Integration',        start: '2027-Q3', end: '2027-Q4', dependsOn: ['pnl-2'],       enables: [],                 description: null },
    { id: 'infra-1', laneId: 'Infra', title: 'Cloud Migration',          start: '2026-Q1', end: '2026-Q2', dependsOn: [],              enables: ['infra-2'],        description: null },
    { id: 'infra-2', laneId: 'Infra', title: 'Observability Platform',   start: '2027-Q1', end: '2027-Q2', dependsOn: ['infra-1'],    enables: ['infra-3'],        description: null },
    { id: 'infra-3', laneId: 'Infra', title: 'DR & Hardening',           start: '2028-Q1', end: '2028-Q2', dependsOn: ['infra-2'],    enables: [],                 description: null },
  ],
  errors: [],
};

const simplePlan: Plan = {
  title: 'Simple Two-Lane Plan',
  description: null,
  start: '2025-Q1',
  end: '2025-Q4',
  timeslice: 'Quarter',
  lanes: [
    { id: 'eng',  label: 'Engineering', color: '#e8eefc', description: null },
    { id: 'ops',  label: 'Ops',         color: '#eaf7ef', description: null },
  ],
  stages: [
    { id: 'a', laneId: 'eng', title: 'Phase 1', start: '2025-Q1', end: '2025-Q1', dependsOn: [],    enables: ['b'], description: null },
    { id: 'b', laneId: 'ops', title: 'Phase 2', start: '2025-Q2', end: '2025-Q2', dependsOn: ['a'], enables: ['c'], description: null },
    { id: 'c', laneId: 'eng', title: 'Phase 3', start: '2025-Q4', end: '2025-Q4', dependsOn: ['b'], enables: [],    description: null },
  ],
  errors: [],
};

export const PortfolioPlan: Story = {
  render: () => (
    <div style={{ padding: 24, background: '#f8f8f8', minHeight: '100vh' }}>
      <Gantt plan={portfolioPlan} />
    </div>
  ),
};

export const PortfolioPlanWithDebug: Story = {
  render: () => (
    <div style={{ padding: 24, background: '#f8f8f8', minHeight: '100vh' }}>
      <Gantt plan={portfolioPlan} />
    </div>
  ),
  parameters: {
    // Simulates ?debug query param — RoutingGridDebug needs useSearchParams so
    // add ?debug to the Storybook URL manually to activate it.
  },
};

export const SimplePlan: Story = {
  render: () => (
    <div style={{ padding: 24, background: '#f8f8f8', minHeight: '100vh' }}>
      <Gantt plan={simplePlan} />
    </div>
  ),
};
