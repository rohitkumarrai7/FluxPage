"use client";

import type { StructuredResume } from "./resumeParser";
import { structuredResumeToText } from "./resumeParser";

export async function exportAsDocx(resume: StructuredResume, filename = "tailored-resume.docx") {
  let docxModule: any;
  try {
    docxModule = await new Function('return import("docx")')();
  } catch {
    alert("DOCX export is not available in this environment. Please download as PDF.");
    return;
  }
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docxModule;

  const contactParts = [
    resume.contact.phone,
    resume.contact.email,
    resume.contact.linkedin,
    resume.contact.github,
  ].filter(Boolean);

  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: resume.contact.name || "Your Name", bold: true, size: 32, font: "Calibri" }),
      ],
    }),
  ];

  if (contactParts.length) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: contactParts.join("  |  "), size: 18, color: "666666", font: "Calibri" }),
        ],
      })
    );
  }

  for (const section of resume.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
        children: [
          new TextRun({ text: section.heading.toUpperCase(), bold: true, size: 22, color: "1E3A5F", font: "Calibri" }),
        ],
      })
    );

    if (section.type === "summary") {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: section.items.map((it) => it.text).join(" "), size: 20, font: "Calibri" }),
          ],
        })
      );
    } else if (section.type === "skills") {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: section.items.map((it) => it.text).join(", "), size: 20, font: "Calibri" }),
          ],
        })
      );
    } else {
      for (const item of section.items) {
        if (item.metadata?.role) {
          const dateStr = [item.metadata.startDate, item.metadata.endDate].filter(Boolean).join(" – ");
          children.push(
            new Paragraph({
              spacing: { before: 120, after: 40 },
              children: [
                new TextRun({ text: item.metadata.role, bold: true, size: 20, font: "Calibri" }),
                item.metadata.company ? new TextRun({ text: ` — ${item.metadata.company}`, italics: true, size: 20, font: "Calibri" }) : new TextRun({ text: "" }),
                dateStr ? new TextRun({ text: `  ${dateStr}`, size: 18, color: "888888", font: "Calibri" }) : new TextRun({ text: "" }),
              ],
            })
          );
        } else if (item.metadata?.degree) {
          children.push(
            new Paragraph({
              spacing: { before: 80, after: 40 },
              children: [
                new TextRun({ text: item.metadata.degree, bold: true, size: 20, font: "Calibri" }),
                item.metadata.institution ? new TextRun({ text: ` — ${item.metadata.institution}`, size: 20, font: "Calibri" }) : new TextRun({ text: "" }),
              ],
            })
          );
        } else {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 40 },
              children: [
                new TextRun({ text: item.text, size: 20, font: "Calibri" }),
              ],
            })
          );
        }
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsLatex(resume: StructuredResume, filename = "tailored-resume.tex") {
  const esc = (s: string): string =>
    String(s)
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/[&%$#_{}]/g, (c) => `\\${c}`)
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/\^/g, "\\textasciicircum{}");

  const contactParts: string[] = [
    resume.contact.phone,
    resume.contact.email,
    resume.contact.linkedin,
    resume.contact.github,
  ].filter((p): p is string => !!p);

  let tex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{hyperref}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{8pt}{4pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}

\\begin{document}

\\begin{center}
{\\LARGE\\bfseries ${esc(resume.contact.name || "Your Name")}}\\\\[4pt]
${contactParts.length > 0 ? contactParts.map((p) => `{\\small ${esc(p)}}`).join(" $\\cdot$ ") + "\n" : ""}\\end{center}

`;

  for (const section of resume.sections) {
    tex += `\\section{${esc(section.heading)}}\n`;

    if (section.type === "summary") {
      tex += `${section.items.map((it) => esc(it.text)).join(" ")}\n\n`;
    } else if (section.type === "skills") {
      tex += `${section.items.map((it) => esc(it.text)).join(", ")}\n\n`;
    } else {
      tex += `\\begin{itemize}[leftmargin=*,itemsep=2pt]\n`;
      for (const item of section.items) {
        if (item.metadata?.role) {
          const dateStr = [item.metadata.startDate, item.metadata.endDate].filter(Boolean).join(" -- ");
          tex += `\\item \\textbf{${esc(item.metadata.role)}}${item.metadata.company ? ` --- ${esc(item.metadata.company)}` : ""}${dateStr ? ` \\hfill {\\small ${esc(dateStr)}}` : ""}\n`;
        } else if (item.metadata?.degree) {
          tex += `\\item \\textbf{${esc(item.metadata.degree)}}${item.metadata.institution ? ` --- ${esc(item.metadata.institution)}` : ""}\n`;
        } else {
          tex += `\\item ${esc(item.text)}\n`;
        }
      }
      tex += `\\end{itemize}\n\n`;
    }
  }

  tex += `\\end{document}\n`;

  const blob = new Blob([tex], { type: "application/x-tex" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
