const path = require("path");
const { createRequire } = require("module");

const projectRequire = createRequire(path.join(process.cwd(), "package.json"));

function resolveWorkerModule() {
  return projectRequire.resolve("pdfjs-dist/legacy/build/pdf.worker.js");
}

/** pdfjs-dist legacy — Node/Vercel: use require() path for worker, not file:// URL. */
async function extractWithPdfJs(buffer) {
  const pdfjs = projectRequire("pdfjs-dist/legacy/build/pdf.js");
  const workerResolved = resolveWorkerModule();

  pdfjs.GlobalWorkerOptions.workerSrc = workerResolved;

  try {
    const workerMod = projectRequire(workerResolved);
    if (workerMod && typeof workerMod === "object") {
      globalThis.pdfjsWorker = workerMod;
    }
  } catch {
    // Fake worker will load via require(workerSrc) in pdf.js
  }

  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

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

async function extractPdfText(buffer) {
  const text = await extractWithPdfJs(buffer);
  if (text.length >= 30) return text;
  throw new Error("pdfjs: too little text extracted from PDF");
}

module.exports = { extractPdfText };
