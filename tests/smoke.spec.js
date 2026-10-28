// Smoke playtest, run twice: on the original build (/) and on the same game running inside Phaser (/next/).
// The game boots, every level (rounds 1-3) and the boss fights start, Wrencher can be steered, and nothing throws.
import { test, expect } from '@playwright/test';

const HOLD = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

async function boot(page, base) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/api\/|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(base);
  await page.waitForFunction(() => window.__wrencher && window.__wrencher.G.phase);
  return errors;
}

// drive the stick with the keyboard: a few direction holds and action taps
async function wiggle(page, ms) {
  const end = Date.now() + ms;
  let i = 0;
  while (Date.now() < end) {
    const k = HOLD[i++ % HOLD.length];
    await page.keyboard.down(k); await page.waitForTimeout(250); await page.keyboard.up(k);
    await page.keyboard.press('Space');
  }
}

for (const [name, base] of [['original', '/'], ['phaser', '/next/']]) {
  test(`${name}: title screen boots`, async ({ page }) => {
    const errors = await boot(page, base);
    await page.waitForTimeout(1500);
    expect(['title', 'attract']).toContain(await page.evaluate(() => window.__wrencher.G.phase));
    await page.screenshot({ path: `test-results/${name}-title.png` });
    expect(errors).toEqual([]);
  });

  test(`${name}: every level starts and survives input`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = await boot(page, base);
    const names = await page.evaluate(() => window.__wrencher.levels.map(l => l[0]));
    for (let li = 0; li < names.length; li++) {
      for (const n of [1, 2, 3]) {
        await page.evaluate(([li, n]) => window.__wrencher.levels[li][1](n), [li, n]);
        await wiggle(page, 2500);
        const phase = await page.evaluate(() => window.__wrencher.G.phase);
        expect(phase, `${names[li]} ${n}`).toBeTruthy();
        await page.screenshot({ path: `test-results/${name}-${names[li].replace(/\W+/g, '-').toLowerCase()}-${n}.png` });
        expect(errors, `${names[li]} ${n}`).toEqual([]);
      }
    }
  });

  test(`${name}: shop and ending screens open`, async ({ page }) => {
    const errors = await boot(page, base);
    await page.evaluate(() => window.__wrencher.previewShop());
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.__wrencher.previewEnding());
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });
}

test('all audio files are served', async ({ request }) => {
  const res = await request.get('/');
  const html = await res.text();
  const urls = [...new Set(html.match(/audio\/[\w/-]+\.mp3/g))];
  expect(urls.length).toBeGreaterThan(30);
  for (const u of urls) expect((await request.get('/' + u)).status(), u).toBe(200);
});
