// ─── TF-IDF Cosine Similarity Engine ───────────────────────────────────────────
// True semantic matching using Term Frequency–Inverse Document Frequency
// with cosine similarity. Works without external API calls.

import { expandSkillAliases, resolveSkill } from "./skillsTaxonomy";

export interface SemanticResult {
  overallSimilarity: number;
  sectionSimilarities: { section: string; similarity: number }[];
  topAlignedPhrases: { resumePhrase: string; jdPhrase: string; similarity: number }[];
  conceptCoverage: number;
}

// ─── Text Processing ───────────────────────────────────────────────────────────

const SEMANTIC_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "must",
  "it", "its", "this", "that", "these", "those", "i", "me", "my",
  "we", "our", "you", "your", "he", "him", "his", "she", "her",
  "they", "them", "their", "who", "whom", "which", "what", "where",
  "when", "how", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "no", "not", "only", "same",
  "so", "than", "too", "very", "just", "about", "above", "after",
  "again", "also", "am", "as", "because", "before", "between",
  "during", "here", "there", "into", "through", "up", "down",
  "out", "off", "over", "under", "then", "once", "if", "while",
]);

function tokenize(text: string): string[] {
  const normalized = expandSkillAliases(text).toLowerCase()
    .replace(/[^a-z0-9+#.\-/\s]/g, " ");
  return normalized
    .split(/\s+/)
    .filter((t) => t.length > 1 && !SEMANTIC_STOP_WORDS.has(t));
}

function extractNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(" "));
  }
  return ngrams;
}

function buildVocabulary(docs: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of docs) {
    const seen = new Set<string>();
    for (const token of doc) {
      if (!seen.has(token)) {
        seen.add(token);
        df.set(token, (df.get(token) || 0) + 1);
      }
    }
  }
  return df;
}

// ─── TF-IDF Computation ────────────────────────────────────────────────────────

interface TfIdfVector {
  terms: Map<string, number>;
  magnitude: number;
}

function computeTfIdf(tokens: string[], df: Map<string, number>, totalDocs: number): TfIdfVector {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }

  const terms = new Map<string, number>();
  let magnitudeSquared = 0;

  for (const [term, count] of tf) {
    const termFreq = count / tokens.length;
    const docFreq = df.get(term) || 1;
    const idf = Math.log((totalDocs + 1) / (docFreq + 1)) + 1;
    const tfidf = termFreq * idf;
    terms.set(term, tfidf);
    magnitudeSquared += tfidf * tfidf;
  }

  return { terms, magnitude: Math.sqrt(magnitudeSquared) };
}

function cosineSimilarity(a: TfIdfVector, b: TfIdfVector): number {
  if (a.magnitude === 0 || b.magnitude === 0) return 0;

  let dotProduct = 0;
  for (const [term, weightA] of a.terms) {
    const weightB = b.terms.get(term);
    if (weightB) dotProduct += weightA * weightB;
  }

  return dotProduct / (a.magnitude * b.magnitude);
}

// ─── Sentence-Level Matching ───────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  return text.split(/[.\n;!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

function findBestAlignments(
  resumeSentences: string[],
  jdSentences: string[],
  df: Map<string, number>,
  totalDocs: number
): { resumePhrase: string; jdPhrase: string; similarity: number }[] {
  const alignments: { resumePhrase: string; jdPhrase: string; similarity: number }[] = [];

  for (const jdSent of jdSentences) {
    const jdTokens = tokenize(jdSent);
    if (jdTokens.length < 2) continue;
    const jdVec = computeTfIdf(jdTokens, df, totalDocs);

    let bestSim = 0;
    let bestResume = "";

    for (const rSent of resumeSentences) {
      const rTokens = tokenize(rSent);
      if (rTokens.length < 2) continue;
      const rVec = computeTfIdf(rTokens, df, totalDocs);
      const sim = cosineSimilarity(jdVec, rVec);
      if (sim > bestSim) {
        bestSim = sim;
        bestResume = rSent;
      }
    }

    if (bestSim > 0.15) {
      alignments.push({
        resumePhrase: bestResume.slice(0, 100),
        jdPhrase: jdSent.slice(0, 100),
        similarity: Math.round(bestSim * 100) / 100,
      });
    }
  }

  return alignments.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
}

