import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Plan, Stage } from '../types/plan';
import { HoverCard } from './HoverCard';
import { DependencyArrows } from './DependencyArrows';
import { RoutingGridDebug } from './RoutingGridDebug';
import styles from './Gantt.module.css';
import { getSlices } from '../utils/slices';
import { computeLaneCells } from '../utils/ganttLayout';
import type { GridConfig } from '../utils/arrowRouting';

interface Props { plan: Plan; }

export const LANE_COL_WIDTH  = 160;
export const SLICE_COL_WIDTH = 120;
export const ROW_HEIGHT      = 72;
export const HEADER_HEIGHT   = 44;
export const CELL_PADDING    = 8;
export const CELL_BORDER_LEFT = 1;
// The grid container has border: 1px, so its content area starts 1 px inside
// the SVG coordinate origin.  originX/Y corrects all routing coordinates.
export const CONTAINER_BORDER = 1;

export const STAGE_BLOCK_HEIGHT = 52;  // min-height of .stageBlock (px)

export const GANTT_GRID: GridConfig = {
  laneColWidth:  LANE_COL_WIDTH,
  colWidth:      SLICE_COL_WIDTH,
  rowHeight:     ROW_HEIGHT,
  headerHeight:  HEADER_HEIGHT,
  cellPadding:   CELL_PADDING,
  cellBorderLeft: CELL_BORDER_LEFT,
  originX: CONTAINER_BORDER,
  originY: CONTAINER_BORDER,
  stageBlockHeight: STAGE_BLOCK_HEIGHT,
};

export function Gantt({ plan }: Props) {
  const [hoveredStage,  setHoveredStage]  = useState<Stage | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const slices = getSlices(plan.start, plan.end, plan.timeslice);

  const [searchParams] = useSearchParams();
  const showDebug = searchParams.has('debug');

  const stageRefs = useRef<Record<string, DOMRect>>({});

  // Hover takes precedence over click-selection on pointer devices.
  const activeStageId = hoveredStage?.id ?? selectedStage?.id ?? null;

  const handleMouseEnter = (stage: Stage, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    setHoverPos({ x: rect.left - containerRect.left, y: rect.bottom - containerRect.top + 8 });
    setHoveredStage(stage);
    stageRefs.current[stage.id] = rect;
  };

  const handleStageClick = (stage: Stage, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStage(prev => prev?.id === stage.id ? null : stage);
  };

  return (
    <div className={styles.wrap} ref={containerRef} onClick={() => setSelectedStage(null)}>
      <div
        className={styles.gantt}
        style={{
          gridTemplateColumns: `${LANE_COL_WIDTH}px repeat(${slices.length}, ${SLICE_COL_WIDTH}px)`,
          // Pin rows to the exact heights the arrow routing assumes
          // (HEADER_HEIGHT + one ROW_HEIGHT per lane). Without this, a long title
          // that wraps grows its row, shifting every row below it away from the
          // fixed routing grid so dependency arrows no longer hit card centres.
          gridTemplateRows: `${HEADER_HEIGHT}px repeat(${plan.lanes.length}, ${ROW_HEIGHT}px)`,
        }}
      >
        {/* Header row */}
        <div className={`${styles.cell} ${styles.header}`}>Stream</div>
        {slices.map(s => (
          <div key={s} className={`${styles.cell} ${styles.header}`}>{s}</div>
        ))}

        {/* Lane rows */}
        {plan.lanes.map(lane => {
          const laneStages = plan.stages.filter(s => s.laneId === lane.id);
          const cells = computeLaneCells(laneStages, slices);
          return (
            <div key={lane.id} className={styles.row}>
              <div className={`${styles.cell} ${styles.laneLabel}`}>{lane.label}</div>
              {cells.map(({ slice, stage, span }) => (
                <div
                  key={slice}
                  className={styles.cell}
                  style={span > 1 ? { gridColumn: `span ${span}` } : {}}
                >
                  {stage && (
                    <div
                      className={styles.stageBlock}
                      style={{ background: lane.color ?? '#f0f0f0' }}
                      onMouseEnter={e => handleMouseEnter(stage, e)}
                      onMouseLeave={() => setHoveredStage(null)}
                      onClick={e => handleStageClick(stage, e)}
                    >
                      <span className={styles.stageTitle}>{stage.title}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <DependencyArrows
        plan={plan}
        slices={slices}
        laneColWidth={LANE_COL_WIDTH}
        sliceColWidth={SLICE_COL_WIDTH}
        rowHeight={ROW_HEIGHT}
        hoveredStageId={activeStageId}
      />

      {showDebug && (
        <RoutingGridDebug
          numCols={slices.length}
          numRows={plan.lanes.length}
          grid={GANTT_GRID}
        />
      )}

      {hoveredStage && (
        <div className={styles.popup} style={{ left: hoverPos.x, top: hoverPos.y }}>
          <HoverCard stage={hoveredStage} lanes={plan.lanes} />
        </div>
      )}
    </div>
  );
}
