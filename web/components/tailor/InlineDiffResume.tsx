"use client";

import { useState } from "react";
import type { StructuredResume, TailorSuggestion } from "@/lib/resumeParser";
import type { ResumeBullet, ResumeSection } from "@/lib/types";

interface Props {
  resume: StructuredResume;
  suggestions: TailorSuggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

function findSuggestionForBullet(
  bullet: ResumeBullet,
  section: ResumeSection,
  suggestions: TailorSuggestion[]
): TailorSuggestion | undefined {
  return suggestions.find((s) => {
    if (s.bulletId && s.bulletId === bullet.id) return true;
    if (s.originalText && s.originalText === bullet.text) return true;
    return false;
  });
}

function findSummarySuggestion(suggestions: TailorSuggestion[]): TailorSuggestion | undefined {
  return suggestions.find((s) => s.type === "summary");
}

function FloatingActions({
  suggestion,
  onAccept,
  onReject,
}: {
  suggestion: TailorSuggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (suggestion.applied) {
    return (
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full flex items-center gap-1 pl-2">
        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Applied</span>
        <button
          onClick={(e) => { e.stopPropagation(); onReject(suggestion.id); }}
          className="w-5 h-5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center text-[10px] transition-colors"
          title="Undo"
        >
          ↩
        </button>
      </div>
    );
  }
  return (
    <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full flex items-center gap-1 pl-2">
      <button
        onClick={(e) => { e.stopPropagation(); onAccept(suggestion.id); }}
        className="w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center text-xs font-bold transition-colors shadow-sm"
        title="Accept"
      >
        ✓
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onReject(suggestion.id); }}
        className="w-6 h-6 rounded-full bg-white hover:bg-red-50 text-red-400 hover:text-red-600 flex items-center justify-center text-xs font-bold transition-colors border border-slate-200 shadow-sm"
        title="Reject"
      >
        ✗
      </button>
    </div>
  );
}

function DiffBullet({
  bullet,
  suggestion,
  onAccept,
  onReject,
}: {
  bullet: ResumeBullet;
  suggestion?: TailorSuggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (!suggestion) {
    return (
      <li className="text-[12px] text-slate-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400 leading-relaxed py-0.5">
        {bullet.text}
      </li>
    );
  }

  if (suggestion.applied) {
    return (
      <li className="relative text-[12px] pl-4 leading-relaxed py-1 mr-16 bg-emerald-50 rounded-md px-3 border-l-3 border-emerald-400">
        <span className="text-emerald-800">{suggestion.suggestedText}</span>
        {suggestion.keywords.length > 0 && (
          <span className="ml-2 inline-flex gap-0.5">
            {suggestion.keywords.map((kw) => (
              <span key={kw} className="text-[8px] px-1 py-0 rounded bg-emerald-200/60 text-emerald-700">{kw}</span>
            ))}
          </span>
        )}
        <FloatingActions suggestion={suggestion} onAccept={onAccept} onReject={onReject} />
      </li>
    );
  }

  return (
    <li className="relative pl-4 leading-relaxed py-1.5 mr-16 bg-yellow-50 rounded-md px-3 border-l-3 border-yellow-400">
      <div className="text-[12px] text-red-500/80 line-through leading-snug">{bullet.text}</div>
      <div className="text-[12px] text-slate-800 leading-snug mt-0.5 font-medium bg-yellow-100/80 rounded px-1.5 py-0.5 inline-block">
        {suggestion.suggestedText}
      </div>
      {suggestion.keywords.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {suggestion.keywords.map((kw) => (
            <span key={kw} className="text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 font-medium">{kw}</span>
          ))}
        </div>
      )}
      <FloatingActions suggestion={suggestion} onAccept={onAccept} onReject={onReject} />
    </li>
  );
}

function RoleHeader({ item }: { item: ResumeBullet }) {
  if (!item.metadata?.role) return null;
  return (
    <div className="mb-1 mt-3 first:mt-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold text-slate-900 text-[13px]">{item.metadata.role}</span>
        <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
          {[item.metadata.startDate, item.metadata.endDate].filter(Boolean).join(" – ")}
        </span>
      </div>
      {item.metadata.company && (
        <div className="text-[11px] text-slate-500 italic">{item.metadata.company}</div>
      )}
    </div>
  );
}

function EduEntry({ item }: { item: ResumeBullet }) {
  if (!item.metadata?.degree) return null;
  return (
    <div className="mb-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold text-slate-900 text-[13px]">{item.metadata.degree}</span>
        <span className="text-[10px] text-slate-400 whitespace-nowrap">
          {[item.metadata.startDate, item.metadata.endDate].filter(Boolean).join(" – ")}
        </span>
      </div>
      {item.metadata.institution && <div className="text-[11px] text-slate-500">{item.metadata.institution}</div>}
    </div>
  );
}

