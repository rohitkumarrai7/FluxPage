const path = require("path");
const { createRequire } = require("module");

const projectRequire = createRequire(path.join(process.cwd(), "package.json"));

function resolveWorkerModule() {
  return projectRequire.resolve("pdfjs-dist/legacy/build/pdf.worker.js");
}

/** pdfjs-dist legacy — Node/Vercel: reconstruct lines from Y-position transforms. */
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

  const LINE_GAP_THRESHOLD = 2;
  const pageTexts = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    if (!content.items || content.items.length === 0) {
      pageTexts.push("");
      continue;
    }

    const items = content.items.filter(
      (item) => item && typeof item.str === "string"
    );

    const lineMap = new Map();
    for (const item of items) {
      const y = item.transform ? Math.round(item.transform[5] * 10) / 10 : 0;
      const x = item.transform ? item.transform[4] : 0;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x, str: item.str });
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

    const mergedYs = [];
    for (const y of sortedYs) {
      if (
        mergedYs.length > 0 &&
        Math.abs(y - mergedYs[mergedYs.length - 1].y) <= LINE_GAP_THRESHOLD
      ) {
        mergedYs[mergedYs.length - 1].items.push(...lineMap.get(y));
      } else {
        mergedYs.push({ y, items: [...lineMap.get(y)] });
      }
    }

    const lines = [];
    for (const group of mergedYs) {
      group.items.sort((a, b) => a.x - b.x);

      let line = "";
      let prevX = -Infinity;
      let prevWidth = 0;
      for (const seg of group.items) {
        const gap = seg.x - (prevX + prevWidth);
        if (line && seg.str && gap > 4) {
          line += " ";
        }
        line += seg.str;
        prevX = seg.x;
        prevWidth = seg.str.length * 4;
      }
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    }

    pageTexts.push(lines.join("\n"));
  }

  await doc.destroy();
  return pageTexts.join("\n\n").trim();
}

async function extractPdfText(buffer) {
  const text = await extractWithPdfJs(buffer);
  if (text.length >= 30) return text;
  throw new Error("pdfjs: too little text extracted from PDF");
}

module.exports = { extractPdfText };
