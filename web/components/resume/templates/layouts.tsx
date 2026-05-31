"use client";

import type { StructuredResume } from "@/lib/resumeParser";
import type { ResumeSection, ResumeBullet } from "@/lib/types";
import { TEMPLATE_STYLES, type TemplateVariant } from "./index";

interface LayoutProps {
  resume: StructuredResume;
  template: TemplateVariant;
  compact?: boolean;
}

function ContactLine({ resume, className = "" }: { resume: StructuredResume; className?: string }) {
  const parts = [resume.contact.phone, resume.contact.email, resume.contact.linkedin, resume.contact.github].filter(Boolean);
  if (!parts.length) return null;
  return <div className={`text-xs text-slate-500 ${className}`}>{parts.join("  ·  ")}</div>;
}

function SectionHeading({ heading, accent, pill, compact }: { heading: string; accent: string; pill?: boolean; compact?: boolean }) {
  if (pill) {
    return (
      <h2
        className={`inline-block font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white ${
          compact ? "text-[9px] mb-1" : "text-[10px] mb-2"
        }`}
        style={{ backgroundColor: accent }}
      >
        {heading}
      </h2>
    );
  }
  return (
    <h2
      className={`font-bold uppercase tracking-wide mb-2 pb-1 border-b ${compact ? "text-[11px]" : "text-sm"}`}
      style={{ color: accent, borderColor: `${accent}44` }}
    >
      {heading}
    </h2>
  );
}

function RoleHeader({ item }: { item: ResumeBullet }) {
  if (!item.metadata?.role) return null;
  return (
    <div className="mb-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-slate-900 text-sm">{item.metadata.role}</span>
        <span className="text-[10px] text-slate-400 whitespace-nowrap">
          {[item.metadata.startDate, item.metadata.endDate].filter(Boolean).join(" – ")}
        </span>
      </div>
      {item.metadata.company && (
        <div className="text-xs text-slate-600 italic">{item.metadata.company}{item.metadata.location ? ` · ${item.metadata.location}` : ""}</div>
      )}
    </div>
  );
}

function EduEntry({ item }: { item: ResumeBullet }) {
  if (!item.metadata?.degree) return null;
  return (
    <div className="mb-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-slate-900 text-sm">{item.metadata.degree}</span>
        <span className="text-[10px] text-slate-400 whitespace-nowrap">
          {[item.metadata.startDate, item.metadata.endDate].filter(Boolean).join(" – ")}
        </span>
      </div>
      {item.metadata.institution && <div className="text-xs text-slate-600">{item.metadata.institution}</div>}
    </div>
  );
}

function SummaryBlock({ items, compact }: { items: ResumeBullet[]; compact?: boolean }) {
  return (
    <p className={`text-slate-700 leading-relaxed ${compact ? "text-[11px]" : "text-sm"}`}>
      {items.map((it) => it.text).join(" ")}
    </p>
  );
}

function SkillsBlock({ items, compact }: { items: ResumeBullet[]; compact?: boolean }) {
  const allText = items.map((it) => it.text).join(", ");
  if (allText.length < 200) {
    return <p className={`text-slate-700 ${compact ? "text-[11px]" : "text-sm"}`}>{allText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it) => (
        <span key={it.id} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">{it.text}</span>
      ))}
    </div>
  );
}

function BulletList({ items, compact }: { items: ResumeBullet[]; compact?: boolean }) {
  return (
    <ul className={compact ? "space-y-0.5" : "space-y-1"}>
      {items.map((it) => {
        if (it.metadata?.role) return <RoleHeader key={it.id} item={it} />;
        if (it.metadata?.degree) return <EduEntry key={it.id} item={it} />;
        return (
          <li
            key={it.id}
            className={`text-slate-700 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400 break-words ${
              compact ? "text-[11px] leading-snug" : "text-sm leading-relaxed"
            }`}
          >
            {it.text}
          </li>
        );
      })}
    </ul>
  );
}

function SmartSection({ section, accent, compact, pill }: { section: ResumeSection; accent: string; compact?: boolean; pill?: boolean }) {
  if (!section.items.length) return null;
  return (
    <div className={compact ? "mb-2" : "mb-5"}>
      <SectionHeading heading={section.heading} accent={accent} pill={pill} compact={compact} />
      {section.type === "summary" ? (
        <SummaryBlock items={section.items} compact={compact} />
      ) : section.type === "skills" ? (
        <SkillsBlock items={section.items} compact={compact} />
      ) : (
        <BulletList items={section.items} compact={compact} />
      )}
    </div>
  );
}