function skillSetOverlap(tokens: string[]): Set<string> {
  const ids = new Set<string>();
  for (const token of tokens) {
    const node = resolveSkill(token);
    if (node) ids.add(node.id);
  }
  return ids;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const id of a) {
    if (b.has(id)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ─── Main Semantic Scoring Function ────────────────────────────────────────────

export function computeSemanticSimilarity(resumeText: string, jdText: string): SemanticResult {
  if (!resumeText || !jdText) {
    return { overallSimilarity: 0, sectionSimilarities: [], topAlignedPhrases: [], conceptCoverage: 0 };
  }

  const expandedResume = expandSkillAliases(resumeText);
  const expandedJd = expandSkillAliases(jdText);

  // Tokenize both documents with unigrams + bigrams
  const resumeTokens = tokenize(expandedResume);
  const jdTokens = tokenize(expandedJd);
  const resumeBigrams = extractNgrams(resumeTokens, 2);
  const jdBigrams = extractNgrams(jdTokens, 2);

  const allResumeTokens = [...resumeTokens, ...resumeBigrams];
  const allJdTokens = [...jdTokens, ...jdBigrams];

  // Build vocabulary across both docs
  const allDocs = [allResumeTokens, allJdTokens];
  const df = buildVocabulary(allDocs);
  const totalDocs = allDocs.length;

  // Document-level TF-IDF cosine similarity
  const resumeVec = computeTfIdf(allResumeTokens, df, totalDocs);
  const jdVec = computeTfIdf(allJdTokens, df, totalDocs);
  let overallSimilarity = cosineSimilarity(resumeVec, jdVec);

  // Section-level analysis
  const resumeSections = expandedResume.split(/\n(?=[A-Z][a-z]*\s*\n|[A-Z]{3,})/);
  const sectionSimilarities: { section: string; similarity: number }[] = [];

  for (const section of resumeSections) {
    if (section.trim().length < 20) continue;
    const sectionLines = section.split("\n");
    const heading = sectionLines[0]?.trim().slice(0, 40) || "Section";
    const sectionTokens = [...tokenize(section), ...extractNgrams(tokenize(section), 2)];
    const sectionVec = computeTfIdf(sectionTokens, df, totalDocs);
    const sim = cosineSimilarity(sectionVec, jdVec);
    sectionSimilarities.push({ section: heading, similarity: Math.round(sim * 100) / 100 });
  }

  // Sentence-level alignments
  const resumeSentences = splitSentences(expandedResume);
  const jdSentences = splitSentences(expandedJd);
  const topAlignedPhrases = findBestAlignments(resumeSentences, jdSentences, df, totalDocs + resumeSentences.length + jdSentences.length);

  // Concept coverage: what % of JD's important terms appear (fuzzy) in the resume
  const jdImportant = [...jdVec.terms.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([term]) => term);

  let covered = 0;
  for (const term of jdImportant) {
    if (resumeVec.terms.has(term)) covered++;
  }
  const conceptCoverage = jdImportant.length > 0 ? covered / jdImportant.length : 0;

  // Taxonomy skill overlap (JS/k8s abbreviations resolve to same nodes as full JD terms)
  const resumeSkillIds = skillSetOverlap(resumeTokens);
  const jdSkillIds = skillSetOverlap(jdTokens);
  const skillOverlap = jaccardSimilarity(resumeSkillIds, jdSkillIds);

  // Blend TF-IDF with concept + taxonomy skill overlap for abbreviated resumes
  overallSimilarity =
    overallSimilarity * 0.45 +
    conceptCoverage * 0.25 +
    skillOverlap * 0.30;

  return {
    overallSimilarity: Math.round(overallSimilarity * 100) / 100,
    sectionSimilarities: sectionSimilarities.sort((a, b) => b.similarity - a.similarity).slice(0, 8),
    topAlignedPhrases,
    conceptCoverage: Math.round(conceptCoverage * 100) / 100,
  };
}
