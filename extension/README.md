# Fluxpage Chrome Extension (MV3)

Manifest v3 extension that adds an ATS resume sidebar to job listing pages. Part of the [Fluxpage monorepo](../README.md).

**Name in Chrome:** Fluxpage — ATS Resume Assistant  
**Version:** 2.0.0 (see [`manifest.json`](manifest.json))

---

## Load for development

1. From repo root: `npm run extension:dev` (generates icons + dev `config.generated.js`).
2. Chrome → `chrome://extensions` → **Developer mode** → **Load unpacked**.
3. Select this `extension/` directory (not the repo root).

Click the toolbar icon on a supported job page to toggle the sidebar.

---

## Directory map

| Path | Role |
|------|------|
| `manifest.json` | Permissions, content_scripts, icons, CSP |
| `background.js` | Service worker: messages, Convex HTTP, auth token handling |
| `config.generated.js` | **Generated** — API_BASE, WEB_BASE (do not edit; gitignored) |
| `extension.config.example.js` | Template for local overrides |
| `theme.js` | `__FLUXPAGE_THEME__` CSS tokens and brand name |
| `content/sidebar.js` | Shadow DOM UI shell |
| `content/floating-button.js` | FAB on job pages |
| `content/detector.js` | Job page detection |
| `content/extract-common.js` | Shared scrape helpers (`ResumodExtract`) |
| `content/universal-extractor.js` | Generic JD fallback |
| `content/jd-highlighter.js` | Highlight missing keywords in page text |
| `content/linkedin.js` (+ `linkedin-profile.js`) | LinkedIn scrapers |
| `content/internshala.js` | Internshala |
| `content/naukri.js` | Naukri |
| `content/indeed.js` | Indeed |
| `content/glassdoor.js` | Glassdoor |
| `popup/` | Toolbar popup HTML/CSS/JS |
| `callback.html` / `callback.js` | OAuth return from fluxpage.com |
| `offscreen.html` / `offscreen.js` | Offscreen document for PDF parsing |
| `icons/` | Brand SVGs + generated PNG toolbar icons |
| `lib/pdfjs/` | Bundled PDF.js worker and build |

---

## Content script order

`manifest.json` defines injection per host. Typical chain on LinkedIn:

1. `config.generated.js`
2. `content/extract-common.js`
3. `content/linkedin.js` (site scraper registers on `window.ResumodExtract`)
4. `content/sidebar.js`

Global scripts on `<all_urls>`: `detector.js`, `universal-extractor.js`, `floating-button.js`, `jd-highlighter.js`.

All scripts use `run_at: "document_idle"` so SPAs have rendered once.

---

## Icons and branding

Chrome requires **PNG** for `manifest.json → icons` (16, 32, 48, 128).

| Asset | Use |
|-------|-----|
| `icons/logo-mark.svg` | Source for PNG generation; sidebar, popup, callback UI |
| `icons/logo.svg` | Full wordmark (web_accessible_resources) |
| `icons/icon16.png` … `icon128.png` | **Generated** toolbar / store icons |

Regenerate PNGs from the brand mark:

```bash
# from repo root
npm run extension:icons
```

This runs [`../scripts/generate-extension-icons.mjs`](../scripts/generate-extension-icons.mjs) (uses `sharp` on `logo-mark.svg`).  
`npm run extension:build` runs icon generation automatically before writing config.

---

## Build and pack

| Command (repo root) | Output |
|---------------------|--------|
| `npm run extension:dev` | Dev hosts: localhost:3000, localhost:8000 |
| `npm run extension:build` | Prod: fluxpage.com + Convex `.convex.site` |
| `npm run extension:pack` | `extension/fluxpage-extension.zip` |

Environment overrides:

```bash
set EXTENSION_API_BASE=https://your-deployment.convex.site
set EXTENSION_WEB_BASE=https://www.fluxpage.com
npm run extension:build
```

---

## Messaging

| Message | Direction | Behavior |
|---------|-----------|----------|
| `TOGGLE_SIDEBAR` | background → content | Show/hide shadow sidebar |
| `ANALYZE_JOB` | content → background | POST resume + scraped JD to Convex; return score |

Background normalizes API responses (`score`, `matchedKeywords`, `missingKeywords`, `suggestions`).

---

## Storage

Keys in `chrome.storage.local` (prefix `rf_`):

- `rf_resumes`, `rf_auth`, `rf_last_analysis`, `rf_saved_jobs`, `rf_active_tab`, `rf_settings`

---

## OAuth flow

1. User opens popup or sidebar → sign in.
2. Extension opens `WEB_BASE` Clerk flow.
3. Redirect lands on `callback.html` with tokens.
4. `callback.js` persists `rf_auth` and closes the tab.

Add extension callback URL in Clerk redirect allowlist (see [web/DEPLOY.md](../web/DEPLOY.md)).

---

## CSP troubleshooting on new sites

1. Open DevTools → Console on the job page.
2. Search for `Content Security Policy` or `Refused to apply style`.
3. Ensure styles are inside **shadow root**, not `document.head`.
4. Never add inline handlers or external script tags from content scripts.
5. Route all `fetch` to APIs through `background.js`.

Selector maintenance: prefer attribute-contains selectors (`[class*="jobs-description"]`) after specific class names, and use `ResumodExtract.waitFor` with timeout for lazy-loaded panels.

---

## Permissions summary

- `activeTab`, `scripting`, `storage`, `tabs`, `identity`, `offscreen`
- Host permissions: fluxpage.com, Convex, LinkedIn, Internshala, Naukri, Indeed, Glassdoor

See [`manifest.json`](manifest.json) for the canonical list.
