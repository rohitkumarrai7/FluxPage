"use client";

import type { TailorSuggestion } from "@/lib/resumeParser";

interface Props {
  suggestions: TailorSuggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  lastScoreDelta?: number | null;
}

const SECTION_COLORS: Record<string, string> = {
  summary: "bg-violet-500/20 text-violet-300",
  experience: "bg-blue-500/20 text-blue-300",
  skills: "bg-emerald-500/20 text-emerald-300",
  projects: "bg-amber-500/20 text-amber-300",
  education: "bg-slate-500/20 text-slate-300",
};

export function SuggestionChecklist({
  suggestions,
  onAccept,
  onReject,
  lastScoreDelta,
}: Props) {
  const sorted = [...suggestions].sort((a, b) => (a.priority || 2) - (b.priority || 2));

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--focus-border)]">
        <h3 className="text-sm font-bold text-slate-100">AI Suggestions</h3>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Check to apply — score updates live
        </p>
        {lastScoreDelta != null && lastScoreDelta > 0 && (
          <div className="mt-2 text-xs font-bold text-emerald-400 animate-pulse">
            +{lastScoreDelta} match score
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {sorted.length === 0 && (
          <p className="text-xs text-slate-500 p-3 text-center">No suggestions yet</p>
        )}
        {sorted.map((s, i) => {
          const section = s.sectionType || s.type || "experience";
          const badgeClass = SECTION_COLORS[section] || SECTION_COLORS.experience;
          const preview = (s.suggestedText || s.reason || "").slice(0, 72);

          return (
            <label
              key={s.id}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors border ${
                s.applied
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-[var(--focus-surface)] border-transparent hover:border-[var(--focus-border)]"
              }`}
            >
              <input
                type="checkbox"
                checked={s.applied}
                onChange={() => (s.applied ? onReject(s.id) : onAccept(s.id))}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500/30"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[9px] font-bold text-slate-500">#{i + 1}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${badgeClass}`}>
                    {section}
                  </span>
                  {s.priority === 1 && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">
                      HIGH
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">{preview}</p>
                {s.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {s.keywords.slice(0, 3).map((kw) => (
                      <span
                        key={kw}
                        className="text-[8px] px-1 py-0.5 rounded bg-slate-700/50 text-slate-400"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
