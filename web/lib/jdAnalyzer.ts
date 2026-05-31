import { chatWithFallback } from "./llm";

export interface JDAnalysis {
  hardSkills: string[];
  softSkills: string[];
  tools: string[];
  keywords: string[];
  industry: string;
  roleLevel: string;
  source: "llm" | "regex";
}

const JD_SYSTEM_PROMPT = `You extract ATS keywords from job descriptions. Output ONLY a valid JSON object — no markdown, no explanation.

Return this exact shape:
{
  "hardSkills": ["skill1", "skill2"],
  "softSkills": ["skill1"],
  "tools": ["tool1", "tool2"],
  "keywords": ["exact phrase from JD that an ATS would scan for"],
  "industry": "one word industry",
  "roleLevel": "intern|junior|mid|senior|lead|manager|director|vp|executive"
}

Rules:
1. Extract ALL skills, tools, technologies, methodologies, certifications, and domain terms.
2. Include both abbreviated and full forms (e.g. "SQL" and "Structured Query Language").
3. "keywords" should be exact multi-word phrases a recruiter would Ctrl+F for.
4. Do NOT include generic words like "team player" or "good communication" in hardSkills — those go in softSkills.
5. For non-tech roles (finance, marketing, healthcare, legal), extract domain-specific terms.`;

function stripThinkingTags(text: string): string {
  return text
    .replace(/<think[\s\S]*?<\/think>/gi, "")
    .replace(/<redacted_reasoning[\s\S]*?<\/redacted_reasoning>/gi, "")
    .trim();
}

export async function analyzeJobDescription(
  jdText: string,
  jobTitle?: string
): Promise<JDAnalysis> {
  try {
    const result = await chatWithFallback({
      system: JD_SYSTEM_PROMPT,
      user: `Job Title: ${jobTitle || "Unknown"}\n\nJob Description:\n${jdText.slice(0, 6000)}`,
      temperature: 0.1,
      maxTokens: 2048,
    });

    if (result?.content) {
      const cleaned = stripThinkingTags(result.content);
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const analysis: JDAnalysis = {
          hardSkills: Array.isArray(parsed.hardSkills) ? parsed.hardSkills : [],
          softSkills: Array.isArray(parsed.softSkills) ? parsed.softSkills : [],
          tools: Array.isArray(parsed.tools) ? parsed.tools : [],
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          industry: parsed.industry || "",
          roleLevel: parsed.roleLevel || "mid",
          source: "llm",
        };

        const allTerms = [
          ...analysis.hardSkills,
          ...analysis.tools,
          ...analysis.keywords,
        ];
        if (allTerms.length >= 3) return analysis;
      }
    }
  } catch (err) {
    console.error("[jdAnalyzer] LLM extraction failed:", err);
  }

  return regexFallback(jdText, jobTitle);
}

