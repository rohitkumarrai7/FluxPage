#!/usr/bin/env node
/**
 * Build Chrome Web Store promo tiles from extension UI screenshots.
 * Output: web/public/store/small-promo-440x280.png, marquee-promo-1400x560.png
 *
 * Usage:
 *   node scripts/generate-store-promo-tiles.mjs [saveJob.png] [resumeFit.png]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "web", "public", "store");

const defaultSaveJob = path.join(
  root,
  "assets",
  "store-source-save-job.png"
);
const defaultResumeFit = path.join(
  root,
  "assets",
  "store-source-resume-fit.png"
);

const saveJobSrc = process.argv[2] || defaultSaveJob;
const resumeFitSrc = process.argv[3] || defaultResumeFit;

for (const p of [saveJobSrc, resumeFitSrc]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing source image: ${p}`);
    console.error(
      "Copy your screenshots to assets/store-source-save-job.png and assets/store-source-resume-fit.png"
    );
    console.error("Or pass paths: node scripts/generate-store-promo-tiles.mjs <saveJob> <resumeFit>");
    process.exit(1);
  }
}

fs.mkdirSync(outDir, { recursive: true });

const BRAND = "#0d9488";
const BRAND_DARK = "#0f766e";
const BG = "#f8fafc";

async function brandBar(width, height, title, subtitle) {
  const w = width;
  const h = height;
  const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BRAND}"/>
      <stop offset="100%" style="stop-color:${BRAND_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <text x="24" y="${Math.round(h * 0.42)}" fill="white" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(h * 0.22)}" font-weight="700">Fluxpage</text>
  <text x="24" y="${Math.round(h * 0.72)}" fill="rgba(255,255,255,0.9)" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(h * 0.11)}" font-weight="600">AI JOB ASSISTANT</text>
  ${subtitle ? `<text x="24" y="${Math.round(h * 0.9)}" fill="rgba(255,255,255,0.85)" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(h * 0.09)}">${subtitle}</text>` : ""}
</svg>`;
  return sharp(Buffer.from(svg)).png();
}

/** Small promo 440x280 — results panel + brand strip */
async function buildSmallPromo() {
  const W = 440;
  const H = 280;
  const barH = 56;

  const fit = await sharp(resumeFitSrc)
    .resize({ width: 900, height: 520, fit: "inside" })
    .toBuffer();
  const meta = await sharp(fit).metadata();
  const cropW = Math.min(meta.width, Math.floor(meta.width * 0.48));
  const cropX = Math.floor(meta.width * 0.52);

  const panel = await sharp(fit)
    .extract({
      left: cropX,
      top: 0,
      width: Math.min(cropW, meta.width - cropX),
      height: meta.height,
    })
    .resize({ width: W, height: H - barH, fit: "cover", position: "top" })
    .png()
    .toBuffer();

  const bar = await brandBar(W, barH, "Fluxpage", "ATS scoring on LinkedIn, Indeed, Naukri");

  await sharp({
    create: { width: W, height: H, channels: 3, background: BG },
  })
    .composite([
      { input: await bar.toBuffer(), top: 0, left: 0 },
      { input: panel, top: barH, left: 0 },
    ])
    .png()
    .toFile(path.join(outDir, "small-promo-440x280.png"));

  console.log("Wrote", path.join(outDir, "small-promo-440x280.png"));
}

/** Marquee 1400x560 — wide dual-panel screenshot + brand left */
async function buildMarqueePromo() {
  const W = 1400;
  const H = 560;
  const barW = 320;

  const ui = await sharp(resumeFitSrc)
    .resize({ width: W - barW - 24, height: H - 32, fit: "inside" })
    .png()
    .toBuffer();
  const uiMeta = await sharp(ui).metadata();
  const uiLeft = barW + Math.floor((W - barW - uiMeta.width) / 2);
  const uiTop = Math.floor((H - uiMeta.height) / 2);

  const bar = await brandBar(
    barW,
    H,
    "Fluxpage",
    "Tailor your resume in 30 seconds"
  );

  const tagSvg = Buffer.from(`
<svg width="360" height="80" xmlns="http://www.w3.org/2000/svg">
  <text x="24" y="28" fill="white" font-family="Segoe UI, Arial, sans-serif" font-size="18" opacity="0.95">Average +27 ATS points</text>
  <text x="24" y="58" fill="white" font-family="Segoe UI, Arial, sans-serif" font-size="15" opacity="0.85">LinkedIn, Indeed, Naukri, Glassdoor</text>
</svg>`);

  await sharp({
    create: { width: W, height: H, channels: 3, background: BG },
  })
    .composite([
      { input: await bar.toBuffer(), top: 0, left: 0 },
      { input: await sharp(tagSvg).png().toBuffer(), top: H - 120, left: 0 },
      { input: ui, top: uiTop, left: uiLeft },
    ])
    .png()
    .toFile(path.join(outDir, "marquee-promo-1400x560.png"));

  console.log("Wrote", path.join(outDir, "marquee-promo-1400x560.png"));
}

await buildSmallPromo();
await buildMarqueePromo();
