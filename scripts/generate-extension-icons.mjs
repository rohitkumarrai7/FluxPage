#!/usr/bin/env node
/**
 * Rasterize extension/icons/logo-mark.svg to Chrome toolbar PNG sizes.
 * Usage: node scripts/generate-extension-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "extension", "icons");
const svgPath = path.join(iconsDir, "logo-mark.svg");

const SIZES = [
  { size: 16, file: "icon16.png" },
  { size: 32, file: "icon32.png" },
  { size: 48, file: "icon48.png" },
  { size: 128, file: "icon128.png" },
];

if (!fs.existsSync(svgPath)) {
  console.error(`Missing brand mark: ${svgPath}`);
  process.exit(1);
}

const svg = fs.readFileSync(svgPath);

for (const { size, file } of SIZES) {
  const out = path.join(iconsDir, file);
  await sharp(svg, { density: 300 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  console.log(`  ${file} (${size}x${size})`);
}

console.log("Extension icons generated from logo-mark.svg");
