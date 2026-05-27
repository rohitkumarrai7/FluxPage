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

## Vercel env vars (production)

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://stoic-caiman-320.convex.site` |
| `NEXT_PUBLIC_WEB_URL` | `https://www.fluxpage.com` |
| `RAZORPAY_WEBHOOK_SECRET` | Same as Razorpay webhook Secret field |
| `RAZORPAY_KEY_SECRET` | Live Razorpay API secret |
| `CLERK_SYNC_SECRET` | Matches Convex |

Redeploy Vercel after changing variables.

## Extension production build

```bash
npm run extension:build
```

Uses `https://stoic-caiman-320.convex.site` and `https://www.fluxpage.com` by default.
