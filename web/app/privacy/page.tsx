import Link from "next/link";
import { Logo, CeoAgencyCredit } from "@/components/ui";
import {
  CONTACT_EMAIL_PRIMARY,
  CONTACT_EMAIL_SECONDARY,
  CONTACT_MAILTO_PRIMARY,
  CONTACT_MAILTO_SECONDARY,
} from "@/lib/contact";

export const metadata = {
  title: "Privacy Policy — Fluxpage",
  description: "How Fluxpage collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
          <div>
            <Link href="/">
              <Logo />
            </Link>
            <CeoAgencyCredit variant="header" className="mt-2" />
          </div>
          <Link href="/" className="text-sm text-muted hover:text-foreground shrink-0">
            Back to home
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 prose prose-slate max-w-none">
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted text-sm mb-8">Last updated: May 28, 2026</p>

        <section className="space-y-4 text-sm text-foreground leading-relaxed">
          <p>
            Fluxpage (&quot;we&quot;, &quot;us&quot;) operates the website{" "}
            <a href="https://www.fluxpage.com" className="text-primary hover:underline">
              fluxpage.com
            </a>{" "}
            and the Fluxpage Chrome extension. This policy explains what data we collect and how we use it.
          </p>

          <h2 className="text-lg font-semibold mt-8">Information we collect</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted">
            <li>
              <strong className="text-foreground">Account data:</strong> email address and name when you sign in
              (via our authentication provider).
            </li>
            <li>
              <strong className="text-foreground">Resume data:</strong> resumes you upload or create, including text
              extracted from PDF/DOCX files.
            </li>
            <li>
              <strong className="text-foreground">Job content:</strong> job descriptions and metadata scraped from
              job pages you visit when you use the extension (only when you open Fluxpage on that page).
            </li>
            <li>
              <strong className="text-foreground">Usage data:</strong> ATS scores, saved jobs, tailoring actions, and
              settings needed to provide the service.
            </li>
          </ul>

          <h2 className="text-lg font-semibold mt-8">Chrome extension</h2>
          <p className="text-muted">
            The extension stores resumes, auth tokens, and preferences locally in Chrome storage. When you are signed
            in and run analysis, resume and job description data is sent to our servers over HTTPS to compute ATS
            scores and sync with your dashboard. We do not read your full browsing history—only job-related content on
            pages where you activate Fluxpage.
          </p>

          <h2 className="text-lg font-semibold mt-8">How we use data</h2>
          <p className="text-muted">
            We use your data to provide ATS scoring, resume tailoring, cover letters, job tracking, billing for paid
            plans, and customer support. We do not sell your personal data. We do not use your resume to train public
            AI models without your consent.
          </p>

          <h2 className="text-lg font-semibold mt-8">Third-party services</h2>
          <p className="text-muted">
            We use trusted providers for authentication, hosting, payments, and AI processing. Data is encrypted in
            transit (HTTPS). Access is limited to what is needed to operate Fluxpage.
          </p>

          <h2 className="text-lg font-semibold mt-8">Retention and deletion</h2>
          <p className="text-muted">
            You may delete resumes and account data from the dashboard or by contacting us. We retain data only as long
            as needed to provide the service or comply with law.
          </p>

          <h2 className="text-lg font-semibold mt-8">Contact</h2>
          <p className="text-muted">
            Questions:{" "}
            <a href={CONTACT_MAILTO_PRIMARY} className="text-primary hover:underline">
              {CONTACT_EMAIL_PRIMARY}
            </a>
            {" · "}
            <a href={CONTACT_MAILTO_SECONDARY} className="text-primary hover:underline">
              {CONTACT_EMAIL_SECONDARY}
            </a>
          </p>
        </section>
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-muted">&copy; 2026 Fluxpage. All rights reserved.</p>
          <CeoAgencyCredit variant="footer" />
        </div>
      </footer>
    </div>
  );
}
