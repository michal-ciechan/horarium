/**
 * Playwright alignment test: verifies that dependency arrows land exactly
 * on the bounding edges of the stage blocks they connect.
 *
 * Assertions for BackwardsDown (Platform → Widget, backwards-downward routing):
 *   1. Exit Y   ≈ Platform card bottom edge         (±1 px)
 *   2. Exit X   is within Platform horizontal bounds
 *   3. P1 X     = Exit X  (vertical drop before horizontal turn)
 *   4. Entry X  ≈ Widget card left edge             (±1 px)
 *   5. Entry Y  ≈ Widget card vertical centre       (±1 px)
 *
 * Run with: npx playwright test (Storybook served on port 17004)
 */
import { test, expect } from '@playwright/test';

interface Rect { x: number; y: number; width: number; height: number; }

/** Pull a stage card's rect, the SVG offset, and the arrow path `d` from the DOM. */
async function readArrowGeometry(
  page: import('@playwright/test').Page,
  sourceLabel: string,
  targetLabel: string,
) {
  return page.evaluate(({ sourceLabel, targetLabel }) => {
    const toRect = (r: DOMRect): Rect => ({ x: r.x, y: r.y, width: r.width, height: r.height });
    const allDivs = [...document.querySelectorAll('div')].reverse();  // innermost first
    const sourceEl = allDivs.find(d => d.textContent?.trim() === sourceLabel);
    const targetEl = allDivs.find(d => d.textContent?.trim() === targetLabel);
    const svgEl    = document.querySelector('svg[aria-hidden="true"]');
    const pathEl   = svgEl?.querySelector('path') ?? null;
    if (!sourceEl || !targetEl || !svgEl || !pathEl) return null;
    return {
      source: toRect(sourceEl.getBoundingClientRect()),
      target: toRect(targetEl.getBoundingClientRect()),
      svg:    toRect(svgEl.getBoundingClientRect()),
      pathD:  pathEl.getAttribute('d') ?? '',
    };
  }, { sourceLabel, targetLabel }) as Promise<
    { source: Rect; target: Rect; svg: Rect; pathD: string } | null
  >;
}

interface Pt { x: number; y: number; }

/** All numeric (x,y) coordinate pairs in an SVG path, in order, as viewport points. */
function pathPoints(pathD: string, svg: Rect): Pt[] {
  const nums = [...pathD.matchAll(/[ML]\s+([\d.-]+)\s+([\d.-]+)|Q\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/g)];
  const pts: Pt[] = [];
  for (const m of nums) {
    if (m[1] !== undefined) pts.push({ x: svg.x + parseFloat(m[1]), y: svg.y + parseFloat(m[2]) });
    else {
      // Q control + endpoint — include both (control ≈ the corner vertex)
      pts.push({ x: svg.x + parseFloat(m[3]), y: svg.y + parseFloat(m[4]) });
      pts.push({ x: svg.x + parseFloat(m[5]), y: svg.y + parseFloat(m[6]) });
    }
  }
  return pts;
}

/** Assert every waypoint lies within the SVG canvas rect (with a small tolerance). */
function expectWithinCanvas(pts: Pt[], svg: Rect, tol = 1.5): void {
  const left = svg.x - tol, right = svg.x + svg.width + tol;
  const top = svg.y - tol, bottom = svg.y + svg.height + tol;
  for (const pt of pts) {
    expect(
      pt.x >= left && pt.x <= right && pt.y >= top && pt.y <= bottom,
      `waypoint (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}) is outside the canvas `
      + `[${left.toFixed(0)}–${right.toFixed(0)}, ${top.toFixed(0)}–${bottom.toFixed(0)}]`,
    ).toBe(true);
  }
}

/** Does any axis-aligned segment of `pts` pass through the open interior of `r`? */
function segmentsCrossRect(pts: Pt[], r: Rect): boolean {
  const EPS = 1.5;
  const left = r.x, right = r.x + r.width, top = r.y, bottom = r.y + r.height;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    if (Math.abs(a.y - b.y) < EPS) {              // horizontal
      const y = a.y;
      if (y <= top + EPS || y >= bottom - EPS) continue;
      const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
      if (hi > left + EPS && lo < right - EPS) return true;
    } else if (Math.abs(a.x - b.x) < EPS) {       // vertical
      const x = a.x;
      if (x <= left + EPS || x >= right - EPS) continue;
      const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y);
      if (hi > top + EPS && lo < bottom - EPS) return true;
    }
  }
  return false;
}

