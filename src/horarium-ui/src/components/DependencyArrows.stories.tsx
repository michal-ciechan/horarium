import type { Meta, StoryObj } from '@storybook/react';
import { DependencyArrows } from './DependencyArrows';
import { RoutingGridDebug } from './RoutingGridDebug';
import { getSlices } from '../utils/slices';
import { computeLaneCells } from '../utils/ganttLayout';
import type { Plan, Lane, Stage } from '../types/plan';
import {
  LANE_COL_WIDTH,
  SLICE_COL_WIDTH,
  ROW_HEIGHT,
  HEADER_HEIGHT,
  GANTT_GRID,
} from './Gantt';

const meta: Meta = {
  title: 'Components/DependencyArrows',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

// ─── Mini grid renderer ───────────────────────────────────────────────────────
// Renders the same cell/header/stageBlock structure as <Gantt> so arrows land
// exactly where they would in production.

const LINE    = '#d9d9d9';
const CELL_STYLE: React.CSSProperties = {
  position: 'relative',
  padding: 8,
  borderLeft:  `1px solid ${LINE}`,
  borderTop:   `1px solid ${LINE}`,
  minHeight:   ROW_HEIGHT,
  boxSizing:   'border-box',
};
const HEADER_STYLE: React.CSSProperties = {
  ...CELL_STYLE,
  minHeight:   HEADER_HEIGHT,
  borderTop:   'none',
  background:  '#fafafa',
  display:     'flex',
  alignItems:  'center',
  justifyContent: 'center',
  fontSize:    11,
  fontWeight:  800,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color:       '#666',
};
const LANE_LABEL_STYLE: React.CSSProperties = {
  ...CELL_STYLE,
  borderLeft: 'none',
  fontWeight: 700,
  fontSize:   13,
  display:    'flex',
  alignItems: 'center',
};
const STAGE_BLOCK_STYLE = (color: string): React.CSSProperties => ({
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  height:         'calc(100% - 8px)',
  minHeight:      52,
  border:         '1px solid rgba(0,0,0,0.12)',
  borderRadius:   8,
  padding:        8,
  background:     color,
  fontSize:       12,
  fontWeight:     600,
  textAlign:      'center',
  lineHeight:     1.3,
  boxSizing:      'border-box',
});

function MiniGantt({ plan, showDebug = false }: { plan: Plan; showDebug?: boolean }) {
  const slices = getSlices(plan.start, plan.end, plan.timeslice);
  const numCols = slices.length;
  const numRows = plan.lanes.length;
  const totalWidth  = LANE_COL_WIDTH + numCols * SLICE_COL_WIDTH;
  const totalHeight = HEADER_HEIGHT  + numRows * ROW_HEIGHT;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `${LANE_COL_WIDTH}px repeat(${numCols}, ${SLICE_COL_WIDTH}px)`,
    border: `1px solid ${LINE}`,
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 'max-content',
    position: 'relative',
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={gridStyle}>
        {/* Header row */}
        <div style={{ ...HEADER_STYLE, borderLeft: 'none' }}>Stream</div>
        {slices.map(s => (
          <div key={s} style={HEADER_STYLE}>{s}</div>
        ))}

        {/* Lane rows — display:contents equivalent via fragment */}
        {plan.lanes.map((lane: Lane, laneIndex: number) => {
          const laneStages = plan.stages.filter(s => s.laneId === lane.id);
          const cells = computeLaneCells(laneStages, slices);
          return (
            <div key={lane.id} style={{ display: 'contents' }}>
              <div style={LANE_LABEL_STYLE} data-lane-row={laneIndex}>{lane.label}</div>
              {cells.map(({ slice, stage, span }) => (
                <div
                  key={slice}
                  style={{
                    ...CELL_STYLE,
                    ...(span > 1 ? { gridColumn: `span ${span}` } : {}),
                  }}
                >
                  {stage && (
                    <div style={STAGE_BLOCK_STYLE(lane.color ?? '#f0f0f0')} data-stage-id={stage.id}>
                      {stage.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Arrow overlay — same props as production */}
      <DependencyArrows
        plan={plan}
        slices={slices}
        laneColWidth={LANE_COL_WIDTH}
        sliceColWidth={SLICE_COL_WIDTH}
        rowHeight={ROW_HEIGHT}
      />

      {/* Optional debug dots */}
      {showDebug && (
        <RoutingGridDebug
          numCols={numCols}
          numRows={numRows}
          grid={GANTT_GRID}
        />
      )}

      {/* Pixel ruler overlay: column boundaries */}
      {showDebug && (
        <svg
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
          width={totalWidth}
          height={totalHeight}
          aria-hidden="true"
        >
          {Array.from({ length: numCols + 1 }, (_, i) => {
            const x = GANTT_GRID.originX! + LANE_COL_WIDTH + i * SLICE_COL_WIDTH;
            return (
              <line key={i} x1={x} y1={0} x2={x} y2={totalHeight}
                    stroke="rgba(0,120,255,0.25)" strokeWidth={1} strokeDasharray="4 3" />
            );
          })}
          {Array.from({ length: numRows + 1 }, (_, i) => {
            const y = GANTT_GRID.originY! + HEADER_HEIGHT + i * ROW_HEIGHT;
            return (
              <line key={i} x1={0} y1={y} x2={totalWidth} y2={y}
                    stroke="rgba(0,120,255,0.25)" strokeWidth={1} strokeDasharray="4 3" />
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ─── Plans ────────────────────────────────────────────────────────────────────

function stage(
  id: string, laneId: string, title: string, start: string, end: string,
  dependsOn: string[] = [], enables: string[] = [],
  dependencyAt?: Record<string, string>,
): Stage {
  return { id, laneId, title, start, end, dependsOn, enables, dependencyAt, description: null };
}
function lane(id: string, label: string, color: string): Lane {
  return { id, label, color, description: null };
}

// Same row — straight horizontal arrow
const sameRowPlan: Plan = {
  title: 'Same row', description: null, start: '2025-Q1', end: '2025-Q4', timeslice: 'Quarter',
  lanes: [lane('eng', 'Engineering', '#e8eefc')],
  stages: [
    stage('a', 'eng', 'Stage A', '2025-Q1', '2025-Q1', [], ['b']),
    stage('b', 'eng', 'Stage B', '2025-Q3', '2025-Q3', ['a']),
  ],
  errors: [],
};

// Adjacent column, cross-lane — L-shape
const lShapePlan: Plan = {
  title: 'L-shape', description: null, start: '2025-Q1', end: '2025-Q3', timeslice: 'Quarter',
  lanes: [lane('frontend', 'Frontend', '#d4edda'), lane('backend', 'Backend', '#e8eefc')],
  stages: [
    stage('api', 'backend', 'API',    '2025-Q1', '2025-Q1', [], ['ui']),
    stage('ui',  'frontend', 'UI',    '2025-Q2', '2025-Q2', ['api']),
  ],
  errors: [],
};

// Non-adjacent column, cross-lane — Z-shape
const zShapePlan: Plan = {
  title: 'Z-shape', description: null, start: '2025-Q1', end: '2025-Q4', timeslice: 'Quarter',
  lanes: [lane('frontend', 'Frontend', '#d4edda'), lane('backend', 'Backend', '#e8eefc')],
  stages: [
    stage('api', 'backend',  'API',    '2025-Q1', '2025-Q1', [], ['ui']),
    stage('ui',  'frontend', 'UI',     '2025-Q3', '2025-Q3', ['api']),
  ],
  errors: [],
};

// Chained A → B → C across lanes
const chainPlan: Plan = {
  title: 'Chain A→B→C', description: null, start: '2025-Q1', end: '2025-Q4', timeslice: 'Quarter',
  lanes: [lane('eng', 'Engineering', '#e8eefc'), lane('ops', 'Ops', '#fce8e8')],
  stages: [
    stage('a', 'eng', 'Scaffold',   '2025-Q1', '2025-Q1', [], ['b']),
    stage('b', 'ops', 'Implement',  '2025-Q2', '2025-Q2', ['a'], ['c']),
    stage('c', 'eng', 'Deploy',     '2025-Q4', '2025-Q4', ['b']),
  ],
  errors: [],
};

// Spanning source card (2 quarters)
const spanningPlan: Plan = {
  title: 'Spanning card', description: null, start: '2025-Q1', end: '2025-Q4', timeslice: 'Quarter',
  lanes: [lane('eng', 'Engineering', '#e8eefc'), lane('ops', 'Ops', '#fce8e8')],
  stages: [
    stage('a', 'eng', 'Long Phase', '2025-Q1', '2025-Q2', [], ['b']),
    stage('b', 'ops', 'Follow-up',  '2025-Q3', '2025-Q3', ['a']),
  ],
  errors: [],
};

// Multi-exit points on a spanning card + one backwards dependency
//
// Layout (Q1–Q4):
//
//   source  │ [Core Engine: Q1-Q2 ────────]  │               │               │
//   early   │ [Alpha (Mid Q1)]               │ [Beta (Q1←)]  │               │
//   late    │               │               │ [Gamma (def)] │ [Delta (MidQ2)]│
//   back    │               │ [Retro (Q2)]  │               │ [Future (Q4)] │
//
// Arrows:
//   Core→Alpha:  custom exit Mid 2025-Q1  (backwards-down, target below)
//   Core→Beta:   custom exit 2025-Q1 end  (top band, target below same col)
//   Core→Gamma:  default exit (right edge of Q2) → standard L/Z forward
//   Core→Delta:  custom exit Mid 2025-Q2  (bottom band, target below-right)
//   Future→Retro: backwards dep            (top band, same row)
const multiExitPlan: Plan = {
  title: 'Multi-exit + backwards', description: null,
  start: '2025-Q1', end: '2025-Q4', timeslice: 'Quarter',
  lanes: [
    lane('source', 'Source',   '#e8eefc'),
    lane('early',  'Early',    '#d4edda'),
    lane('late',   'Late',     '#fce8dc'),
    lane('back',   'Backwards','#fce8e8'),
  ],
  stages: [
    // Spanning source card
    stage('hub', 'source', 'Core Engine', '2025-Q1', '2025-Q2', [], ['alpha','beta','gamma','delta']),

    // Depends on hub at Mid Q1 — exits hub's bottom surface at mid-Q1 column
    stage('alpha', 'early',  'Alpha (Mid Q1)', '2025-Q1', '2025-Q1',
      ['hub'], [], { hub: 'Mid 2025-Q1' }),

    // Depends on hub at right edge of Q1 — exitX lands exactly on beta's cellLeft
    // → exit bottom, drop to grid line, stub right, drop to entry (4 pts)
    stage('beta',  'early',  'Beta (Q1 end)',  '2025-Q2', '2025-Q2',
      ['hub'], [], { hub: '2025-Q1' }),

    // Depends on hub with default exit (right edge of Q2) — standard forward routing
    stage('gamma', 'late',   'Gamma (default)','2025-Q3', '2025-Q3', ['hub']),

    // Depends on hub at Mid Q2 — exits hub's bottom surface at mid-Q2 column
    stage('delta', 'late',   'Delta (Mid Q2)', '2025-Q4', '2025-Q4',
      ['hub'], [], { hub: 'Mid 2025-Q2' }),

    // Backwards dependency: Retro (Q2) dependsOn Future (Q4) — arrow arcs over the top
    stage('future', 'back',  'Future Event',   '2025-Q4', '2025-Q4'),
    stage('retro',  'back',  'Retrospective',  '2025-Q2', '2025-Q2', ['future']),
  ],
  errors: [],
};

// Backwards downward: spanning card exits at mid-point, target is in same column below
//
//   driver  │ [Platform: Q1-Q2 ───────────────]  │
//   feature │ [Widget (Mid Q1)]                  │
//
// Arrow exits Platform's bottom at mid-Q1, drops to the row grid line,
// turns left, then drops into Widget.
const backwardsDownPlan: Plan = {
  title: 'Backwards downward (spanning → same-col below)', description: null,
  start: '2025-Q1', end: '2025-Q3', timeslice: 'Quarter',
  lanes: [
    lane('driver',  'Driver',  '#e8eefc'),
    lane('feature', 'Feature', '#d4edda'),
  ],
  stages: [
    stage('platform', 'driver',  'Platform', '2025-Q1', '2025-Q2', [], ['widget']),
    stage('widget',   'feature', 'Widget',   '2025-Q1', '2025-Q1',
      ['platform'], [], { platform: 'Mid 2025-Q1' }),
  ],
  errors: [],
};

// Core Engine → Beta: spanning source (Q1-Q2), exitAt='2025-Q1' lands exactly on
// beta's left cell boundary → degenerate forward path (exitX === cellLeft).
//
//   source │ [Core Engine: Q1-Q2 ────────]  │
//   early  │               │ [Beta (Q2)]   │
//
// Arrow exits hub at (Q1-boundary x, hub-centerY), drops straight down to
// beta-centerY on that same vertical, then stubs 9 px right into beta.
const coreEngineBetaPlan: Plan = {
  title: 'Core Engine → Beta (exitAt Q1 boundary)', description: null,
  start: '2025-Q1', end: '2025-Q3', timeslice: 'Quarter',
  lanes: [
    lane('source', 'Source', '#e8eefc'),
    lane('early',  'Early',  '#d4edda'),
  ],
  stages: [
    stage('hub',  'source', 'Core Engine', '2025-Q1', '2025-Q2', [], ['beta']),
    stage('beta', 'early',  'Beta',        '2025-Q2', '2025-Q2',
      ['hub'], [], { hub: '2025-Q1' }),
  ],
  errors: [],
};

// Isolated from multiExitPlan: just Core Engine → Gamma (default exit).
// Lanes (source/early/late) and the Q1–Q4 range are preserved so the arrow
// routes identically to the MultiExit story; the 'early' lane is intentionally
// empty to keep 'late' two rows below 'source'.
const gammaDefaultPlan: Plan = {
  title: 'Gamma (default exit)', description: null,
  start: '2025-Q1', end: '2025-Q4', timeslice: 'Quarter',
  lanes: [
    lane('source', 'Source', '#e8eefc'),
    lane('early',  'Early',  '#d4edda'),
    lane('late',   'Late',   '#fce8dc'),
  ],
  stages: [
    stage('hub',   'source', 'Core Engine',     '2025-Q1', '2025-Q2', [], ['gamma']),
    stage('gamma', 'late',   'Gamma (default)', '2025-Q3', '2025-Q3', ['hub']),
  ],
  errors: [],
};

// Isolated from multiExitPlan: just Core Engine → Delta, exiting hub's bottom
// surface at Mid 2025-Q2. Same lane layout and range as MultiExit.
// Nothing is in the way, so the arrow takes the fewest-bends route: straight
// down from the hub bottom to Delta's row, then straight across into Delta.
const deltaMidQ2Plan: Plan = {
  title: 'Delta (Mid Q2 exit)', description: null,
  start: '2025-Q1', end: '2025-Q4', timeslice: 'Quarter',
  lanes: [
    lane('source', 'Source', '#e8eefc'),
    lane('early',  'Early',  '#d4edda'),
    lane('late',   'Late',   '#fce8dc'),
  ],
  stages: [
    stage('hub',   'source', 'Core Engine',    '2025-Q1', '2025-Q2', [], ['delta']),
    stage('delta', 'late',   'Delta (Mid Q2)', '2025-Q4', '2025-Q4',
      ['hub'], [], { hub: 'Mid 2025-Q2' }),
  ],
  errors: [],
};

// Same as deltaMidQ2Plan but with Gamma (Q3) sitting in Delta's row, between the
// Mid-Q2 exit column and Delta. The straight low-bend route would cut through
// Gamma, so Delta's arrow must instead route around it (over the row grid line
// above Gamma, then drop into Delta's left edge).
const deltaAroundGammaPlan: Plan = {
  title: 'Delta + Gamma (route around Gamma)', description: null,
  start: '2025-Q1', end: '2025-Q4', timeslice: 'Quarter',
  lanes: [
    lane('source', 'Source', '#e8eefc'),
    lane('early',  'Early',  '#d4edda'),
    lane('late',   'Late',   '#fce8dc'),
  ],
  stages: [
    stage('hub',   'source', 'Core Engine',     '2025-Q1', '2025-Q2', [], ['gamma', 'delta']),
    stage('gamma', 'late',   'Gamma (default)', '2025-Q3', '2025-Q3', ['hub']),
    stage('delta', 'late',   'Delta (Mid Q2)',  '2025-Q4', '2025-Q4',
      ['hub'], [], { hub: 'Mid 2025-Q2' }),
  ],
  errors: [],
};

// Future → Retro on its own: a backwards dependency (Retro in Q2 depends on
// Future in Q4). Same row, so the arrow arcs over the top of the grid, comes
// down at Retro's column and stubs into its left edge.
const futureRetroPlan: Plan = {
  title: 'Future → Retro (backwards, over-the-top arc)', description: null,
  start: '2025-Q1', end: '2025-Q4', timeslice: 'Quarter',
  lanes: [lane('back', 'Backwards', '#fce8e8')],
  stages: [
    stage('future', 'back', 'Future Event',  '2025-Q4', '2025-Q4'),
    stage('retro',  'back', 'Retrospective', '2025-Q2', '2025-Q2', ['future']),
  ],
  errors: [],
};

// Same as futureRetroPlan but with a card (Q3) sitting directly between Retro
// and Future in the same row — right where a direct line would run. The arc
// must go over the top and clear it.
const futureRetroBlockedPlan: Plan = {
  title: 'Future → Retro with a card in the way', description: null,
  start: '2025-Q1', end: '2025-Q4', timeslice: 'Quarter',
  lanes: [lane('back', 'Backwards', '#fce8e8')],
  stages: [
    stage('future',  'back', 'Future Event',  '2025-Q4', '2025-Q4'),
    stage('blocker', 'back', 'In The Way',    '2025-Q3', '2025-Q3'),
    stage('retro',   'back', 'Retrospective', '2025-Q2', '2025-Q2', ['future']),
  ],
  errors: [],
};

// ─── Stories ──────────────────────────────────────────────────────────────────

const wrap = (plan: Plan, debug = false) => ({
  render: () => (
    <div style={{ padding: 32, background: '#f4f4f4', minHeight: '100vh' }}>
      <h3 style={{ fontFamily: 'sans-serif', marginBottom: 16, fontSize: 13, color: '#555' }}>
        {plan.title}
      </h3>
      <MiniGantt plan={plan} showDebug={debug} />
    </div>
  ),
});

export const SameRow:           Story = wrap(sameRowPlan);
export const LShape:            Story = wrap(lShapePlan);
export const ZShape:            Story = wrap(zShapePlan);
export const Chain:             Story = wrap(chainPlan);
export const SpanningCard:      Story = wrap(spanningPlan);
export const BackwardsDown:          Story = wrap(backwardsDownPlan);
export const BackwardsDownDebug:     Story = wrap(backwardsDownPlan, true);
export const CoreEngineToBeta:       Story = wrap(coreEngineBetaPlan);
export const CoreEngineToBetaDebug:  Story = wrap(coreEngineBetaPlan, true);
export const MultiExit:         Story = wrap(multiExitPlan);
export const MultiExitDebug:    Story = wrap(multiExitPlan, true);
export const GammaDefault:      Story = wrap(gammaDefaultPlan);
export const DeltaMidQ2:        Story = wrap(deltaMidQ2Plan);
export const DeltaAroundGamma:  Story = wrap(deltaAroundGammaPlan);
export const FutureRetro:        Story = wrap(futureRetroPlan);
export const FutureRetroBlocked: Story = wrap(futureRetroBlockedPlan);
export const WithDebugDots:     Story = wrap(zShapePlan, true);
