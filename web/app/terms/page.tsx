import Link from "next/link";
import { Logo } from "@/components/ui";
import {
  CONTACT_EMAIL_PRIMARY,
  CONTACT_EMAIL_SECONDARY,
  CONTACT_MAILTO_PRIMARY,
  CONTACT_MAILTO_SECONDARY,
} from "@/lib/contact";

export const metadata = {
  title: "Terms of Service — Fluxpage",
  description: "Terms for using Fluxpage and the Chrome extension.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            Back to home
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted text-sm mb-8">Last updated: May 28, 2026</p>

        <section className="space-y-4 text-sm text-foreground leading-relaxed">
          <p className="text-muted">
            By using Fluxpage (website and Chrome extension), you agree to these terms. If you do not agree, do not use
            the service.
          </p>

          <h2 className="text-lg font-semibold mt-8">Service</h2>
          <p className="text-muted">
            Fluxpage provides AI-assisted resume analysis, tailoring, and job application tools. Features and limits
            depend on your plan (free, Pro, or Premium).
          </p>

          <h2 className="text-lg font-semibold mt-8">Your content</h2>
          <p className="text-muted">
            You retain ownership of resumes and content you upload. You are responsible for ensuring your resumes are
            accurate and truthful. Do not upload unlawful or infringing material.
          </p>

          <h2 className="text-lg font-semibold mt-8">Acceptable use</h2>
          <p className="text-muted">
            Do not abuse the service, attempt unauthorized access, or use Fluxpage to violate job board or third-party
            terms of service.
          </p>

          <h2 className="text-lg font-semibold mt-8">Payments</h2>
          <p className="text-muted">
            Paid plans are billed through our payment provider. Subscriptions and refunds follow the pricing shown at
            checkout and applicable law.
          </p>

          <h2 className="text-lg font-semibold mt-8">Disclaimer</h2>
          <p className="text-muted">
            Fluxpage is provided &quot;as is.&quot; We do not guarantee interviews or job offers. ATS scores are
            estimates, not guarantees of employer systems.
          </p>

          <h2 className="text-lg font-semibold mt-8">Contact</h2>
          <p className="text-muted">
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
    </div>
  );
}
