/** Apply one suggestion per bullet (highest priority) — matches realistic accept-all behavior. */
export function dedupeSuggestionsForApply(suggestions) {
  const seenBullet = new Set();
  let hasSummary = false;
  const sorted = [...suggestions].sort((a, b) => (a.priority || 2) - (b.priority || 2));
  const out = [];

  for (const s of sorted) {
    if (s.type === "summary" || s.sectionType === "summary") {
      if (hasSummary) continue;
      hasSummary = true;
      out.push(s);
      continue;
    }

    if (
      s.type === "rewrite" &&
      s.bulletIndex != null &&
      (s.sectionType === "experience" || s.sectionType === "projects")
    ) {
      const key = `${s.sectionType}:${s.bulletIndex}`;
      if (seenBullet.has(key)) continue;
      seenBullet.add(key);
    }

    out.push(s);
  }

  return out;
}
