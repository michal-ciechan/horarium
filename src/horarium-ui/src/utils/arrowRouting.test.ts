import { describe, it, expect } from 'vitest';
import {
  computeArrowPath,
  exitXFromAt,
  cardAttachPoint,
  pathToString,
  renderGrid,
  type GridConfig,
  type CardBounds,
  type Point,
  type ArrowPath,
  type ArrowOptions,
} from './arrowRouting';

// ─── Simplified grid for easy mental arithmetic ────────────────────────────────
//
//  cellPadding=8, cellBorderLeft=1
//
//  cardLeft  (col c) = c*100 + 9      (1 border + 8 pad)
//  cardRight (endCol e) = e*100 − 8   (8 pad on right, no border)
//  cardCenterY (row r) = r*60 + 30    (headerHeight=0, rowHeight/2=30)
//  cellRight  = endCol*100            ← vertical routing channel
//  cellTop    = row*60                ← horizontal routing lane (src above tgt)
//  cellBottom = (row+1)*60            ← horizontal routing lane (src below tgt)

const G: GridConfig = {
  laneColWidth:  0,
  colWidth:      100,
  rowHeight:     60,
  headerHeight:  0,
  cellPadding:   8,
  cellBorderLeft: 1,
};

function c(startCol: number, endCol: number, row: number): CardBounds {
  return { startCol, endCol, row };
}
function p(...coords: [number, number][]): Point[] {
  return coords.map(([x, y]) => ({ x, y }));
}

// ─── Same row (straight horizontal) ───────────────────────────────────────────

describe('same row → straight horizontal', () => {
  it('adjacent columns, same row: card-edge to card-edge', () => {
    // r0: [A] [B]
    // A cardRight=92  A cardCenterY=30
    // B cardLeft=109  B cardCenterY=30
    expect(computeArrowPath(c(0,1,0), c(1,2,0), G)).toEqual(p([92,30],[109,30]));
  });

  it('gap of one column, same row', () => {
    // r0: [A] ·  [B]
    // A cardRight=92, B cardLeft=209
    expect(computeArrowPath(c(0,1,0), c(2,3,0), G)).toEqual(p([92,30],[209,30]));
  });

  it('gap of two columns, same row', () => {
    // A cardRight=92, B cardLeft=309
    expect(computeArrowPath(c(0,1,0), c(3,4,0), G)).toEqual(p([92,30],[309,30]));
  });
});

// ─── Adjacent column, different row (L-shape) ─────────────────────────────────
//
//  4 points:
//  (cardRight, srcCenterY)
//  (cellRight, srcCenterY)   ← 8 px exit stub to column-boundary grid line
//  (cellRight, tgtCenterY)   ← vertical travel on column boundary
//  (tgtCardLeft, tgtCenterY) ← 9 px entry stub into target card

describe('adjacent column, different row → L-shape', () => {
  it('target one row below', () => {
    // r0: [A] ·
    // r1:  ·  [B]
    // A: cardRight=92, srcCenterY=30, cellRight=100
    // B: cardLeft=109, tgtCenterY=90
    expect(computeArrowPath(c(0,1,0), c(1,2,1), G))
      .toEqual(p([92,30],[100,30],[100,90],[109,90]));
  });

  it('target one row above', () => {
    // r0:  ·  [B]
    // r1: [A]  ·
    // A: cardRight=92, srcCenterY=90, cellRight=100
    // B: cardLeft=109, tgtCenterY=30
    expect(computeArrowPath(c(0,1,1), c(1,2,0), G))
      .toEqual(p([92,90],[100,90],[100,30],[109,30]));
  });

  it('target two rows below', () => {
    // A: row 0, cellRight=100, srcCenterY=30
    // B: row 2, cardLeft=109, tgtCenterY=150
    expect(computeArrowPath(c(0,1,0), c(1,2,2), G))
      .toEqual(p([92,30],[100,30],[100,150],[109,150]));
  });
});

// ─── Non-adjacent column, different row (Z-shape) ─────────────────────────────
//
//  4 points:
//  (cardRight,   srcCenterY)   exit card right-center
//  (tgtCellLeft, srcCenterY)   travel right to target's left column boundary
//  (tgtCellLeft, tgtCenterY)   travel up/down on that grid line
//  (tgtCardLeft, tgtCenterY)   short stub into target card
//
//  tgtCellLeft (col c) = c*100   (laneColWidth=0)
//  tgtCardLeft (col c) = c*100 + 9

describe('non-adjacent column, different row → Z-shape', () => {
  it('source above-left, target below-right', () => {
    // r0: [A]  ·   ·
    // r1:  ·   · [B]
    // A: cardRight=92, srcCenterY=30
    // B: cellLeft=200, cardLeft=209, tgtCenterY=90
    expect(computeArrowPath(c(0,1,0), c(2,3,1), G))
      .toEqual(p([92,30],[200,30],[200,90],[209,90]));
  });

  it('source below-left, target above-right', () => {
    // r0:  ·   · [B]
    // r1: [A]  ·   ·
    // A: cardRight=92, srcCenterY=90
    // B: cellLeft=200, cardLeft=209, tgtCenterY=30
    expect(computeArrowPath(c(0,1,1), c(2,3,0), G))
      .toEqual(p([92,90],[200,90],[200,30],[209,30]));
  });

  it('two rows gap, source above', () => {
    // A row 0 → B row 2, col 2
    // B: cellLeft=200, cardLeft=209, tgtCenterY=150
    expect(computeArrowPath(c(0,1,0), c(2,3,2), G))
      .toEqual(p([92,30],[200,30],[200,150],[209,150]));
  });

  it('far right target', () => {
    // A row 0 col 0→1, B row 1 col 3→4
    // B: cellLeft=300, cardLeft=309, tgtCenterY=90
    expect(computeArrowPath(c(0,1,0), c(3,4,1), G))
      .toEqual(p([92,30],[300,30],[300,90],[309,90]));
  });
});

