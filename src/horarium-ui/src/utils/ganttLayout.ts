import type { Stage } from '../types/plan';
import { sliceIndex } from './slices';

export interface CellDef {
  slice: string;
  stage: Stage | null;
  span: number;
}

/**
 * Returns one CellDef per visible grid cell in a lane row.
 * Continuation slices of spanning stages are omitted so the CSS grid
 * receives exactly (slices.length) items — no more, no less.
 */
export function computeLaneCells(stages: Stage[], slices: string[]): CellDef[] {
  const cells: CellDef[] = [];
  for (const slice of slices) {
    const stage = stages.find(s => s.start === slice) ?? null;
    const sliceIdx = sliceIndex(slice, slices);
    const isCovered = stages.some(
      s => sliceIndex(s.start, slices) < sliceIdx && sliceIndex(s.end, slices) >= sliceIdx,
    );
    if (isCovered) continue;
    const span = stage
      ? sliceIndex(stage.end, slices) - sliceIndex(stage.start, slices) + 1
      : 1;
    cells.push({ slice, stage, span });
  }
  return cells;
}

/** Sum of all spans must equal slices.length — guarantees the row fills exactly one grid row. */
export function totalSpan(cells: CellDef[]): number {
  return cells.reduce((acc, c) => acc + c.span, 0);
}
