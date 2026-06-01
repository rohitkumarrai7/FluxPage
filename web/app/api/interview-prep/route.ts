import { NextRequest, NextResponse } from "next/server";
import { CONVEX_HTTP_URL } from "@/lib/convexDeployment";
import { chatWithFallback } from "@/lib/llm";

const API_URL = CONVEX_HTTP_URL;

const SYSTEM_PROMPT = `You are an expert interview coach. Generate interview preparation questions and talking points.

Rules:
1. Generate 8-10 interview questions specific to the role and company.
2. Mix behavioral, technical, and situational questions.
3. For each question, provide a brief "Approach" hint using the candidate's actual resume experience.
4. Categorize questions as: Technical, Behavioral, Situational, or Company-Specific.
5. Output valid JSON array with objects: { "category", "question", "approach", "difficulty" }
6. difficulty is one of: "easy", "medium", "hard"
7. Do NOT fabricate resume details. Only reference what is actually in the resume text.`;

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
            { error: "Interview prep requires a Pro or Premium plan." },
            { status: 403 }
          );
        }
      }
    }

    const body = await req.json();
    const { resumeText, jobDescription, jobTitle, company } = body;

    if (!jobDescription) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    const userPrompt = `Generate interview prep for:

**Job Title:** ${jobTitle || "the position"}
**Company:** ${company || "the company"}

**Job Description:**
${jobDescription.slice(0, 3000)}

**Candidate Resume:**
${(resumeText || "Not provided").slice(0, 3000)}

Generate the JSON array of interview questions now.`;

    const result = await chatWithFallback({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.5,
      maxTokens: 4096,
    });

    if (!result?.content) {
      return NextResponse.json(
        { error: "AI service not configured (set OPENROUTER_API_KEY or MINIMAX_API_KEY)" },
        { status: 503 }
      );
    }

    let parsed = result.content;
    const jsonMatch = result.content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) parsed = jsonMatch[1];

    try {
      const questions = JSON.parse(parsed.trim());
      return NextResponse.json({ questions, provider: result.model });
    } catch {
      return NextResponse.json({ questions: [], raw: result.content, provider: result.model });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error("[interview-prep] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