// ─── Spanning cards ────────────────────────────────────────────────────────────

describe('spanning cards', () => {
  it('source spans 3 cols, adjacent target → L-shape from right of span', () => {
    // [A===] · → [B]  (A: col 0-2, B: col 3-3, row 1)
    // A: cardRight=300-8=292, cellRight=300
    // B: cardLeft=300+9=309, tgtCenterY=90
    expect(computeArrowPath(c(0,3,0), c(3,4,1), G))
      .toEqual(p([292,30],[300,30],[300,90],[309,90]));
  });

  it('source spans 3 cols, non-adjacent target → Z-shape from right of span', () => {
    // A: col 0-2, B: col 4, row 1
    // A: cardRight=292
    // B: cellLeft=400, cardLeft=409, tgtCenterY=90
    expect(computeArrowPath(c(0,3,0), c(4,5,1), G))
      .toEqual(p([292,30],[400,30],[400,90],[409,90]));
  });

  it('target spans 2 cols → entry at LEFT edge of span', () => {
    // A: col 0-0, B: col 2-3, row 1
    // B: cellLeft=200, cardLeft=209, tgtCenterY=90
    expect(computeArrowPath(c(0,1,0), c(2,4,1), G))
      .toEqual(p([92,30],[200,30],[200,90],[209,90]));
  });
});

// ─── Real Gantt constants (absolute pixel verification) ───────────────────────
//
//  LANE_COL_WIDTH=160, SLICE_COL_WIDTH=120, ROW_HEIGHT=72, HEADER_HEIGHT=44
//  cellPadding=8, cellBorderLeft=1
//
//  cardLeft  (col c) = 160 + c*120 + 9
//  cardRight (endCol e) = 160 + e*120 − 8
//  cardCenterY (row r) = 44 + r*72 + 36
//  cellRight  = 160 + endCol*120
//  cellTop    = 44 + row*72

const GANTT: GridConfig = {
  laneColWidth:  160,
  colWidth:      120,
  rowHeight:     72,
  headerHeight:  44,
  cellPadding:   8,
  cellBorderLeft: 1,
};

// Same as GANTT but with the 1px container border origin offset AND the real
// stage-block height — matches actual rendered pixel positions (verified via
// getBoundingClientRect in Storybook).
const GANTT_REAL: GridConfig = { ...GANTT, originX: 1, originY: 1, stageBlockHeight: 52 };

describe('real Gantt – cardAttachPoint absolute positions', () => {
  // Lane 0 (row 0), slice 0 (col 0), single column
  const s0c0: CardBounds = { startCol: 0, endCol: 1, row: 0 };
  // cardLeft=169, cardRight=272, cardCenterY=80, cardTop=53, cardBottom=107

  it('right-center = exit point', () => {
    expect(cardAttachPoint(s0c0, 'right', 'center', GANTT)).toEqual({ x: 272, y: 80 });
  });

  it('left-center = entry point', () => {
    expect(cardAttachPoint(s0c0, 'left', 'center', GANTT)).toEqual({ x: 169, y: 80 });
  });

  it('top-start = top-left corner', () => {
    // cardTop = 44 + 0*72 + 1 + 8 = 53
    expect(cardAttachPoint(s0c0, 'top', 'start', GANTT)).toEqual({ x: 169, y: 53 });
  });

  it('bottom-end = bottom-right corner', () => {
    // cardBottom = 44 + 1*72 - 8 = 108
    expect(cardAttachPoint(s0c0, 'bottom', 'end', GANTT)).toEqual({ x: 272, y: 108 });
  });

  // Lane 1 (row 1), slice 1 (col 1), spanning to slice 2 (endCol 3)
  const s1c1span2: CardBounds = { startCol: 1, endCol: 3, row: 1 };
  // cardLeft=160+120+9=289, cardRight=160+360-8=512, cardCenterY=44+72+36=152

  it('spanning card right-center', () => {
    expect(cardAttachPoint(s1c1span2, 'right', 'center', GANTT)).toEqual({ x: 512, y: 152 });
  });

  it('spanning card left-center', () => {
    expect(cardAttachPoint(s1c1span2, 'left', 'center', GANTT)).toEqual({ x: 289, y: 152 });
  });
});

describe('real Gantt – computeArrowPath absolute positions', () => {
  it('adjacent column, row 0 → row 1 (L-shape)', () => {
    // src: lane 0, slice 0  → cardRight=272, srcCenterY=80, cellRight=280
    // tgt: lane 1, slice 1  → cardLeft=289, tgtCenterY=152
    expect(computeArrowPath(
      { startCol: 0, endCol: 1, row: 0 },
      { startCol: 1, endCol: 2, row: 1 },
      GANTT,
    )).toEqual(p([272,80],[280,80],[280,152],[289,152]));
  });

  it('Z-shape: row 0 slice 0 → row 1 slice 2', () => {
    // src: cardRight=272, srcCenterY=80
    // tgt: cellLeft=160+2*120=400, cardLeft=409, tgtCenterY=152
    expect(computeArrowPath(
      { startCol: 0, endCol: 1, row: 0 },
      { startCol: 2, endCol: 3, row: 1 },
      GANTT,
    )).toEqual(p([272,80],[400,80],[400,152],[409,152]));
  });

  it('Z-shape: row 1 slice 0 → row 0 slice 2 (going up)', () => {
    // src: cardRight=272, srcCenterY=152
    // tgt: cellLeft=400, cardLeft=409, tgtCenterY=80
    expect(computeArrowPath(
      { startCol: 0, endCol: 1, row: 1 },
      { startCol: 2, endCol: 3, row: 0 },
      GANTT,
    )).toEqual(p([272,152],[400,152],[400,80],[409,80]));
  });

  it('same row across 3 slices', () => {
    // src: lane 0, slice 0 → cardRight=272, srcCenterY=80
    // tgt: lane 0, slice 3 → cardLeft=160+3*120+9=529, tgtCenterY=80
    expect(computeArrowPath(
      { startCol: 0, endCol: 1, row: 0 },
      { startCol: 3, endCol: 4, row: 0 },
      GANTT,
    )).toEqual(p([272,80],[529,80]));
  });
});

