/**
 * Debug overlay: renders pink dots at every position the routing algorithm
 * can snap to — card edges, column-boundary channels, and row-boundary lanes.
 *
 * Enable by adding ?debug to the URL.
 *
 * Dot sizes:
 *   r=5  card attachment point (cardRight/cardLeft × rowCenter)  — where arrows start/end
 *   r=3  column-boundary channel × rowCenter or rowBoundary      — routing waypoints
 *   r=2  card edge × rowBoundary                                 — transition corners
 */
import type { GridConfig } from '../utils/arrowRouting';

interface Props {
  numCols:  number;
  numRows:  number;
  grid:     GridConfig;
}

export function RoutingGridDebug({ numCols, numRows, grid }: Props) {
  const { laneColWidth, colWidth, rowHeight, headerHeight } = grid;
  const pad = grid.cellPadding    ?? 8;
  const bdr = grid.cellBorderLeft ?? 1;
  const ox  = grid.originX ?? 0;
  const oy  = grid.originY ?? 0;

  // ── X snap positions ──────────────────────────────────────────────────────
  type XKind = 'boundary' | 'cardLeft' | 'cardRight';
  const xs: { x: number; xk: XKind }[] = [];

  for (let c = 0; c <= numCols; c++) {
    xs.push({ x: ox + laneColWidth + c * colWidth, xk: 'boundary' });
  }
  for (let c = 0; c < numCols; c++) {
    xs.push({ x: ox + laneColWidth + c * colWidth + bdr + pad, xk: 'cardLeft'  });
    xs.push({ x: ox + laneColWidth + (c + 1) * colWidth - pad, xk: 'cardRight' });
  }

  // ── Y snap positions ──────────────────────────────────────────────────────
  type YKind = 'boundary' | 'center';
  const ys: { y: number; yk: YKind }[] = [];

  for (let r = 0; r <= numRows; r++) {
    ys.push({ y: oy + headerHeight + r * rowHeight, yk: 'boundary' });
  }
  for (let r = 0; r < numRows; r++) {
    ys.push({ y: oy + headerHeight + r * rowHeight + rowHeight / 2, yk: 'center' });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <svg
      style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none', overflow: 'visible',
        zIndex: 20,
      }}
      width={laneColWidth + numCols * colWidth}
      height={headerHeight + numRows * rowHeight}
      aria-hidden="true"
    >
      {xs.flatMap(({ x, xk }) =>
        ys.map(({ y, yk }) => {
          const isAttach  = (xk === 'cardLeft' || xk === 'cardRight') && yk === 'center';
          const isChannel = xk === 'boundary' && (yk === 'center' || yk === 'boundary');
          const r       = isAttach ? 5 : isChannel ? 3 : 2;
          const opacity = isAttach ? 1 : isChannel ? 0.7 : 0.4;
          return (
            <circle
              key={`${x}-${y}`}
              cx={x} cy={y} r={r}
              fill="hotpink"
              opacity={opacity}
            />
          );
        })
      )}
    </svg>
  );
}
