#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extDir = path.join(__dirname, "..", "extension");
const outZip = path.join(extDir, "fluxpage-extension.zip");

const exclude = new Set(["fluxpage-extension.zip", "package.json", "extension.config.example.js"]);

function zipWithPowerShell() {
  if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
  const files = fs.readdirSync(extDir).filter((f) => !exclude.has(f));
  const tempDir = path.join(extDir, "_pack");
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });
  for (const f of files) {
    const src = path.join(extDir, f);
    const dest = path.join(tempDir, f);
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  execSync(
    `Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${outZip}" -Force`,
    { shell: "powershell.exe" }
  );
  fs.rmSync(tempDir, { recursive: true });
  console.log(`Packed: ${outZip}`);
}

zipWithPowerShell();
