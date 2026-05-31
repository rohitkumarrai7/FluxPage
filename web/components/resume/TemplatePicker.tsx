"use client";

import { RESUME_TEMPLATES, type TemplateVariant } from "./templates";
import type { StructuredResume } from "@/lib/resumeParser";
import { ResumeLayout } from "./templates/layouts";

const SAMPLE_RESUME: StructuredResume = {
  contact: { name: "John Doe", email: "john@example.com", phone: "+1 555-0100", linkedin: "linkedin.com/in/johndoe" },
  sections: [
    { id: "s0", type: "summary", heading: "Summary", items: [{ id: "b0", text: "Results-driven engineer with 5+ years experience in full-stack development." }], order: 0 },
    { id: "s1", type: "experience", heading: "Experience", items: [
      { id: "r0", text: "Senior Developer — Acme Corp", metadata: { role: "Senior Developer", company: "Acme Corp", startDate: "Jan 2022", endDate: "Present" } },
      { id: "b1", text: "Led migration of monolith to microservices, reducing deploy time by 60%." },
      { id: "b2", text: "Built real-time analytics dashboard processing 10M+ events daily." },
    ], order: 1 },
    { id: "s2", type: "skills", heading: "Skills", items: [{ id: "sk0", text: "React, Node.js, TypeScript, Python, AWS, PostgreSQL, Docker" }], order: 2 },
    { id: "s3", type: "education", heading: "Education", items: [{ id: "e0", text: "B.S. Computer Science — MIT", metadata: { degree: "B.S. Computer Science", institution: "MIT", endDate: "2020" } }], order: 3 },
  ],
};

interface Props {
  value: TemplateVariant;
  onChange: (template: TemplateVariant) => void;
  resume?: StructuredResume | null;
}

export function TemplatePicker({ value, onChange, resume }: Props) {
  const previewResume = resume || SAMPLE_RESUME;

  return (
    <div className="flex items-center gap-2">
      {RESUME_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          title={t.description}
          className={`group relative flex flex-col items-center rounded-lg border-2 transition-all ${
            value === t.id
              ? "border-primary ring-2 ring-primary/30 shadow-md"
              : "border-slate-200 hover:border-primary/50 hover:shadow-sm"
          }`}
        >
          <div className="w-14 h-[72px] rounded-t-md overflow-hidden bg-white relative">
            <div
              className="absolute inset-0 origin-top-left"
              style={{ transform: "scale(0.08)", width: "175mm", height: "250mm" }}
            >
              <ResumeLayout resume={previewResume} template={t.id} />
            </div>
          </div>
          <span className={`text-[9px] px-1 py-0.5 whitespace-nowrap leading-none font-medium ${
            value === t.id ? "text-primary" : "text-slate-400"
          }`}>
            {t.name}
          </span>
        </button>
      ))}
    </div>
  );
}

export { slugToVariant } from "./templates";