// ─── pathToString / renderGrid ────────────────────────────────────────────────

describe('pathToString', () => {
  it('two-point path', () => {
    expect(pathToString(p([92,30],[209,30]))).toBe('(92,30) → (209,30)');
  });
  it('five-point Z-shape', () => {
    expect(pathToString(p([92,30],[100,30],[100,60],[209,60],[209,90])))
      .toBe('(92,30) → (100,30) → (100,60) → (209,60) → (209,90)');
  });
});

describe('renderGrid', () => {
  it('contains card labels and dots', () => {
    const out = renderGrid(2, 3, [
      { label: 'A', bounds: c(0,1,0) },
      { label: 'B', bounds: c(2,3,1) },
    ]);
    expect(out).toContain('[A');
    expect(out).toContain('[B');
    expect(out).toContain('.');
  });
});

// ─── Backwards routing (target left of source exit) ───────────────────────────
//
//  Top/bottom band routing is used whenever t.cardLeft < exitX.
//  Top band (y = −20) when tgt.row ≤ src.row.
//  Bottom band        when tgt.row >  src.row.
//
//  G constants (laneColWidth=0, colWidth=100):
//    cellLeft(c)   = c*100
//    cardLeft(c)   = c*100 + 9
//    cardRight(e)  = e*100 − 8
//    cardTop(r)    = r*60 + 9
//    cardBottom(r) = (r+1)*60 − 8
//    cardCenterY(r)= r*60 + 30
//    cellTop(r)    = r*60
//    cellBottom(r) = (r+1)*60

describe('backwards routing → top/bottom band', () => {
  it('same row: source right of target → top arch from card centre (inside canvas)', () => {
    // src: col 2-3, row 0 → cardLeft=209, cardRight=292 → cardCenterX=250.5, cardTop=9
    // tgt: col 0-1, row 0 → cardLeft=9, cellLeft=0, cardCenterY=30
    // useTop=true; band = originY + headerHeight = 0 (header bottom border).
    // Default backwards exit leaves the TOP-CENTRE of the source, not the corner.
    expect(computeArrowPath(c(2,3,0), c(0,1,0), G))
      .toEqual(p([250.5,9],[250.5,0],[0,0],[0,30],[9,30]));
  });

  it('target one row above → top arch from card centre (inside canvas)', () => {
    // src: col 2-3, row 1 → cardCenterX=250.5, cardTop=69, cellBottom=120
    // tgt: col 0-1, row 0 → cardLeft=9, cellLeft=0, cardCenterY=30
    // useTop=(0≤1)=true; band=0, exits the top-centre of the source.
    expect(computeArrowPath(c(2,3,1), c(0,1,0), G))
      .toEqual(p([250.5,69],[250.5,0],[0,0],[0,30],[9,30]));
  });

  it('target one row below → exit bottom centre, drop to grid line, go left, drop to target', () => {
    // src: col 2-3, row 0 → cardCenterX=250.5, cardBottom=52, cellBottom=60
    // tgt: col 0-1, row 1 → cardLeft=9, cellLeft=0, cardCenterY=90
    // useTop=(1≤0)=false → exit bottom-centre (250.5,52), drop to grid line (250.5,60),
    //                       left to (0,60), drop to (0,90), stub to (9,90)
    expect(computeArrowPath(c(2,3,0), c(0,1,1), G))
      .toEqual(p([250.5,52],[250.5,60],[0,60],[0,90],[9,90]));
  });
});

// ─── Degenerate forward: exitX lands exactly on t.cellLeft ───────────────────
//
//  Rule: the vertical segment must travel on the column grid line (x = t.cellLeft),
//        never inside the target card (x = t.cardLeft = t.cellLeft + bdr + pad).
//  This is the "Core Engine → Beta" shape: the exit point is a column boundary,
//  which is also the target's left cell edge.
//
//  Target below (tgt.row > src.row):  3-pt path
//    (exitX, cardBottom)        exit source bottom surface
//    (t.cellLeft, tgtCenterY)   drop *on the grid line* to target centre Y
//    (tgtCardLeft, tgtCenterY)  short stub right into target card
//
//  Target above (tgt.row < src.row):  3-pt path
//    (exitX, srcCenterY)        exit source at centre Y
//    (exitX, tgtCenterY)        travel on the grid line to target centre Y
//    (tgtCardLeft, tgtCenterY)  stub right into target card

