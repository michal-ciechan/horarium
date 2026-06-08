import { describe, it, expect } from 'vitest';
import { computeLaneCells, totalSpan } from './ganttLayout';
import type { Stage } from '../types/plan';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SLICES = ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4',
                '2027-Q1', '2027-Q2', '2027-Q3', '2027-Q4',
                '2028-Q1', '2028-Q2', '2028-Q3', '2028-Q4'];

function stage(id: string, start: string, end: string): Stage {
  return { id, laneId: 'lane', title: id, description: '', start, end, dependsOn: [], enables: [] };
}

// ─── Single-quarter stages ────────────────────────────────────────────────────

describe('no spanning stages', () => {
  it('empty lane produces one empty cell per slice', () => {
    const cells = computeLaneCells([], SLICES);
    expect(cells).toHaveLength(SLICES.length);
    expect(totalSpan(cells)).toBe(SLICES.length);
    expect(cells.every(c => c.stage === null && c.span === 1)).toBe(true);
  });

  it('single-quarter stage: one cell with span 1, rest empty', () => {
    const cells = computeLaneCells([stage('s1', '2026-Q2', '2026-Q2')], SLICES);
    expect(totalSpan(cells)).toBe(SLICES.length);
    const s1 = cells.find(c => c.slice === '2026-Q2');
    expect(s1?.stage?.id).toBe('s1');
    expect(s1?.span).toBe(1);
  });

  it('three non-adjacent single-quarter stages', () => {
    const stages = [
      stage('a', '2026-Q2', '2026-Q2'),
      stage('b', '2026-Q3', '2026-Q3'),
      stage('c', '2026-Q4', '2026-Q4'),
    ];
    const cells = computeLaneCells(stages, SLICES);
    expect(totalSpan(cells)).toBe(SLICES.length);
    expect(cells).toHaveLength(SLICES.length); // no cells dropped, no spans
  });
});

// ─── Spanning stages ──────────────────────────────────────────────────────────

describe('spanning stages', () => {
  it('2-quarter span: continuation slice is dropped, total span stays correct', () => {
    const cells = computeLaneCells([stage('s2', '2027-Q4', '2028-Q1')], SLICES);
    // 12 slices, one span-2 stage → 11 cells (10 empty + 1 span-2)
    expect(cells).toHaveLength(11);
    expect(totalSpan(cells)).toBe(SLICES.length);
    const spanCell = cells.find(c => c.stage?.id === 's2');
    expect(spanCell?.span).toBe(2);
    expect(spanCell?.slice).toBe('2027-Q4');
    // 2028-Q1 must not appear as a separate cell
    expect(cells.find(c => c.slice === '2028-Q1')).toBeUndefined();
  });

  it('two spanning stages in the same lane', () => {
    const stages = [
      stage('a', '2026-Q3', '2026-Q4'), // span 2
      stage('b', '2027-Q2', '2027-Q3'), // span 2
    ];
    const cells = computeLaneCells(stages, SLICES);
    // 12 slices − 2 dropped continuations = 10 cells, total span still 12
    expect(cells).toHaveLength(10);
    expect(totalSpan(cells)).toBe(SLICES.length);
  });

  it('3-quarter span drops 2 continuation cells', () => {
    const cells = computeLaneCells([stage('s3', '2027-Q1', '2027-Q3')], SLICES);
    expect(cells).toHaveLength(10); // 12 − 2
    expect(totalSpan(cells)).toBe(SLICES.length);
    const spanCell = cells.find(c => c.stage?.id === 's3');
    expect(spanCell?.span).toBe(3);
  });
});

// ─── Real plan stages (regression for portfolio-plan.md) ─────────────────────
//
// Stages that span multiple quarters in the sample plan:
//   quartz-4 : 2027-Q4 → 2028-Q1  (span 2)
//   cash-3   : 2027-Q2 → 2027-Q3  (span 2)
//   pnl-2    : 2027-Q1 → 2027-Q2  (span 2)
//   pnl-3    : 2027-Q3 → 2027-Q4  (span 2)
//   infra-2  : 2027-Q1 → 2027-Q2  (span 2)
//   infra-3  : 2028-Q1 → 2028-Q2  (span 2)

describe('portfolio-plan regression — total span = 12 for every lane', () => {
  const quartStages = [
    stage('q1', '2027-Q1', '2027-Q1'),
    stage('q2', '2027-Q2', '2027-Q2'),
    stage('q3', '2027-Q3', '2027-Q3'),
    stage('q4', '2027-Q4', '2028-Q1'), // spans 2
  ];
  it('Quartz lane fills exactly 12 columns', () => {
    const cells = computeLaneCells(quartStages, SLICES);
    expect(totalSpan(cells)).toBe(12);
  });

  const cashStages = [
    stage('cash1', '2026-Q3', '2026-Q3'),
    stage('cash2', '2026-Q4', '2026-Q4'),
    stage('cash3', '2027-Q2', '2027-Q3'), // spans 2
  ];
  it('Cash lane fills exactly 12 columns', () => {
    const cells = computeLaneCells(cashStages, SLICES);
    expect(totalSpan(cells)).toBe(12);
  });

  const pnlStages = [
    stage('pnl1', '2026-Q4', '2026-Q4'),
    stage('pnl2', '2027-Q1', '2027-Q2'), // spans 2
    stage('pnl3', '2027-Q3', '2027-Q4'), // spans 2
  ];
  it('PnL App lane fills exactly 12 columns', () => {
    const cells = computeLaneCells(pnlStages, SLICES);
    expect(totalSpan(cells)).toBe(12);
  });

  const infraStages = [
    stage('infra1', '2026-Q1', '2026-Q2'), // spans 2
    stage('infra2', '2027-Q1', '2027-Q2'), // spans 2
    stage('infra3', '2028-Q1', '2028-Q2'), // spans 2
  ];
  it('Infra lane fills exactly 12 columns', () => {
    const cells = computeLaneCells(infraStages, SLICES);
    expect(totalSpan(cells)).toBe(12);
  });
});
