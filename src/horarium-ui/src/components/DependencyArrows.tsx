import type { Plan } from '../types/plan';
import { sliceIndex } from '../utils/slices';

interface Props {
  plan: Plan;
  slices: string[];
  laneColWidth: number;
  sliceColWidth: number;
  rowHeight: number;
}

export function DependencyArrows({ plan, slices, laneColWidth, sliceColWidth, rowHeight }: Props) {
  const headerHeight = 44;
  const laneIndex = (laneId: string) => plan.lanes.findIndex(l => l.id === laneId);

  const stageCenter = (stage: { start: string; laneId: string }) => {
    const col = sliceIndex(stage.start, slices);
    const row = laneIndex(stage.laneId);
    const x = laneColWidth + col * sliceColWidth + sliceColWidth / 2;
    const y = headerHeight + row * rowHeight + rowHeight / 2;
    return { x, y };
  };

  const arrows: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];

  for (const stage of plan.stages) {
    for (const depId of stage.dependsOn) {
      const dep = plan.stages.find(s => s.id === depId);
      if (!dep) continue;
      arrows.push({ from: stageCenter(dep), to: stageCenter(stage) });
    }
  }

  if (arrows.length === 0) return null;

  const totalWidth = laneColWidth + slices.length * sliceColWidth;
  const totalHeight = headerHeight + plan.lanes.length * rowHeight;

  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
      width={totalWidth}
      height={totalHeight}
      aria-hidden="true"
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#525252" />
        </marker>
      </defs>
      {arrows.map(({ from, to }, i) => (
        <line
          key={i}
          x1={from.x} y1={from.y}
          x2={to.x} y2={to.y}
          stroke="#525252"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          markerEnd="url(#arrowhead)"
        />
      ))}
    </svg>
  );
}
