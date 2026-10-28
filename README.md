# Wrencher

8-bit side-on platformer for iPhone (landscape, on-screen stick or controller). A Yugoslav maintenance worker keeps the machines running while bureaucrats heckle him.

- `public/index.html`: the game (served as a static file)
- `src/index.js`: Cloudflare Worker for `/api/*` (name + PIN profiles, cloud saves, run log, feedback) and `/admin`
- `schema.sql`: D1 tables (already loaded on the live database; safe to re-run)

The admin token is a Worker secret (`npx wrangler secret put ADMIN_TOKEN`). Never commit it.
