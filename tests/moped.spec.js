// The moped post: the button is TURBO (not a brake), and a turbo jump off the red ramp reaches the high road.
// Run on the original (/) and inside Phaser (/next/).
import { test, expect } from '@playwright/test';

for (const [name, base] of [['original', '/'], ['phaser', '/next/?touch']]) {
  test(`${name}: moped button says TURBO and a turbo jump reaches the high road`, async ({ page }) => {
    test.setTimeout(60000);
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base);
    await page.waitForFunction(() => window.__wrencher && window.__wrencher.G.phase);
    expect(await page.evaluate(() => window.__wrencher.actLabel())).toBe('WRENCH');

    await page.evaluate(() => window.__wrencher.levels.find(l => l[0] === 'MOPED POST')[1]());
    await page.waitForFunction(() => window.__wrencher.G.phase === 'moped');
    expect(await page.evaluate(() => window.__wrencher.actLabel())).toBe('TURBO');
    if (base === '/') await expect(page.locator('#act')).toHaveText('TURBO');

    // ride the right lane and hold turbo as a launch ramp comes up (the first one comes after ~7 s; holding it the
    // whole time would overheat the engine)
    let held = false, up = false;
    for (let i = 0; i < 400 && !up; i++) {
      const s = await page.evaluate(() => {
        const w = window.__wrencher, m = w.moped(); w.G.dignity = 1e9;
        if (!m.up && !m.toUp) m.lane = 3;
        const r = m.ramps.find(r => r.side && !r.used && r.y < 150);
        return { phase: w.G.phase, up: !!m.up, near: !!r && r.y > 0, over: m.over > 0 };
      });
      expect(s.phase).toBe('moped');
      up = s.up;
      const want = s.near && !s.over;
      if (want !== held) { held = want; await (want ? page.keyboard.down('Space') : page.keyboard.up('Space')); }
      await page.waitForTimeout(100);
    }
    if (up && process.env.MOPED_SHOT) { await page.waitForTimeout(600); await page.screenshot({ path: process.env.MOPED_SHOT }); }
    if (held) await page.keyboard.up('Space');
    expect(up).toBe(true);
    expect(errors).toEqual([]);
  });
}