describe('degenerate forward — exitX === t.cellLeft', () => {
  it('target below: vertical on grid line (cellLeft), NOT inside card (cardLeft)', () => {
    // src: col 0-1, row 0 → cardBottom=52, srcCenterY=30
    // tgt: col 1-2, row 1 → cellLeft=100, cardLeft=109, cardCenterY=90
    // exitX=100 === t.cellLeft
    // 3-pt path: (100,52)→(100,90)→(109,90)
    // Regression guard: must NOT be (100,52)→(100,60)→(109,60)→(109,90) [vertical inside card]
    const path = computeArrowPath(c(0,1,0), c(1,2,1), G, { srcExitX: 100 });
    expect(path).toEqual(p([100,52],[100,90],[109,90]));
    // The vertical segment (pts[0]→pts[1]) must be at x=cellLeft=100, not x=cardLeft=109
    expect(path[0].x).toBe(100);
    expect(path[1].x).toBe(100);
  });

  it('target above: vertical on grid line (cellLeft)', () => {
    // src: col 0-1, row 1 → srcCenterY=90
    // tgt: col 1-2, row 0 → cellLeft=100, cardLeft=109, cardCenterY=30
    // exitX=100 === t.cellLeft
    // 3-pt path: (100,90)→(100,30)→(109,30)
    const path = computeArrowPath(c(0,1,1), c(1,2,0), G, { srcExitX: 100 });
    expect(path).toEqual(p([100,90],[100,30],[109,30]));
    expect(path[0].x).toBe(100);
    expect(path[1].x).toBe(100);
  });
});

// ─── Custom exit (srcExitX supplied) ─────────────────────────────────────────
//
//  Forward custom exits (exitX ≤ entryX) use L/Z routing — same as default but
//  starting from the custom X position at src.cardCenterY.
//  Backwards custom exits (exitX > entryX) still use band routing.

describe('custom exit point — forward → L/Z routing', () => {
  it('mid-col exit, same row, target right → straight horizontal', () => {
    // src: col 0-2, row 0, srcExitX=50 (mid col 0)
    // tgt: col 3-4, row 0 → cardLeft=309, cardCenterY=30
    // exitX=50 < entryX=309 → forward → same-row straight
    expect(computeArrowPath(c(0,2,0), c(3,4,0), G, { srcExitX: 50 }))
      .toEqual(p([50,30],[309,30]));
  });

  it('mid-body exit, different row below, target right, nothing in the way → straight L (one bend)', () => {
    // src: col 0-2, row 0, srcExitX=100 (col0/col1 boundary, INSIDE the span body)
    //   → cardRight=192, cardBottom=52
    // tgt: col 2-3, row 1 → cardLeft=209, cardCenterY=90
    // exitX=100 < cardRight=192 → exit the bottom; no obstacles → drop straight
    //   to entryY then straight across: 3-pt L.
    expect(computeArrowPath(c(0,2,0), c(2,3,1), G, { srcExitX: 100 }))
      .toEqual(p([100,52],[100,90],[209,90]));
  });

  it('backwards custom exit, same row → top arch (inside canvas)', () => {
    // src: col 0-2, row 0, srcExitX=50 (mid col 0)
    // tgt: col 0-1, row 0 → cardLeft=9
    // exitX=50 > entryX=9 → backwards, useTop=(0≤0)=true → top arc
    // cardTop(row 0) = 9, band = 0 (header-strip top), cellLeft=0
    expect(computeArrowPath(c(0,2,0), c(0,1,0), G, { srcExitX: 50 }))
      .toEqual(p([50,9],[50,0],[0,0],[0,30],[9,30]));
  });

  it('backwards custom exit, target below → exit bottom, drop to grid line, go left, drop', () => {
    // src: col 0-2, row 0, srcExitX=50 (mid col 0), cardBottom=52, cellBottom=60
    // tgt: col 0-1, row 1 → cardLeft=9, cellLeft=0, cardCenterY=90
    // exitX=50 > entryX=9 → backwards, useTop=(1≤0)=false → exit bottom, drop to grid line, left, drop
    expect(computeArrowPath(c(0,2,0), c(0,1,1), G, { srcExitX: 50 }))
      .toEqual(p([50,52],[50,60],[0,60],[0,90],[9,90]));
  });
});

// ─── exitXFromAt ─────────────────────────────────────────────────────────────

describe('exitXFromAt', () => {
  const slices = ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4'];

  it('slice name → right edge of that column (laneColWidth=0)', () => {
    // col 0 right edge = 0 + 1*100 = 100
    expect(exitXFromAt('2025-Q1', slices, G)).toBe(100);
  });

  it('Mid slice → midpoint of that column', () => {
    // col 1 midpoint = 0 + 1*100 + 50 = 150
    expect(exitXFromAt('Mid 2025-Q2', slices, G)).toBe(150);
  });

  it('case-insensitive Mid prefix', () => {
    expect(exitXFromAt('mid 2025-Q2', slices, G)).toBe(150);
  });

  it('with laneColWidth offset (real Gantt)', () => {
    // GANTT: laneColWidth=160, colWidth=120
    // "2025-Q1" = col 0 right edge = 160 + 1*120 = 280
    expect(exitXFromAt('2025-Q1', slices, GANTT)).toBe(280);
    // "Mid 2025-Q2" = col 1 midpoint = 160 + 1*120 + 60 = 340
    expect(exitXFromAt('Mid 2025-Q2', slices, GANTT)).toBe(340);
  });
});

