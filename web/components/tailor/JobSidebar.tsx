"use client";

interface Props {
  jobTitle: string;
  company: string;
  source?: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  totalJDKeywords: number;
  score: number | null;
  initialScore: number | null;
  appliedCount: number;
  totalSuggestions: number;
  onTailorResume?: () => void;
  isGenerating?: boolean;
}

function KeywordGauge({ matched, total }: { matched: number; total: number }) {
  const pct = total > 0 ? Math.round((matched / total) * 100) : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 70 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#1E293B" strokeWidth="4" />
          <circle
            cx="40" cy="40" r={radius}
            fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black" style={{ color }}>{matched}</span>
          <span className="text-[9px] text-slate-400">of {total}</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-200">Keywords</div>
        <div className="text-[11px] text-slate-400">{pct}% matched</div>
      </div>
    </div>
  );
}

export function JobSidebar({
  jobTitle,
  company,
  source,
  matchedKeywords,
  missingKeywords,
  totalJDKeywords,
  score,
  initialScore,
  appliedCount,
  totalSuggestions,
  onTailorResume,
  isGenerating,
}: Props) {
  const improvement = initialScore != null && score != null ? score - initialScore : null;

  return (
    <div className="flex flex-col h-full">
      {/* Job info */}
      <div className="p-4 border-b border-[var(--focus-border)]">
        <h2 className="text-sm font-bold text-slate-100 leading-tight">{jobTitle || "Job Details"}</h2>
        {company && <div className="text-xs text-slate-400 mt-0.5">{company}</div>}
        {source && (
          <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{source}</span>
        )}
      </div>

      {/* Score section */}
      <div className="p-4 border-b border-[var(--focus-border)]">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">ATS Match Score</div>
        <div className="flex items-end gap-2">
          <span className={`text-4xl font-black tabular-nums ${
            score != null ? (score >= 70 ? "text-emerald-400" : score >= 45 ? "text-amber-400" : "text-red-400") : "text-slate-500"
          }`}>
            {score ?? "–"}
          </span>
          {improvement != null && improvement > 0 && (
            <span className="text-emerald-400 text-sm font-bold mb-1.5 animate-pulse">+{improvement}</span>
          )}
        </div>
        {initialScore != null && (
          <div className="text-[10px] text-slate-500 mt-1">
            Baseline: {initialScore} &middot; {appliedCount}/{totalSuggestions} applied
          </div>
        )}
      </div>

      {/* Keyword gauge */}
      <div className="p-4 border-b border-[var(--focus-border)]">
        <KeywordGauge matched={matchedKeywords.length} total={totalJDKeywords} />
      </div>

      {/* Skills tags */}
      {matchedKeywords.length > 0 && (
        <div className="p-4 border-b border-[var(--focus-border)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Skills Found</div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {matchedKeywords.slice(0, 20).map((kw) => (
              <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing keywords */}
      {missingKeywords.length > 0 && (
        <div className="p-4 border-b border-[var(--focus-border)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Missing Keywords</div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {missingKeywords.slice(0, 20).map((kw) => (
              <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="p-4 space-y-2 mt-auto">
        {onTailorResume && (
          <button
            onClick={onTailorResume}
            disabled={isGenerating}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isGenerating ? "Regenerating..." : "Regenerate Suggestions"}
          </button>
        )}
      </div>
    </div>
  );
}