/** Read every arrow path plus the named card rects and SVG offset from the DOM. */
async function readScene(page: import('@playwright/test').Page, labels: string[]) {
  return page.evaluate(({ labels }) => {
    const toRect = (r: DOMRect): Rect => ({ x: r.x, y: r.y, width: r.width, height: r.height });
    const allDivs = [...document.querySelectorAll('div')].reverse();  // innermost first
    const cards: Record<string, Rect | null> = {};
    for (const label of labels) {
      const el = allDivs.find(d => d.textContent?.trim() === label);
      cards[label] = el ? toRect(el.getBoundingClientRect()) : null;
    }
    const svgEl = document.querySelector('svg[aria-hidden="true"]');
    const paths = svgEl
      ? [...svgEl.querySelectorAll('path')].map(p => p.getAttribute('d') ?? '')
      : [];
    return { cards, svg: svgEl ? toRect(svgEl.getBoundingClientRect()) : null, paths };
  }, { labels }) as Promise<{ cards: Record<string, Rect | null>; svg: Rect | null; paths: string[] }>;
}

const STORY =
  '/iframe.html?id=components-dependencyarrows--backwards-down&viewMode=story';

test('BackwardsDown: exit touches Platform bottom, vertical drop, entry touches Widget left-centre', async ({ page }) => {
  await page.goto(STORY);
  await page.waitForSelector('svg[aria-hidden="true"] path', { state: 'attached' });

  const data = await page.evaluate(() => {
    const toRect = (r: DOMRect) => ({ x: r.x, y: r.y, width: r.width, height: r.height });

    const allDivs = Array.from(document.querySelectorAll('div'));
    // Reverse so .find() returns the innermost (deepest) matching element
    const platformEl = [...allDivs].reverse().find(d => d.textContent.trim() === 'Platform');
    const widgetEl   = [...allDivs].reverse().find(d => d.textContent.trim() === 'Widget');
    const svgEl      = document.querySelector('svg[aria-hidden="true"]');
    const pathEl     = svgEl?.querySelector('path') ?? null;

    if (!platformEl || !widgetEl || !svgEl || !pathEl) return null;

    return {
      platform: toRect(platformEl.getBoundingClientRect()),
      widget:   toRect(widgetEl.getBoundingClientRect()),
      svg:      toRect(svgEl.getBoundingClientRect()),
      pathD:    pathEl.getAttribute('d') ?? '',
    };
  });

  expect(data, 'Expected stage blocks and SVG path to be present').not.toBeNull();
  const { platform, widget, svg, pathD } = data!;

  // The whole arrow stays inside the SVG canvas.
  expectWithinCanvas(pathPoints(pathD, svg), svg);

  // Parse waypoints from the rounded SVG path:
  //   M x0 y0          → P0 (exit from card)
  //   … Q x1 y1 …      → P1 (first corner control = cell-bottom grid line)
  //   … L xN yN        → last L = P4 (entry into target)
  const firstM  = pathD.match(/M\s+([\d.-]+)\s+([\d.-]+)/);
  const allQ    = [...pathD.matchAll(/Q\s+([\d.-]+)\s+([\d.-]+)/g)];
  const allL    = [...pathD.matchAll(/L\s+([\d.-]+)\s+([\d.-]+)/g)];
  const lastL   = allL[allL.length - 1];
  const firstQ  = allQ[0];  // control point of the first corner (P1)

  expect(firstM, 'SVG path must contain M command').not.toBeNull();
  expect(firstQ, 'SVG path must contain Q command (rounded corner)').not.toBeNull();
  expect(lastL,  'SVG path must contain L command').not.toBeNull();

  // SVG coordinate → viewport coordinate
  const exitX  = svg.x + parseFloat(firstM![1]);
  const exitY  = svg.y + parseFloat(firstM![2]);
  const p1X    = svg.x + parseFloat(firstQ![1]);
  const entryX = svg.x + parseFloat(lastL![1]);
  const entryY = svg.y + parseFloat(lastL![2]);

  // ── Exit point: touches Platform's bottom edge ────────────────────────────
  const platformBottom = platform.y + platform.height;
  expect(
    Math.abs(exitY - platformBottom),
    `exit y ${exitY.toFixed(1)} should be within 1px of platform bottom ${platformBottom.toFixed(1)}`,
  ).toBeLessThanOrEqual(1);

  // Exit X is within Platform's horizontal extent
  expect(exitX, 'exit x should be ≥ platform left').toBeGreaterThanOrEqual(platform.x - 1);
  expect(exitX, 'exit x should be ≤ platform right').toBeLessThanOrEqual(platform.x + platform.width + 1);

  // ── Vertical-first routing: P1 has same X as exit (straight down before turning) ──
  expect(
    Math.abs(p1X - exitX),
    `first corner x ${p1X.toFixed(1)} should match exit x ${exitX.toFixed(1)} (vertical drop first)`,
  ).toBeLessThanOrEqual(1);

  // ── Entry point: touches Widget's left edge at its vertical centre ────────
  expect(
    Math.abs(entryX - widget.x),
    `entry x ${entryX.toFixed(1)} should be within 1px of widget left ${widget.x.toFixed(1)}`,
  ).toBeLessThanOrEqual(1);

  const widgetCenterY = widget.y + widget.height / 2;
  expect(
    Math.abs(entryY - widgetCenterY),
    `entry y ${entryY.toFixed(1)} should be within 1px of widget centre ${widgetCenterY.toFixed(1)}`,
  ).toBeLessThanOrEqual(1);
});