// ─── Real Gantt – MultiExit plan alignment ────────────────────────────────────
//
//  Uses GANTT_REAL (originX=1, originY=1, stageBlockHeight=52) — coordinates
//  verified against getBoundingClientRect() in Storybook.
//
//  GANTT_REAL: laneColWidth=160, colWidth=120, rowHeight=72, headerHeight=44,
//              pad=8, bdr=1, originX=1, originY=1, stageBlockHeight=52
//
//  cardTop(r)    = 1 + 44 + r*72 + 1 + 8 = r*72 + 54
//  cardBottom(r) = cardTop(r) + 52
//  cardCenterY(r)= cardTop(r) + 26
//
//  Stages:
//    hub   row0, cols 0-2  cardRight=393  cardTop=54  cardBottom=106  cardCenterY=80
//    alpha row1, col  0-1  cardLeft=170   cellLeft=161  cardCenterY=152
//    beta  row1, col  1-2  cardLeft=290   cellLeft=281  cardCenterY=152
//    gamma row2, col  2-3  cardLeft=410   cellLeft=401  cardCenterY=224
//    delta row2, col  3-4  cardLeft=530   cellLeft=521  cardCenterY=224
//    future row3, col 3-4  cardRight=633  cardTop=270
//    retro  row3, col 1-2  cardLeft=290   cellLeft=281  cardCenterY=296

const SLICES = ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4'];

describe('real Gantt – MultiExit plan alignment (originX=1, originY=1)', () => {
  it('hub→alpha: Mid-Q1 exit, backwards-downward → exit bottom, drop to grid line, go left, drop', () => {
    // exitX = exitXFromAt('Mid 2025-Q1', GANTT_REAL) = 1 + 160 + 60 = 221
    // alpha.cardLeft=170 < 221 → backwards; tgt.row1 > src.row0 → backwards-down
    // hub: cardBottom(row0)=106, cellBottom(row0)=1+44+1*72=117
    // alpha: cellLeft=161, cardCenterY=152, cardLeft=170
    const exitX = exitXFromAt('Mid 2025-Q1', SLICES, GANTT_REAL);
    expect(exitX).toBe(221);
    expect(computeArrowPath(
      { startCol: 0, endCol: 2, row: 0 },
      { startCol: 0, endCol: 1, row: 1 },
      GANTT_REAL, { srcExitX: exitX },
    )).toEqual(p([221,106],[221,117],[161,117],[161,152],[170,152]));
  });

  it('hub→beta: Q1-boundary exit, exitX===cellLeft, target below → exit bottom, vertical on grid line, stub right', () => {
    // exitX = exitXFromAt('2025-Q1', GANTT_REAL) = 1 + 160 + 120 = 281 = beta.cellLeft
    // beta.cardLeft=290 > 281 → forward; exitX===cellLeft, tgt.row1>src.row0
    //   Rule: vertical segment must be on column grid line (x=281=cellLeft),
    //         NOT inside target card (x=290=cardLeft).
    //   3-pt path: exit bottom (281,106) → drop on grid line to entryY (281,152)
    //              → stub right into card (290,152)
    // hub: cardBottom=106
    // beta: cellLeft=281, cardLeft=290, cardCenterY=152
    const exitX = exitXFromAt('2025-Q1', SLICES, GANTT_REAL);
    expect(exitX).toBe(281);
    expect(computeArrowPath(
      { startCol: 0, endCol: 2, row: 0 },
      { startCol: 1, endCol: 2, row: 1 },
      GANTT_REAL, { srcExitX: exitX },
    )).toEqual(p([281,106],[281,152],[290,152]));
  });

  it('hub→gamma: default exit, forward Z-shape', () => {
    // exitX = hub.cardRight = 1 + 160 + 2*120 - 8 = 393
    // gamma.cardLeft=410, cellLeft=401; hub.cardCenterY=80, gamma.cardCenterY=224
    expect(computeArrowPath(
      { startCol: 0, endCol: 2, row: 0 },
      { startCol: 2, endCol: 3, row: 2 },
      GANTT_REAL,
    )).toEqual(p([393,80],[401,80],[401,224],[410,224]));
  });

  it('hub→delta: Mid-Q2 exit, target below, nothing in the way → straight down then turn', () => {
    // exitX = exitXFromAt('Mid 2025-Q2', GANTT_REAL) = 1 + 160 + 120 + 60 = 341
    // 341 sits inside the hub body (hub.cardRight=393) → exit the bottom.
    // hub.cardBottom=106; delta.cardLeft=530, cardCenterY=224
    //   With no obstacles: straight down the Mid-Q2 column to Delta's centre Y,
    //   then straight across into Delta — one bend.
    const exitX = exitXFromAt('Mid 2025-Q2', SLICES, GANTT_REAL);
    expect(exitX).toBe(341);
    expect(computeArrowPath(
      { startCol: 0, endCol: 2, row: 0 },
      { startCol: 3, endCol: 4, row: 2 },
      GANTT_REAL, { srcExitX: exitX },
    )).toEqual(p([341,106],[341,224],[530,224]));
  });

  it('hub→delta with Gamma in the way → routes around Gamma (grid-line detour)', () => {
    // Gamma occupies Delta's row between the Mid-Q2 column and Delta:
    //   gamma { col 2-3, row 2 } → cardLeft=410, cardRight=513, cardTop=198, cardBottom=250
    // The straight route's horizontal leg at y=224 would cross Gamma, so the
    // arrow detours along the grid line just below the hub (y=117) instead.
    const exitX = exitXFromAt('Mid 2025-Q2', SLICES, GANTT_REAL);  // 341
    const gamma: CardBounds = { startCol: 2, endCol: 3, row: 2 };
    const path = computeArrowPath(
      { startCol: 0, endCol: 2, row: 0 },
      { startCol: 3, endCol: 4, row: 2 },
      GANTT_REAL, { srcExitX: exitX, obstacles: [gamma] },
    );
    expect(path).toEqual(p([341,106],[341,117],[521,117],[521,224],[530,224]));
    // …and the detour genuinely clears Gamma's interior.
    expect(
      pathOverlapsCard(path, gamma, GANTT_REAL),
      `detour ${pathToString(path)} still crosses Gamma`,
    ).toBe(false);
  });

  it('future→retro: backwards same-row → top arc from the source top-centre', () => {
    // future.cardLeft=530, cardRight=633 → cardCenterX=581.5. Default backwards exit
    // leaves the TOP-CENTRE of the source card, not the top-right corner.
    // retro.cardLeft=290 < exit → backwards; same row → top arc.
    // band = originY + headerHeight = 1 + 44 = 45 — the header bottom border
    // (cellTop of row 0). Above every card body (card tops are at 54) but never
    // up inside the header.
    // future.cardTop = 1 + 44 + 3*72 + 1 + 8 = 270, retro.cellLeft=281, retro.cardCenterY=296
    expect(computeArrowPath(
      { startCol: 3, endCol: 4, row: 3 },
      { startCol: 1, endCol: 2, row: 3 },
      GANTT_REAL,
    )).toEqual(p([581.5,270],[581.5,45],[281,45],[281,296],[290,296]));
  });

  it('future→retro clears a card sitting between them (arc goes over the top)', () => {
    // blocker { col 2-3, row 3 } at Q3, directly between Retro (Q2) and Future (Q4):
    //   cardLeft=410, cardRight=513, cardTop=270, cardBottom=322
    // A direct same-row line would run through it; the over-the-top arc must not.
    const future:  CardBounds = { startCol: 3, endCol: 4, row: 3 };
    const retro:   CardBounds = { startCol: 1, endCol: 2, row: 3 };
    const blocker: CardBounds = { startCol: 2, endCol: 3, row: 3 };
    const path = computeArrowPath(future, retro, GANTT_REAL, { obstacles: [blocker] });
    expect(path).toEqual(p([581.5,270],[581.5,45],[281,45],[281,296],[290,296]));
    expect(
      pathOverlapsCard(path, blocker, GANTT_REAL),
      `arc ${pathToString(path)} crosses the in-between card`,
    ).toBe(false);
  });
});

