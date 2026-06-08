/**
 * Orthogonal arrow routing for Gantt dependency arrows.
 *
 * Default (forward) paths exit from the right edge of the source card and enter
 * the left edge of the target card.  Routing channels travel along CSS grid lines.
 *
 *  Same row, forward          → 2 pts  straight horizontal
 *  Different row, forward     → 4 pts  L/Z shape via target's left column boundary
 *  Backwards, target ≤ same row → 5 pts  arc over the top (through the header channel)
 *  Backwards, target below    → 5 pts  exit bottom → drop to row grid line → go left → drop to target
 *
 * "Backwards" = t.cardLeft < srcExitX (target's left entry is left of source's exit).
 * "Custom exit" = caller supplies srcExitX (a mid-card or slice-boundary X position).
 *
 * Backwards routing:
 *   tgt.row ≤ src.row (same row or target above):
 *     Arc over top — exit top surface, rise into the header channel (a card-free
 *     band inside the canvas), travel left, drop to target centre Y, stub in. 5 pts.
 *   tgt.row > src.row (target below):
 *     Exit bottom surface at srcExitX, drop vertically to the row grid line
 *     (s.cellBottom), travel left to target's column boundary, drop to target
 *     centre Y, stub in.  5 pts.
 */

export interface GridConfig {
  laneColWidth:  number;  // width of the lane-label column (px)
  colWidth:      number;  // width of each timeslice column (px)
  rowHeight:     number;  // height of each lane row (px)
  headerHeight:  number;  // height of the header row (px)
  /** Padding applied to every side of each cell (px). Default: 8. */
  cellPadding?:    number;
  /** Width of the left border on each cell (px). Default: 1. */
  cellBorderLeft?: number;
  /**
   * SVG-coordinate offset for the grid content area origin (px). Default: 0.
   * Set to the container's border-width so that computed coordinates land on
   * actual card edges rather than 1 px inside the container border.
   */
  originX?: number;
  originY?: number;
  /**
   * Actual rendered height of a stage block (px). When set, `cardBottom` and
   * `cardCenterY` are derived from the card's top edge + this height, which
   * matches the DOM exactly. Without it the legacy formula is used
   * (`cellBottom − padding`), which can be a few pixels off when `min-height`
   * clamps the stage block smaller than the cell.
   */
  stageBlockHeight?: number;
}

/** 0-indexed position of a card in the data grid (excludes the lane-label column). */
export interface CardBounds {
  startCol: number;  // inclusive
  endCol:   number;  // exclusive  (= startCol + colSpan)
  row:      number;  // 0-based lane row
}

export interface Point { x: number; y: number; }

export type ArrowPath = readonly Point[];

// ─── Internal pixel helpers ────────────────────────────────────────────────────

function pxValues(g: GridConfig) {
  return {
    pad: g.cellPadding    ?? 8,
    bdr: g.cellBorderLeft ?? 1,
  };
}

/** Cell outer boundaries (include border, exclude any outer container border). */
function cellPx(card: CardBounds, g: GridConfig) {
  const ox = g.originX ?? 0;
  const oy = g.originY ?? 0;
  return {
    cellLeft:   ox + g.laneColWidth + card.startCol * g.colWidth,
    cellRight:  ox + g.laneColWidth + card.endCol   * g.colWidth,
    cellTop:    oy + g.headerHeight + card.row       * g.rowHeight,
    cellBottom: oy + g.headerHeight + (card.row + 1) * g.rowHeight,
  };
}

/** stageBlock pixel edges and center. */
function cardPx(card: CardBounds, g: GridConfig) {
  const { pad, bdr } = pxValues(g);
  const { cellLeft, cellRight, cellTop, cellBottom } = cellPx(card, g);
  const cardTop  = cellTop  + bdr + pad;
  const cardLeft = cellLeft + bdr + pad;

  const cardBottom = g.stageBlockHeight != null
    ? cardTop + g.stageBlockHeight
    : cellBottom - pad;

  const cardCenterY = g.stageBlockHeight != null
    ? cardTop + g.stageBlockHeight / 2
    : g.headerHeight + card.row * g.rowHeight + g.rowHeight / 2;

  return {
    cardLeft,
    cardRight:  cellRight - pad,
    cardTop,
    cardBottom,
    cardCenterY,
    ...cellPx(card, g),
  };
}