export function ClassicLayout({ resume, template, compact }: LayoutProps) {
  const t = TEMPLATE_STYLES[template] || TEMPLATE_STYLES.classic;
  return (
    <div className={`bg-white text-slate-900 rounded-lg shadow-lg min-h-full ${compact ? "p-5" : "p-8"}`}>
      <div className={`text-center border-b ${compact ? "pb-2 mb-3" : "pb-4 mb-6"}`} style={{ borderColor: t.accent }}>
        <h1 className={`font-bold tracking-tight ${compact ? "text-xl" : "text-2xl"}`} style={{ color: t.accent }}>{resume.contact.name || "Your Name"}</h1>
        <ContactLine resume={resume} className="mt-2 flex flex-wrap justify-center gap-x-3" />
      </div>
      {resume.sections.map((s) => <SmartSection key={s.id} section={s} accent={t.accent} compact={compact} />)}
    </div>
  );
}

export function CompactLayout({ resume }: LayoutProps) {
  const t = TEMPLATE_STYLES.compact;
  return (
    <div className="bg-white text-slate-900 rounded-lg shadow-lg p-5 min-h-full">
      <div className="border-b-2 pb-2 mb-3" style={{ borderColor: t.accent }}>
        <h1 className="text-lg font-black uppercase tracking-tight" style={{ color: t.accent }}>{resume.contact.name || "Your Name"}</h1>
        <ContactLine resume={resume} className="mt-1" />
      </div>
      {resume.sections.map((s) => <SmartSection key={s.id} section={s} accent={t.accent} compact />)}
    </div>
  );
}

export function ModernLayout({ resume, compact }: LayoutProps) {
  const t = TEMPLATE_STYLES.modern;
  return (
    <div className="bg-white text-slate-900 rounded-lg shadow-lg overflow-hidden min-h-full flex">
      <div className="w-2 flex-shrink-0" style={{ backgroundColor: t.accent }} />
      <div className={`flex-1 min-w-0 ${compact ? "p-4" : "p-8"}`}>
        <div className={compact ? "mb-3" : "mb-6"}>
          <h1
            className={`font-black tracking-tight ${compact ? "text-xl" : "text-3xl"}`}
            style={{ color: t.accent }}
          >
            {resume.contact.name || "Your Name"}
          </h1>
          <ContactLine resume={resume} className={compact ? "mt-1" : "mt-2"} />
        </div>
        {resume.sections.map((s) => (
          <SmartSection key={s.id} section={s} accent={t.accent} pill compact={compact} />
        ))}
      </div>
    </div>
  );
}