// ─── Overlay detection: a custom mid-card exit must not draw through the card ──
//
//  The "Delta (Mid Q2)" dependency exits the hub at the *midpoint of Q2*, which
//  sits inside the hub's horizontal body (hub spans Q1–Q2). If the arrow leaves
//  at the card's centre Y and travels horizontally, that first segment is drawn
//  straight through the hub card. Because the target (delta) is two rows BELOW,
//  the arrow must instead exit the hub's BOTTOM surface.
//
//  These tests reconstruct the hub's rectangle from cardAttachPoint() (the same
//  geometry a getBoundingClientRect() would report) and assert no path segment
//  passes through its interior.

interface Rect { left: number; top: number; right: number; bottom: number; }

/** Hub rectangle from two opposite corner attach points (mirrors a DOM rect). */
function cardRect(card: CardBounds, g: GridConfig): Rect {
  const tl = cardAttachPoint(card, 'top', 'start', g);   // (cardLeft,  cardTop)
  const br = cardAttachPoint(card, 'bottom', 'end', g);  // (cardRight, cardBottom)
  return { left: tl.x, top: tl.y, right: br.x, bottom: br.y };
}

/**
 * Does an axis-aligned segment pass through the OPEN interior of `r`?
 * Points lying exactly on an edge (e.g. an exit on the bottom surface) do not
 * count — only a segment that crosses the inside of the card is an overlay.
 */
function segmentEntersRect(a: Point, b: Point, r: Rect): boolean {
  const EPS = 0.5;
  if (Math.abs(a.y - b.y) < EPS) {            // horizontal segment
    const y = a.y;
    if (y <= r.top + EPS || y >= r.bottom - EPS) return false;
    const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
    return hi > r.left + EPS && lo < r.right - EPS;
  }
  if (Math.abs(a.x - b.x) < EPS) {            // vertical segment
    const x = a.x;
    if (x <= r.left + EPS || x >= r.right - EPS) return false;
    const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y);
    return hi > r.top + EPS && lo < r.bottom - EPS;
  }
  return false;                               // diagonal — not produced here
}

function pathOverlapsCard(path: ArrowPath, card: CardBounds, g: GridConfig): boolean {
  const r = cardRect(card, g);
  for (let i = 0; i + 1 < path.length; i++) {
    if (segmentEntersRect(path[i], path[i + 1], r)) return true;
  }
  return false;
}

describe('overlay detection — hub→delta Mid-Q2 exit must leave the bottom', () => {
  const hub:   CardBounds = { startCol: 0, endCol: 2, row: 0 };  // spans Q1–Q2
  const delta: CardBounds = { startCol: 3, endCol: 4, row: 2 };  // Q4, two rows below
  const exitX = exitXFromAt('Mid 2025-Q2', SLICES, GANTT_REAL);  // 341

  it('sanity: the Mid-Q2 exit X sits inside the hub body', () => {
    const hubRight = cardAttachPoint(hub, 'right', 'center', GANTT_REAL).x;  // 393
    // 341 < 393 → a centre-Y horizontal exit would be drawn through the hub.
    expect(exitX).toBeLessThan(hubRight);
  });

  it('the arrow path does NOT cross the hub card interior', () => {
    const path = computeArrowPath(hub, delta, GANTT_REAL, { srcExitX: exitX });
    expect(
      pathOverlapsCard(path, hub, GANTT_REAL),
      `arrow path ${pathToString(path)} overlays the hub card`,
    ).toBe(false);
  });

  it('the arrow exits from the hub BOTTOM surface (target is below)', () => {
    const path = computeArrowPath(hub, delta, GANTT_REAL, { srcExitX: exitX });
    const hubBottom = cardAttachPoint(hub, 'bottom', 'center', GANTT_REAL).y;  // 106
    expect(path[0].x).toBe(exitX);
    expect(path[0].y).toBe(hubBottom);
  });
});

