import type { Timeslice } from '../types/plan';

export function getSlices(start: string, end: string, timeslice: Timeslice): string[] {
  if (timeslice === 'Quarter') return getQuarterSlices(start, end);
  if (timeslice === 'Month') return getMonthSlices(start, end);
  return [start, end];
}

export function sliceIndex(slice: string, slices: string[]): number {
  const idx = slices.indexOf(slice);
  return idx >= 0 ? idx : 0;
}

function getQuarterSlices(start: string, end: string): string[] {
  const [sy, sq] = parseQuarter(start);
  const [ey, eq] = parseQuarter(end);
  const result: string[] = [];
  let y = sy, q = sq;
  while (y < ey || (y === ey && q <= eq)) {
    result.push(`${y}-Q${q}`);
    q++;
    if (q > 4) { q = 1; y++; }
  }
  return result;
}

function parseQuarter(s: string): [number, number] {
  const m = s.match(/^(\d{4})-Q([1-4])$/);
  if (!m) return [0, 1];
  return [parseInt(m[1]), parseInt(m[2])];
}

function getMonthSlices(start: string, end: string): string[] {
  const [sy, sm] = parseMonth(start);
  const [ey, em] = parseMonth(end);
  const result: string[] = [];
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

function parseMonth(s: string): [number, number] {
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return [0, 1];
  return [parseInt(m[1]), parseInt(m[2])];
}
