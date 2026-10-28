# Wrencher

iOS-targeted 8-bit side-on platformer, played on iPhone in landscape with an on-screen stick (or a controller). The owner dictates by speech-to-text: "rancher/richer/renter" means Wrencher.

## Layout
- `public/index.html`: the live game (one IIFE, canvas 2D, 2x hand-drawn sprites in `HD_SPRITES`). Still the source of truth for rules and art while the port runs.
- `game/`: the Phaser 4 port, built by Vite into `public/next/` (served at `/next/`, not committed). Scenes in `game/src/scenes/`, tuning numbers in `game/src/config.js`, input in `game/src/input/Controls.js`.
- `game/src/sprites/data.js`: GENERATED from `public/index.html` by `npm run sprites`. Never edit it by hand; re-run the script after changing art in the original.
- Wrencher is layered (`game/src/wrencher/parts.js`): body, back arm, front arm, hat. Outfits are palettes over the same layers. A test checks the layers stack back into the exact original sprite.
- `public/audio/`: MP3s loaded with `loadClip(url)` and decoded into the Web Audio context.
- `src/index.js`: Cloudflare Worker for `/api/*` and `/admin`; `schema.sql` is the D1 schema.
- `tests/`: Playwright playtests. `window.__wrencher` (original) and `window.__wrencherNext` (Phaser) are the hooks they use.

## Rules
- Run `npm test` before pushing (it builds `game/` first). Locally in a Claude cloud session, set `PW_CHROMIUM` to the preinstalled Chromium. Pushing to `main` deploys to the live site.
- Keep the viewport meta, `touch-action:none`, gesture/dblclick preventDefault and the canvas dpr cap at 2 in the head/CSS: removing them brings back the iPhone stick lag and pinch-zoom bugs.
- Never commit the admin token or any Cloudflare credential.
- Don't change movement constants (RUN_ACCEL, SKID_DECEL, stick deadzones) without the owner asking; feel is tuned by hand on a phone.
- The rex plugins need a global `Phaser`; keep `import './phaser-global.js'` as the first line of `game/src/main.js`.
