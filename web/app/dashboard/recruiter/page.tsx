"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Card, Button, PageHeader, Badge, SpinnerCenter } from "@/components/ui";

interface Candidate {
  id: string;
  name: string;
  email: string;
  resumeLabel: string;
  skills: string[];
  experienceYears: number;
  education: string;
  lastAtsScore: number | null;
  matchedJobs: number;
  tier: string;
}

interface SearchFilters {
  query: string;
  minExperience: number;
  maxExperience: number;
  requiredSkills: string[];
  education: string;
  minAtsScore: number;
  booleanQuery: string;
}

const EDUCATION_OPTIONS = [
  { value: "", label: "Any Education" },
  { value: "high_school", label: "High School" },
  { value: "associate", label: "Associate" },
  { value: "bachelor", label: "Bachelor's" },
  { value: "master", label: "Master's" },
  { value: "doctorate", label: "Doctorate" },
];

const POPULAR_SKILLS = [
  "Python", "JavaScript", "TypeScript", "React", "Node.js",
  "Java", "AWS", "Docker", "Kubernetes", "SQL",
  "Machine Learning", "Go", "C++", "PostgreSQL", "MongoDB",
];

function parseBooleanQuery(query: string, candidates: Candidate[]): Candidate[] {
  if (!query.trim()) return candidates;

  const normalizedQuery = query.toLowerCase();

  // Parse AND/OR/NOT operators
  const andGroups = normalizedQuery.split(/\s+and\s+/i);

  return candidates.filter((candidate) => {
    const candidateText = [
      candidate.name,
      candidate.email,
      candidate.resumeLabel,
      ...candidate.skills,
      candidate.education,
      `${candidate.experienceYears} years`,
    ].join(" ").toLowerCase();

    return andGroups.every((group) => {
      const orTerms = group.split(/\s+or\s+/i);

      return orTerms.some((term) => {
        const trimmed = term.trim();

        // NOT operator
        if (trimmed.startsWith("not ")) {
          const notTerm = trimmed.slice(4).replace(/['"]/g, "");
          return !candidateText.includes(notTerm);
        }

        // Experience filter: experience >= N
        const expMatch = trimmed.match(/experience\s*>=?\s*(\d+)/);
        if (expMatch) {
          return candidate.experienceYears >= parseInt(expMatch[1]);
        }

        // Score filter: score >= N
        const scoreMatch = trimmed.match(/score\s*>=?\s*(\d+)/);
        if (scoreMatch) {
          return (candidate.lastAtsScore || 0) >= parseInt(scoreMatch[1]);
        }

        // Quoted exact match
        const quoted = trimmed.match(/^["'](.+)["']$/);
        if (quoted) {
          return candidateText.includes(quoted[1]);
        }

        // General term match
        return candidateText.includes(trimmed.replace(/['"]/g, ""));
      });
    });
  });
}

export default function RecruiterDashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    minExperience: 0,
    maxExperience: 30,
    requiredSkills: [],
    education: "",
    minAtsScore: 0,
    booleanQuery: "",
  });
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  useEffect(() => {
    loadCandidates();
  }, []);

  async function loadCandidates() {
    setLoading(true);
    try {
      // Fetch all resumes and user data to build candidate list
      const resumes = await api.resumes.list();
      const mockCandidates: Candidate[] = (resumes || []).map((r: any, i: number) => {
        const structured = r.structuredData || {};
        const skills = Array.isArray(structured.skills)
          ? structured.skills.map((s: any) => (typeof s === "string" ? s : s.skill || "")).filter(Boolean)
          : [];
        return {
          id: r.id || r._id || `c-${i}`,
          name: structured.contact?.name || r.label || "Unknown Candidate",
          email: structured.contact?.email || "",
          resumeLabel: r.label || r.filename,
          skills,
          experienceYears: structured.totalExperienceYears || 0,
          education: structured.education?.[0]?.level || "unknown",
          lastAtsScore: r.lastAtsScore ?? null,
          matchedJobs: 0,
          tier: "active",
        };
      });
      setCandidates(mockCandidates);
    } catch (e) {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredCandidates = useMemo(() => {
    let result = candidates;

    // Text search
    if (filters.query) {
      const q = filters.query.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Experience range
    result = result.filter((c) =>
      c.experienceYears >= filters.minExperience &&
      c.experienceYears <= filters.maxExperience
    );

    // Required skills
    if (filters.requiredSkills.length > 0) {
      result = result.filter((c) =>
        filters.requiredSkills.every((skill) =>
          c.skills.some((s) => s.toLowerCase().includes(skill.toLowerCase()))
        )
      );
    }

    // Education
    if (filters.education) {
      const EDUCATION_RANK: Record<string, number> = {
        high_school: 1, associate: 2, bachelor: 3, master: 4, doctorate: 5,
      };
      const requiredRank = EDUCATION_RANK[filters.education] || 0;
      result = result.filter((c) => (EDUCATION_RANK[c.education] || 0) >= requiredRank);
    }

    // Min ATS score
    if (filters.minAtsScore > 0) {
      result = result.filter((c) => (c.lastAtsScore || 0) >= filters.minAtsScore);
    }

    // Boolean query
    if (filters.booleanQuery) {
      result = parseBooleanQuery(filters.booleanQuery, result);
    }

    return result;
  }, [candidates, filters]);

  function toggleSkill(skill: string) {
    setFilters((f) => ({
      ...f,
      requiredSkills: f.requiredSkills.includes(skill)
        ? f.requiredSkills.filter((s) => s !== skill)
        : [...f.requiredSkills, skill],
    }));
  }

  function toggleCandidate(id: string) {
    setSelectedCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <SpinnerCenter className="min-h-[400px]" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruiter Dashboard"
        subtitle={`${filteredCandidates.length} candidates match your criteria`}
      />

      {/* Boolean Search Bar */}
      <Card padding="md">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">Boolean Search</label>
          <input
            type="text"
            value={filters.booleanQuery}
            onChange={(e) => setFilters((f) => ({ ...f, booleanQuery: e.target.value }))}
            placeholder={`("Python" OR "Java") AND "AWS" AND experience >= 5 AND NOT "intern"`}
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
          <p className="text-xs text-muted">
            Supports: AND, OR, NOT, quoted phrases, experience &gt;= N, score &gt;= N
          </p>
        </div>
      </Card>

      {/* Filters Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <label className="block text-xs font-medium text-muted mb-2">Quick Search</label>
          <input
            type="text"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Name, email, skill..."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface outline-none focus:ring-2 focus:ring-primary/20"
          />
        </Card>

        <Card padding="sm">
          <label className="block text-xs font-medium text-muted mb-2">
            Experience: {filters.minExperience}–{filters.maxExperience} years
          </label>
          <div className="flex gap-2">
            <input
              type="number" min={0} max={30}
              value={filters.minExperience}
              onChange={(e) => setFilters((f) => ({ ...f, minExperience: Number(e.target.value) }))}
              className="w-full px-2 py-1.5 border border-border rounded text-sm bg-surface outline-none"
            />
            <span className="text-muted self-center">–</span>
            <input
              type="number" min={0} max={30}
              value={filters.maxExperience}
              onChange={(e) => setFilters((f) => ({ ...f, maxExperience: Number(e.target.value) }))}
              className="w-full px-2 py-1.5 border border-border rounded text-sm bg-surface outline-none"
            />
          </div>
        </Card>

        <Card padding="sm">
          <label className="block text-xs font-medium text-muted mb-2">Min Education</label>
          <select
            value={filters.education}
            onChange={(e) => setFilters((f) => ({ ...f, education: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface outline-none"
          >
            {EDUCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Card>

        <Card padding="sm">
          <label className="block text-xs font-medium text-muted mb-2">Min ATS Score</label>
          <input
            type="range" min={0} max={100} step={5}
            value={filters.minAtsScore}
            onChange={(e) => setFilters((f) => ({ ...f, minAtsScore: Number(e.target.value) }))}
            className="w-full"
          />
          <div className="text-xs text-center text-muted mt-1">{filters.minAtsScore}%</div>
        </Card>
      </div>

      {/* Skills Chips */}
      <Card padding="sm">
        <label className="block text-xs font-medium text-muted mb-2">Required Skills (AND logic)</label>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SKILLS.map((skill) => (
            <button
              key={skill}
              onClick={() => toggleSkill(skill)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filters.requiredSkills.includes(skill)
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-muted border-border hover:border-primary hover:text-primary"
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
        {filters.requiredSkills.length > 0 && (
          <div className="mt-2 text-xs text-muted">
            Active: {filters.requiredSkills.join(" AND ")}
            <button
              onClick={() => setFilters((f) => ({ ...f, requiredSkills: [] }))}
              className="ml-2 text-danger hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">
          {selectedCandidates.size > 0 && (
            <span className="font-medium text-primary">{selectedCandidates.size} selected · </span>
          )}
          Showing {filteredCandidates.length} of {candidates.length} candidates
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 text-xs rounded border ${viewMode === "table" ? "bg-primary text-white border-primary" : "border-border text-muted"}`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1.5 text-xs rounded border ${viewMode === "cards" ? "bg-primary text-white border-primary" : "border-border text-muted"}`}
          >
            Cards
          </button>
        </div>
      </div>

      {/* Results */}
      {filteredCandidates.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No candidates match</h3>
            <p className="text-sm text-muted">Try adjusting your filters or broadening your search criteria.</p>
          </div>
        </Card>
      ) : viewMode === "table" ? (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted w-8">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCandidates(new Set(filteredCandidates.map((c) => c.id)));
                        } else {
                          setSelectedCandidates(new Set());
                        }
                      }}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Candidate</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Skills</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Exp</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Education</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">ATS Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCandidates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedCandidates.has(c.id)}
                        onChange={() => toggleCandidate(c.id)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted">{c.email || c.resumeLabel}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {c.skills.slice(0, 4).map((s) => (
                          <span key={s} className="px-1.5 py-0.5 bg-slate-100 text-xs rounded text-foreground">{s}</span>
                        ))}
                        {c.skills.length > 4 && (
                          <span className="px-1.5 py-0.5 text-xs text-muted">+{c.skills.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{c.experienceYears}y</td>
                    <td className="px-4 py-3 capitalize text-foreground">{c.education.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      {c.lastAtsScore !== null ? (
                        <Badge variant={c.lastAtsScore >= 75 ? "primary" : c.lastAtsScore >= 50 ? "warning" : "default"}>
                          {c.lastAtsScore}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map((c) => (
            <Card key={c.id} padding="md">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground">{c.name}</h4>
                  <p className="text-xs text-muted">{c.email || c.resumeLabel}</p>
                </div>
                {c.lastAtsScore !== null && (
                  <Badge variant={c.lastAtsScore >= 75 ? "primary" : c.lastAtsScore >= 50 ? "warning" : "default"}>
                    {c.lastAtsScore}%
                  </Badge>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Experience</span>
                  <span className="font-medium">{c.experienceYears} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Education</span>
                  <span className="font-medium capitalize">{c.education.replace("_", " ")}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {c.skills.slice(0, 6).map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-slate-100 text-xs rounded-full">{s}</span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
