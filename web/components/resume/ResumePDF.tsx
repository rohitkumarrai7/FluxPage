"use client";

import { Document, Font, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { StructuredResume } from "@/lib/resumeParser";
import type { ResumeBullet } from "@/lib/types";
import { computePdfFitScale } from "@/lib/resumeFit";
import { TEMPLATE_STYLES, type TemplateVariant } from "./templates";

Font.registerHyphenationCallback((word: string) => [word]);

const SECTION_ORDER: Record<string, number> = {
  summary: 0, experience: 1, skills: 2, projects: 3,
  education: 4, certifications: 5, achievements: 6, custom: 7,
};

function orderedSections(sections: StructuredResume["sections"]) {
  return [...sections].sort(
    (a, b) => (SECTION_ORDER[a.type] ?? 99) - (SECTION_ORDER[b.type] ?? 99)
  );
}

function contactStr(resume: StructuredResume) {
  return [resume.contact.phone, resume.contact.email, resume.contact.linkedin, resume.contact.github].filter(Boolean).join("  |  ");
}

function PDFSectionTitle({ text, style }: { text: string; style: PdfStyles["sectionTitle"] }) {
  return <Text style={style}>{text.toUpperCase()}</Text>;
}

function PDFRoleHeader({ item, styles }: { item: ResumeBullet; styles: PdfStyles }) {
  if (!item.metadata?.role) return null;
  return (
    <View style={{ marginBottom: 2 }} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={styles.roleName}>{item.metadata.role}</Text>
        <Text style={styles.roleDate}>
          {[item.metadata.startDate, item.metadata.endDate].filter(Boolean).join(" – ")}
        </Text>
      </View>
      {item.metadata.company && (
        <Text style={styles.roleCompany}>
          {item.metadata.company}{item.metadata.location ? ` · ${item.metadata.location}` : ""}
        </Text>
      )}
    </View>
  );
}

function PDFEduEntry({ item, styles }: { item: ResumeBullet; styles: PdfStyles }) {
  if (!item.metadata?.degree) return null;
  return (
    <View style={{ marginBottom: 2 }} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={styles.roleName}>{item.metadata.degree}</Text>
        <Text style={styles.roleDate}>
          {[item.metadata.startDate, item.metadata.endDate].filter(Boolean).join(" – ")}
        </Text>
      </View>
      {item.metadata.institution && <Text style={styles.roleCompany}>{item.metadata.institution}</Text>}
    </View>
  );
}

function PDFSectionItems({ items, type, styles }: { items: ResumeBullet[]; type: string; styles: PdfStyles }) {
  if (type === "summary") {
    return <Text style={styles.summary}>{items.map((i) => i.text).join(" ")}</Text>;
  }
  if (type === "skills") {
    return <Text style={styles.bullet}>{items.map((i) => i.text).join(", ")}</Text>;
  }
  return (
    <>
      {items.map((item) => {
        if (item.metadata?.role) return <PDFRoleHeader key={item.id} item={item} styles={styles} />;
        if (item.metadata?.degree) return <PDFEduEntry key={item.id} item={item} styles={styles} />;
        return <Text key={item.id} style={styles.bullet}>• {item.text}</Text>;
      })}
    </>
  );
}

function makeStyles(t: (typeof TEMPLATE_STYLES)[TemplateVariant], fontScale = 1, lineScale = 1) {
  const tight = fontScale < 0.78;
  const body = t.bodySize * fontScale;
  const name = t.nameSize * fontScale * (tight ? 0.92 : 1);
  const section = t.sectionSize * fontScale;
  const pad = t.pagePadding * fontScale * (tight ? 0.75 : 1);
  const gap = t.sectionGap * fontScale * (tight ? 0.6 : 1);
  const bulletGap = tight ? 0.5 : 2;
  return {
    page: { padding: pad, fontSize: body, fontFamily: "Helvetica", color: "#111827" },
    name: { fontSize: name, fontWeight: "bold" as const, color: t.accent },
    contact: { fontSize: body - 1, color: "#64748B", marginTop: 3 * fontScale },
    sectionTitle: {
      fontSize: section, fontWeight: "bold" as const, color: t.accent,
      marginTop: gap, marginBottom: 3 * fontScale,
      borderBottomWidth: 0.5, borderBottomColor: "#CBD5E1", paddingBottom: 2,
      textTransform: "uppercase" as const, letterSpacing: 0.5,
    },
    bullet: { fontSize: body, marginBottom: bulletGap * fontScale, paddingLeft: 8, lineHeight: (tight ? 1.25 : 1.35) * lineScale },
    summary: { fontSize: body, lineHeight: (tight ? 1.35 : 1.45) * lineScale, marginBottom: 3 * fontScale },
    roleName: { fontSize: body, fontWeight: "bold" as const },
    roleDate: { fontSize: body - 1.5, color: "#64748B" },
    roleCompany: { fontSize: body - 0.5, color: "#475569", fontStyle: "italic" as const },
    pill: {
      fontSize: section - 1, fontWeight: "bold" as const, color: "#FFFFFF",
      backgroundColor: t.accent, paddingHorizontal: 6, paddingVertical: 2,
      marginTop: gap, marginBottom: 3 * fontScale, alignSelf: "flex-start" as const,
    },
  } as const;
}

type PdfStyles = ReturnType<typeof makeStyles>;

function ClassicPDF({ resume, template, fontScale, lineScale }: { resume: StructuredResume; template: TemplateVariant; fontScale: number; lineScale: number }) {
  const t = TEMPLATE_STYLES[template] || TEMPLATE_STYLES.classic;
  const s = StyleSheet.create(makeStyles(t, fontScale, lineScale));
  const contact = contactStr(resume);
  return (
    <Page size="A4" style={s.page}>
      <View style={{ textAlign: "center", marginBottom: 12 * fontScale, borderBottomWidth: 1, borderBottomColor: t.accent, paddingBottom: 6 * fontScale }}>
        <Text style={s.name}>{resume.contact.name || "Your Name"}</Text>
        {contact ? <Text style={{ ...s.contact, textAlign: "center" }}>{contact}</Text> : null}
      </View>
      {orderedSections(resume.sections).map((sec) => (
        <View key={sec.id}>
          <PDFSectionTitle text={sec.heading} style={s.sectionTitle} />
          <PDFSectionItems items={sec.items} type={sec.type} styles={s} />
        </View>
      ))}
    </Page>
  );
}

function CompactPDF({ resume, fontScale, lineScale }: { resume: StructuredResume; fontScale: number; lineScale: number }) {
  const t = TEMPLATE_STYLES.compact;
  const s = StyleSheet.create(makeStyles(t, fontScale, lineScale));
  const contact = contactStr(resume);
  return (
    <Page size="A4" style={s.page}>
      <View style={{ marginBottom: 6 * fontScale, borderBottomWidth: 2, borderBottomColor: t.accent, paddingBottom: 3 * fontScale }}>
        <Text style={{ ...s.name, textTransform: "uppercase" }}>{resume.contact.name || "Your Name"}</Text>
        {contact ? <Text style={s.contact}>{contact}</Text> : null}
      </View>
      {orderedSections(resume.sections).map((sec) => (
        <View key={sec.id}>
          <PDFSectionTitle text={sec.heading} style={{ ...s.sectionTitle, marginTop: 5 * fontScale, marginBottom: 2 * fontScale }} />
          <PDFSectionItems items={sec.items} type={sec.type} styles={s} />
        </View>
      ))}
    </Page>
  );
}

function ModernPDF({ resume, fontScale, lineScale }: { resume: StructuredResume; fontScale: number; lineScale: number }) {
  const t = TEMPLATE_STYLES.modern;
  const s = StyleSheet.create(makeStyles(t, fontScale, lineScale));
  const contact = contactStr(resume);
  const tight = fontScale < 0.78;
  const pad = t.pagePadding * fontScale * (tight ? 0.75 : 1);
  const nameSize = (t.nameSize + (tight ? 0 : 2)) * fontScale;
  return (
    <Page size="A4" style={{ ...s.page, padding: 0, flexDirection: "row" }}>
      <View style={{ width: tight ? 4 : 6, backgroundColor: t.accent }} />
      <View style={{ flex: 1, padding: pad }}>
        <Text style={{ ...s.name, fontSize: nameSize }}>{resume.contact.name || "Your Name"}</Text>
        {contact ? <Text style={{ ...s.contact, marginBottom: (tight ? 4 : 8) * fontScale }}>{contact}</Text> : null}
        {orderedSections(resume.sections).map((sec) => (
          <View key={sec.id}>
            <Text style={{
              ...s.pill,
              marginTop: (tight ? 4 : t.sectionGap) * fontScale,
              marginBottom: (tight ? 2 : 3) * fontScale,
            }}>
              {sec.heading.toUpperCase()}
            </Text>
            <PDFSectionItems items={sec.items} type={sec.type} styles={s} />
          </View>
        ))}
      </View>
    </Page>
  );
}

function SidebarPDF({ resume, fontScale, lineScale }: { resume: StructuredResume; fontScale: number; lineScale: number }) {
  const t = TEMPLATE_STYLES.sidebar;
  const s = StyleSheet.create(makeStyles(t, fontScale, lineScale));
  const ordered = orderedSections(resume.sections);
  const skills = ordered.filter((sec) => sec.type === "skills" || sec.type === "certifications");
  const main = ordered.filter((sec) => sec.type !== "skills" && sec.type !== "certifications");
  const sidePad = 16 * fontScale;
  return (
    <Page size="A4" style={{ ...s.page, padding: 0, flexDirection: "row" }}>
      <View style={{ width: "32%", backgroundColor: t.accent, padding: sidePad, color: "#FFFFFF" }}>
        <Text style={{ ...s.name, color: "#FFFFFF", marginBottom: 6 * fontScale }}>{resume.contact.name || "Your Name"}</Text>
        {resume.contact.email ? <Text style={{ fontSize: 8 * fontScale, marginBottom: 2, color: "#FFFFFF" }}>{resume.contact.email}</Text> : null}
        {resume.contact.phone ? <Text style={{ fontSize: 8 * fontScale, marginBottom: 2, color: "#FFFFFF" }}>{resume.contact.phone}</Text> : null}
        {skills.map((sec) => (
          <View key={sec.id} style={{ marginTop: 8 * fontScale }}>
            <Text style={{ fontSize: 9 * fontScale, fontWeight: "bold", marginBottom: 3, color: "#FFFFFF" }}>{sec.heading.toUpperCase()}</Text>
            <Text style={{ fontSize: 7.5 * fontScale, color: "#FFFFFF", lineHeight: 1.35 }}>
              {sec.items.map((i) => i.text).join(", ")}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ width: "68%", padding: t.pagePadding * fontScale }}>
        {main.map((sec) => (
          <View key={sec.id}>
            <PDFSectionTitle text={sec.heading} style={s.sectionTitle} />
            <PDFSectionItems items={sec.items} type={sec.type} styles={s} />
          </View>
        ))}
      </View>
    </Page>
  );
}

function ExecutivePDF({ resume, fontScale, lineScale }: { resume: StructuredResume; fontScale: number; lineScale: number }) {
  const t = TEMPLATE_STYLES.executive;
  const s = StyleSheet.create(makeStyles(t, fontScale, lineScale));
  const contact = contactStr(resume);
  return (
    <Page size="A4" style={s.page}>
      <View style={{ textAlign: "center", marginBottom: 14 * fontScale }}>
        <Text style={{ ...s.name, letterSpacing: 1 }}>{resume.contact.name || "Your Name"}</Text>
        <View style={{ width: 50, height: 1, backgroundColor: t.accent, marginTop: 6, marginBottom: 4, marginHorizontal: "auto" }} />
        {contact ? <Text style={{ ...s.contact, textAlign: "center" }}>{contact}</Text> : null}
      </View>
      {orderedSections(resume.sections).map((sec) => (
        <View key={sec.id}>
          <PDFSectionTitle text={sec.heading} style={s.sectionTitle} />
          <PDFSectionItems items={sec.items} type={sec.type} styles={s} />
        </View>
      ))}
    </Page>
  );
}

function DesignerPDF({ resume, fontScale, lineScale }: { resume: StructuredResume; fontScale: number; lineScale: number }) {
  const t = TEMPLATE_STYLES.designer;
  const s = StyleSheet.create(makeStyles(t, fontScale, lineScale));
  return (
    <Page size="A4" style={{ ...s.page, padding: 0 }}>
      <View style={{ backgroundColor: t.accent, paddingHorizontal: 32 * fontScale, paddingVertical: 14 * fontScale }}>
        <Text style={{ ...s.name, color: "#FFFFFF" }}>{resume.contact.name || "Your Name"}</Text>
        <Text style={{ fontSize: 9 * fontScale, color: "#FFFFFF", marginTop: 3 * fontScale }}>
          {contactStr(resume)}
        </Text>
      </View>
      <View style={{ padding: 28 * fontScale }}>
        {orderedSections(resume.sections).map((sec) => (
          <View key={sec.id}>
            <PDFSectionTitle text={sec.heading} style={s.sectionTitle} />
            <PDFSectionItems items={sec.items} type={sec.type} styles={s} />
          </View>
        ))}
      </View>
    </Page>
  );
}

function MinimalPDF({ resume, fontScale, lineScale }: { resume: StructuredResume; fontScale: number; lineScale: number }) {
  const t = TEMPLATE_STYLES.minimal;
  const s = StyleSheet.create(makeStyles(t, fontScale, lineScale));
  const contact = contactStr(resume);
  const small = 9 * fontScale;
  return (
    <Page size="A4" style={{ ...s.page, fontFamily: "Courier" }}>
      <View style={{ marginBottom: 6 * fontScale, borderBottomWidth: 2, borderBottomColor: "#000000", paddingBottom: 3 * fontScale }}>
        <Text style={{ ...s.name, color: "#000000" }}>{resume.contact.name || "Your Name"}</Text>
        {contact ? <Text style={{ ...s.contact, fontSize: small }}>{contact}</Text> : null}
      </View>
      {orderedSections(resume.sections).map((sec) => (
        <View key={sec.id}>
          <Text style={{ ...s.sectionTitle, color: "#000000", borderBottomColor: "#94A3B8", fontSize: small, letterSpacing: 1, marginTop: 5 * fontScale, marginBottom: 2 * fontScale }}>
            {sec.heading.toUpperCase()}
          </Text>
          <PDFSectionItems items={sec.items} type={sec.type} styles={{ ...s, bullet: { ...s.bullet, fontSize: small }, summary: { ...s.summary, fontSize: small } }} />
        </View>
      ))}
    </Page>
  );
}

function ResumePDFDocument({
  resume,
  template = "classic",
  fontScale = 1,
  lineScale = 1,
}: {
  resume: StructuredResume;
  template?: TemplateVariant;
  fontScale?: number;
  lineScale?: number;
}) {
  let page;
  switch (template) {
    case "compact": page = <CompactPDF resume={resume} fontScale={fontScale} lineScale={lineScale} />; break;
    case "modern": page = <ModernPDF resume={resume} fontScale={fontScale} lineScale={lineScale} />; break;
    case "sidebar": page = <SidebarPDF resume={resume} fontScale={fontScale} lineScale={lineScale} />; break;
    case "executive": page = <ExecutivePDF resume={resume} fontScale={fontScale} lineScale={lineScale} />; break;
    case "designer": page = <DesignerPDF resume={resume} fontScale={fontScale} lineScale={lineScale} />; break;
    case "minimal": page = <MinimalPDF resume={resume} fontScale={fontScale} lineScale={lineScale} />; break;
    default: page = <ClassicPDF resume={resume} template={template} fontScale={fontScale} lineScale={lineScale} />;
  }
  return <Document>{page}</Document>;
}

async function generatePdfBlob(
  resume: StructuredResume,
  template: TemplateVariant,
  fontScale: number,
  lineScale: number
): Promise<Blob> {
  const doc = (
    <ResumePDFDocument resume={resume} template={template} fontScale={fontScale} lineScale={lineScale} />
  );
  return await pdf(doc).toBlob();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

export interface DownloadPdfOptions {
  fontSize?: number;
  lineSpacing?: number;
}

export async function downloadResumePdf(
  resume: StructuredResume,
  template: TemplateVariant = "classic",
  filename = "tailored-resume.pdf",
  options: DownloadPdfOptions = {}
) {
  const userScale = (options.fontSize ?? 10.5) / 10.5;
  const lineScale = options.lineSpacing ?? 1.2;
  const fontScale = computePdfFitScale(resume, template, userScale, lineScale);

  let blob: Blob | null = null;
  let lastError: unknown = null;

  try {
    blob = await generatePdfBlob(resume, template, fontScale, lineScale);
  } catch (err) {
    lastError = err;
    // Only shrink further if generation failed — try one step down, still readable
    try {
      const fallback = Math.max(0.72, fontScale - 0.06);
      blob = await generatePdfBlob(resume, template, fallback, lineScale);
    } catch (err2) {
      lastError = err2;
    }
  }

  if (!blob || blob.size <= 500) {
    console.error("[PDF] generation failed:", lastError);
    throw new Error(
      lastError instanceof Error
        ? `PDF failed: ${lastError.message}`
        : "PDF generation failed. Try a different template or reduce content."
    );
  }

  triggerDownload(blob, filename);
}

export { ResumePDFDocument };
