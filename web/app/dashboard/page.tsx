"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { CHROME_EXTENSION_STORE_URL } from "@/lib/contact";
import { PageHeader, StatCard, Card, Button, Badge, SpinnerCenter, AtsEnterpriseResults } from "@/components/ui";
import type { AtsAnalysisResult } from "@/lib/atsNormalize";

export default function DashboardPage() {
  const [stats, setStats] = useState({ jobs: 0, resumes: 0, avgScore: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [atsResult, setAtsResult] = useState<AtsAnalysisResult | null>(null);
  const [atsJobDescription, setAtsJobDescription] = useState("");
  const [analyzingAts, setAnalyzingAts] = useState(false);
  const [atsResumes, setAtsResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [planInfo, setPlanInfo] = useState<{ tier: string; usage: any } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [jobsData, resumesData] = await Promise.all([
        api.jobs.list(),
        api.resumes.list(),
      ]);
      const profile = api.auth.getUser();
      const jobs = jobsData.jobs || [];
      const resumes = resumesData.resumes || [];
      setAtsResumes(resumes);
      if (resumes.length > 0) {
        const def = resumes.find((r: any) => r.isDefault) || resumes[0];
        setSelectedResumeId(def.id);
      }
      const scores = jobs
        .filter((j: any) => j.atsScore != null)
        .map((j: any) => j.atsScore);
      setStats({
        jobs: jobs.length,
        resumes: resumes.length,
        avgScore: scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0,
      });
      setRecentJobs(jobs.slice(0, 5));
      if (profile) {
        setPlanInfo({ tier: profile.tier || "free", usage: null });
      }
      api.auth.getProfile().then((fresh) => {
        setPlanInfo({ tier: fresh.tier || "free", usage: fresh.usage || null });
        api.auth.updateStoredTier(fresh.tier);
      }).catch(() => {});
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (planInfo?.usage) {
      const { resumesCount, resumesLimit } = planInfo.usage;
      if (resumesLimit >= 0 && resumesCount >= resumesLimit) {
        alert(`Resume limit reached (${resumesLimit} on ${planInfo.tier} plan). Delete a resume or upgrade your plan.`);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    }
    setUploadingResume(true);
    try {
      await api.resumes.upload(file);
      await load();
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploadingResume(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function runAtsAnalysis() {
    if (!atsJobDescription.trim() || !selectedResumeId) return;
    setAnalyzingAts(true);
    setAtsResult(null);
    try {
      const resume = atsResumes.find((r: any) => r.id === selectedResumeId);
      const resumeText = resume?.rawText || resume?.textPreview || "";
      if (!resumeText) {
        alert("Selected resume has no text content. Please re-upload.");
        setAnalyzingAts(false);
        return;
      }
      const result = await api.ats.analyzeEnterprise(resumeText, atsJobDescription);
      setAtsResult(result);
    } catch (err: any) {
      alert(err.message || "ATS analysis failed");
    } finally {
      setAnalyzingAts(false);
    }
  }

  if (loading) {
    return <SpinnerCenter />;
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your resume optimization overview" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard label="Saved Jobs" value={stats.jobs} icon="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        <StatCard label="Resumes" value={stats.resumes} icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <StatCard label="Avg ATS Score" value={stats.avgScore > 0 ? stats.avgScore : "—"} icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </div>

      {planInfo && (
        <Card className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground capitalize">{planInfo.tier} Plan</span>
                <Badge variant={planInfo.tier === "premium" ? "warning" : planInfo.tier === "pro" ? "primary" : "default"} className="capitalize text-xs">
                  {planInfo.tier}
                </Badge>
              </div>
              {planInfo.usage && (
                <div className="flex flex-wrap gap-4 text-xs text-muted">
                  <span>
                    Tailors: {planInfo.usage.tailorsThisMonth || 0}/{planInfo.usage.tailorsLimit < 0 ? "∞" : planInfo.usage.tailorsLimit}
                  </span>
                  <span>
                    Resumes: {planInfo.usage.resumesCount || 0}/{planInfo.usage.resumesLimit < 0 ? "∞" : planInfo.usage.resumesLimit}
                  </span>
                  <span>
                    Cover letters: {planInfo.usage.coverLettersEnabled ? "Enabled" : "Pro+"}
                  </span>
                </div>
              )}
            </div>
            {planInfo.tier === "free" && (
              <Button href="/dashboard/billing" size="sm" variant="primary">Upgrade Plan</Button>
            )}
          </div>
          {planInfo.usage && planInfo.usage.tailorsLimit >= 0 && (
            <div className="mt-3">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (planInfo.usage.tailorsThisMonth || 0) >= planInfo.usage.tailorsLimit
                      ? "bg-red-500"
                      : (planInfo.usage.tailorsThisMonth || 0) >= planInfo.usage.tailorsLimit * 0.8
                      ? "bg-amber-500"
                      : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, ((planInfo.usage.tailorsThisMonth || 0) / planInfo.usage.tailorsLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h2 className="text-lg font-bold text-foreground mb-4">ATS Score Check</h2>
          <p className="text-sm text-slate-500 mb-4">Upload a resume and paste a job description to get your real ATS score.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Resume</label>
              <div className="flex gap-2">
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-button text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  {atsResumes.length === 0 ? (
                    <option value="">No resumes uploaded</option>
                  ) : (
                    atsResumes.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.label || r.filename}</option>
                    ))
                  )}
                </select>
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingResume}
                  loading={uploadingResume}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  + Upload
                </Button>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleResumeUpload} className="hidden" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Description</label>
              <textarea
                value={atsJobDescription}
                onChange={(e) => setAtsJobDescription(e.target.value)}
                rows={5}
                placeholder="Paste the job description here..."
                className="w-full px-3 py-2 border border-border rounded-button text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y"
              />
            </div>

            <Button
              onClick={runAtsAnalysis}
              disabled={analyzingAts || !atsJobDescription.trim() || !selectedResumeId}
              loading={analyzingAts}
              className="w-full"
            >
              Analyze ATS Score
            </Button>

            {atsResult && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <AtsEnterpriseResults result={atsResult} />
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Jobs</h2>
            {recentJobs.length === 0 ? (
              <p className="text-slate-400 text-sm">No saved jobs yet. Use the Chrome extension to save jobs.</p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <div className="font-medium text-sm text-slate-900">{job.title}</div>
                      <div className="text-xs text-slate-400">{job.company} &middot; {job.source}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      job.status === "applied" ? "bg-primary-50 text-primary-700" :
                      job.status === "offer" ? "bg-green-50 text-green-700" :
                      job.status === "rejected" ? "bg-red-50 text-red-700" :
                      "bg-slate-50 text-slate-600"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button href="/dashboard/resumes" className="w-full">Upload Resume</Button>
              <a
                href={CHROME_EXTENSION_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium rounded-lg text-center hover:bg-emerald-100 transition-all text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Get Chrome Extension
              </a>
              <div className="grid grid-cols-3 gap-2">
                <a href="https://www.linkedin.com/jobs/" target="_blank" rel="noopener" className="block w-full py-2.5 px-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg text-center hover:bg-slate-50 transition-all text-xs">
                  LinkedIn
                </a>
                <a href="https://internshala.com/jobs/" target="_blank" rel="noopener" className="block w-full py-2.5 px-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg text-center hover:bg-slate-50 transition-all text-xs">
                  Internshala
                </a>
                <a href="https://www.naukri.com/jobs" target="_blank" rel="noopener" className="block w-full py-2.5 px-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg text-center hover:bg-slate-50 transition-all text-xs">
                  Naukri
                </a>
              </div>
              <Button href="/dashboard/jobs" variant="secondary" className="w-full">View Job Tracker</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
