import { useState, useRef } from 'react';
import type { Plan, Stage } from '../types/plan';
import { HoverCard } from './HoverCard';
import { DependencyArrows } from './DependencyArrows';
import styles from './Gantt.module.css';
import { getSlices, sliceIndex } from '../utils/slices';

interface Props { plan: Plan; }

const LANE_COL_WIDTH = 160;
const SLICE_COL_WIDTH = 120;
const ROW_HEIGHT = 72;

export function Gantt({ plan }: Props) {
  const [hoveredStage, setHoveredStage] = useState<Stage | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const slices = getSlices(plan.start, plan.end, plan.timeslice);

  const stageRefs = useRef<Record<string, DOMRect>>({});

  const handleMouseEnter = (stage: Stage, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    setHoverPos({ x: rect.left - containerRect.left, y: rect.bottom - containerRect.top + 8 });
    setHoveredStage(stage);
    stageRefs.current[stage.id] = rect;
  };

  return (
    <div className={styles.wrap} ref={containerRef}>
      <div className={styles.gantt} style={{ gridTemplateColumns: `${LANE_COL_WIDTH}px repeat(${slices.length}, ${SLICE_COL_WIDTH}px)` }}>
        {/* Header row */}
        <div className={`${styles.cell} ${styles.header}`}>Stream</div>
        {slices.map(s => (
          <div key={s} className={`${styles.cell} ${styles.header}`}>{s}</div>
        ))}

        {/* Lane rows */}
        {plan.lanes.map(lane => {
          const laneStages = plan.stages.filter(s => s.laneId === lane.id);
          return (
            <div key={lane.id} className={styles.row}>
              <div className={`${styles.cell} ${styles.laneLabel}`}>{lane.label}</div>
              {slices.map(slice => {
                const stage = laneStages.find(s => s.start === slice);
                const sliceSpan = stage ? sliceIndex(stage.end, slices) - sliceIndex(stage.start, slices) + 1 : 1;
                if (stage && stage.start !== slice) return null; // handled by spanning cell
                return (
                  <div
                    key={slice}
                    className={styles.cell}
                    style={stage ? { gridColumn: `span ${sliceSpan}` } : {}}
                  >
                    {stage && (
                      <div
                        className={styles.stageBlock}
                        style={{ background: lane.color ?? '#f0f0f0' }}
                        onMouseEnter={e => handleMouseEnter(stage, e)}
                        onMouseLeave={() => setHoveredStage(null)}
                      >
                        <span className={styles.stageTitle}>{stage.title}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <DependencyArrows plan={plan} slices={slices} laneColWidth={LANE_COL_WIDTH} sliceColWidth={SLICE_COL_WIDTH} rowHeight={ROW_HEIGHT} />

      {hoveredStage && (
        <div className={styles.popup} style={{ left: hoverPos.x, top: hoverPos.y }}>
          <HoverCard stage={hoveredStage} lanes={plan.lanes} />
        </div>
      )}
    </div>
  );
}
