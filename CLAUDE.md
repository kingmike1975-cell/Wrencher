# Wrencher

iOS-targeted 8-bit side-on platformer, played on iPhone in landscape with an on-screen stick (or a controller). The owner dictates by speech-to-text: "rancher/richer/renter" means Wrencher.

## Layout
- `public/index.html`: the whole game today (one IIFE, canvas 2D, 2x hand-drawn sprites in `HD_SPRITES`). A Phaser port is planned; see the migration plan.
- `public/audio/`: MP3s loaded with `loadClip(url)` and decoded into the Web Audio context.
- `src/index.js`: Cloudflare Worker for `/api/*` and `/admin`; `schema.sql` is the D1 schema.
- `tests/`: Playwright playtests. `window.__wrencher` exposes `G` and the test level list for them.

## Rules
- Run `npm test` before pushing. Pushing to `main` deploys to the live site.
- Keep the viewport meta, `touch-action:none`, gesture/dblclick preventDefault and the canvas dpr cap at 2 in the head/CSS: removing them brings back the iPhone stick lag and pinch-zoom bugs.
- Never commit the admin token or any Cloudflare credential.
- Don't change movement constants (RUN_ACCEL, SKID_DECEL, stick deadzones) without the owner asking; feel is tuned by hand on a phone.