// ─── Public API ────────────────────────────────────────────────────────────────

export type AttachmentSide     = 'top' | 'right' | 'bottom' | 'left';
export type AttachmentPosition = 'start' | 'center' | 'end';

/**
 * Returns one of the 8 perimeter attachment points on a stageBlock.
 * 'start'/'end' run left→right on horizontal edges, top→bottom on vertical edges.
 */
export function cardAttachPoint(
  card: CardBounds,
  side: AttachmentSide,
  pos:  AttachmentPosition,
  grid: GridConfig,
): Point {
  const { cardLeft, cardRight, cardTop, cardBottom, cardCenterY } = cardPx(card, grid);
  const cardCenterX = (cardLeft + cardRight) / 2;

  const xAt = (p: AttachmentPosition) =>
    p === 'start' ? cardLeft   : p === 'center' ? cardCenterX : cardRight;
  const yAt = (p: AttachmentPosition) =>
    p === 'start' ? cardTop    : p === 'center' ? cardCenterY : cardBottom;

  switch (side) {
    case 'top':    return { x: xAt(pos), y: cardTop    };
    case 'bottom': return { x: xAt(pos), y: cardBottom };
    case 'left':   return { x: cardLeft,  y: yAt(pos) };
    case 'right':  return { x: cardRight, y: yAt(pos) };
  }
}

export interface ArrowOptions {
  /**
   * Override the X position at which the arrow exits the source card.
   * Use `exitXFromAt()` to convert a slice-notation string to pixels.
   * When set (even if it equals `s.cardRight`), top/bottom band routing is used.
   */
  srcExitX?: number;
  /**
   * Other cards on the grid that the arrow must not be drawn through. Used to
   * decide whether a low-bend "straight" route is clear; if it would cross one
   * of these, a grid-line route that travels around them is used instead.
   * The source and target should NOT be included.
   */
  obstacles?: readonly CardBounds[];
}

/** Card body rectangle (stageBlock edges) in px. */
function cardBodyRect(card: CardBounds, g: GridConfig) {
  const { cardLeft, cardRight, cardTop, cardBottom } = cardPx(card, g);
  return { left: cardLeft, right: cardRight, top: cardTop, bottom: cardBottom };
}

/**
 * Does any axis-aligned segment of `pts` pass through the OPEN interior of any
 * obstacle card? Segments merely touching an edge (e.g. travelling along a
 * card's cell boundary) do not count.
 */
function pathHitsObstacle(
  pts: readonly Point[],
  obstacles: readonly CardBounds[],
  g: GridConfig,
): boolean {
  if (obstacles.length === 0) return false;
  const EPS = 0.5;
  const rects = obstacles.map(o => cardBodyRect(o, g));
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    for (const r of rects) {
      if (Math.abs(a.y - b.y) < EPS) {              // horizontal segment
        const y = a.y;
        if (y <= r.top + EPS || y >= r.bottom - EPS) continue;
        const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
        if (hi > r.left + EPS && lo < r.right - EPS) return true;
      } else if (Math.abs(a.x - b.x) < EPS) {       // vertical segment
        const x = a.x;
        if (x <= r.left + EPS || x >= r.right - EPS) continue;
        const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y);
        if (hi > r.top + EPS && lo < r.bottom - EPS) return true;
      }
    }
  }
  return false;
}

/**
 * Computes an orthogonal arrow path from the source card to the left-center
 * of `tgt`.  All axis-aligned segments travel along CSS grid lines.
 *
 * Standard forward path exits right-center of `src`; supply `options.srcExitX`
 * to exit at a different horizontal position (mid-card or slice boundary), which
 * automatically triggers top/bottom band routing.  Backwards arrows (target
 * entry X < source exit X) also use top/bottom band routing automatically.
 */
