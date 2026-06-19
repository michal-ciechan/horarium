/**
 * Playwright alignment test for the REAL <Gantt> component (not the isolated
 * MiniGantt used by the DependencyArrows stories).
 *
 * Systematic invariant: in any Gantt story, every dependency-arrow endpoint must
 * land on the edge-CENTRE of an actual stage card — exit centred on the source's
 * edge, entry centred on the target's. This is measured against the real rendered
 * card rects, so it catches the case where content-driven card growth (long titles
 * wrap → taller rows) shifts cards away from the fixed routing grid and the arrows
 * no longer connect to the middle.
 *
 * Run with: npx playwright test (Storybook served on port 17004)
 */
import { test, expect } from '@playwright/test';

interface Rect { x: number; y: number; width: number; height: number; }
interface Pt { x: number; y: number; }

/** All numeric (x,y) coordinate pairs in an SVG path, in order, as viewport points. */
function pathPoints(pathD: string, svg: Rect): Pt[] {
  const nums = [...pathD.matchAll(/[ML]\s+([\d.-]+)\s+([\d.-]+)|Q\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/g)];
  const pts: Pt[] = [];
  for (const m of nums) {
    if (m[1] !== undefined) pts.push({ x: svg.x + parseFloat(m[1]), y: svg.y + parseFloat(m[2]) });
    else {
      pts.push({ x: svg.x + parseFloat(m[3]), y: svg.y + parseFloat(m[4]) });
      pts.push({ x: svg.x + parseFloat(m[5]), y: svg.y + parseFloat(m[6]) });
    }
  }
  return pts;
}

/** Every stage card rect, the arrow SVG offset, and every arrow path `d`. */
async function readGantt(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const toRect = (r: DOMRect): Rect => ({ x: r.x, y: r.y, width: r.width, height: r.height });
    const cards = [...document.querySelectorAll('[class*="stageBlock"]')].map(el => {
      const r = el.getBoundingClientRect();
      return { label: (el.textContent ?? '').trim().slice(0, 24), x: r.x, y: r.y, width: r.width, height: r.height };
    });
    const svgEl = document.querySelector('svg[aria-hidden="true"]');
    const paths = svgEl ? [...svgEl.querySelectorAll('path')].map(p => p.getAttribute('d') ?? '') : [];
    return { cards, svg: svgEl ? toRect(svgEl.getBoundingClientRect()) : null, paths };
  }) as Promise<{ cards: (Rect & { label: string })[]; svg: Rect | null; paths: string[] }>;
}

const STORIES: { name: string; id: string }[] = [
  { name: 'PortfolioPlan', id: 'components-gantt--portfolio-plan' },
  { name: 'SimplePlan',    id: 'components-gantt--simple-plan' },
];

for (const story of STORIES) {
  test(`${story.name}: every arrow endpoint lands on a stage card edge-centre`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
    await page.waitForSelector('svg[aria-hidden="true"] path', { state: 'attached' });

    const scene = await readGantt(page);
    expect(scene.svg, 'expected the arrow SVG').toBeTruthy();
    expect(scene.cards.length, 'expected stage cards').toBeGreaterThan(0);
    expect(scene.paths.length, 'expected at least one arrow').toBeGreaterThan(0);

    // The only legitimate attach points: the centre of each of a card's 4 edges.
    const anchors = scene.cards.flatMap(c => {
      const cx = c.x + c.width / 2, cy = c.y + c.height / 2;
      return [
        { x: c.x + c.width, y: cy, desc: `${c.label} right-centre` },
        { x: c.x,           y: cy, desc: `${c.label} left-centre` },
        { x: cx, y: c.y,            desc: `${c.label} top-centre` },
        { x: cx, y: c.y + c.height, desc: `${c.label} bottom-centre` },
      ];
    });
    const nearest = (pt: Pt) => anchors.reduce(
      (best, a) => { const d = Math.hypot(pt.x - a.x, pt.y - a.y); return d < best.dist ? { a, dist: d } : best; },
      { a: anchors[0], dist: Infinity },
    );

    const TOL = 1.5;  // an arrow endpoint must sit on a card edge-centre, not near it
    const failures: string[] = [];
    for (const d of scene.paths) {
      const pts = pathPoints(d, scene.svg!);
      if (pts.length < 2) continue;
      for (const [which, pt] of [['exit', pts[0]], ['entry', pts[pts.length - 1]]] as const) {
        const { a, dist } = nearest(pt);
        if (dist > TOL) {
          failures.push(
            `${which} (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}) is ${dist.toFixed(1)}px off the nearest `
            + `card edge-centre (${a.desc} @ ${a.x.toFixed(1)}, ${a.y.toFixed(1)})`,
          );
        }
      }
    }
    expect(failures, `${failures.length} arrow endpoint(s) not centred on a card edge:\n  ${failures.join('\n  ')}`).toEqual([]);
  });
}
