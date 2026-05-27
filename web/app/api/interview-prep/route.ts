import { NextRequest, NextResponse } from "next/server";
import { isMinimaxConfigured, minimaxChat } from "@/lib/minimax";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

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

    let content = "";
    let provider = "";

    if (isMinimaxConfigured()) {
      const mm = await minimaxChat({
        system: SYSTEM_PROMPT,
        user: userPrompt,
        temperature: 0.5,
        maxTokens: 4096,
      });
      if (mm?.content) {
        content = mm.content;
        provider = mm.model;
      }
    }

    if (!content && GEMINI_KEY) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
          }),
        }
      );

      if (geminiRes.ok) {
        const gemData = await geminiRes.json();
        content = gemData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        provider = "gemini-2.0-flash";
      }
    }

    if (!content) {
      return NextResponse.json(
        { error: "AI service not configured (set MINIMAX_API_KEY or GEMINI_API_KEY)" },
        { status: 503 }
      );
    }

    let parsed = content;
    const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) parsed = jsonMatch[1];

    try {
      const questions = JSON.parse(parsed.trim());
      return NextResponse.json({ questions, provider });
    } catch {
      return NextResponse.json({ questions: [], raw: content, provider });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error("[interview-prep] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