const TECH_SKILLS = /\b(python|java|javascript|typescript|react|angular|vue|node\.?js|next\.?js|express|django|flask|spring\s*boot|spring|ruby|rails|go|golang|rust|swift|kotlin|c\+\+|c#|\.net|php|laravel|scala|sql|mysql|postgresql|postgres|mongodb|redis|elasticsearch|kafka|docker|kubernetes|k8s|aws|azure|gcp|terraform|ansible|jenkins|git|github|gitlab|jira|confluence|figma|tableau|power\s*bi|pandas|numpy|tensorflow|pytorch|scikit-learn|keras|spark|hadoop|airflow|snowflake|databricks|graphql|rest\s*api|microservices|ci\/cd|devops|linux|bash|html|css|sass|tailwind|bootstrap|webpack|vite|jest|cypress|selenium|agile|scrum|kanban|machine\s*learning|deep\s*learning|nlp|computer\s*vision|data\s*science|data\s*engineering|data\s*analysis|excel|powerpoint|salesforce|hubspot|sap|oracle|quickbooks|autocad|solidworks|photoshop|illustrator|indesign|premiere|blender|unity|unreal|matlab|r\b|stata|spss|sas|financial\s*modeling|financial\s*analysis|equity\s*research|market\s*analysis|risk\s*management|portfolio\s*management|valuation|bloomberg|factset|morningstar|capital\s*iq|pitchbook|dcf|lbo|m&a|ipo|compliance|regulatory|hipaa|sox|gaap|ifrs|cfa|cpa|frm|series\s*\d+)\b/gi;

const SOFT_SKILLS = /\b(leadership|teamwork|communication|problem[- ]solving|critical\s*thinking|time\s*management|adaptability|collaboration|negotiation|presentation|mentoring|coaching|project\s*management|stakeholder\s*management|strategic\s*planning|decision[- ]making|conflict\s*resolution|emotional\s*intelligence|creativity|innovation|analytical\s*thinking|attention\s*to\s*detail|organizational\s*skills|interpersonal\s*skills|client\s*relations|customer\s*service|business\s*development|account\s*management|cross[- ]functional)\b/gi;

function regexFallback(jdText: string, jobTitle?: string): JDAnalysis {
  const hardSkills = new Set<string>();
  const softSkills = new Set<string>();
  const tools = new Set<string>();

  let match;
  const techRe = new RegExp(TECH_SKILLS.source, "gi");
  while ((match = techRe.exec(jdText)) !== null) {
    const term = match[0].trim();
    if (/^(aws|azure|gcp|docker|kubernetes|jenkins|git|jira|figma|tableau|salesforce|hubspot|sap|bloomberg|factset|excel)$/i.test(term)) {
      tools.add(term);
    } else {
      hardSkills.add(term);
    }
  }

  const softRe = new RegExp(SOFT_SKILLS.source, "gi");
  while ((match = softRe.exec(jdText)) !== null) {
    softSkills.add(match[0].trim());
  }

  const keywords: string[] = [];
  const lines = jdText.split("\n");
  for (const line of lines) {
    const clean = line.replace(/^[-•*▪▸►◆]\s*/, "").trim();
    if (clean.length > 10 && clean.length < 80) {
      const words = clean.split(/\s+/).slice(0, 5).join(" ");
      if (words.length > 8) keywords.push(words);
    }
  }

  return {
    hardSkills: [...hardSkills].slice(0, 20),
    softSkills: [...softSkills].slice(0, 10),
    tools: [...tools].slice(0, 10),
    keywords: keywords.slice(0, 15),
    industry: guessIndustry(jdText, jobTitle),
    roleLevel: "mid",
    source: "regex",
  };
}

function guessIndustry(jdText: string, jobTitle?: string): string {
  const text = `${jobTitle || ""} ${jdText}`.toLowerCase();
  if (/financ|equity|trading|banking|invest|portfolio/i.test(text)) return "finance";
  if (/health|medical|pharma|clinical|patient|hipaa/i.test(text)) return "healthcare";
  if (/market|brand|seo|content|social\s*media|advertis/i.test(text)) return "marketing";
  if (/legal|law|compliance|regulat|attorney/i.test(text)) return "legal";
  if (/education|teach|academ|curriculum/i.test(text)) return "education";
  if (/engineer|software|develop|devops|fullstack|backend|frontend/i.test(text)) return "technology";
  if (/design|ux|ui|creative|graphic/i.test(text)) return "design";
  if (/sales|account\s*exec|business\s*develop/i.test(text)) return "sales";
  return "general";
}

export function mergeJDKeywordsWithATS(
  jdAnalysis: JDAnalysis,
  atsMatched: string[],
  atsMissing: string[]
): { matchedKeywords: string[]; missingKeywords: string[] } {
  const allJDTerms = [
    ...jdAnalysis.hardSkills,
    ...jdAnalysis.tools,
    ...jdAnalysis.keywords,
    ...jdAnalysis.softSkills,
  ];

  const matchedSet = new Set(atsMatched.map((k) => k.toLowerCase()));
  const enhanced: string[] = [...atsMatched];
  const enhancedMissing: string[] = [];

  for (const term of allJDTerms) {
    const lower = term.toLowerCase();
    if (matchedSet.has(lower)) continue;
    enhancedMissing.push(term);
  }

  for (const term of atsMissing) {
    if (!enhancedMissing.some((e) => e.toLowerCase() === term.toLowerCase())) {
      enhancedMissing.push(term);
    }
  }

  return {
    matchedKeywords: enhanced,
    missingKeywords: [...new Set(enhancedMissing)].slice(0, 20),
  };
}
