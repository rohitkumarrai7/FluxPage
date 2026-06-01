"use client";

import { useState, useRef, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { CHROME_EXTENSION_STORE_URL } from "@/lib/contact";
import { Logo, Card, Button, SpinnerCenter, CeoAgencyCredit } from "@/components/ui";

const STEPS = ["Welcome", "Upload", "Review", "Extension", "Done"] as const;

const inputClass =
  "w-full mt-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

function extractContactInfo(text: string) {
  const email = text.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] || "";
  const phone = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] || "";
  const firstLine = text.split("\n").find((l) => l.trim().length > 2)?.trim() || "";
  return { email, phone, name: firstLine };
}

function OnboardingContent() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [parsedText, setParsedText] = useState("");
  const [resumeLabel, setResumeLabel] = useState("");
  const [profileRole, setProfileRole] = useState("Software Engineer");
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [resumeId, setResumeId] = useState<string | null>(null);

  useEffect(() => {
    if (!api.auth.isLoggedIn()) {
      router.replace("/auth/sync");
    }
  }, [router]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await api.resumes.upload(file);
      analytics.resumeUploaded({ source: "onboarding" });
      setResumeId(result.id);
      const text = result.text || result.textPreview || "";
      if (!text || text.length < 20) {
        throw new Error("Could not read resume text. Try a text-based PDF or DOCX file.");
      }
      setParsedText(text);
      setResumeLabel(file.name.replace(/\.[^/.]+$/, ""));
      setContact(extractContactInfo(text));
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleFinish() {
    setError("");
    try {
      await api.auth.completeOnboarding();
      if (resumeId) {
        try {
          await api.resumes.update(resumeId, {
            label: resumeLabel || undefined,
            profileRole,
          });
        } catch {
          // Non-blocking
        }
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not finish onboarding");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <Logo />
          <p className="text-sm text-muted mt-2">Set up your account</p>
          <CeoAgencyCredit variant="header" className="mt-2" />
        </div>

        <div className="flex gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
              <div className={`text-[10px] mt-1 ${i <= step ? "text-primary font-medium" : "text-muted"}`}>{label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-danger">{error}</div>
        )}

        {step === 0 && (
          <Card padding="lg">
            <h1 className="text-2xl font-bold text-foreground mb-3">Tailor your resume in 30 seconds</h1>
            <p className="text-muted mb-6 leading-relaxed">
              Upload your resume once. Fluxpage will parse it, score it against jobs, and help you tailor applications from any job board.
            </p>
            <ul className="space-y-2 mb-8 text-sm text-foreground">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ATS-optimized resume tailoring
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Cover letters matched to each job
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Cross-platform job tracker
              </li>
            </ul>
            <Button onClick={() => setStep(1)} className="w-full">Get started</Button>
          </Card>
        )}

        {step === 1 && (
          <Card padding="lg" className="text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Upload your resume</h2>
            <p className="text-muted text-sm mb-6">PDF, DOCX, or TXT. We extract the text automatically.</p>
            <Button onClick={() => fileRef.current?.click()} loading={uploading} disabled={uploading}>
              {uploading ? "Parsing resume..." : "Choose file"}
            </Button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleUpload} className="hidden" />
          </Card>
        )}

        {step === 2 && (
          <Card padding="lg" className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Confirm your details</h2>
            <div>
              <label className="text-xs text-muted font-medium">Resume label</label>
              <input value={resumeLabel} onChange={(e) => setResumeLabel(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted font-medium">Target role profile</label>
              <select value={profileRole} onChange={(e) => setProfileRole(e.target.value)} className={inputClass}>
                <option>Software Engineer</option>
                <option>Product Manager</option>
                <option>Data Analyst</option>
                <option>Designer</option>
                <option>Other</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted font-medium">Name (from resume)</label>
                <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-muted font-medium">Email</label>
                <input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 max-h-48 overflow-y-auto text-xs text-muted whitespace-pre-wrap border border-border">
              {parsedText.slice(0, 1200)}{parsedText.length > 1200 ? "..." : ""}
            </div>
            <Button onClick={() => setStep(3)} className="w-full">Continue</Button>
          </Card>
        )}

        {step === 3 && (
          <Card padding="lg">
            <h2 className="text-xl font-bold text-foreground mb-2">Install the Chrome extension</h2>
            <p className="text-muted text-sm mb-6">
              Tailor resumes directly from LinkedIn, Indeed, Naukri, and more. After you sign in once in the extension,
              your onboarding resume syncs automatically — no need to upload it again.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Fluxpage Chrome Extension</div>
                  <div className="text-xs text-muted">AI Job Assistant for Chrome</div>
                </div>
              </div>
              <a
                href={CHROME_EXTENSION_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Add to Chrome — Free
              </a>
              <p className="text-xs text-muted mt-3 text-center">
                Or load manually: <code className="text-primary font-mono text-xs">chrome://extensions</code> → Developer mode → Load unpacked
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setStep(4)} className="flex-1">I installed it</Button>
              <Button onClick={() => setStep(4)} variant="secondary" className="flex-1">Skip for now</Button>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card padding="lg" className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">You&apos;re all set</h2>
            <p className="text-muted text-sm mb-6">Your resume is ready. Open a job posting and start tailoring.</p>
            <Button onClick={handleFinish} className="w-full">Go to dashboard</Button>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<SpinnerCenter className="min-h-screen" />}>
      <OnboardingContent />
    </Suspense>
  );
}
