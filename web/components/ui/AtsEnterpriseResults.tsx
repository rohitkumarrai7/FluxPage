import type { AtsAnalysisResult } from "@/lib/atsNormalize";

interface AtsEnterpriseResultsProps {
  result: AtsAnalysisResult;
  compact?: boolean;
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted capitalize">{label.replace(/([A-Z])/g, " $1").trim()}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export function AtsEnterpriseResults({ result, compact = false }: AtsEnterpriseResultsProps) {
  const scoreColor =
    result.score >= 75 ? "text-green-600" : result.score >= 50 ? "text-amber-500" : "text-red-500";

  const hardFailures =
    result.knockoutDetails?.failedFilters?.filter((f) => f.severity === "hard") ?? [];
  const softFailures =
    result.knockoutDetails?.failedFilters?.filter((f) => f.severity !== "hard") ?? [];
  const knockoutFailed = result.passedKnockouts === false;
  const keySkillTotal = result.matchedKeywords.length + result.missingKeywords.length;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted leading-relaxed">
        This score estimates keyword and skill fit against this job description. Real employer ATS systems
        vary by company and are not shown here.
      </p>

      <div className="flex items-center gap-4">
        <div className={`text-4xl font-black ${scoreColor}`}>{result.score}</div>
        <div className="text-sm text-muted">/100 match estimate</div>
        <span
          className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
            knockoutFailed
              ? "bg-red-50 text-red-700"
              : result.score >= 75
                ? "bg-green-50 text-green-700"
                : result.score >= 50
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
          }`}
        >
          {knockoutFailed
            ? "Key gaps found"
            : result.score >= 75
              ? "Strong fit"
              : result.score >= 50
                ? "Moderate fit"
                : "Low fit"}
        </span>
      </div>

      {keySkillTotal > 0 && (
        <p className="text-xs text-foreground">
          Matched <span className="font-semibold text-green-700">{result.matchedKeywords.length}</span>
          {" "}of{" "}
          <span className="font-semibold">{keySkillTotal}</span> key skills from this job description.
        </p>
      )}

      {knockoutFailed && hardFailures.length > 0 ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
          <div className="font-semibold">Important requirements not met</div>
          {hardFailures.map((f, i) => (
            <div key={i}>• {f.message}</div>
          ))}
        </div>
      ) : null}

      {softFailures.length > 0 ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
          <div className="font-semibold">
            {knockoutFailed ? "Additional gaps" : "Improvement opportunities"}
          </div>
          {softFailures.map((f, i) => (
            <div key={i}>• {f.message}</div>
          ))}
        </div>
      ) : null}

      {!compact && result.parsedResume && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 bg-slate-50 rounded border border-border">
            <div className="text-muted">Experience</div>
            <div className="font-semibold">{result.parsedResume.totalExperienceYears}y</div>
          </div>
          <div className="p-2 bg-slate-50 rounded border border-border">
            <div className="text-muted">Seniority</div>
            <div className="font-semibold capitalize">{result.parsedResume.seniorityLevel}</div>
          </div>
          <div className="p-2 bg-slate-50 rounded border border-border">
            <div className="text-muted">Skills</div>
            <div className="font-semibold">{result.parsedResume.skillCount}</div>
          </div>
          <div className="p-2 bg-slate-50 rounded border border-border">
            <div className="text-muted">Education</div>
            <div className="font-semibold capitalize">{result.parsedResume.educationLevel.replace("_", " ")}</div>
          </div>
        </div>
      )}

      {result.breakdown && !compact && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">Score Breakdown</div>
          <BreakdownBar label="Keywords" value={result.breakdown.keywordMatch} />
          {result.breakdown.taxonomyMatch != null && (
            <BreakdownBar label="Taxonomy" value={result.breakdown.taxonomyMatch} />
          )}
          <BreakdownBar label="Semantic" value={result.breakdown.semanticSimilarity} />
          <BreakdownBar label="Sections" value={result.breakdown.sectionCompleteness} />
          <BreakdownBar label="Format" value={result.breakdown.formatCompatibility} />
          <BreakdownBar label="Impact" value={result.breakdown.impactDensity} />
          {result.breakdown.experienceRelevance != null && (
            <BreakdownBar label="Experience relevance" value={result.breakdown.experienceRelevance} />
          )}
        </div>
      )}

      {result.matchedKeywords.length > 0 && (
        <div>
          <div className="text-xs font-medium text-green-700 mb-1">
            Matched key skills ({result.matchedKeywords.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.matchedKeywords.slice(0, compact ? 10 : 15).map((kw) => (
              <span key={kw} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.missingKeywords.length > 0 && (
        <div>
          <div className="text-xs font-medium text-amber-700 mb-1">
            Missing key skills ({result.missingKeywords.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.missingKeywords.slice(0, compact ? 10 : 15).map((kw) => (
              <span key={kw} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.relatedMatches && result.relatedMatches.length > 0 && !compact && (
        <div>
          <div className="text-xs font-medium text-primary mb-1">Related Skill Matches</div>
          <div className="space-y-1 text-xs text-muted">
            {result.relatedMatches.slice(0, 5).map((m, i) => (
              <div key={i}>
                {m.resumeSkill} ≈ {m.jdSkill} ({Math.round(m.similarity * 100)}%)
              </div>
            ))}
          </div>
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div>
          <div className="text-xs font-medium text-foreground mb-1">Suggestions</div>
          <ul className="text-xs text-muted space-y-1">
            {result.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary flex-shrink-0">&rarr;</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