export function SidebarLayout({ resume, compact }: LayoutProps) {
  const t = TEMPLATE_STYLES.sidebar;
  const skills = resume.sections.filter((s) => s.type === "skills" || s.type === "certifications");
  const main = resume.sections.filter((s) => s.type !== "skills" && s.type !== "certifications");
  return (
    <div className="bg-white text-slate-900 rounded-lg shadow-lg overflow-hidden min-h-full flex">
      <div className={`w-[32%] text-white flex-shrink-0 ${compact ? "p-3" : "p-5"}`} style={{ backgroundColor: t.accent }}>
        <h1 className="text-lg font-bold leading-tight mb-3">{resume.contact.name || "Your Name"}</h1>
        <div className="space-y-1 text-[10px] opacity-90 mb-5">
          {resume.contact.email && <div>{resume.contact.email}</div>}
          {resume.contact.phone && <div>{resume.contact.phone}</div>}
          {resume.contact.linkedin && <div className="break-all">{resume.contact.linkedin}</div>}
        </div>
        {skills.map((section) => (
          <div key={section.id} className="mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-80">{section.heading}</h2>
            <div className="flex flex-wrap gap-1">
              {section.items.map((item) => (
                <span key={item.id} className="text-[9px] px-1.5 py-0.5 rounded bg-white/15">
                  {item.text.length > 40 ? item.text.slice(0, 40) + "…" : item.text}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={`flex-1 min-w-0 overflow-hidden ${compact ? "p-4" : "p-6"}`}>
        {main.map((s) => <SmartSection key={s.id} section={s} accent={t.accent} compact={compact} />)}
      </div>
    </div>
  );
}

export function ExecutiveLayout({ resume, compact }: LayoutProps) {
  const t = TEMPLATE_STYLES.executive;
  return (
    <div
      className={`bg-white text-slate-900 rounded-lg shadow-lg min-h-full ${compact ? "p-6" : "p-10"}`}
      style={{ fontFamily: "Georgia, serif" }}
    >
      <div className={compact ? "text-center mb-4" : "text-center mb-8"}>
        <h1
          className={`font-bold tracking-wide ${compact ? "text-2xl" : "text-3xl"}`}
          style={{ color: t.accent }}
        >
          {resume.contact.name || "Your Name"}
        </h1>
        <div className="w-16 h-0.5 mx-auto mt-3 mb-2" style={{ backgroundColor: t.accent }} />
        <ContactLine resume={resume} className="flex flex-wrap justify-center gap-x-4" />
      </div>
      {resume.sections.map((s) => <SmartSection key={s.id} section={s} accent={t.accent} compact={compact} />)}
    </div>
  );
}

export function DesignerLayout({ resume, compact }: LayoutProps) {
  const t = TEMPLATE_STYLES.designer;
  return (
    <div className="bg-white text-slate-900 rounded-lg shadow-lg overflow-hidden min-h-full">
      <div className={`text-white ${compact ? "px-5 py-3" : "px-8 py-5"}`} style={{ backgroundColor: t.accent }}>
        <h1 className={`font-black tracking-tight ${compact ? "text-xl" : "text-2xl"}`}>
          {resume.contact.name || "Your Name"}
        </h1>
        <div className="flex flex-wrap gap-x-4 text-[11px] mt-1 opacity-90">
          {resume.contact.phone && <span>{resume.contact.phone}</span>}
          {resume.contact.email && <span>{resume.contact.email}</span>}
          {resume.contact.linkedin && <span>{resume.contact.linkedin}</span>}
        </div>
      </div>
      <div className={compact ? "p-4" : "p-8"}>
        {resume.sections.map((s) => <SmartSection key={s.id} section={s} accent={t.accent} compact={compact} />)}
      </div>
    </div>
  );
}

export function MinimalLayout({ resume, compact }: LayoutProps) {
  return (
    <div className="bg-white text-slate-900 p-6 min-h-full" style={{ fontFamily: "'Courier New', monospace" }}>
      <div className="border-b-2 border-black pb-2 mb-4">
        <h1 className="text-xl font-bold tracking-tight">{resume.contact.name || "Your Name"}</h1>
        <div className="flex flex-wrap gap-x-3 text-[10px] text-slate-600 mt-1">
          {resume.contact.phone && <span>{resume.contact.phone}</span>}
          {resume.contact.email && <span>{resume.contact.email}</span>}
          {resume.contact.linkedin && <span>{resume.contact.linkedin}</span>}
          {resume.contact.github && <span>{resume.contact.github}</span>}
        </div>
      </div>
      {resume.sections.map((section) => (
        <div key={section.id} className="mb-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5 pb-0.5 border-b border-slate-300">
            {section.heading}
          </h2>
          {section.type === "summary" ? (
            <p className="text-[10px] text-slate-700 leading-snug">
              {section.items.map((it) => it.text).join(" ")}
            </p>
          ) : section.type === "skills" ? (
            <p className="text-[10px] text-slate-700">
              {section.items.map((it) => it.text).join(", ")}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {section.items.map((it) => {
                if (it.metadata?.role) return <RoleHeader key={it.id} item={it} />;
                if (it.metadata?.degree) return <EduEntry key={it.id} item={it} />;
                return (
                  <li key={it.id} className="text-[10px] text-slate-700 pl-2.5 relative before:content-['–'] before:absolute before:left-0 before:text-slate-400 leading-snug">
                    {it.text}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export function ResumeLayout({ resume, template, compact }: LayoutProps) {
  switch (template) {
    case "compact": return <CompactLayout resume={resume} template={template} compact={compact ?? true} />;
    case "modern": return <ModernLayout resume={resume} template={template} compact={compact} />;
    case "sidebar": return <SidebarLayout resume={resume} template={template} compact={compact} />;
    case "executive": return <ExecutiveLayout resume={resume} template={template} compact={compact} />;
    case "designer": return <DesignerLayout resume={resume} template={template} compact={compact} />;
    case "minimal": return <MinimalLayout resume={resume} template={template} compact={compact ?? true} />;
    default: return <ClassicLayout resume={resume} template={template} compact={compact} />;
  }
}
