# Fluxpage deployment guide

Deploy the **web app** on Vercel (`web/` as root directory) and the **Chrome extension** separately from `extension/`.

Monorepo overview: [../README.md](../README.md)  
Extension build details: [../extension/README.md](../extension/README.md)

---

## Local development

### Prerequisites

- Node.js 18+
- Convex account and CLI
- Clerk application (development instance is fine for local)

### Setup

```bash
# repo root
npm install
cd web && npm install && cd ..
cp web/.env.example web/.env.local
# Edit web/.env.local — at minimum Clerk keys + NEXT_PUBLIC_API_URL
```

### Run services

| Terminal | Command | URL |
|----------|---------|-----|
| 1 | `npx convex dev` (root) | Convex dashboard shows dev deployment URL |
| 2 | `cd web && npm run dev` | http://localhost:3000 |
| 3 (optional) | `cd backend && uvicorn main:app --reload --port 8000` | http://localhost:8000 |
| 4 | `npm run extension:dev` (root) | Load unpacked `extension/` in Chrome |

Set `NEXT_PUBLIC_API_URL` in `.env.local` to your Convex **HTTP Actions** URL (`.convex.site`).

For extension ↔ localhost web:

```bash
npm run extension:dev
```

This sets `WEB_BASE` to `http://localhost:3000` in `config.generated.js`.

### Clerk redirect URLs (local)

In Clerk → **Paths / Redirect URLs**, add:

- `http://localhost:3000/login`
- `http://localhost:3000/register`
- `http://localhost:3000/auth/sync`
- `http://localhost:3000/extension`
- `http://localhost:3000/(auth)/callback` or your configured callback path

Extension OAuth uses `chrome-extension://<id>/callback.html` — add the extension redirect URL from the Chrome extensions page after loading unpacked.

---

## 1. Convex (production)

From the repository root:

```bash
npx convex deploy
```

In the [Convex dashboard](https://dashboard.convex.dev) → **Settings → Environment Variables**:

| Variable | Example / notes |
|----------|-----------------|
| `CLERK_SYNC_SECRET` | Same random string as Vercel (32+ chars) |
| `RAZORPAY_WEBHOOK_INTERNAL_SECRET` | Same as Vercel, or reuse `CLERK_SYNC_SECRET` |
| `WEB_BASE` | `https://www.fluxpage.com` |
| `ALLOWED_ORIGINS` | Optional extra comma-separated origins |

Production Convex deployment: **`stoic-caiman-320`**

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_API_URL` | `https://stoic-caiman-320.convex.site` |
| Convex dashboard URL | `https://stoic-caiman-320.convex.cloud` |

Set `NEXT_PUBLIC_API_URL` on Vercel to the `.convex.site` URL above.

---

## 2. Vercel (web app)

**Root directory:** `web`  
**Framework:** Next.js 14

### Clerk (fixes “Auth is not configured yet” banner)

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` from Clerk dashboard |
| `CLERK_SECRET_KEY` | `sk_live_…` |
| `CLERK_SYNC_SECRET` | Must match Convex |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/register` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/auth/sync` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/auth/sync` |

In **Clerk → Domains / Redirect URLs**, add production:

- `https://www.fluxpage.com`
- `https://fluxpage.com` (if used)
- Paths: `/login`, `/register`, `/auth/sync`, `/extension`, `/callback`

### Core app

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://stoic-caiman-320.convex.site` |
| `NEXT_PUBLIC_WEB_URL` | `https://www.fluxpage.com` |

### Razorpay (live)

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `rzp_live_…` |
| `RAZORPAY_KEY_SECRET` | Live secret from Razorpay |
| `RAZORPAY_WEBHOOK_SECRET` | From Razorpay → Webhooks |
| `RAZORPAY_WEBHOOK_INTERNAL_SECRET` | Match Convex |
| `RAZORPAY_PLAN_PRO_AMOUNT` | `19900` (paise, ₹199) |
| `RAZORPAY_PLAN_PREMIUM_AMOUNT` | `39900` (paise, ₹399) |
| `NEXT_PUBLIC_RAZORPAY_PRO_DISPLAY` | `₹199` |
| `NEXT_PUBLIC_RAZORPAY_PRO_ORIGINAL_DISPLAY` | `₹999` (strikethrough on UI) |
| `NEXT_PUBLIC_RAZORPAY_PREMIUM_DISPLAY` | `₹399` |
| `NEXT_PUBLIC_RAZORPAY_PREMIUM_ORIGINAL_DISPLAY` | `₹2,499` (strikethrough on UI) |

**Razorpay webhook URL:**

```
https://www.fluxpage.com/api/razorpay/webhook
```

Enable event: `payment.captured`.

### AI (optional)

**Primary LLM (recommended):** MiniMax M2.7

| Variable | Value |
|----------|--------|
| `MINIMAX_API_KEY` | From [MiniMax platform](https://platform.minimax.io) |
| `MINIMAX_MODEL` | `MiniMax-M2.7` |
| `MINIMAX_API_URL` | `https://api.minimax.io/v1/chat/completions` |

Optional fallbacks: `GEMINI_API_KEY`, `OPENROUTER_API_KEY`.

Redeploy Vercel after saving all variables.

Full template: [`.env.example`](.env.example)

---

## 3. Chrome extension (production)

```bash
npm run extension:build
```

Or with explicit env:

```bash
set EXTENSION_WEB_BASE=https://www.fluxpage.com
set EXTENSION_API_BASE=https://your-deployment.convex.site
npm run extension:build
```

**Load unpacked:** Chrome → Extensions → Developer mode → `extension/` folder.

**Store package:**

```bash
npm run extension:pack
```

Output: `extension/fluxpage-extension.zip`

Icons are built from `extension/icons/logo-mark.svg` automatically.

### Extension ↔ production auth

1. User signs in via extension → opens `https://www.fluxpage.com` Clerk flow.
2. Redirect to `chrome-extension://<id>/callback.html`.
3. Ensure Clerk allows the extension redirect URI and `CLERK_SYNC_SECRET` matches Convex.

---

## 4. Vercel ↔ GitHub

After pushing to [github.com/rohitkumarrai7/FluxPage](https://github.com/rohitkumarrai7/FluxPage):

1. Vercel → **Add New Project** → import FluxPage.
2. Set **Root Directory** to `web`.
3. Add all environment variables from section 2.
4. Deploy.

If the GitHub repo was recreated, reconnect Git in **Project → Settings → Git**.

---

## 5. Verification checklist

- [ ] https://www.fluxpage.com — no amber Clerk banner; Sign In works
- [ ] `/auth/sync` completes and `/dashboard` loads
- [ ] `/dashboard/billing` — Razorpay checkout upgrades tier
- [ ] Razorpay webhook logs show `payment.captured`
- [ ] Extension login opens fluxpage.com and returns tokens to `callback.html`
- [ ] Toolbar icon shows Fluxpage brand (not a generic placeholder)
- [ ] ATS analyze works on LinkedIn job page with signed-in user

---

## Environment variable groups (quick reference)

| Group | Variables |
|-------|-----------|
| Convex HTTP | `NEXT_PUBLIC_API_URL` |
| Public URLs | `NEXT_PUBLIC_WEB_URL`, `WEB_BASE` (Convex only) |
| Clerk | `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY`, `CLERK_SYNC_SECRET` |
| Razorpay | `NEXT_PUBLIC_RAZORPAY_*`, `RAZORPAY_*` |
| AI | `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `LLM_*` |
| CORS | `ALLOWED_ORIGINS` |

Never commit `.env.local` to git.
