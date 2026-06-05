/** Universal guards — block JD boilerplate/metadata for ANY resume type or industry. */

const GENERIC_STOPWORDS = new Set([
  "looking", "join", "opportunity", "apply", "prefer", "preferred", "bonus",
  "excellent", "familiarity", "hands-on", "environment", "delivering", "creating",
  "maintaining", "ensure", "across", "multiple", "both", "either", "focused",
  "provide", "providing", "collaborate", "contribute", "ensuring",
  "help", "want", "like", "would", "could", "may", "might",
  "since", "still", "while", "then", "there", "here", "much", "many",
  "those", "these", "being", "having", "doing", "going",
  "make", "take", "own", "per", "via", "through", "along", "whether",
  "great", "ideal", "clear", "simple", "complex", "enhance", "evaluate",
  "assess", "diverse", "top", "exceptional", "leveraging", "welcome", "believe",
]);

const JD_BOILERPLATE =
  /\b(whatsapp|share your|updated cv|send your resume|click to apply|stipend|duration|qualification|employment type|reports to|work model|role category|industry type|department|freshers|internship period|job description|what we believe|accountable for|this position|full time|paid summer|high[- ]speed internet|laptop or desktop|basic computer knowledge|naukri|naukri\.com|indeed\.com|linkedin\.com\/jobs|salary range|compensation|benefits package|equal opportunity|eoe|apply now|walk[- ]in|walk in)\b/i;

const SENTENCE_FRAGMENTS =
  /\b(you will|we are|we're|our team|your role|responsibilities include|requirements include|must have|nice to have|about the role|about us|who you are|what you'll do|what you will|please note|note:|important:)\b/i;

const PHONE_PATTERN = /\+?\d[\d\s\-().]{7,}/;
const URL_OR_EMAIL = /https?:\/\/|www\.|@[\w.-]+\.\w/i;
const FIELD_LABEL = /^[a-z][\w\s]{0,32}:\s/;
const CURRENCY_OR_SALARY = /₹|rs\.?\s*\d|\$\d|lpa|per month|per annum|\/month|\/year/i;

export function isValidTailorKeyword(kw: string): boolean {
  const lower = kw.toLowerCase().trim().replace(/\s+/g, " ");
  if (lower.length < 2 || lower.length > 45) return false;
  if (PHONE_PATTERN.test(lower)) return false;
  if (URL_OR_EMAIL.test(lower)) return false;
  if (JD_BOILERPLATE.test(lower)) return false;
  if (SENTENCE_FRAGMENTS.test(lower)) return false;
  if (FIELD_LABEL.test(lower)) return false;
  if (CURRENCY_OR_SALARY.test(lower)) return false;
  if (/[;!?]/.test(lower)) return false;
  if (/^\d+$/.test(lower)) return false;

  const words = lower.split(/\s+/);
  if (words.length > 6) return false;

  // Single generic filler words only — never block multi-word domain skills
  if (words.length === 1 && GENERIC_STOPWORDS.has(lower)) return false;

  if (words.length > 1) {
    const stopCount = words.filter((w) => GENERIC_STOPWORDS.has(w)).length;
    if (stopCount >= words.length) return false;
  }

  return true;
}

export function filterTailorKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const kw of keywords) {
    const norm = kw.toLowerCase().trim().replace(/\s+/g, " ");
    if (!isValidTailorKeyword(norm) || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}
