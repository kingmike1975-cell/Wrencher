# Deploying Wrencher

Every push to `main` runs the playtests in `tests/`. If they pass, GitHub Actions deploys the game and Worker to Cloudflare (the `wrencher` Worker and its `wrencher_db` D1 database). Pull requests run the playtests only.

## One-time setup: give GitHub a Cloudflare token

1. In the Cloudflare dashboard, open **My Profile > API Tokens > Create Token** and pick the **Edit Cloudflare Workers** template. Under Account Resources choose your account, then add one more permission: **Account > D1 > Edit**. Create it and copy the token.
2. Copy your **Account ID** from the Workers & Pages overview page (right-hand side).
3. In GitHub, open the repo's **Settings > Secrets and variables > Actions > New repository secret** and add:
   - `CLOUDFLARE_API_TOKEN`: the token from step 1
   - `CLOUDFLARE_ACCOUNT_ID`: the ID from step 2
4. Open the **Actions** tab, pick **Test and deploy**, and press **Run workflow** on `main`.

Until both secrets exist, the deploy step prints a notice and skips.

## Things that stay as they are

- The admin token is a Worker secret, set once with `npx wrangler secret put ADMIN_TOKEN`. Deploys keep it. Never commit it.
- Player saves live in D1 and survive every deploy.
- Do not run `wrangler d1 create`; the database already exists and its id is in `wrangler.toml`.

## Deploying by hand (fallback)

```
npm install
npx wrangler login
npm run deploy
```

## Local copy (Scat Box)

The drive copy is a clone of this repo. To update it: `git pull` in that folder, or use GitHub Desktop's **Fetch origin / Pull**.
