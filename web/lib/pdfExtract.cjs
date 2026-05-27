const path = require("path");
const { pathToFileURL } = require("url");
const { createRequire } = require("module");

const projectRequire = createRequire(path.join(process.cwd(), "package.json"));

function resolvePkgFile(pkg, ...segments) {
  try {
    return projectRequire.resolve(path.join(pkg, ...segments));
  } catch {
    return path.join(process.cwd(), "node_modules", pkg, ...segments);
  }
}

/** pdfjs-dist legacy — works on Vercel without pdf-parse/worker subpath. */
async function extractWithPdfJs(buffer) {
  const pdfjsPath = resolvePkgFile("pdfjs-dist", "legacy", "build", "pdf.js");
  const pdfjs = projectRequire(pdfjsPath);

  const workerPath = resolvePkgFile("pdfjs-dist", "legacy", "build", "pdf.worker.js");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const parts = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (item && typeof item.str === "string" && item.str.trim()) {
        parts.push(item.str);
      }
    }
    parts.push("\n");
  }
  await doc.destroy();
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

let pdfParseReady = false;

async function configurePdfParseWorker() {
  if (pdfParseReady) return;
  const workerEntry = resolvePkgFile("pdf-parse", "dist", "worker", "cjs", "index.cjs");
  const { getPath } = projectRequire(workerEntry);
  const workerMod = await import(pathToFileURL(getPath()).href);
  globalThis.pdfjsWorker = workerMod;
  pdfParseReady = true;
}

async function extractWithPdfParse(buffer) {
  await configurePdfParseWorker();
  const pdfParseEntry = resolvePkgFile("pdf-parse", "dist", "pdf-parse", "cjs", "index.cjs");
  const { PDFParse } = projectRequire(pdfParseEntry);
  const parser = new PDFParse({ data: Buffer.from(buffer) });
  try {
    const result = await parser.getText();
    return (result.text || "").trim();
  } finally {
    await parser.destroy();
  }
}

async function extractPdfText(buffer) {
  const errors = [];

  // pdf-parse first — reliable on Vercel with explicit worker paths
  try {
    const text = await extractWithPdfParse(buffer);
    if (text.length >= 30) return text;
    errors.push("pdf-parse: too little text");
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "pdf-parse failed");
  }

  try {
    const text = await extractWithPdfJs(buffer);
    if (text.length >= 30) return text;
    errors.push("pdfjs: too little text");
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "pdfjs failed");
  }

  throw new Error(errors.join("; ") || "PDF text extraction failed");
}

module.exports = { extractPdfText };