// ─── Routing invariants: every path stays inside the canvas and crosses no card ─
//
//  The SVG canvas the arrows are drawn into spans [0,totalWidth] × [0,totalHeight]
//  (see DependencyArrows.tsx):
//    totalWidth  = laneColWidth + numCols * colWidth
//    totalHeight = headerHeight + numRows * rowHeight
//  No waypoint may fall outside it (the old over-the-top arc used y=-20, which
//  left the canvas), and no segment may pass through any card body — including
//  the source and target (the path may only touch their edges).

function canvasSize(g: GridConfig, numRows: number, numCols: number) {
  return {
    width:  g.laneColWidth + numCols * g.colWidth,
    height: g.headerHeight + numRows * g.rowHeight,
  };
}

function pointOutsideCanvas(pt: Point, width: number, height: number, tol = 1.5): boolean {
  return pt.x < -tol || pt.x > width + tol || pt.y < -tol || pt.y > height + tol;
}

interface RoutingScenario {
  name: string;
  src: CardBounds;
  tgt: CardBounds;
  grid: GridConfig;
  options?: ArrowOptions;
  /** Every card present on the grid (src + tgt + any obstacles). */
  cards: CardBounds[];
  rows: number;
  cols: number;
}

const R = (startCol: number, endCol: number, row: number): CardBounds => ({ startCol, endCol, row });

const ROUTING_SCENARIOS: RoutingScenario[] = [
  // ── Forward shapes ──────────────────────────────────────────────────────────
  { name: 'same row, forward', src: R(0,1,0), tgt: R(3,4,0), grid: GANTT_REAL,
    cards: [R(0,1,0), R(3,4,0)], rows: 1, cols: 4 },
  { name: 'L-shape, target one row below', src: R(0,1,0), tgt: R(1,2,1), grid: GANTT_REAL,
    cards: [R(0,1,0), R(1,2,1)], rows: 2, cols: 2 },
  { name: 'L-shape, target one row above', src: R(0,1,1), tgt: R(1,2,0), grid: GANTT_REAL,
    cards: [R(0,1,1), R(1,2,0)], rows: 2, cols: 2 },
  { name: 'Z-shape, target below-right', src: R(0,1,0), tgt: R(2,3,1), grid: GANTT_REAL,
    cards: [R(0,1,0), R(2,3,1)], rows: 2, cols: 3 },

  // ── Backwards shapes (these are the ones the old code routed off-canvas) ──────
  { name: 'backwards, same row → top arc', src: R(2,3,0), tgt: R(0,1,0), grid: GANTT_REAL,
    cards: [R(2,3,0), R(0,1,0)], rows: 1, cols: 3 },
  { name: 'backwards, target one row above → top arc', src: R(2,3,1), tgt: R(0,1,0), grid: GANTT_REAL,
    cards: [R(2,3,1), R(0,1,0)], rows: 2, cols: 3 },
  { name: 'backwards, target one row below → bottom route', src: R(2,3,0), tgt: R(0,1,1), grid: GANTT_REAL,
    cards: [R(2,3,0), R(0,1,1)], rows: 2, cols: 3 },

  // ── Custom mid-card exits ─────────────────────────────────────────────────────
  { name: 'hub→delta: Mid-Q2 exit, straight down', src: R(0,2,0), tgt: R(3,4,2), grid: GANTT_REAL,
    options: { srcExitX: exitXFromAt('Mid 2025-Q2', SLICES, GANTT_REAL) },
    cards: [R(0,2,0), R(3,4,2)], rows: 3, cols: 4 },
  { name: 'hub→delta around Gamma', src: R(0,2,0), tgt: R(3,4,2), grid: GANTT_REAL,
    options: { srcExitX: exitXFromAt('Mid 2025-Q2', SLICES, GANTT_REAL), obstacles: [R(2,3,2)] },
    cards: [R(0,2,0), R(3,4,2), R(2,3,2)], rows: 3, cols: 4 },
  { name: 'hub→beta: Q1-boundary exit (exitX===cellLeft)', src: R(0,2,0), tgt: R(1,2,1), grid: GANTT_REAL,
    options: { srcExitX: exitXFromAt('2025-Q1', SLICES, GANTT_REAL) },
    cards: [R(0,2,0), R(1,2,1)], rows: 2, cols: 4 },

  // ── Future→Retro (the reported off-canvas case), bare and with a blocker ──────
  { name: 'future→retro: backwards top arc', src: R(3,4,3), tgt: R(1,2,3), grid: GANTT_REAL,
    cards: [R(3,4,3), R(1,2,3)], rows: 4, cols: 4 },
  { name: 'future→retro with a card in the way', src: R(3,4,3), tgt: R(1,2,3), grid: GANTT_REAL,
    options: { obstacles: [R(2,3,3)] },
    cards: [R(3,4,3), R(1,2,3), R(2,3,3)], rows: 4, cols: 4 },
];

