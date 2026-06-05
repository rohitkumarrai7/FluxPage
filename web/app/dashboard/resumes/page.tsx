"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { PageHeader, EmptyState, Button, Card, SpinnerCenter, AtsEnterpriseResults } from "@/components/ui";
import type { AtsAnalysisResult } from "@/lib/atsNormalize";

export default function ResumesPage() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [analysisMap, setAnalysisMap] = useState<Record<string, AtsAnalysisResult | null>>({});
  const [jdForAnalysis, setJdForAnalysis] = useState("");
  const [jdError, setJdError] = useState("");
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const jdRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadResumes();
  }, []);

  async function loadResumes() {
    try {
      const data = await api.resumes.list();
      setResumes(data.resumes || []);
    } catch (err) {
      console.error("Failed to load resumes:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setUploadSuccess("");
    try {
      await api.resumes.upload(file);
      analytics.resumeUploaded({ source: "dashboard" });
      await loadResumes();
      setUploadSuccess(`"${file.name}" uploaded and parsed successfully.`);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await api.resumes.setDefault(id);
      await loadResumes();
    } catch (err: any) {
      setUploadError(err.message || "Failed to set default");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this resume?")) return;
    try {
      await api.resumes.delete(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  async function resolveResumeText(resume: any): Promise<string> {
    const preview = resume.textPreview || "";
    const inline = resume.rawText || "";
    if (inline.length > preview.length + 50) return inline;

    try {
      const full = await api.resumes.get(resume.id);
      return full.rawText || full.textPreview || inline || preview;
    } catch {
      return inline || preview;
    }
  }

  async function analyzeResume(resume: any) {
    setAnalysisErrors((prev) => {
      const next = { ...prev };
      delete next[resume.id];
      return next;
    });

    if (!jdForAnalysis.trim()) {
      setJdError("Paste a job description above, then click Check ATS Score.");
      jdRef.current?.focus();
      jdRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setJdError("");

    setAnalyzingId(resume.id);
    try {
      const resumeText = await resolveResumeText(resume);
      if (!resumeText.trim()) {
        setAnalysisErrors((prev) => ({
          ...prev,
          [resume.id]: "No readable text found. Re-upload this resume as PDF, DOCX, or TXT.",
        }));
        return;
      }

      const result = await api.ats.analyzeEnterprise(resumeText, jdForAnalysis);
      analytics.atsAnalyzed({ score: result.score || 0, has_jd: true });
      setAnalysisMap((prev) => ({
        ...prev,
        [resume.id]: result,
      }));

      try {
        await api.resumes.update(resume.id, { lastAtsScore: result.score || 0 });
        await loadResumes();
      } catch (saveErr) {
        console.warn("Could not save ATS score:", saveErr);
      }
    } catch (err: any) {
      setAnalysisErrors((prev) => ({
        ...prev,
        [resume.id]: err.message || "ATS analysis failed. Try again.",
      }));
    } finally {
      setAnalyzingId(null);
    }
  }

  if (loading) return <SpinnerCenter />;

  return (
    <div>
      <PageHeader
        title="Resume Library"
        subtitle={`${resumes.length} resume${resumes.length !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => fileRef.current?.click()} loading={uploading} disabled={uploading}>
            + Upload Resume
          </Button>
        }
      />
      <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleUpload} className="hidden" />

      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{uploadError}</div>
      )}
      {uploadSuccess && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">{uploadSuccess}</div>
      )}

      <Card className="mb-6">
        <h2 className="text-sm font-bold text-foreground mb-1">ATS Analysis</h2>
        <p className="text-xs text-muted mb-3">
          Paste a job description, then run our built-in ATS scorer against any resume below.
        </p>
        <textarea
          ref={jdRef}
          value={jdForAnalysis}
          onChange={(e) => {
            setJdForAnalysis(e.target.value);
            if (e.target.value.trim()) setJdError("");
          }}
          rows={4}
          placeholder="Paste the full job description here (title, requirements, skills, experience)..."
          className={`w-full px-3 py-2 border rounded-button text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y ${
            jdError ? "border-red-300 bg-red-50/40" : "border-border"
          }`}
        />
        {jdError ? (
          <p className="mt-2 text-xs text-red-600">{jdError}</p>
        ) : !jdForAnalysis.trim() ? (
          <p className="mt-2 text-xs text-amber-600">A job description is required before checking ATS score.</p>
        ) : (
          <p className="mt-2 text-xs text-emerald-600">Ready — click Check ATS Score on a resume card.</p>
        )}
      </Card>

      {resumes.length === 0 ? (
        <Card>
          <EmptyState
            title="No resumes uploaded yet"
            actionLabel="Upload your first resume"
            onAction={() => fileRef.current?.click()}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((resume) => {
            const analysis = analysisMap[resume.id];
            const displayScore = analysis?.score ?? resume.lastAtsScore ?? null;
            const scoreColor = displayScore != null
              ? displayScore >= 75 ? "text-green-600" : displayScore >= 50 ? "text-amber-500" : "text-red-500"
              : "text-slate-400";

            return (
              <div key={resume.id} className="bg-surface rounded-card p-5 shadow-card border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{resume.label || resume.filename}</div>
                      <div className="text-xs text-slate-400">{resume.filename}</div>
                    </div>
                  </div>
                  {resume.isDefault && (
                    <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">Default</span>
                  )}
                  {displayScore != null && !analysis && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${scoreColor} bg-slate-50`}>
                      ATS {displayScore}
                    </span>
                  )}
                </div>
                {resume.textPreview && (
                  <p className="mt-3 text-xs text-slate-400 line-clamp-2">{resume.textPreview.slice(0, 150)}</p>
                )}
                {resume.structuredData?.skills?.length > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    Parsed: {resume.structuredData.totalExperienceYears || 0}y experience · {resume.structuredData.skills.length} skills · {resume.structuredData.seniorityLevel || "unknown"} level
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">
                    {resume.fileSize ? `${(resume.fileSize / 1024).toFixed(1)} KB` : ""}
                  </span>
                  <div className="flex gap-2">
                    {!resume.isDefault && (
                      <button
                        onClick={() => handleSetDefault(resume.id)}
                        className="text-xs text-primary hover:text-primary-hover font-medium"
                      >
                        Set default
                      </button>
                    )}
                    <button
                      onClick={() => analyzeResume(resume)}
                      disabled={analyzingId === resume.id}
                      className="text-xs text-primary hover:text-primary-hover font-medium disabled:text-slate-300 disabled:cursor-not-allowed"
                    >
                      {analyzingId === resume.id ? "Analyzing..." : "Check ATS Score"}
                    </button>
                    <button onClick={() => handleDelete(resume.id)} className="text-xs text-slate-400 hover:text-red-500">Delete</button>
                  </div>
                </div>

                {analysisErrors[resume.id] && (
                  <p className="mt-3 text-xs text-red-600">{analysisErrors[resume.id]}</p>
                )}

                {analysis && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <AtsEnterpriseResults result={analysis} compact />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
