"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { slugToVariant, RESUME_TEMPLATES, type TemplateVariant } from "@/components/resume/templates";
import { ResumeLayout } from "@/components/resume/templates/layouts";
import {
  applySuggestionToResume,
  buildSuggestions,
  needsReparse,
  nerToStructuredResume,
  parseResumeText,
  scoreParseQuality,
  structuredResumeToText,
  type StructuredResume,
  type TailorSuggestion,
} from "@/lib/resumeParser";
import { Spinner, SpinnerCenter } from "@/components/ui";
import { AnimatedScore } from "@/components/ui/AnimatedScore";
import { InlineDiffResume } from "@/components/tailor/InlineDiffResume";
import { JobSidebar } from "@/components/tailor/JobSidebar";
import { SuggestionChecklist } from "@/components/tailor/SuggestionChecklist";
import type { AtsBreakdown } from "@/lib/atsNormalize";
import type { JDAnalysis } from "@/lib/jdAnalyzer";
import { analytics } from "@/lib/analytics";
import { useFluxFlag } from "@/hooks/useFeatureFlag";

type WizardStep = "tailor" | "template" | "download";
type Intensity = "low" | "medium" | "high";

function pickBestParse(...candidates: (StructuredResume | null | undefined)[]): StructuredResume | null {
  let best: StructuredResume | null = null;
  let bestScore = -1;
  for (const c of candidates) {
    if (!c || !c.sections?.length) continue;
    const s = scoreParseQuality(c);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}

function TailorContent() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<any>(null);
  const [resume, setResume] = useState<StructuredResume | null>(null);
  const [originalResume, setOriginalResume] = useState<StructuredResume | null>(null);
  const [suggestions, setSuggestions] = useState<TailorSuggestion[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [initialScore, setInitialScore] = useState<number | null>(null);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [isGeneratingSugg, setIsGeneratingSugg] = useState(false);
  const [template, setTemplate] = useState<TemplateVariant>("classic");
  const [step, setStep] = useState<WizardStep>("tailor");
  const [intensity, setIntensity] = useState<Intensity>("medium");
  const [fontSize, setFontSize] = useState(10.5);
  const [lineSpacing, setLineSpacing] = useState(1.2);
  const [isLlmParsing, setIsLlmParsing] = useState(false);
  const [filename, setFilename] = useState("tailored-resume");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [atsBreakdown, setAtsBreakdown] = useState<AtsBreakdown | null>(null);
  const [jdInsights, setJdInsights] = useState<JDAnalysis | null>(null);
  const [lastScoreDelta, setLastScoreDelta] = useState<number | null>(null);
  const jdAnalysisCacheRef = useRef<JDAnalysis | null>(null);
  const [docxExportEnabled, setDocxExportEnabled] = useState(false);
  const newTailorWizard = useFluxFlag("new-tailor-wizard");

  const snapshotsRef = useRef<Map<string, StructuredResume>>(new Map());

  const rescoreFull = useCallback(async (nextResume: StructuredResume) => {
    if (!jobDescription) return { score: 0, matchedKeywords: [] as string[], missingKeywords: [] as string[] };
    const text = structuredResumeToText(nextResume);
    try {
      const result = await api.ats.analyzeEnterprise(text, jobDescription);
      setScore(result.score || 0);
      setMatchedKeywords(result.matchedKeywords || []);
      setMissingKeywords(result.missingKeywords || []);
      if (result.breakdown) setAtsBreakdown(result.breakdown);
      return {
        score: result.score || 0,
        matchedKeywords: result.matchedKeywords || [],
        missingKeywords: result.missingKeywords || [],
      };
    } catch {
      return { score: 0, matchedKeywords: [], missingKeywords: [] };
    }
  }, [jobDescription]);

  const rescore = useCallback(async (nextResume: StructuredResume): Promise<number> => {
    const result = await rescoreFull(nextResume);
    return result.score;
  }, [rescoreFull]);

  useEffect(() => {
    const saved = localStorage.getItem("rf_preferred_template");
    if (saved) setTemplate(slugToVariant(saved));
  }, []);

  useEffect(() => {
    if (!api.auth.isLoggedIn()) return;
    api.auth.getProfile().then((profile) => {
      setDocxExportEnabled(!!profile.usage?.docxExportEnabled);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (draft?.context?.preferredTemplate) {
      setTemplate(slugToVariant(draft.context.preferredTemplate));
    }
  }, [draft]);

  async function llmParseResume(rawText: string): Promise<StructuredResume | null> {
    try {
      setIsLlmParsing(true);
      const res = await fetch("/api/parse-resume-structured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (data.parsed?.sections?.length > 0) {
        return data.parsed as StructuredResume;
      }
    } catch (err) {
      console.error("[tailor] LLM parse failed:", err);
    } finally {
      setIsLlmParsing(false);
    }
    return null;
  }

  async function generateLLMSuggestions(
    structuredResume: StructuredResume,
    jd: string,
    draftData: any,
    gapMissing: string[],
    gapMatched: string[],
    intensityOverride?: Intensity
  ) {
    setIsGeneratingSugg(true);
    try {
      const res = await fetch("/api/tailor-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: structuredResumeToText(structuredResume),
          structuredResume,
          jobDescription: jd,
          jobTitle: draftData?.context?.job?.title || draftData?.jobTitle || "",
          company: draftData?.context?.job?.company || draftData?.company || "",
          missingKeywords: gapMissing,
          matchedKeywords: gapMatched,
          intensity: intensityOverride || intensity,
          cachedJdAnalysis: jdAnalysisCacheRef.current,
        }),
      });
      const data = await res.json();
      if (data.jdAnalysis) {
        jdAnalysisCacheRef.current = data.jdAnalysis;
        setJdInsights(data.jdAnalysis);
      }
      if (data.suggestions && data.suggestions.length > 0) {
        const mapped: TailorSuggestion[] = data.suggestions.map((s: any) => {
          const section = structuredResume.sections.find(
            (sec) => sec.type === s.sectionType
          );
          let bulletId: string | undefined;
          if (s.bulletIndex != null && section) {
            const bullets = section.items.filter((it) => !it.metadata?.role && !it.metadata?.degree);
            bulletId = bullets[s.bulletIndex]?.id;
          }
          return {
            id: s.id,
            sectionId: section?.id || structuredResume.sections[0]?.id || "general",
            sectionType: s.sectionType,
            bulletId,
            bulletIndex: s.bulletIndex,
            type: s.type as TailorSuggestion["type"],
            originalText: s.originalText || "",
            suggestedText: s.suggestedText || "",
            reason: s.reason || "",
            keywords: s.keywords || [],
            applied: false,
            priority: s.priority || 2,
          };
        });
        return mapped;
      }
    } catch (err) {
      console.error("[tailor] LLM suggestions failed:", err);
    } finally {
      setIsGeneratingSugg(false);
    }
    return null;
  }

  useEffect(() => {
    if (!draftId) {
      setLoading(false);
      setError("No draft ID. Open from the Chrome extension after analyzing a job.");
      return;
    }
    (async () => {
      try {
        const data = await api.drafts.get(draftId);
        setDraft(data);
        localStorage.setItem("rf_last_draft_id", draftId);
        setInitialScore(data.initialScore ?? data.context?.analysis?.initialScore ?? null);
        setScore(data.currentAtsScore ?? data.context?.analysis?.currentScore ?? null);
        analytics.tailorOpened({
          draft_id: draftId,
          initial_score: data.initialScore ?? data.context?.analysis?.initialScore ?? undefined,
        });

        const gap = data.context?.analysis?.gapAnalysis || {};
        const gapMatched = gap.matchedKeywords || [];
        const gapMissing = gap.missingKeywords || [];
        setMatchedKeywords(gapMatched);
        setMissingKeywords(gapMissing);
        const jd =
          data.context?.job?.description ||
          data.jobDescription ||
          data.context?.jobDescription ||
          "";
        setJobDescription(jd);
        const rawText =
          data.context?.analysis?.gapAnalysis?.resumeOriginalText ||
          data.resumeOriginalText ||
          data.context?.resume?.rawText ||
          "";

        // Build parse candidates
        const regexParsed = rawText ? parseResumeText(rawText) : null;
        const cachedStructured = data.context?.structuredResume || null;
        let nerConverted: StructuredResume | null = null;
        if (data.context?.resume?.structuredData) {
          try { nerConverted = nerToStructuredResume(data.context.resume.structuredData); } catch {}
        }

        const llmPromise =
          rawText && rawText.length > 50 ? llmParseResume(rawText) : Promise.resolve(null);

        let structured = pickBestParse(nerConverted, regexParsed, cachedStructured);
        const llmParsed = await llmPromise;
        structured = pickBestParse(llmParsed, structured);
        if (!structured && cachedStructured) structured = cachedStructured;

        setResume(structured);
        setOriginalResume(structured ? JSON.parse(JSON.stringify(structured)) : null);

        if (structured && jd) {
          rescoreFull(structured).catch(() => {});
        }

        if (structured && jd) {
          const llmSugg = await generateLLMSuggestions(
            structured, jd, data, gapMissing, gapMatched
          );
          if (llmSugg && llmSugg.length > 0) {
            setSuggestions(llmSugg);
          } else {
            const fallback = buildSuggestions(structured, gapMissing, []);
            setSuggestions(fallback);
          }
        }

        // Persist improved structured resume
        if (structured && draftId) {
          api.drafts.saveState(draftId, {
            structuredResume: structured,
            aiSuggestions: [],
            currentScore: data.currentAtsScore ?? 0,
          }).catch(() => {});
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load draft");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  async function persistState(
    nextResume: StructuredResume,
    nextSuggestions: TailorSuggestion[],
    nextScore: number
  ) {
    if (!draftId) return;
    try {
      await api.drafts.saveState(draftId, {
        structuredResume: nextResume,
        aiSuggestions: nextSuggestions,
        currentScore: nextScore,
      });
    } catch { /* non-blocking */ }
  }

  function acceptSuggestion(id: string) {
    if (!resume) return;
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion || suggestion.applied) return;

    const scoreBefore = score ?? initialScore ?? 0;
    snapshotsRef.current.set(id, JSON.parse(JSON.stringify(resume)));
    const nextResume = applySuggestionToResume(resume, suggestion);
    setResume(nextResume);
    const nextSuggestions = suggestions.map((s) =>
      s.id === id ? { ...s, applied: true } : s
    );
    setSuggestions(nextSuggestions);
    analytics.tailorSuggestionApplied({ count: 1, type: suggestion.type });
    rescore(nextResume).then((newScore) => {
      const delta = newScore - scoreBefore;
      if (delta > 0) setLastScoreDelta(delta);
      persistState(nextResume, nextSuggestions, newScore);
    });
  }

  function rejectSuggestion(id: string) {
    if (!resume) return;
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion) return;

    if (suggestion.applied) {
      const snapshot = snapshotsRef.current.get(id);
      if (snapshot) {
        setResume(snapshot);
        snapshotsRef.current.delete(id);
      }
    }
    const nextSuggestions = suggestions.map((s) =>
      s.id === id ? { ...s, applied: false } : s
    );
    setSuggestions(nextSuggestions);
  }

  async function applyAll() {
    if (!resume || !jobDescription) return;
    snapshotsRef.current.set("__all__", JSON.parse(JSON.stringify(resume)));
    const scoreBefore = score ?? initialScore ?? 0;
    let nextResume = resume;
    const nextSuggestions = suggestions.map((s) => {
      if (s.applied) return s;
      snapshotsRef.current.set(s.id, JSON.parse(JSON.stringify(nextResume)));
      nextResume = applySuggestionToResume(nextResume, s);
      return { ...s, applied: true };
    });
    setResume(nextResume);
    setSuggestions(nextSuggestions);

    const rescored = await rescoreFull(nextResume);
    const delta = rescored.score - scoreBefore;
    if (delta > 0) setLastScoreDelta(delta);
    analytics.tailorSuggestionApplied({ count: nextSuggestions.filter((s) => s.applied).length, type: "bulk" });
    await persistState(nextResume, nextSuggestions, rescored.score);
  }

  function resetAll() {
    if (originalResume) {
      setResume(JSON.parse(JSON.stringify(originalResume)));
      setSuggestions((prev) => prev.map((s) => ({ ...s, applied: false })));
      snapshotsRef.current.clear();
    }
  }

  async function regenerateSuggestions(newIntensity?: Intensity) {
    if (!resume || !jobDescription) return;
    const gap = draft?.context?.analysis?.gapAnalysis || {};
    const llmSugg = await generateLLMSuggestions(
      originalResume || resume,
      jobDescription,
      draft,
      gap.missingKeywords || missingKeywords,
      gap.matchedKeywords || matchedKeywords,
      newIntensity
    );
    if (llmSugg && llmSugg.length > 0) {
      if (originalResume) setResume(JSON.parse(JSON.stringify(originalResume)));
      setSuggestions(llmSugg);
      snapshotsRef.current.clear();
    }
  }

  async function downloadPdf() {
    if (!resume || isDownloading) return;
    setIsDownloading(true);
    setDownloadError("");
    try {
      const { downloadResumePdf } = await import("@/components/resume/ResumePDF");
      const safeName = (filename.trim() || "tailored-resume").replace(/[<>:"/\\|?*]+/g, "-");
      await downloadResumePdf(resume, template, `${safeName}.pdf`, {
        fontSize,
        lineSpacing,
      });
      analytics.pdfDownloaded({ template });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "PDF download failed";
      setDownloadError(msg);
      console.error("[tailor] PDF download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  }

  async function downloadDocx() {
    if (!resume) return;
    if (!docxExportEnabled) {
      setDownloadError("DOCX export requires a Pro or Premium plan.");
      return;
    }
    setDownloadError("");
    const { exportAsDocx } = await import("@/lib/exportResume");
    await exportAsDocx(resume, `${filename}.docx`);
    analytics.docxDownloaded({ template });
  }

  function downloadLatex() {
    if (!resume) return;
    import("@/lib/exportResume").then(({ exportAsLatex }) => {
      exportAsLatex(resume!, `${filename}.tex`);
    });
  }

  const appliedCount = suggestions.filter((s) => s.applied).length;
  const jobTitle = draft?.context?.job?.title || draft?.jobTitle || "";
  const company = draft?.context?.job?.company || draft?.company || "";
  const source = draft?.context?.job?.source || "";
  const improvement = initialScore != null && score != null ? score - initialScore : null;

  if (loading) {
    return (
      <div className="focus-shell min-h-screen flex flex-col items-center justify-center bg-[var(--focus-bg)] gap-3">
        <Spinner size="lg" />
        {isLlmParsing && <span className="text-xs text-slate-400">Analyzing resume with AI...</span>}
        {isGeneratingSugg && <span className="text-xs text-slate-400">Generating tailored suggestions...</span>}
      </div>
    );
  }

  if (error && !resume) {
    return (
      <div className="focus-shell min-h-screen flex items-center justify-center bg-[var(--focus-bg)] text-center px-6 text-[var(--focus-text)]">
        <div>
          <p className="text-red-300 mb-4">{error}</p>
          <a href="/dashboard" className="text-primary-400 hover:underline">Go to dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="focus-shell h-screen flex flex-col bg-[var(--focus-bg)] text-[var(--focus-text)]">
      {/* Header */}
      <header className="h-12 border-b border-[var(--focus-border)] bg-[var(--focus-panel)] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="leading-tight">
            <span className="font-semibold text-sm">{jobTitle || "Tailored Resume"}</span>
            {newTailorWizard && (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                Beta
              </span>
            )}
            {company && <span className="text-xs text-slate-400 ml-2">{company}</span>}
          </div>
        </div>

        {/* Center: Tailoring intensity (LetMeApply style) */}
        {step === "tailor" && (
          <div className="flex items-center gap-0.5 bg-[var(--focus-surface)] rounded-lg p-0.5">
            <span className="text-[10px] text-slate-400 px-2">Tailoring</span>
            {(["low", "medium", "high"] as const).map((i) => (
              <button
                key={i}
                onClick={() => {
                  setIntensity(i);
                  regenerateSuggestions(i);
                }}
                className={`text-xs px-3 py-1 rounded-md capitalize font-medium transition-all ${
                  intensity === i
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        )}

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {(["tailor", "template", "download"] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                step === s
                  ? "bg-primary/20 text-primary-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                step === s ? "bg-primary text-white" : "bg-slate-700 text-slate-400"
              }`}>
                {i + 1}
              </span>
              {s === "tailor" ? "Tailor" : s === "template" ? "Template" : "Download"}
            </button>
          ))}
        </div>
      </header>

      {/* Step 1: Tailor (LetMeApply layout) */}
      {step === "tailor" && (
        <div className="flex-1 flex overflow-hidden relative pb-14">
          {/* Left: Suggestion checklist (LetMeApply style) */}
          <div className="w-72 border-r border-[var(--focus-border)] bg-[var(--focus-panel)] flex-shrink-0 overflow-hidden hidden lg:flex lg:flex-col">
            <SuggestionChecklist
              suggestions={suggestions}
              onAccept={acceptSuggestion}
              onReject={rejectSuggestion}
              lastScoreDelta={lastScoreDelta}
            />
          </div>

          {/* Center: Resume with inline diffs */}
          <div className="flex-1 overflow-auto bg-gray-100 dark:bg-slate-900/50">
            <div className="max-w-[680px] mx-auto py-6 px-4 relative">
              {/* Floating score overlay */}
              <div className="absolute top-8 right-0 z-10 flex flex-col items-center">
                <div className="bg-white dark:bg-[var(--focus-panel)] rounded-xl shadow-lg border border-slate-200 dark:border-[var(--focus-border)] p-3 flex flex-col items-center min-w-[80px]">
                  <AnimatedScore value={score} className="text-2xl font-black" />
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Match Score</span>
                  {improvement != null && improvement > 0 && (
                    <span className="text-emerald-500 text-[10px] font-bold">+{improvement}</span>
                  )}
                </div>
              </div>

              {isGeneratingSugg && (
                <div className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 mb-4 justify-center bg-white dark:bg-[var(--focus-panel)] rounded-lg p-3 shadow-sm">
                  <Spinner size="sm" /> Generating AI suggestions...
                </div>
              )}

              {resume && (
                <div data-ph-mask>
                <InlineDiffResume
                  resume={resume}
                  suggestions={suggestions}
                  onAccept={acceptSuggestion}
                  onReject={rejectSuggestion}
                />
                </div>
              )}
            </div>
          </div>

          {/* Right: Job sidebar */}
          <div className="w-80 border-l border-[var(--focus-border)] bg-[var(--focus-panel)] flex-shrink-0 overflow-y-auto">
            <JobSidebar
              jobTitle={jobTitle}
              company={company}
              source={source}
              matchedKeywords={matchedKeywords}
              missingKeywords={missingKeywords}
              score={score}
              initialScore={initialScore}
              appliedCount={appliedCount}
              totalSuggestions={suggestions.length}
              breakdown={atsBreakdown}
              jdInsights={jdInsights}
              onTailorResume={() => regenerateSuggestions()}
              isGenerating={isGeneratingSugg}
            />
          </div>

          {/* Sticky bottom bar (LetMeApply style) */}
          <div className="absolute bottom-0 left-0 right-0 lg:left-72 lg:right-80 h-14 bg-white dark:bg-[var(--focus-panel)] border-t border-slate-200 dark:border-[var(--focus-border)] flex items-center justify-between px-6 shadow-lg z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={applyAll}
                disabled={appliedCount === suggestions.length || suggestions.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Accept All Suggestions
              </button>
              <button
                onClick={resetAll}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Reset Changes
              </button>
            </div>
            <button
              onClick={() => setStep("template")}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-colors shadow-sm"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Template gallery */}
      {step === "template" && (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-slate-900/50">
            <div className="max-w-5xl mx-auto">
              <button onClick={() => setStep("tailor")} className="text-sm text-primary-400 hover:underline mb-4 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Back to tailor resume
              </button>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Choose your resume template</h2>
              <p className="text-sm text-slate-500 mb-6">Select a design that fits your professional style. You can preview and download in PDF or Word.</p>
              <div className="grid grid-cols-3 gap-6">
                {RESUME_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTemplate(t.id);
                      analytics.templateSelected({ template_id: t.id });
                      const slug = `${t.id}-ats`;
                      localStorage.setItem("rf_preferred_template", slug);
                      if (draftId && resume) {
                        api.drafts.saveState(draftId, {
                          structuredResume: resume,
                          aiSuggestions: suggestions,
                          currentScore: score ?? 0,
                          templateSlug: slug,
                        }).catch(() => {});
                      }
                    }}
                    className={`relative rounded-xl border-2 overflow-hidden transition-all group ${
                      template === t.id
                        ? "border-primary ring-2 ring-primary/30 shadow-xl scale-[1.02]"
                        : "border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg"
                    }`}
                  >
                    <div className="aspect-[210/297] bg-white overflow-hidden">
                      <div
                        className="origin-top-left"
                        style={{ transform: "scale(0.28)", width: "357%", height: "357%", transformOrigin: "top left" }}
                      >
                        {resume && <ResumeLayout resume={resume} template={t.id} />}
                      </div>
                    </div>
                    <div className={`px-3 py-2.5 text-center ${template === t.id ? "bg-primary/10" : "bg-slate-50 dark:bg-[var(--focus-surface)]"}`}>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.name}</div>
                    </div>
                    {template === t.id && (
                      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar persists on template step */}
          <div className="w-80 border-l border-[var(--focus-border)] bg-[var(--focus-panel)] flex-shrink-0 overflow-y-auto">
            <JobSidebar
              jobTitle={jobTitle}
              company={company}
              source={source}
              matchedKeywords={matchedKeywords}
              missingKeywords={missingKeywords}
              score={score}
              initialScore={initialScore}
              appliedCount={appliedCount}
              totalSuggestions={suggestions.length}
              breakdown={atsBreakdown}
              jdInsights={jdInsights}
              onTailorResume={() => regenerateSuggestions()}
              isGenerating={isGeneratingSugg}
            />
          </div>

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-80 h-14 bg-white dark:bg-[var(--focus-panel)] border-t border-slate-200 dark:border-[var(--focus-border)] flex items-center justify-between px-6 shadow-lg z-20">
            <button onClick={() => setStep("tailor")} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400">Cancel</button>
            <button
              onClick={() => setStep("download")}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-colors shadow-sm"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Download preview (LetMeApply toolbar) */}
      {step === "download" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Download toolbar */}
          <div className="h-12 border-b border-[var(--focus-border)] bg-[var(--focus-panel)] flex items-center gap-4 px-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">A</span>
              <button onClick={() => setFontSize((p) => Math.max(8, +(p - 0.5).toFixed(1)))} className="w-6 h-6 text-xs rounded hover:bg-[var(--focus-surface)] text-slate-400">−</button>
              <span className="text-xs text-slate-300 w-8 text-center">{fontSize}</span>
              <button onClick={() => setFontSize((p) => Math.min(14, +(p + 0.5).toFixed(1)))} className="w-6 h-6 text-xs rounded hover:bg-[var(--focus-surface)] text-slate-400">+</button>
            </div>
            <div className="w-px h-6 bg-[var(--focus-border)]" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Line</span>
              <input
                type="range" min="1" max="1.6" step="0.05"
                value={lineSpacing}
                onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                className="w-20 h-1 accent-primary"
              />
              <span className="text-xs text-slate-400 w-8">{lineSpacing.toFixed(2)}</span>
            </div>
            <div className="w-px h-6 bg-[var(--focus-border)]" />
            <div className="flex items-center gap-2">
              <input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="text-xs bg-[var(--focus-input)] border border-[var(--focus-border)] rounded px-2 py-1 text-slate-300 w-44"
                placeholder="Filename"
              />
              <span className="text-[10px] text-slate-500">.pdf</span>
            </div>
            <div className="flex-1" />
            <button onClick={() => setStep("template")} className="text-xs text-slate-400 hover:text-slate-200 mr-2">Cancel</button>
            <button
              onClick={downloadPdf}
              disabled={isDownloading}
              className="px-5 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {isDownloading ? "Generating..." : "Download PDF"}
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-slate-900/50 p-6">
              {resume && (
                <div className="max-w-[650px] mx-auto">
                  <ResumePreview
                    resume={resume}
                    template={template}
                    fontSize={fontSize}
                    lineSpacing={lineSpacing}
                    fitOnePage
                  />
                </div>
              )}
            </div>
            <div className="w-64 border-l border-[var(--focus-border)] bg-[var(--focus-panel)] p-4 flex flex-col gap-3 flex-shrink-0">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Template</div>
                <div className="text-sm text-slate-200 font-medium">
                  {RESUME_TEMPLATES.find((t) => t.id === template)?.name || template}
                </div>
                <button onClick={() => setStep("template")} className="text-[10px] text-primary-300 hover:underline mt-0.5">Change</button>
              </div>
              <div className="pt-2 border-t border-[var(--focus-border)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400">ATS Score</span>
                  <AnimatedScore value={score} className="text-lg font-black" />
                </div>
                {improvement != null && improvement > 0 && (
                  <div className="text-[10px] text-emerald-400 font-semibold">+{improvement} from baseline</div>
                )}
              </div>
              <div className="flex-1" />
              {downloadError && (
                <p className="text-[10px] text-red-400 mb-2">{downloadError}</p>
              )}
              <div className="space-y-2">
                <button
                  onClick={downloadPdf}
                  disabled={isDownloading}
                  className="w-full px-4 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isDownloading ? "Generating PDF..." : "Download PDF"}
                </button>
                <button
                  onClick={downloadDocx}
                  disabled={!docxExportEnabled}
                  title={docxExportEnabled ? undefined : "Upgrade to Pro for DOCX export"}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {docxExportEnabled ? "Download DOCX" : "Download DOCX (Pro+)"}
                </button>
                <button onClick={downloadLatex} className="w-full px-4 py-2 bg-[var(--focus-input)] border border-[var(--focus-border)] text-slate-300 rounded-lg text-sm hover:bg-[var(--focus-surface)] transition-colors">
                  Download .tex
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TailorPage() {
  return (
    <Suspense fallback={<SpinnerCenter className="focus-shell min-h-screen bg-[var(--focus-bg)]" />}>
      <TailorContent />
    </Suspense>
  );
}
