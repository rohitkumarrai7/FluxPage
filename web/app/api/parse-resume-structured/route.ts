import { NextRequest, NextResponse } from "next/server";
import { chatWithFallback } from "@/lib/llm";

const SYSTEM_PROMPT = `You are a resume extraction AI. Given raw text extracted from a resume PDF/DOCX, produce a structured JSON representation.

OUTPUT exactly this JSON shape (nothing else — no markdown fences, no explanation):
{
  "contact": {
    "name": "",
    "email": "",
    "phone": "",
    "linkedin": "",
    "github": ""
  },
  "sections": [
    {
      "type": "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "achievements" | "custom",
      "heading": "Section heading as written",
      "items": [
        {
          "text": "Bullet text or entry text",
          "metadata": {
            "role": "Job Title (only for experience items)",
            "company": "Company Name",
            "startDate": "MMM YYYY",
            "endDate": "MMM YYYY or Present",
            "degree": "Degree (only for education)",
            "institution": "School Name"
          }
        }
      ]
    }
  ]
}

RULES:
1. For experience sections: the first item per job should have metadata with role, company, startDate, endDate. Following items are plain bullets (no metadata).
2. For education: items should have metadata with degree, institution, endDate.
3. For skills: combine into one item with comma-separated text, or split by category (e.g., "Languages: Python, Java" as one item).
4. Preserve original wording — do NOT rewrite or embellish bullets.
5. Do NOT include contact info (name, email, phone, URLs) as section items.
6. If no clear section header exists for initial text, put it in "summary" type.
7. Output valid JSON only.`;

function stripThinkingTags(text: string): string {
  return text
    .replace(/<think[\s\S]*?<\/think>/gi, "")
    .replace(/<redacted_reasoning[\s\S]*?<\/redacted_reasoning>/gi, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawText } = body;

    if (!rawText || typeof rawText !== "string" || rawText.trim().length < 20) {
      return NextResponse.json({ error: "rawText is required (at least 20 chars)" }, { status: 400 });
    }

    const result = await chatWithFallback({
      system: SYSTEM_PROMPT,
      user: `Extract structured data from this resume text:\n\n${rawText.slice(0, 8000)}`,
      temperature: 0.1,
      maxTokens: 4096,
    });

    if (!result?.content) {
      return NextResponse.json({ error: "LLM returned no content", parsed: null }, { status: 502 });
    }

    let cleaned = stripThinkingTags(result.content);
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not find JSON object in LLM response", parsed: null }, { status: 502 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from LLM", parsed: null }, { status: 502 });
    }

    if (!parsed.contact) parsed.contact = {};
    if (!Array.isArray(parsed.sections)) parsed.sections = [];

    const contact = {
      name: parsed.contact.name || "",
      email: parsed.contact.email || "",
      phone: parsed.contact.phone || "",
      linkedin: parsed.contact.linkedin || "",
      github: parsed.contact.github || "",
    };

    let bulletId = 0;
    const sections = parsed.sections.map((s: any, si: number) => ({
      id: `sec-${si}`,
      type: s.type || "custom",
      heading: s.heading || s.type || "Section",
      items: (Array.isArray(s.items) ? s.items : []).map((item: any) => ({
        id: `b-${bulletId++}`,
        text: typeof item === "string" ? item : item.text || "",
        ...(item.metadata && Object.keys(item.metadata).some((k: string) => item.metadata[k])
          ? { metadata: item.metadata }
          : {}),
      })),
      order: si,
    }));

    return NextResponse.json({
      parsed: { contact, sections },
      model: result.model,
    });
  } catch (err: any) {
    console.error("[parse-resume-structured]", err);
    return NextResponse.json({ error: err.message, parsed: null }, { status: 500 });
  }
}
