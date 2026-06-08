import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

interface StoryEntry {
  id: string;
  type: 'story' | 'docs';
  title: string;
  name: string;
}

async function loadStoryIds(page: Page): Promise<StoryEntry[]> {
  const resp = await page.request.get('/index.json');
  const json = await resp.json() as { entries: Record<string, StoryEntry> };
  return Object.values(json.entries).filter(e => e.type === 'story');
}

test('all stories render without JavaScript errors', async ({ page }) => {
  const stories = await loadStoryIds(page);
  expect(stories.length, 'Expected at least one story in index.json').toBeGreaterThan(0);

  const failures: { id: string; errors: string[] }[] = [];

  for (const story of stories) {
    const errors: string[] = [];

    const onPageError = (err: Error) => errors.push(err.message);
    const onConsole = (msg: ConsoleMessage) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    };

    page.on('pageerror', onPageError);
    page.on('console', onConsole);

    try {
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
      await page.waitForLoadState('domcontentloaded');
      // Brief settle time for React to commit the render
      await page.waitForTimeout(300);
    } finally {
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
    }

    if (errors.length > 0) {
      failures.push({ id: story.id, errors });
    }
  }

  const report = failures
    .map(f => `  ${f.id}:\n${f.errors.map(e => `    - ${e}`).join('\n')}`)
    .join('\n');

  expect(
    failures,
    `${failures.length} of ${stories.length} stories have errors:\n${report}`,
  ).toHaveLength(0);
});
