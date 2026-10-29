// The kiosk: potabage prices and the rat headphones (bought, switched on and off, and swapping the crossroads' set of four).
// Run on the original (/) and inside Phaser (/next/).
import { test, expect } from '@playwright/test';

async function boot(page, base) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/api\/|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => localStorage.setItem('wrencher.shop', JSON.stringify({ coins: 20, upg: {} })));
  await page.goto(base);
  await page.waitForFunction(() => window.__wrencher && window.__wrencher.G.phase);
  return errors;
}

for (const [name, base] of [['original', '/'], ['phaser', '/next/']]) {
  test(`${name}: potabage costs 5 coins per step`, async ({ page }) => {
    await boot(page, base);
    const pot = await page.evaluate(() => window.__wrencher.upgrades.find(u => u.id === 'potabage'));
    expect(pot.cost).toEqual([5, 5]);
  });

  test(`${name}: rat headphones swap the crossroads`, async ({ page }) => {
    const errors = await boot(page, base);
    const ratsIx = await page.evaluate(() => window.__wrencher.upgrades.findIndex(u => u.id === 'rats'));
    expect(await page.evaluate(i => window.__wrencher.upgrades[i].cost, ratsIx)).toEqual([15]);

    // a new game opens at the kiosk; buy the rats
    await page.evaluate(() => window.__wrencher.newGame());
    await page.waitForFunction(() => window.__wrencher.G.phase === 'shop');
    await page.evaluate(i => window.__wrencher.shopBuy(i), ratsIx);
    await expect(page.locator('#overlay h1')).toHaveText('RAT HEADPHONES');
    expect(await page.evaluate(() => window.__wrencher.shop())).toMatchObject({ coins: 5, rats: true });
    await page.screenshot({ path: `test-results/${name}-rats-card.png` });
    await page.waitForTimeout(700);
    await page.keyboard.down('Space'); await page.waitForTimeout(100); await page.keyboard.up('Space');
    await expect(page.locator('#overlay')).toBeHidden();

    // pick them again to switch off and on
    await page.evaluate(i => window.__wrencher.shopBuy(i), ratsIx);
    expect(await page.evaluate(() => window.__wrencher.shop().rats)).toBe(false);
    expect(await page.evaluate(() => window.__wrencher.hubLevels())).toContain('farm');
    await page.evaluate(i => window.__wrencher.shopBuy(i), ratsIx);
    expect(await page.evaluate(() => window.__wrencher.shop().rats)).toBe(true);

    // round 1 with the rats on: the next four, played at their first round
    await page.evaluate(n => window.__wrencher.shopBuy(n), await page.evaluate(() => window.__wrencher.upgrades.length));
    await page.waitForFunction(() => window.__wrencher.G.phase === 'hub');
    expect(await page.evaluate(() => window.__wrencher.hubLevels())).toContain('nuke');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/${name}-rats-hub.png` });
    await page.evaluate(() => window.__wrencher.hubEnter('W'));
    expect(await page.evaluate(() => [window.__wrencher.G.shift, window.__wrencher.G.realShift])).toEqual([4, 1]);
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(800); await page.keyboard.up('ArrowRight');

    // round 4: the past four, played at their first round
    await page.evaluate(() => { const w = window.__wrencher; w.G.realShift = 0; w.G.shift = 4; w.G.cleared = {}; });
    expect(await page.evaluate(() => window.__wrencher.hubLevels())).toEqual(['farm', 'factory', 'yugo', 'moped']);
    await page.evaluate(() => window.__wrencher.hubEnter('N'));
    expect(await page.evaluate(() => [window.__wrencher.G.shift, window.__wrencher.G.realShift])).toEqual([1, 4]);
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(800); await page.keyboard.up('ArrowLeft');
    expect(errors).toEqual([]);
  });
}
