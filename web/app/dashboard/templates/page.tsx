"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PageHeader, EmptyState, Button, Card, SpinnerCenter } from "@/components/ui";
import { RESUME_TEMPLATES, type TemplateVariant, slugToVariant } from "@/components/resume/templates";
import { ResumeLayout } from "@/components/resume/templates/layouts";
import type { StructuredResume } from "@/lib/resumeParser";

const SAMPLE_RESUME: StructuredResume = {
  contact: { name: "Charles Bloomberg", email: "charles@bloomberg.com", phone: "+1 555-0199", linkedin: "linkedin.com/in/cbloomberg" },
  sections: [
    { id: "s0", type: "summary", heading: "Professional Summary", items: [{ id: "b0", text: "Results-driven professional with 6+ years experience driving business growth through data-driven strategies and cross-functional leadership." }], order: 0 },
    { id: "s1", type: "experience", heading: "Experience", items: [
      { id: "r0", text: "Senior Product Manager — TechCorp", metadata: { role: "Senior Product Manager", company: "TechCorp Inc.", startDate: "Mar 2021", endDate: "Present" } },
      { id: "b1", text: "Led product roadmap for a SaaS platform serving 50K+ enterprise users, increasing ARR by 35%." },
      { id: "b2", text: "Managed cross-functional team of 12 engineers, designers, and data scientists." },
      { id: "r1", text: "Product Manager — StartupXYZ", metadata: { role: "Product Manager", company: "StartupXYZ", startDate: "Jun 2019", endDate: "Feb 2021" } },
      { id: "b3", text: "Launched 3 major features that drove 40% increase in user engagement." },
    ], order: 1 },
    { id: "s2", type: "skills", heading: "Skills", items: [{ id: "sk0", text: "Product Strategy, Agile/Scrum, SQL, Python, Tableau, A/B Testing, User Research, Jira, Figma" }], order: 2 },
    { id: "s3", type: "education", heading: "Education", items: [{ id: "e0", text: "MBA — Harvard Business School", metadata: { degree: "MBA", institution: "Harvard Business School", endDate: "2019" } }], order: 3 },
    { id: "s4", type: "projects", heading: "Projects", items: [
      { id: "p0", text: "Built an internal analytics dashboard that reduced report generation time by 70%." },
      { id: "p1", text: "Developed a customer segmentation model using Python and scikit-learn." },
    ], order: 4 },
  ],
};

interface Template {
  _id: string;
  name: string;
  slug: string;
  category: string;
  engine: string;
  colors?: string[];
  fonts?: string[];
  spacing?: string;
  sectionOrder?: string[];
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [seeding, setSeeding] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateVariant | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("rf_preferred_template");
    if (saved) setSelectedSlug(saved);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [filter]);

  async function loadTemplates() {
    try {
      const data = await api.templates.list(filter !== "all" ? filter : undefined);
      setTemplates(data.templates || []);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }

  async function seedTemplates() {
    setSeeding(true);
    try {
      await api.templates.seed();
      await loadTemplates();
    } catch (err) {
      console.error("Failed to seed:", err);
    } finally {
      setSeeding(false);
    }
  }

  function useTemplate(template: Template) {
    localStorage.setItem("rf_preferred_template", template.slug);
    setSelectedSlug(template.slug);

    const lastDraft = localStorage.getItem("rf_last_draft_id");
    if (lastDraft) {
      router.push(`/tailor?draft=${lastDraft}`);
    } else {
      router.push("/dashboard/resumes");
    }
  }

  const filteredMeta = RESUME_TEMPLATES.filter((t) => {
    if (filter === "all") return true;
    const tmpl = templates.find((db) => slugToVariant(db.slug) === t.id);
    return tmpl?.category === filter;
  });

  if (loading) return <SpinnerCenter />;

  return (
    <div>
      <PageHeader
        title="Choose Your Template"
        subtitle="Select a design that fits your professional style. Preview with sample data, then download as PDF or Word."
        action={
          templates.length === 0 ? (
            <Button onClick={seedTemplates} loading={seeding} disabled={seeding}>
              Load Templates
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-2 mb-8">
        {["all", "ats", "design"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium capitalize transition-all ${
              filter === cat
                ? "bg-primary text-white shadow-md"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            {cat === "all" ? "All Templates" : cat === "ats" ? "ATS-Optimized" : "Design-Forward"}
          </button>
        ))}
      </div>

      {templates.length === 0 && filteredMeta.length === 0 ? (
        <Card>
          <EmptyState
            title="No templates yet"
            description='Click "Load Templates" to get started.'
            icon="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMeta.map((t) => {
              const isSelected = selectedSlug && slugToVariant(selectedSlug) === t.id;
              const dbTemplate = templates.find((db) => slugToVariant(db.slug) === t.id);

              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-xl overflow-hidden transition-all cursor-pointer group ${
                    isSelected
                      ? "ring-2 ring-primary shadow-lg border border-primary/30"
                      : "border border-slate-200 hover:shadow-lg hover:border-slate-300"
                  }`}
                  onClick={() => setPreviewTemplate(previewTemplate === t.id ? null : t.id)}
                >
                  <div className="relative h-64 overflow-hidden bg-slate-50 border-b border-slate-100">
                    <div
                      className="absolute top-3 left-3 right-3 origin-top-left transition-transform group-hover:scale-[1.02]"
                      style={{ transform: "scale(0.32)", width: "210mm", height: "297mm", transformOrigin: "top left" }}
                    >
                      <div className="bg-white shadow-lg" style={{ width: "210mm", minHeight: "297mm", padding: 0 }}>
                        <ResumeLayout resume={SAMPLE_RESUME} template={t.id} />
                      </div>
                    </div>

                    <div className="absolute top-3 right-3 z-10">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm ${
                        t.id === "executive" || t.id === "designer"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {t.id === "executive" || t.id === "designer" ? "Design" : "ATS Safe"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 text-base">{t.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dbTemplate) useTemplate(dbTemplate);
                        else {
                          localStorage.setItem("rf_preferred_template", `${t.id}-ats`);
                          setSelectedSlug(`${t.id}-ats`);
                          const lastDraft = localStorage.getItem("rf_last_draft_id");
                          if (lastDraft) router.push(`/tailor?draft=${lastDraft}`);
                          else router.push("/dashboard/resumes");
                        }
                      }}
                      className={`mt-3 w-full py-2.5 text-sm font-medium rounded-lg transition-all ${
                        isSelected
                          ? "bg-primary text-white shadow-sm"
                          : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-primary hover:text-white hover:border-primary"
                      }`}
                    >
                      {isSelected ? "Selected" : "Use Template"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {previewTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)}>
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {RESUME_TEMPLATES.find((t) => t.id === previewTemplate)?.name}
                    </h2>
                    <p className="text-sm text-slate-500">Preview with sample data</p>
                  </div>
                  <button onClick={() => setPreviewTemplate(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-6">
                  <div className="bg-white shadow-lg border border-slate-200 mx-auto" style={{ maxWidth: "210mm" }}>
                    <ResumeLayout resume={SAMPLE_RESUME} template={previewTemplate} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
