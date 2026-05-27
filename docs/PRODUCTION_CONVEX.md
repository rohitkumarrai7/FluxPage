# Production Convex: stoic-caiman-320

Fluxpage production uses deployment **`stoic-caiman-320`**.

| Purpose | URL |
|---------|-----|
| HTTP API (Vercel, extension) | `https://stoic-caiman-320.convex.site` |
| Convex dashboard / client | `https://stoic-caiman-320.convex.cloud` |

Local `npx convex dev` still uses **dev** deployment `canny-woodpecker-211`.

## Deploy backend

```bash
npx convex deploy
```

Confirm push to **stoic-caiman-320** when prompted.

## Convex dashboard env vars (production)

In [Convex dashboard](https://dashboard.convex.dev) → **stoic-caiman-320** → Settings → Environment Variables:

| Variable | Value |
|----------|--------|
| `CLERK_SYNC_SECRET` | Same as Vercel `CLERK_SYNC_SECRET` |
| `RAZORPAY_WEBHOOK_INTERNAL_SECRET` | Same as Vercel (or reuse `CLERK_SYNC_SECRET`) |
| `WEB_BASE` | `https://www.fluxpage.com` |
| `ALLOWED_ORIGINS` | `https://www.fluxpage.com,https://fluxpage.com` |

### Fix `/auth/sync` Unauthorized

Vercel hides sensitive values — you cannot read `CLERK_SYNC_SECRET` from History. **Set a new value you choose:**

1. Vercel → Environment Variables → click **CLERK_SYNC_SECRET** row (not History).
2. **Edit** → set **Value** to e.g. `resumod-clerk-sync-dev` (or any long random string).
3. Convex **stoic-caiman-320** → add **identical** `CLERK_SYNC_SECRET`.
4. Redeploy Vercel.

Both sides must match **exactly** (character for character).

## Vercel env vars (production)

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://stoic-caiman-320.convex.site` |
| `NEXT_PUBLIC_WEB_URL` | `https://www.fluxpage.com` |
| `RAZORPAY_WEBHOOK_SECRET` | Same as Razorpay webhook Secret field |
| `RAZORPAY_KEY_SECRET` | Live Razorpay API secret |
| `CLERK_SYNC_SECRET` | Must match Convex prod exactly (create/edit in Vercel if hidden) |
| `MINIMAX_API_KEY` | From MiniMax platform |
| `MINIMAX_MODEL` | `MiniMax-M2.7` |
| `MINIMAX_API_URL` | `https://api.minimax.io/v1/chat/completions` |

Redeploy Vercel after changing variables.

## Extension production build

```bash
npm run extension:build
```

Uses `https://stoic-caiman-320.convex.site` and `https://www.fluxpage.com` by default.
