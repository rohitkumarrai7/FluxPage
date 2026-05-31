import { NextRequest, NextResponse } from "next/server";
import { CONVEX_HTTP_URL } from "@/lib/convexDeployment";
import { chatWithFallback } from "@/lib/llm";

const API_URL = CONVEX_HTTP_URL;

const SYSTEM_PROMPT = `You are an expert cover letter writer. Generate a compelling, professional cover letter.

Rules:
1. Keep it concise — 3-4 paragraphs maximum.
2. Reference specific job requirements and match them to the candidate's experience.
3. Use the candidate's actual achievements and metrics from their resume.
4. Never fabricate experience, companies, or qualifications.
5. Match the requested tone precisely.
6. Do not include placeholder brackets like [Company Name] — use the actual values.
7. Output ONLY the cover letter text, no subject lines or formatting instructions.`;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const profileRes = await fetch(`${API_URL}/v1/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        const tier = profile.tier || "free";
        if (tier !== "pro" && tier !== "premium") {
          return NextResponse.json(
            { error: "Cover letters require a Pro or Premium plan." },
            { status: 403 }
          );
        }
      }
    }

    const body = await req.json();
    const { resumeText, jobDescription, jobTitle, company, tone } = body;

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: "Resume text and job description are required" },
        { status: 400 }
      );
    }

    const toneGuide: Record<string, string> = {
      concise: "Write in a direct, no-fluff style. Every sentence should add value.",
      confident: "Write with bold confidence. Emphasize leadership and measurable impact.",
      technical: "Focus on technical expertise, tools, and engineering methodology.",
      warm: "Write in a personable, enthusiastic tone that shows cultural fit.",
    };

    const userPrompt = `Generate a cover letter for this position:

**Job Title:** ${jobTitle || "the position"}
**Company:** ${company || "the company"}
**Tone:** ${toneGuide[tone] || toneGuide.confident}

**Job Description:**
${jobDescription.slice(0, 3000)}

**Candidate Resume:**
${resumeText.slice(0, 4000)}

Write the cover letter now.`;

    const result = await chatWithFallback({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.4,
      maxTokens: 2048,
    });

    if (result?.content) {
      return NextResponse.json({ content: result.content, provider: result.model });
    }

    return NextResponse.json(
      { error: "AI service not configured (set OPENROUTER_API_KEY or MINIMAX_API_KEY)" },
      { status: 503 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error("[cover-letter] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