const DELTA_STORY =
  '/iframe.html?id=components-dependencyarrows--delta-mid-q-2&viewMode=story';

test('DeltaMidQ2: Mid-Q2 exit leaves Core Engine bottom and never crosses the card', async ({ page }) => {
  await page.goto(DELTA_STORY);
  await page.waitForSelector('svg[aria-hidden="true"] path', { state: 'attached' });

  const data = await readArrowGeometry(page, 'Core Engine', 'Delta (Mid Q2)');
  expect(data, 'Expected Core Engine + Delta cards and the SVG path to be present').not.toBeNull();
  const { source: hub, target: delta, svg, pathD } = data!;

  const pts = pathPoints(pathD, svg);
  expect(pts.length, 'arrow path should have multiple waypoints').toBeGreaterThan(2);

  // The whole arrow stays inside the SVG canvas.
  expectWithinCanvas(pts, svg);

  const hubLeft   = hub.x;
  const hubRight  = hub.x + hub.width;
  const hubTop    = hub.y;
  const hubBottom = hub.y + hub.height;
  const hubCenterY = hub.y + hub.height / 2;

  // ── 1. The arrow must EXIT the hub's bottom edge (target Delta is below) ──────
  const exit = pts[0];
  expect(
    Math.abs(exit.y - hubBottom),
    `exit y ${exit.y.toFixed(1)} should be on Core Engine bottom ${hubBottom.toFixed(1)} `
    + `(was it drawn from the centre ${hubCenterY.toFixed(1)}?)`,
  ).toBeLessThanOrEqual(1.5);

  // Exit X is within the hub's horizontal body (it's a Mid-Q2 exit inside the span)
  expect(exit.x).toBeGreaterThanOrEqual(hubLeft - 1);
  expect(exit.x).toBeLessThanOrEqual(hubRight + 1);

  // ── 2. NO waypoint sits inside the hub card interior (no overlay) ────────────
  const EPS = 1.5;
  for (const pt of pts) {
    const insideX = pt.x > hubLeft + EPS && pt.x < hubRight - EPS;
    const insideY = pt.y > hubTop  + EPS && pt.y < hubBottom - EPS;
    expect(
      insideX && insideY,
      `waypoint (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}) lies inside the Core Engine card `
      + `[${hubLeft.toFixed(0)}–${hubRight.toFixed(0)}, ${hubTop.toFixed(0)}–${hubBottom.toFixed(0)}]`,
    ).toBe(false);
  }

  // ── 3. Fewest bends: straight DOWN the exit column to Delta's row, then turn ──
  const deltaCenterY = delta.y + delta.height / 2;
  const entry = pts[pts.length - 1];

  // Entry lands on Delta's left edge at its vertical centre.
  expect(Math.abs(entry.x - delta.x),
    `entry x ${entry.x.toFixed(1)} should be on Delta left ${delta.x.toFixed(1)}`).toBeLessThanOrEqual(1.5);
  expect(Math.abs(entry.y - deltaCenterY),
    `entry y ${entry.y.toFixed(1)} should be on Delta centre ${deltaCenterY.toFixed(1)}`).toBeLessThanOrEqual(1.5);

  // The single turn sits at (exitX, Delta centre Y): the drop is straight down the
  // exit column and the turn happens on Delta's horizontal line.
  const turn = pts.find(pt => Math.abs(pt.x - exit.x) <= 1.5 && Math.abs(pt.y - deltaCenterY) <= 1.5);
  expect(turn,
    `expected a turn at (${exit.x.toFixed(1)}, ${deltaCenterY.toFixed(1)}) — straight down then across`,
  ).toBeTruthy();
});