function SectionEditPencil({ heading, onEdit }: { heading: string; onEdit: () => void }) {
  return (
    <button
      onClick={onEdit}
      className="opacity-0 group-hover:opacity-100 ml-2 text-slate-300 hover:text-slate-600 transition-opacity"
      title={`Edit ${heading}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  );
}

function AddedSkillsSuggestions({
  suggestions,
  onAccept,
  onReject,
}: {
  suggestions: TailorSuggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const pending = suggestions.filter((s) => s.type === "add" && !s.applied);
  const applied = suggestions.filter((s) => s.type === "add" && s.applied);

  if (pending.length === 0 && applied.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {applied.map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 mr-1">
          + {s.suggestedText}
          <button onClick={() => onReject(s.id)} className="text-[9px] text-slate-400 hover:text-red-500 ml-0.5">↩</button>
        </span>
      ))}
      {pending.length > 0 && (
        <div className="bg-yellow-50 rounded-md px-3 py-2 border border-yellow-200">
          <div className="text-[9px] text-yellow-700 font-semibold uppercase tracking-wider mb-1.5">Suggested Skills</div>
          <div className="flex flex-wrap gap-1">
            {pending.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                + {s.suggestedText}
                <button
                  onClick={() => onAccept(s.id)}
                  className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center hover:bg-emerald-600"
                >
                  ✓
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function InlineDiffResume({ resume, suggestions, onAccept, onReject }: Props) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const summarySuggestion = findSummarySuggestion(suggestions);
  const rewriteSuggestions = suggestions.filter((s) => s.type === "rewrite");

  return (
    <div className="bg-white text-slate-900 rounded-lg shadow-lg p-8 min-h-full border border-slate-200">
      {/* Contact header */}
      <div className="text-center border-b pb-4 mb-5 border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">
          {resume.contact.name || "Your Name"}
        </h1>
        <div className="text-[11px] text-slate-500 mt-1.5 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
          {[resume.contact.phone, resume.contact.email, resume.contact.linkedin, resume.contact.github]
            .filter(Boolean)
            .map((c, i, arr) => (
              <span key={i}>
                {c}{i < arr.length - 1 ? <span className="mx-1 text-slate-300">|</span> : ""}
              </span>
            ))}
        </div>
      </div>

      {/* Sections */}
      {resume.sections.map((section) => (
        <div key={section.id} className="mb-4 group">
          <div className="flex items-center mb-2 pb-1 border-b border-slate-200">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {section.heading}
            </h2>
            <SectionEditPencil
              heading={section.heading}
              onEdit={() => setEditingSection(editingSection === section.id ? null : section.id)}
            />
          </div>

          {section.type === "summary" && (
            <div>
              {summarySuggestion && !summarySuggestion.applied ? (
                <div className="relative bg-yellow-50 rounded-md px-3 py-2 border-l-3 border-yellow-400 mr-16">
                  <p className="text-[12px] text-red-500/80 line-through leading-snug">
                    {section.items.map((it) => it.text).join(" ")}
                  </p>
                  <p className="text-[12px] text-slate-800 leading-snug mt-1 font-medium bg-yellow-100/80 rounded px-1.5 py-0.5">
                    {summarySuggestion.suggestedText}
                  </p>
                  <FloatingActions suggestion={summarySuggestion} onAccept={onAccept} onReject={onReject} />
                </div>
              ) : summarySuggestion?.applied ? (
                <div className="relative bg-emerald-50 rounded-md px-3 py-2 border-l-3 border-emerald-400 mr-16">
                  <p className="text-[12px] text-emerald-800 leading-snug">
                    {summarySuggestion.suggestedText}
                  </p>
                  <FloatingActions suggestion={summarySuggestion} onAccept={onAccept} onReject={onReject} />
                </div>
              ) : (
                <p className="text-[12px] text-slate-700 leading-relaxed">
                  {section.items.map((it) => it.text).join(" ")}
                </p>
              )}
            </div>
          )}

          {section.type === "skills" && (
            <div>
              <p className="text-[12px] text-slate-700">{section.items.map((it) => it.text).join(", ")}</p>
              <AddedSkillsSuggestions suggestions={suggestions} onAccept={onAccept} onReject={onReject} />
            </div>
          )}

          {section.type !== "summary" && section.type !== "skills" && (
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                if (item.metadata?.role) return <RoleHeader key={item.id} item={item} />;
                if (item.metadata?.degree) return <EduEntry key={item.id} item={item} />;
                const sug = findSuggestionForBullet(item, section, rewriteSuggestions);
                return (
                  <DiffBullet
                    key={item.id}
                    bullet={item}
                    suggestion={sug}
                    onAccept={onAccept}
                    onReject={onReject}
                  />
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