export function computeArrowPath(
  src: CardBounds,
  tgt: CardBounds,
  grid: GridConfig,
  options?: ArrowOptions,
): ArrowPath {
  const s = cardPx(src, grid);
  const t = cardPx(tgt, grid);

  const exitX  = options?.srcExitX ?? s.cardRight;
  const entryX = t.cardLeft;
  const entryY = t.cardCenterY;

  // Arrow needs to travel leftward → use top/bottom band routing.
  const isBackwards = entryX < exitX;

  // ── Standard forward paths ─────────────────────────────────────────────────
  // Custom exits that are still forward (exitX ≤ entryX) use L/Z routing too —
  // band routing is only needed when the path must travel leftward.
  if (!isBackwards) {
    const exitY = s.cardCenterY;
    if (src.row === tgt.row) {
      return [{ x: exitX, y: exitY }, { x: entryX, y: entryY }];
    }
    // L/Z shape: travel to target's left column boundary, then drop/rise.
    // If exitX already sits on t.cellLeft (no horizontal travel before the
    // vertical segment) two rules apply:
    //
    //   • Entering a card from the left always requires a horizontal stub
    //     preceded by a vertical segment on the column grid line (t.cellLeft).
    //   • Exiting a card from the bottom always requires a short vertical stub
    //     to the nearest row grid line before any other movement.
    //
    // When target is below: exit bottom → drop on column grid line to entryY
    //                       → stub right into card.  (3 pts, vertical on grid)
    // When target is above: exit centre Y → rise to entryY → stub right. (3 pts)
    if (exitX === t.cellLeft) {
      if (tgt.row > src.row) {
        return [
          { x: exitX,      y: s.cardBottom },  // exit source bottom surface
          { x: t.cellLeft, y: entryY       },  // drop to entry Y on column grid line
          { x: entryX,     y: entryY       },  // stub right into target left edge
        ];
      }
      return [
        { x: exitX,  y: exitY  },  // exit at centre Y, rise to target
        { x: exitX,  y: entryY },
        { x: entryX, y: entryY },
      ];
    }
    // Custom exit that lands inside the source card body (exitX strictly left of
    // the card's right edge): leaving at centre Y would draw the first horizontal
    // segment straight through the card. Exit the top/bottom surface instead —
    // bottom when the target is below, top when above. (The default right-edge
    // exit, exitX === cardRight, is skipped and keeps the standard L/Z below.)
    if (exitX < s.cardRight) {
      const obstacles = options?.obstacles ?? [];
      if (tgt.row > src.row) {
        // Prefer the fewest bends: drop straight down from the bottom surface to
        // the target's centre Y, then go straight across into its left edge —
        // a single bend. Use it only when nothing sits in the way.
        const straight: Point[] = [
          { x: exitX,  y: s.cardBottom },  // exit source bottom surface
          { x: exitX,  y: entryY       },  // straight down to target centre Y
          { x: entryX, y: entryY       },  // straight across into target left edge
        ];
        if (!pathHitsObstacle(straight, obstacles, grid)) return straight;
        // Something is in the way → ride the row grid line just below the source
        // to travel across above the obstacles, then drop into the target.
        return [
          { x: exitX,      y: s.cardBottom },  // exit source bottom surface
          { x: exitX,      y: s.cellBottom },  // drop to row grid line below source
          { x: t.cellLeft, y: s.cellBottom },  // travel to target column boundary
          { x: t.cellLeft, y: entryY       },  // drop to target centre Y
          { x: entryX,     y: entryY       },  // stub into target left edge
        ];
      }
      // Target above: mirror of the below case.
      const straightUp: Point[] = [
        { x: exitX,  y: s.cardTop },  // exit source top surface
        { x: exitX,  y: entryY    },  // straight up to target centre Y
        { x: entryX, y: entryY    },  // straight across into target left edge
      ];
      if (!pathHitsObstacle(straightUp, obstacles, grid)) return straightUp;
      return [
        { x: exitX,      y: s.cardTop },  // exit source top surface
        { x: exitX,      y: s.cellTop },  // rise to row grid line above source
        { x: t.cellLeft, y: s.cellTop },  // travel to target column boundary
        { x: t.cellLeft, y: entryY    },  // drop to target centre Y
        { x: entryX,     y: entryY    },  // stub into target left edge
      ];
    }
    return [
      { x: exitX,      y: exitY  },
      { x: t.cellLeft, y: exitY  },
      { x: t.cellLeft, y: entryY },
      { x: entryX,     y: entryY },
    ];
  }

  // ── Backwards routing ─────────────────────────────────────────────────────
  const useTop = tgt.row <= src.row;

  if (useTop) {
    // Route over the top along the header's bottom border — the grid line between
    // the header and row 0. It is above every card body (card tops sit bdr+pad
    // below it) so the horizontal travel never crosses a card, and the arrow
    // never rises up INTO the header. (The old code used the header midpoint, and
    // before that y = -BAND_OFFSET, which left the canvas entirely.)
    const oy = grid.originY ?? 0;
    const topBandY = oy + grid.headerHeight;  // = cellTop(row 0), the header bottom border
    return [
      { x: exitX,      y: s.cardTop      },  // exit source top surface
      { x: exitX,      y: topBandY       },  // rise to the header bottom border
      { x: t.cellLeft, y: topBandY       },  // travel left to target column
      { x: t.cellLeft, y: t.cardCenterY  },  // drop to target centre Y
      { x: entryX,     y: entryY         },  // stub into target left edge
    ];
  }

  // Target is below: exit bottom, drop to row grid line, then travel left.
  // The vertical-first segment keeps the arrow clearly outside the source card
  // before turning; the horizontal travel rides the CSS grid row boundary.
  return [
    { x: exitX,      y: s.cardBottom  },  // exit source bottom surface
    { x: exitX,      y: s.cellBottom  },  // drop vertically to row grid line
    { x: t.cellLeft, y: s.cellBottom  },  // travel left along grid line
    { x: t.cellLeft, y: t.cardCenterY },  // drop to target centre Y
    { x: entryX,     y: entryY        },  // stub into target left edge
  ];
}

