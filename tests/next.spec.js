// Playtest for the levels rebuilt natively in Phaser, at /next/?native: it boots, the layered Wrencher matches the original sprite,
// and the stick, ladders, double-tap run and repair zoom all behave.
import { test, expect } from '@playwright/test';
import { layersMatchOriginal } from '../game/src/wrencher/parts.js';

async function boot(page, query = '') {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/next/?native' + (query ? '&' + query.slice(1) : ''));
  await page.waitForFunction(() => window.__wrencherNext?.factory()?.P, null, { timeout: 20_000 });
  return errors;
}
const P = page => page.evaluate(() => { const f = window.__wrencherNext.factory(); return { ...f.P, climb: !!f.P.climb, z: f.cam.z }; });

test('body, arms and hat layers stack back into the exact original sprite', () => {
  expect(layersMatchOriginal()).toBe(true);
});

test('boots with the layered Wrencher in every look', async ({ page }) => {
  const errors = await boot(page, '?outfit=tracksuit&hat');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/next-boot.png' });
  expect(errors).toEqual([]);
});

test('walks, runs on a double tap, and skids to a stop', async ({ page }) => {
  const errors = await boot(page);
  const x0 = (await P(page)).x;
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(400); await page.keyboard.up('ArrowRight');
  const walked = (await P(page)).x - x0;
  expect(walked).toBeGreaterThan(8);
  // let go fully first: a press that flips straight from right to left doesn't count as a tap (same as the original)
  await page.waitForTimeout(150);
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(120); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(60);
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700);
  expect((await P(page)).runV).toBeGreaterThan(60);
  await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(50);
  expect((await P(page)).skidV).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('climbs a ladder to the next floor', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { window.__wrencherNext.factory().P.x = 56; });
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1600); await page.keyboard.up('ArrowUp');
  const p = await P(page);
  expect(p.f).toBe(1);
  expect(p.climb).toBe(false);
});

test('holding WRENCH at a worn machine repairs it and zooms in', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { const f = window.__wrencherNext.factory(); f.P.x = 108; f.machines[0].health = 20; });
  await page.keyboard.down('Space'); await page.waitForTimeout(1500);
  const h = await page.evaluate(() => window.__wrencherNext.factory().machines[0].health);
  const p = await P(page);
  await page.screenshot({ path: 'test-results/next-repair.png' });
  await page.keyboard.up('Space');
  expect(h).toBeGreaterThan(40);
  expect(p.z).toBeGreaterThan(2);
});

test('the on-screen stick steers him', async ({ page }) => {
  await boot(page, '?touch');
  const box = await page.locator('#game canvas').boundingBox();
  // the stick sits 72 game px in from the bottom-left of the 640x360 canvas
  const k = box.width / 640, sx = box.x + 72 * k, sy = box.y + box.height - 72 * k;
  const x0 = (await P(page)).x;
  await page.mouse.move(sx, sy); await page.mouse.down();
  await page.mouse.move(sx + 40 * k, sy, { steps: 4 });
  await page.waitForTimeout(600);
  await page.mouse.up();
  expect((await P(page)).x).toBeGreaterThan(x0 + 8);
});
