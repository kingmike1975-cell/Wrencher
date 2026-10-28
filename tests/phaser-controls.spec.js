// The original game inside Phaser (/next/): Phaser's on-screen stick and WRENCH button drive Wrencher.
import { test, expect } from '@playwright/test';

async function factory(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/next/?touch');
  await page.waitForFunction(() => window.__wrencher?.G.phase);
  await page.evaluate(() => window.__wrencher.levels.find(l => l[0] === 'FACTORY')[1](1));
  await page.waitForFunction(() => window.__wrencher.G.phase === 'play');
  return errors;
}
// the stick's centre and the button's, in page px, from where the pad scene put them
const spots = page => page.evaluate(() => {
  const s = window.__wrencherNext.game.scene.getScene('legacy-pad'), z = window.__wrencherNext.game.scale.zoom;
  return { sx: s.stick.x * z, sy: s.stick.y * z, r: s.stick.radius * z, bx: s.btn.x * z, by: s.btn.y * z };
});

test('dragging the stick walks him', async ({ page }) => {
  const errors = await factory(page);
  const { sx, sy, r } = await spots(page);
  const x0 = await page.evaluate(() => window.__wrencher.P.x);
  await page.mouse.move(sx, sy); await page.mouse.down();
  await page.mouse.move(sx + r * 0.8, sy, { steps: 4 });
  await page.waitForTimeout(800);
  await page.mouse.up();
  const x1 = await page.evaluate(() => window.__wrencher.P.x);
  expect(x1).toBeGreaterThan(x0 + 10);
  await page.waitForTimeout(300);
  // let go: he stops
  const x2 = await page.evaluate(() => window.__wrencher.P.x);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__wrencher.P.x)).toBeCloseTo(x2, 0);
  expect(errors).toEqual([]);
});

test('tapping WRENCH brandishes', async ({ page }) => {
  const errors = await factory(page);
  const { bx, by } = await spots(page);
  await page.mouse.click(bx, by);
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.__wrencher.P.brandT)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