/**
 * Converts a dependency exit-time string into an SVG x pixel coordinate.
 *
 * Format:
 *   "2025-Q1"      → right edge of the 2025-Q1 column  (= left edge of next column)
 *   "Mid 2025-Q1"  → horizontal midpoint of the 2025-Q1 column
 *
 * @param exitAt  The string from `stage.dependencyAt[depId]`
 * @param slices  Ordered slice labels from `getSlices()`
 * @param grid    Grid configuration
 */
export function exitXFromAt(exitAt: string, slices: readonly string[], grid: GridConfig): number {
  const isMid = /^mid\s+/i.test(exitAt);
  const sliceName = exitAt.replace(/^mid\s+/i, '').trim();
  const idx = slices.indexOf(sliceName);
  const col = idx >= 0 ? idx : 0;
  const ox = grid.originX ?? 0;
  return isMid
    ? ox + grid.laneColWidth + col * grid.colWidth + grid.colWidth / 2
    : ox + grid.laneColWidth + (col + 1) * grid.colWidth;
}

// ─── Debug helpers ─────────────────────────────────────────────────────────────

export function pathToString(path: ArrowPath): string {
  return path.map(({ x, y }) => `(${x},${y})`).join(' → ');
}

export function renderGrid(
  numRows: number,
  numCols: number,
  cards: readonly { label: string; bounds: CardBounds }[],
): string {
  const W = 5;
  const header = '    ' + Array.from({ length: numCols }, (_, i) => `c${i}`.padEnd(W)).join('');
  const lines  = [header];
  for (let r = 0; r < numRows; r++) {
    let line = `r${r}  `;
    let c = 0;
    while (c < numCols) {
      const card = cards.find(cd => cd.bounds.row === r && cd.bounds.startCol === c);
      if (card) {
        const span  = card.bounds.endCol - card.bounds.startCol;
        const inner = card.label.slice(0, span * W - 2);
        const fill = '='.repeat(Math.max(0, span * W - 2 - inner.length));
        line += `[${inner}${fill}]`;
        c += span;
      } else {
        line += '.    ';
        c++;
      }
    }
    lines.push(line);
  }
  return lines.join('\n');
}