describe('routing invariants — inside the canvas, never through a card', () => {
  for (const sc of ROUTING_SCENARIOS) {
    it(`${sc.name}: every waypoint stays inside the canvas`, () => {
      const path = computeArrowPath(sc.src, sc.tgt, sc.grid, sc.options);
      const { width, height } = canvasSize(sc.grid, sc.rows, sc.cols);
      for (const pt of path) {
        expect(
          pointOutsideCanvas(pt, width, height),
          `(${pt.x}, ${pt.y}) lies outside the ${width}×${height} canvas in ${pathToString(path)}`,
        ).toBe(false);
      }
    });

    it(`${sc.name}: no segment passes through a card body`, () => {
      const path = computeArrowPath(sc.src, sc.tgt, sc.grid, sc.options);
      for (const card of sc.cards) {
        expect(
          pathOverlapsCard(path, card, sc.grid),
          `${pathToString(path)} passes through a card body`,
        ).toBe(false);
      }
    });

    it(`${sc.name}: never rises above the header bottom border`, () => {
      // Nothing may go higher than the header/row-0 grid line — the top arc rides
      // that border, it must not climb up into the header (or above the canvas).
      const path = computeArrowPath(sc.src, sc.tgt, sc.grid, sc.options);
      const headerBottom = (sc.grid.originY ?? 0) + sc.grid.headerHeight;
      const highest = Math.min(...path.map(pt => pt.y));
      expect(
        highest,
        `highest point y=${highest} rises above the header bottom border y=${headerBottom} `
        + `in ${pathToString(path)}`,
      ).toBeGreaterThanOrEqual(headerBottom - 0.5);
    });
  }
});

// ─── Connection invariants: endpoints attach to a card EDGE INTERIOR, not a corner ─
//
//  Every arrow must visibly connect to its cards. The exit (first point) sits on
//  the source card's perimeter and the entry (last point) on the target's — and on
//  the *interior* of one edge, never on a corner. A corner attachment (e.g. the
//  top-RIGHT of a card) reads as "floating / not connected": for a backwards arrow
//  that arcs over the top, the natural exit is the top-CENTRE of the source card,
//  not its top-right corner. This runs over every routing scenario so the same
//  "disconnected endpoint" regression is caught in any shape, not just the one a
//  human happened to eyeball in Storybook.

type Edge = 'top' | 'bottom' | 'left' | 'right';

/** Direction of travel from a→b (orthogonal segments only). */
function segDir(a: Point, b: Point): 'up' | 'down' | 'left' | 'right' {
  if (Math.abs(a.x - b.x) < 0.5) return b.y > a.y ? 'down' : 'up';
  return b.x > a.x ? 'right' : 'left';
}

/** The edge an arrow LEAVES the source through, inferred from its first segment. */
function exitEdge(path: ArrowPath): Edge {
  const d = segDir(path[0], path[1]);
  return d === 'up' ? 'top' : d === 'down' ? 'bottom' : d === 'right' ? 'right' : 'left';
}

/** The edge an arrow ENTERS the target through, inferred from its last segment. */
function entryEdge(path: ArrowPath): Edge {
  const n = path.length;
  const d = segDir(path[n - 2], path[n - 1]);   // direction of arrival into the card
  // Arriving rightward means it came in through the target's LEFT edge, etc.
  return d === 'right' ? 'left' : d === 'left' ? 'right' : d === 'down' ? 'top' : 'bottom';
}

/** Assert `pt` sits on the interior of `edge` of `rect`: on the edge line AND
 *  strictly between that edge's two corners (a corner attachment fails). */
function expectEdgeInterior(pt: Point, edge: Edge, rect: Rect, label: string) {
  const EPS = 0.6;
  if (edge === 'top' || edge === 'bottom') {
    const edgeY = edge === 'top' ? rect.top : rect.bottom;
    expect(Math.abs(pt.y - edgeY),
      `${label}: endpoint y=${pt.y} is not on the ${edge} edge (y=${edgeY})`).toBeLessThan(EPS);
    const msg = `${label}: endpoint attaches at a CORNER (x=${pt.x}) of the ${edge} edge `
      + `spanning [${rect.left}, ${rect.right}] — it should connect to the edge interior (centre), not a corner`;
    expect(pt.x, msg).toBeGreaterThan(rect.left + EPS);
    expect(pt.x, msg).toBeLessThan(rect.right - EPS);
  } else {
    const edgeX = edge === 'left' ? rect.left : rect.right;
    expect(Math.abs(pt.x - edgeX),
      `${label}: endpoint x=${pt.x} is not on the ${edge} edge (x=${edgeX})`).toBeLessThan(EPS);
    const msg = `${label}: endpoint attaches at a CORNER (y=${pt.y}) of the ${edge} edge `
      + `spanning [${rect.top}, ${rect.bottom}] — it should connect to the edge interior (centre), not a corner`;
    expect(pt.y, msg).toBeGreaterThan(rect.top + EPS);
    expect(pt.y, msg).toBeLessThan(rect.bottom - EPS);
  }
}

describe('connection invariants — endpoints attach to a card edge interior, never a corner', () => {
  for (const sc of ROUTING_SCENARIOS) {
    it(`${sc.name}: exit connects to the source card edge interior`, () => {
      const path = computeArrowPath(sc.src, sc.tgt, sc.grid, sc.options);
      expectEdgeInterior(path[0], exitEdge(path), cardRect(sc.src, sc.grid),
        `exit of "${sc.name}" ${pathToString(path)}`);
    });

    it(`${sc.name}: entry connects to the target card edge interior`, () => {
      const path = computeArrowPath(sc.src, sc.tgt, sc.grid, sc.options);
      expectEdgeInterior(path[path.length - 1], entryEdge(path), cardRect(sc.tgt, sc.grid),
        `entry of "${sc.name}" ${pathToString(path)}`);
    });
  }
});