const AROUND_STORY =
  '/iframe.html?id=components-dependencyarrows--delta-around-gamma&viewMode=story';

test('DeltaAroundGamma: Delta arrow exits the bottom and routes AROUND Gamma', async ({ page }) => {
  await page.goto(AROUND_STORY);
  await page.waitForSelector('svg[aria-hidden="true"] path', { state: 'attached' });

  const scene = await readScene(page, ['Core Engine', 'Gamma (default)', 'Delta (Mid Q2)']);
  const hub   = scene.cards['Core Engine'];
  const gamma = scene.cards['Gamma (default)'];
  const svg   = scene.svg;
  expect(hub && gamma && svg, 'Expected hub, gamma cards and SVG to be present').toBeTruthy();

  const hubBottom = hub!.y + hub!.height;

  // Of the two arrows (hub→gamma, hub→delta), pick Delta's: the one that exits
  // the hub's BOTTOM edge (gamma's exits the right edge at the hub's centre).
  const deltaArrow = scene.paths
    .map(d => pathPoints(d, svg!))
    .find(pts => pts.length > 0 && Math.abs(pts[0].y - hubBottom) <= 2);

  expect(deltaArrow,
    'Expected one arrow to exit the Core Engine bottom (the Delta arrow)').toBeTruthy();

  // Every arrow stays inside the SVG canvas.
  for (const d of scene.paths) expectWithinCanvas(pathPoints(d, svg!), svg!);

  // It must NOT be drawn through Gamma.
  expect(
    segmentsCrossRect(deltaArrow!, gamma!),
    `Delta arrow is drawn through Gamma `
    + `[${gamma!.x.toFixed(0)}–${(gamma!.x + gamma!.width).toFixed(0)}, `
    + `${gamma!.y.toFixed(0)}–${(gamma!.y + gamma!.height).toFixed(0)}]`,
  ).toBe(false);
});

const FUTURE_RETRO_STORY =
  '/iframe.html?id=components-dependencyarrows--future-retro&viewMode=story';

