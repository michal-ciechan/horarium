import { useLayoutEffect, useRef, useState } from 'react';
import type { Plan } from '../types/plan';
import { sliceIndex } from '../utils/slices';
import { computeArrowPath, exitXFromAt, type ArrowOptions, type CardBounds, type Point } from '../utils/arrowRouting';
import { GANTT_GRID } from './Gantt';

interface MeasuredRows {
  rowEdges: number[];
  rowCardTops: number[];
  rowCardBottoms: number[];
}

interface Props {
  plan: Plan;
  slices: string[];
  laneColWidth: number;
  sliceColWidth: number;
  rowHeight: number;
  hoveredStageId?: string | null;
}

const CORNER_RADIUS = 10;

/** Converts an array of points into an SVG path string with rounded corners. */
function roundedPath(pts: readonly Point[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  const r = CORNER_RADIUS;
  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const cur  = pts[i];
    const next = pts[i + 1];

    // Vector from prev→cur and cur→next
    const dx0 = cur.x - prev.x, dy0 = cur.y - prev.y;
    const dx1 = next.x - cur.x, dy1 = next.y - cur.y;
    const len0 = Math.hypot(dx0, dy0);
    const len1 = Math.hypot(dx1, dy1);

    // Clamp radius so it never exceeds half the segment length
    const rc = Math.min(r, len0 / 2, len1 / 2);

    // Point on the incoming segment just before the corner
    const ax = cur.x - (dx0 / len0) * rc;
    const ay = cur.y - (dy0 / len0) * rc;
    // Point on the outgoing segment just after the corner
    const bx = cur.x + (dx1 / len1) * rc;
    const by = cur.y + (dy1 / len1) * rc;

    d += ` L ${ax} ${ay} Q ${cur.x} ${cur.y} ${bx} ${by}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function DependencyArrows({ plan, slices, laneColWidth, sliceColWidth, rowHeight, hoveredStageId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [measured, setMeasured] = useState<MeasuredRows | null>(null);

  const laneRow = (laneId: string) => plan.lanes.findIndex(l => l.id === laneId);

  // Measure the ACTUAL rendered stage blocks + lane rows so the arrows follow real,
  // content-driven card positions (a long title that wraps makes its row taller —
  // the fixed rowHeight model would leave the arrow floating off the card centre).
  // Horizontal geometry stays analytical (columns are fixed-width). Until the first
  // measurement lands, routing falls back to the analytical model.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const container = svg?.parentElement;
    if (!svg || !container) return;

    const measure = () => {
      const origin = svg.getBoundingClientRect().top;

      const laneCells = [...container.querySelectorAll<HTMLElement>('[data-lane-row]')]
        .map(el => { const r = el.getBoundingClientRect(); return { row: Number(el.dataset.laneRow), top: r.top - origin, bottom: r.bottom - origin }; })
        .sort((a, b) => a.row - b.row);
      if (laneCells.length === 0) return;

      // Row grid lines: top of each lane row, plus the bottom of the last one.
      const rowEdges = laneCells.map(c => c.top);
      rowEdges.push(laneCells[laneCells.length - 1].bottom);

      // Per-row card top/bottom from any stage block in that row (cards in a row
      // share a height under CSS grid).
      const rowCardTops: number[] = [];
      const rowCardBottoms: number[] = [];
      for (const el of container.querySelectorAll<HTMLElement>('[data-stage-id]')) {
        const stage = plan.stages.find(s => s.id === el.dataset.stageId);
        if (!stage) continue;
        const row = laneRow(stage.laneId);
        if (row < 0) continue;
        const r = el.getBoundingClientRect();
        rowCardTops[row] = r.top - origin;
        rowCardBottoms[row] = r.bottom - origin;
      }

      const next: MeasuredRows = { rowEdges, rowCardTops, rowCardBottoms };
      setMeasured(prev => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
    // plan drives the stage→row mapping; DOM measurement reflects width/layout changes.
  }, [plan]);

  const grid = { ...GANTT_GRID, laneColWidth, colWidth: sliceColWidth, rowHeight, ...(measured ?? {}) };

  const stageBounds = (stageId: string): CardBounds | null => {
    const stage = plan.stages.find(s => s.id === stageId);
    if (!stage) return null;
    return {
      startCol: sliceIndex(stage.start, slices),
      endCol:   sliceIndex(stage.end,   slices) + 1,
      row:      laneRow(stage.laneId),
    };
  };

  // All card rectangles up front — used as routing obstacles (src/tgt excluded
  // per-arrow) so a low-bend route can be rejected when it would cross a card.
  const allBounds = plan.stages
    .map(s => ({ id: s.id, bounds: stageBounds(s.id) }))
    .filter((b): b is { id: string; bounds: CardBounds } => b.bounds !== null);

  const arrows: { d: string; key: string; srcId: string; tgtId: string }[] = [];

  for (const stage of plan.stages) {
    const tgt = stageBounds(stage.id);
    if (!tgt) continue;
    for (const depId of stage.dependsOn) {
      const src = stageBounds(depId);
      if (!src) continue;
      const atStr  = stage.dependencyAt?.[depId];
      const srcExitX = atStr ? exitXFromAt(atStr, slices, grid) : undefined;
      const obstacles = allBounds
        .filter(b => b.id !== stage.id && b.id !== depId)
        .map(b => b.bounds);
      const options: ArrowOptions = { obstacles };
      if (srcExitX !== undefined) options.srcExitX = srcExitX;
      const pts = computeArrowPath(src, tgt, grid, options);
      arrows.push({ d: roundedPath(pts), key: `${depId}-${stage.id}`, srcId: depId, tgtId: stage.id });
    }
  }

  const anyHovered = hoveredStageId != null;

  if (arrows.length === 0) return null;

  const totalWidth  = laneColWidth + slices.length * sliceColWidth;
  const totalHeight = GANTT_GRID.headerHeight + plan.lanes.length * rowHeight;

  return (
    <svg
      ref={svgRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
      width={totalWidth}
      height={totalHeight}
      aria-hidden="true"
    >
      <defs>
        <marker id="arrowhead" markerWidth="4" markerHeight="3"
                refX="4" refY="1.5" orient="auto">
          <polygon points="0 0, 4 1.5, 0 3" fill="rgba(80,80,80,0.7)" />
        </marker>
        <marker id="arrowhead-hl" markerWidth="4" markerHeight="3"
                refX="4" refY="1.5" orient="auto">
          <polygon points="0 0, 4 1.5, 0 3" fill="#4a7eff" />
        </marker>
      </defs>
      {arrows.map(({ d, key, srcId, tgtId }) => {
        const highlighted = anyHovered && (srcId === hoveredStageId || tgtId === hoveredStageId);
        const dimmed      = anyHovered && !highlighted;
        return (
          <path
            key={key}
            d={d}
            fill="none"
            style={{
              stroke:      highlighted ? '#4a7eff' : 'rgba(80,80,80,0.5)',
              strokeWidth: highlighted ? 2 : 1,
              opacity:     dimmed ? 0.2 : 1,
              transition:  'stroke 0.15s, stroke-width 0.15s, opacity 0.15s',
            }}
            markerEnd={highlighted ? 'url(#arrowhead-hl)' : 'url(#arrowhead)'}
          />
        );
      })}
    </svg>
  );
}
