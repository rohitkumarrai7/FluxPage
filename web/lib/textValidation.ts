/**
 * Shared text validation for resume parsing (web + API routes).
 */
export function isHumanReadableText(text: string): boolean {
  if (!text || text.length < 50) return false;

  const pdfMarkers = [
    "%PDF-",
    "obj<<",
    "endobj",
    "endstream",
    "/Type/",
    "/Font",
    "FlateDecode",
    "xref",
    "trailer",
    "startxref",
  ];
  if (pdfMarkers.some((m) => text.includes(m))) return false;

  const nonPrintable = (text.match(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F]/g) || []).length;
  if (nonPrintable / text.length > 0.15) return false;

  const resumeKeywords = [
    "experience",
    "education",
    "skills",
    "project",
    "work",
    "developer",
    "engineer",
    "manager",
    "email",
    "phone",
    "linkedin",
    "summary",
    "professional",
    "university",
    "degree",
    "resume",
    "curriculum",
    "objective",
    "intern",
    "certification",
    "achievement",
    "profile",
    "employment",
  ];
  const lower = text.toLowerCase();
  const keywordHits = resumeKeywords.filter((kw) => lower.includes(kw)).length;
  if (keywordHits >= 1) return true;

  // Allow if mostly ASCII letters/spaces and has an email-like token
  if (/[\w.+-]+@[\w.-]+\.\w+/.test(text) && nonPrintable / text.length < 0.08) return true;

  // Allow if enough alphabetic content (real resumes, not binary garbage)
  const alpha = (text.match(/[a-zA-Z]/g) || []).length;
  if (alpha / text.length > 0.28 && text.length >= 80) return true;

  // Multi-line prose without resume keywords (e.g. minimal CVs)
  const lines = text.split(/\n+/).filter((l) => l.trim().length > 8);
  if (lines.length >= 4 && alpha / text.length > 0.22) return true;

  return false;
}

export function sanitizeResumeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
}

export function assertReadableResumeText(text: string, fileLabel = "file"): string {
  const cleaned = sanitizeResumeText(text);
  if (!isHumanReadableText(cleaned)) {
    throw new Error(
      `Could not extract readable text from ${fileLabel}. Upload a text-based PDF, DOCX, or TXT file (not a scanned image PDF).`
    );
  }
  return cleaned;
}