test('FutureRetro: backwards arrow exits Future top, arcs over the grid, enters Retro left-centre', async ({ page }) => {
  await page.goto(FUTURE_RETRO_STORY);
  await page.waitForSelector('svg[aria-hidden="true"] path', { state: 'attached' });

  const scene = await readScene(page, ['Future Event', 'Retrospective', 'Stream']);
  const future = scene.cards['Future Event'];
  const retro  = scene.cards['Retrospective'];
  const header = scene.cards['Stream'];  // the header-row cell
  expect(future && retro && header && scene.svg, 'Expected Future + Retro + header cells and SVG').toBeTruthy();
  expect(scene.paths.length, 'Expected one arrow').toBe(1);

  const pts = pathPoints(scene.paths[0], scene.svg!);
  const exit  = pts[0];
  const entry = pts[pts.length - 1];

  // Exit from Future's TOP edge (it's a backwards dependency → arc over the top).
  const futureTop = future!.y;
  expect(Math.abs(exit.y - futureTop),
    `exit y ${exit.y.toFixed(1)} should be on Future top ${futureTop.toFixed(1)}`).toBeLessThanOrEqual(1.5);

  // …and from the horizontal CENTRE of Future, not a corner. The bug: a backwards
  // arrow left the right edge, so its start floated off the top-RIGHT corner.
  const futureCenterX = future!.x + future!.width / 2;
  expect(Math.abs(exit.x - futureCenterX),
    `exit x ${exit.x.toFixed(1)} should be at Future's horizontal centre ${futureCenterX.toFixed(1)} `
    + `(not the top-right corner)`).toBeLessThanOrEqual(1.5);

  // The whole arrow stays inside the SVG canvas (the bug: it used to arc above the top).
  expectWithinCanvas(pts, scene.svg!);

  // The arc must ride the HEADER BOTTOM BORDER — not climb up into the header
  // (which a midpoint band would) and not stay down among the cards.
  const peakY = Math.min(...pts.map(pt => pt.y));
  const headerBottom = header!.y + header!.height;
  expect(peakY,
    `arc peak ${peakY.toFixed(1)} must not rise above the header bottom border ${headerBottom.toFixed(1)}`,
  ).toBeGreaterThanOrEqual(headerBottom - 1.5);
  expect(Math.abs(peakY - headerBottom),
    `arc peak ${peakY.toFixed(1)} should sit on the header bottom border ${headerBottom.toFixed(1)} `
    + `(not in the middle of the header)`,
  ).toBeLessThanOrEqual(2);

  // Entry lands on Retro's left edge at its vertical centre.
  const retroCenterY = retro!.y + retro!.height / 2;
  expect(Math.abs(entry.x - retro!.x),
    `entry x ${entry.x.toFixed(1)} should be on Retro left ${retro!.x.toFixed(1)}`).toBeLessThanOrEqual(1.5);
  expect(Math.abs(entry.y - retroCenterY),
    `entry y ${entry.y.toFixed(1)} should be on Retro centre ${retroCenterY.toFixed(1)}`).toBeLessThanOrEqual(1.5);
});

const FUTURE_RETRO_BLOCKED_STORY =
  '/iframe.html?id=components-dependencyarrows--future-retro-blocked&viewMode=story';

test('FutureRetroBlocked: arc clears the card sitting between Future and Retro', async ({ page }) => {
  await page.goto(FUTURE_RETRO_BLOCKED_STORY);
  await page.waitForSelector('svg[aria-hidden="true"] path', { state: 'attached' });

  const scene = await readScene(page, ['Future Event', 'In The Way', 'Retrospective']);
  const blocker = scene.cards['In The Way'];
  const retro   = scene.cards['Retrospective'];
  expect(blocker && retro && scene.svg, 'Expected blocker + Retro cards and SVG').toBeTruthy();
  expect(scene.paths.length, 'Expected one arrow (Future→Retro)').toBe(1);

  const pts = pathPoints(scene.paths[0], scene.svg!);

  // The arrow stays inside the SVG canvas.
  expectWithinCanvas(pts, scene.svg!);

  // The arrow must NOT be drawn through the in-between card.
  expect(
    segmentsCrossRect(pts, blocker!),
    `Future→Retro arrow is drawn through "In The Way" `
    + `[${blocker!.x.toFixed(0)}–${(blocker!.x + blocker!.width).toFixed(0)}, `
    + `${blocker!.y.toFixed(0)}–${(blocker!.y + blocker!.height).toFixed(0)}]`,
  ).toBe(false);

  // Sanity: it still enters Retro's left-centre.
  const entry = pts[pts.length - 1];
  const retroCenterY = retro!.y + retro!.height / 2;
  expect(Math.abs(entry.x - retro!.x)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(entry.y - retroCenterY)).toBeLessThanOrEqual(1.5);
});
