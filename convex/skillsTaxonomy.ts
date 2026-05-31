// ─── Skills Taxonomy & Knowledge Graph ─────────────────────────────────────────
// Hierarchical skill relationships: skill → subcategory → domain
// Enables matching "React" when JD asks for "Frontend Development"

export interface SkillNode {
  id: string;
  name: string;
  aliases: string[];
  parent: string | null;
  domain: string;
  category: string;
  weight: number; // 0-1, importance within its category
}

// ─── Skill Definitions ─────────────────────────────────────────────────────────

const TAXONOMY: SkillNode[] = [
  // === PROGRAMMING LANGUAGES ===
  { id: "python", name: "Python", aliases: ["python3", "py", "python2"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 1.0 },
  { id: "javascript", name: "JavaScript", aliases: ["js", "es6", "es2015", "ecmascript"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 1.0 },
  { id: "typescript", name: "TypeScript", aliases: ["ts"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 0.9 },
  { id: "java", name: "Java", aliases: ["java8", "java11", "java17", "jdk", "jvm"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 1.0 },
  { id: "csharp", name: "C#", aliases: ["c#", "c-sharp", "csharp", "dotnet", ".net"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 0.9 },
  { id: "cpp", name: "C++", aliases: ["c++", "cpp", "c plus plus"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 0.9 },
  { id: "go", name: "Go", aliases: ["golang", "go lang"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 0.8 },
  { id: "rust", name: "Rust", aliases: ["rust-lang"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 0.7 },
  { id: "ruby", name: "Ruby", aliases: ["rb"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 0.7 },
  { id: "php", name: "PHP", aliases: ["php7", "php8"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 0.7 },
  { id: "swift", name: "Swift", aliases: ["swiftui"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 0.7 },
  { id: "kotlin", name: "Kotlin", aliases: ["kt"], parent: "programming_languages", domain: "engineering", category: "languages", weight: 0.7 },
  { id: "scala", name: "Scala", aliases: [], parent: "programming_languages", domain: "engineering", category: "languages", weight: 0.6 },
  { id: "r_lang", name: "R", aliases: ["r language", "rlang", "r programming"], parent: "programming_languages", domain: "data_science", category: "languages", weight: 0.7 },
  { id: "sql", name: "SQL", aliases: ["sql", "structured query language"], parent: "programming_languages", domain: "data", category: "languages", weight: 0.9 },

  // === FRONTEND FRAMEWORKS ===
  { id: "react", name: "React", aliases: ["reactjs", "react.js", "react js"], parent: "frontend_frameworks", domain: "engineering", category: "frontend", weight: 1.0 },
  { id: "angular", name: "Angular", aliases: ["angularjs", "angular.js", "angular2+"], parent: "frontend_frameworks", domain: "engineering", category: "frontend", weight: 0.9 },
  { id: "vue", name: "Vue.js", aliases: ["vuejs", "vue.js", "vue3", "vue2"], parent: "frontend_frameworks", domain: "engineering", category: "frontend", weight: 0.8 },
  { id: "nextjs", name: "Next.js", aliases: ["next.js", "nextjs", "next"], parent: "frontend_frameworks", domain: "engineering", category: "frontend", weight: 0.8 },
  { id: "svelte", name: "Svelte", aliases: ["sveltekit"], parent: "frontend_frameworks", domain: "engineering", category: "frontend", weight: 0.6 },
  { id: "html", name: "HTML", aliases: ["html5"], parent: "frontend_fundamentals", domain: "engineering", category: "frontend", weight: 0.5 },
  { id: "css", name: "CSS", aliases: ["css3", "scss", "sass", "less", "stylesheets"], parent: "frontend_fundamentals", domain: "engineering", category: "frontend", weight: 0.5 },
  { id: "tailwind", name: "Tailwind CSS", aliases: ["tailwindcss", "tailwind"], parent: "frontend_styling", domain: "engineering", category: "frontend", weight: 0.5 },
  { id: "react_native", name: "React Native", aliases: ["react-native", "rn"], parent: "mobile_frameworks", domain: "engineering", category: "mobile", weight: 0.8 },
  { id: "flutter", name: "Flutter", aliases: ["dart", "flutter sdk"], parent: "mobile_frameworks", domain: "engineering", category: "mobile", weight: 0.7 },

  // === BACKEND FRAMEWORKS ===
  { id: "nodejs", name: "Node.js", aliases: ["node.js", "node", "nodejs", "express", "expressjs", "express.js"], parent: "backend_frameworks", domain: "engineering", category: "backend", weight: 1.0 },
  { id: "django", name: "Django", aliases: ["django rest framework", "drf"], parent: "backend_frameworks", domain: "engineering", category: "backend", weight: 0.8 },
  { id: "flask", name: "Flask", aliases: ["flask api"], parent: "backend_frameworks", domain: "engineering", category: "backend", weight: 0.6 },
  { id: "spring", name: "Spring", aliases: ["spring boot", "spring framework", "springboot"], parent: "backend_frameworks", domain: "engineering", category: "backend", weight: 0.9 },
  { id: "rails", name: "Ruby on Rails", aliases: ["rails", "ror", "ruby on rails"], parent: "backend_frameworks", domain: "engineering", category: "backend", weight: 0.7 },
  { id: "fastapi", name: "FastAPI", aliases: ["fast api"], parent: "backend_frameworks", domain: "engineering", category: "backend", weight: 0.6 },
  { id: "graphql", name: "GraphQL", aliases: ["graph ql", "apollo graphql"], parent: "api_technologies", domain: "engineering", category: "backend", weight: 0.7 },
  { id: "rest_api", name: "REST API", aliases: ["rest", "restful", "restful api", "rest apis"], parent: "api_technologies", domain: "engineering", category: "backend", weight: 0.8 },
  { id: "microservices", name: "Microservices", aliases: ["micro services", "microservices architecture", "service oriented"], parent: "architecture_patterns", domain: "engineering", category: "architecture", weight: 0.8 },

  // === DATABASES ===
  { id: "postgresql", name: "PostgreSQL", aliases: ["postgres", "psql", "pg"], parent: "relational_databases", domain: "data", category: "databases", weight: 0.9 },
  { id: "mysql", name: "MySQL", aliases: ["mariadb"], parent: "relational_databases", domain: "data", category: "databases", weight: 0.8 },
  { id: "mongodb", name: "MongoDB", aliases: ["mongo", "mongoose"], parent: "nosql_databases", domain: "data", category: "databases", weight: 0.8 },
  { id: "redis", name: "Redis", aliases: ["redis cache"], parent: "nosql_databases", domain: "data", category: "databases", weight: 0.7 },
  { id: "elasticsearch", name: "Elasticsearch", aliases: ["elastic", "elk", "elk stack", "opensearch"], parent: "nosql_databases", domain: "data", category: "databases", weight: 0.7 },
  { id: "dynamodb", name: "DynamoDB", aliases: ["dynamo db", "aws dynamodb"], parent: "nosql_databases", domain: "data", category: "databases", weight: 0.6 },
  { id: "snowflake", name: "Snowflake", aliases: ["snowflake db"], parent: "data_warehouses", domain: "data", category: "databases", weight: 0.7 },
  { id: "bigquery", name: "BigQuery", aliases: ["google bigquery", "bq"], parent: "data_warehouses", domain: "data", category: "databases", weight: 0.6 },

  // === CLOUD & INFRASTRUCTURE ===
  { id: "aws", name: "AWS", aliases: ["amazon web services", "amazon aws", "aws cloud"], parent: "cloud_providers", domain: "infrastructure", category: "cloud", weight: 1.0 },
  { id: "azure", name: "Azure", aliases: ["microsoft azure", "ms azure", "azure cloud"], parent: "cloud_providers", domain: "infrastructure", category: "cloud", weight: 0.9 },
  { id: "gcp", name: "GCP", aliases: ["google cloud", "google cloud platform", "gcloud"], parent: "cloud_providers", domain: "infrastructure", category: "cloud", weight: 0.8 },
  { id: "docker", name: "Docker", aliases: ["containerization", "containers", "dockerfile"], parent: "containerization", domain: "infrastructure", category: "devops", weight: 0.9 },
  { id: "kubernetes", name: "Kubernetes", aliases: ["k8s", "kube", "container orchestration", "eks", "aks", "gke"], parent: "container_orchestration", domain: "infrastructure", category: "devops", weight: 0.9 },
  { id: "terraform", name: "Terraform", aliases: ["tf", "infrastructure as code", "iac", "hcl"], parent: "iac_tools", domain: "infrastructure", category: "devops", weight: 0.8 },
  { id: "cicd", name: "CI/CD", aliases: ["ci/cd", "ci cd", "cicd", "continuous integration", "continuous deployment", "continuous delivery"], parent: "devops_practices", domain: "infrastructure", category: "devops", weight: 0.8 },
  { id: "jenkins", name: "Jenkins", aliases: ["jenkins ci"], parent: "ci_tools", domain: "infrastructure", category: "devops", weight: 0.6 },
  { id: "github_actions", name: "GitHub Actions", aliases: ["gh actions", "github ci"], parent: "ci_tools", domain: "infrastructure", category: "devops", weight: 0.6 },
  { id: "git", name: "Git", aliases: ["github", "gitlab", "bitbucket", "version control"], parent: "devops_practices", domain: "infrastructure", category: "devops", weight: 0.7 },
  { id: "linux", name: "Linux", aliases: ["unix", "ubuntu", "centos", "debian", "rhel"], parent: "operating_systems", domain: "infrastructure", category: "systems", weight: 0.7 },

  // === DATA & ML ===
  { id: "machine_learning", name: "Machine Learning", aliases: ["ml", "machine learning", "statistical learning"], parent: "ai_ml", domain: "data_science", category: "ml", weight: 1.0 },
  { id: "deep_learning", name: "Deep Learning", aliases: ["dl", "neural networks", "neural nets"], parent: "ai_ml", domain: "data_science", category: "ml", weight: 0.9 },
  { id: "nlp", name: "NLP", aliases: ["natural language processing", "text mining", "computational linguistics"], parent: "ai_ml", domain: "data_science", category: "ml", weight: 0.8 },
  { id: "computer_vision", name: "Computer Vision", aliases: ["cv", "image recognition", "object detection"], parent: "ai_ml", domain: "data_science", category: "ml", weight: 0.8 },
  { id: "tensorflow", name: "TensorFlow", aliases: ["tf", "tensorflow2"], parent: "ml_frameworks", domain: "data_science", category: "ml", weight: 0.8 },
  { id: "pytorch", name: "PyTorch", aliases: ["torch"], parent: "ml_frameworks", domain: "data_science", category: "ml", weight: 0.8 },
  { id: "pandas", name: "Pandas", aliases: ["pandas dataframe"], parent: "data_tools", domain: "data_science", category: "data", weight: 0.6 },
  { id: "spark", name: "Apache Spark", aliases: ["spark", "pyspark", "spark sql"], parent: "big_data", domain: "data_science", category: "data", weight: 0.8 },
  { id: "kafka", name: "Apache Kafka", aliases: ["kafka", "kafka streams", "event streaming"], parent: "streaming", domain: "data", category: "data", weight: 0.7 },
  { id: "airflow", name: "Apache Airflow", aliases: ["airflow", "dag"], parent: "orchestration", domain: "data", category: "data", weight: 0.6 },
  { id: "llm", name: "LLM", aliases: ["large language model", "large language models", "gpt", "llm"], parent: "ai_ml", domain: "data_science", category: "ml", weight: 0.8 },
  { id: "generative_ai", name: "Generative AI", aliases: ["gen ai", "genai", "generative"], parent: "ai_ml", domain: "data_science", category: "ml", weight: 0.7 },

  // === TESTING ===
  { id: "jest", name: "Jest", aliases: ["jest testing"], parent: "testing_frameworks", domain: "engineering", category: "testing", weight: 0.5 },
  { id: "cypress", name: "Cypress", aliases: ["cypress.io"], parent: "e2e_testing", domain: "engineering", category: "testing", weight: 0.5 },
  { id: "selenium", name: "Selenium", aliases: ["selenium webdriver"], parent: "e2e_testing", domain: "engineering", category: "testing", weight: 0.5 },
  { id: "unit_testing", name: "Unit Testing", aliases: ["unit tests", "tdd", "test driven development"], parent: "testing_practices", domain: "engineering", category: "testing", weight: 0.6 },

  // === PROJECT MANAGEMENT & METHODOLOGIES ===
  { id: "agile", name: "Agile", aliases: ["agile methodology", "agile development"], parent: "methodologies", domain: "management", category: "process", weight: 0.7 },
  { id: "scrum", name: "Scrum", aliases: ["scrum master", "sprint planning"], parent: "methodologies", domain: "management", category: "process", weight: 0.6 },
  { id: "project_management", name: "Project Management", aliases: ["pm", "program management"], parent: "management_skills", domain: "management", category: "leadership", weight: 0.7 },
  { id: "product_management", name: "Product Management", aliases: ["product owner", "product strategy"], parent: "management_skills", domain: "management", category: "leadership", weight: 0.7 },

  // === DESIGN ===
  { id: "figma", name: "Figma", aliases: ["figma design"], parent: "design_tools", domain: "design", category: "design", weight: 0.7 },
  { id: "ux_design", name: "UX Design", aliases: ["user experience", "ux", "ux research", "user research"], parent: "design_disciplines", domain: "design", category: "design", weight: 0.8 },
  { id: "ui_design", name: "UI Design", aliases: ["user interface", "ui", "interface design"], parent: "design_disciplines", domain: "design", category: "design", weight: 0.7 },

  // === ANALYTICS & BI ===
  { id: "tableau", name: "Tableau", aliases: ["tableau desktop", "tableau server"], parent: "bi_tools", domain: "analytics", category: "analytics", weight: 0.7 },
  { id: "power_bi", name: "Power BI", aliases: ["powerbi", "power bi", "microsoft power bi"], parent: "bi_tools", domain: "analytics", category: "analytics", weight: 0.7 },
  { id: "data_visualization", name: "Data Visualization", aliases: ["data viz", "dashboards"], parent: "analytics_skills", domain: "analytics", category: "analytics", weight: 0.6 },

  // === SOFT SKILLS & LEADERSHIP ===
  { id: "leadership", name: "Leadership", aliases: ["team leadership", "people management", "mentoring"], parent: "soft_skills", domain: "management", category: "leadership", weight: 0.8 },
  { id: "communication", name: "Communication", aliases: ["written communication", "verbal communication", "presentation"], parent: "soft_skills", domain: "management", category: "soft", weight: 0.5 },
  { id: "stakeholder_management", name: "Stakeholder Management", aliases: ["stakeholder engagement", "cross functional"], parent: "soft_skills", domain: "management", category: "leadership", weight: 0.6 },

  // === HEALTHCARE ===
  { id: "epic_emr", name: "Epic EMR", aliases: ["epic", "epic systems", "electronic medical records"], parent: "healthcare_systems", domain: "healthcare", category: "healthcare", weight: 0.9 },
  { id: "acls", name: "ACLS", aliases: ["advanced cardiac life support"], parent: "healthcare_certs", domain: "healthcare", category: "healthcare", weight: 0.8 },
  { id: "patient_care", name: "Patient Care", aliases: ["clinical care", "bedside care", "direct patient care"], parent: "healthcare_skills", domain: "healthcare", category: "healthcare", weight: 0.9 },

  // === FINANCE ===
  { id: "financial_modeling", name: "Financial Modeling", aliases: ["financial models", "dcf", "valuation"], parent: "finance_skills", domain: "finance", category: "finance", weight: 0.9 },
  { id: "bloomberg", name: "Bloomberg Terminal", aliases: ["bloomberg", "bloomberg terminal"], parent: "finance_tools", domain: "finance", category: "finance", weight: 0.7 },
  { id: "excel_advanced", name: "Advanced Excel", aliases: ["excel", "vlookup", "pivot tables", "macros", "vba"], parent: "finance_tools", domain: "finance", category: "finance", weight: 0.8 },
  { id: "cfa", name: "CFA", aliases: ["chartered financial analyst", "cfa level"], parent: "finance_certs", domain: "finance", category: "finance", weight: 0.8 },
];

// ─── Category Hierarchy ────────────────────────────────────────────────────────

const CATEGORY_HIERARCHY: Record<string, { parent: string | null; label: string; domain: string }> = {
  programming_languages: { parent: null, label: "Programming Languages", domain: "engineering" },
  frontend_frameworks: { parent: "frontend_development", label: "Frontend Frameworks", domain: "engineering" },
  frontend_fundamentals: { parent: "frontend_development", label: "Frontend Fundamentals", domain: "engineering" },
  frontend_styling: { parent: "frontend_development", label: "Frontend Styling", domain: "engineering" },
  frontend_development: { parent: null, label: "Frontend Development", domain: "engineering" },
  mobile_frameworks: { parent: "mobile_development", label: "Mobile Frameworks", domain: "engineering" },
  mobile_development: { parent: null, label: "Mobile Development", domain: "engineering" },
  backend_frameworks: { parent: "backend_development", label: "Backend Frameworks", domain: "engineering" },
  backend_development: { parent: null, label: "Backend Development", domain: "engineering" },
  api_technologies: { parent: "backend_development", label: "API Technologies", domain: "engineering" },
  architecture_patterns: { parent: "backend_development", label: "Architecture", domain: "engineering" },
  relational_databases: { parent: "databases", label: "Relational Databases", domain: "data" },
  nosql_databases: { parent: "databases", label: "NoSQL Databases", domain: "data" },
  data_warehouses: { parent: "databases", label: "Data Warehouses", domain: "data" },
  databases: { parent: null, label: "Databases", domain: "data" },
  cloud_providers: { parent: "cloud_infrastructure", label: "Cloud Providers", domain: "infrastructure" },
  cloud_infrastructure: { parent: null, label: "Cloud & Infrastructure", domain: "infrastructure" },
  containerization: { parent: "devops_tools", label: "Containerization", domain: "infrastructure" },
  container_orchestration: { parent: "devops_tools", label: "Container Orchestration", domain: "infrastructure" },
  iac_tools: { parent: "devops_tools", label: "Infrastructure as Code", domain: "infrastructure" },
  ci_tools: { parent: "devops_tools", label: "CI/CD Tools", domain: "infrastructure" },
  devops_tools: { parent: null, label: "DevOps Tools", domain: "infrastructure" },
  devops_practices: { parent: null, label: "DevOps Practices", domain: "infrastructure" },
  operating_systems: { parent: null, label: "Operating Systems", domain: "infrastructure" },
  ai_ml: { parent: null, label: "AI / Machine Learning", domain: "data_science" },
  ml_frameworks: { parent: "ai_ml", label: "ML Frameworks", domain: "data_science" },
  data_tools: { parent: "data_engineering", label: "Data Tools", domain: "data_science" },
  big_data: { parent: "data_engineering", label: "Big Data", domain: "data_science" },
  streaming: { parent: "data_engineering", label: "Stream Processing", domain: "data" },
  orchestration: { parent: "data_engineering", label: "Orchestration", domain: "data" },
  data_engineering: { parent: null, label: "Data Engineering", domain: "data_science" },
  testing_frameworks: { parent: "testing", label: "Testing Frameworks", domain: "engineering" },
  e2e_testing: { parent: "testing", label: "E2E Testing", domain: "engineering" },
  testing_practices: { parent: "testing", label: "Testing Practices", domain: "engineering" },
  testing: { parent: null, label: "Testing & QA", domain: "engineering" },
  methodologies: { parent: null, label: "Methodologies", domain: "management" },
  management_skills: { parent: null, label: "Management", domain: "management" },
  design_tools: { parent: "design", label: "Design Tools", domain: "design" },
  design_disciplines: { parent: "design", label: "Design Disciplines", domain: "design" },
  design: { parent: null, label: "Design", domain: "design" },
  bi_tools: { parent: "analytics", label: "BI Tools", domain: "analytics" },
  analytics_skills: { parent: "analytics", label: "Analytics Skills", domain: "analytics" },
  analytics: { parent: null, label: "Analytics", domain: "analytics" },
  soft_skills: { parent: null, label: "Soft Skills", domain: "management" },
  healthcare_systems: { parent: "healthcare", label: "Healthcare Systems", domain: "healthcare" },
  healthcare_certs: { parent: "healthcare", label: "Healthcare Certifications", domain: "healthcare" },
  healthcare_skills: { parent: "healthcare", label: "Healthcare Skills", domain: "healthcare" },
  healthcare: { parent: null, label: "Healthcare", domain: "healthcare" },
  finance_skills: { parent: "finance", label: "Finance Skills", domain: "finance" },
  finance_tools: { parent: "finance", label: "Finance Tools", domain: "finance" },
  finance_certs: { parent: "finance", label: "Finance Certifications", domain: "finance" },
  finance: { parent: null, label: "Finance", domain: "finance" },
};

// ─── Lookup Indexes ────────────────────────────────────────────────────────────

const SKILL_BY_ID = new Map<string, SkillNode>();
const SKILL_BY_ALIAS = new Map<string, SkillNode>();

for (const skill of TAXONOMY) {
  SKILL_BY_ID.set(skill.id, skill);
  SKILL_BY_ALIAS.set(skill.name.toLowerCase(), skill);
  for (const alias of skill.aliases) {
    SKILL_BY_ALIAS.set(alias.toLowerCase(), skill);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function resolveSkill(rawSkill: string): SkillNode | null {
  const normalized = rawSkill.toLowerCase().trim();
  return SKILL_BY_ALIAS.get(normalized) || null;
}

export function getSkillCategory(skillId: string): string | null {
  const skill = SKILL_BY_ID.get(skillId);
  return skill?.parent || null;
}

export function getSkillDomain(skillId: string): string | null {
  const skill = SKILL_BY_ID.get(skillId);
  return skill?.domain || null;
}

export function areSkillsRelated(skillA: string, skillB: string): { related: boolean; similarity: number; reason: string } {
  const nodeA = resolveSkill(skillA);
  const nodeB = resolveSkill(skillB);

  if (!nodeA || !nodeB) return { related: false, similarity: 0, reason: "one or both skills not in taxonomy" };

  // Same skill (exact or alias match)
  if (nodeA.id === nodeB.id) return { related: true, similarity: 1.0, reason: "exact match" };

  // Same parent category
  if (nodeA.parent && nodeA.parent === nodeB.parent) {
    return { related: true, similarity: 0.7, reason: `same subcategory: ${nodeA.parent}` };
  }

  // Same domain
  if (nodeA.domain === nodeB.domain) {
    // Check if they share a grandparent
    const parentA = nodeA.parent ? CATEGORY_HIERARCHY[nodeA.parent] : null;
    const parentB = nodeB.parent ? CATEGORY_HIERARCHY[nodeB.parent] : null;
    if (parentA?.parent && parentA.parent === parentB?.parent) {
      return { related: true, similarity: 0.5, reason: `same top-category: ${parentA.parent}` };
    }
    return { related: true, similarity: 0.3, reason: `same domain: ${nodeA.domain}` };
  }

  return { related: false, similarity: 0.1, reason: "different domains" };
}

export function findRelatedSkills(skillInput: string, threshold = 0.3): { skill: SkillNode; similarity: number }[] {
  const results: { skill: SkillNode; similarity: number }[] = [];
  const source = resolveSkill(skillInput);
  if (!source) return results;

  for (const target of TAXONOMY) {
    if (target.id === source.id) continue;
    const { related, similarity } = areSkillsRelated(skillInput, target.name);
    if (related && similarity >= threshold) {
      results.push({ skill: target, similarity });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

export function normalizeSkillList(rawSkills: string[]): { resolved: SkillNode[]; unresolved: string[] } {
  const resolved: SkillNode[] = [];
  const unresolved: string[] = [];
  const seen = new Set<string>();

  for (const raw of rawSkills) {
    const node = resolveSkill(raw);
    if (node && !seen.has(node.id)) {
      seen.add(node.id);
      resolved.push(node);
    } else if (!node) {
      unresolved.push(raw);
    }
  }

  return { resolved, unresolved };
}

export function computeTaxonomyMatchScore(
  resumeSkills: string[],
  jdRequiredSkills: string[],
  jdPreferredSkills: string[]
): {
  score: number;
  exactMatches: string[];
  relatedMatches: { jdSkill: string; resumeSkill: string; similarity: number }[];
  totalMissing: string[];
  domainCoverage: Record<string, number>;
} {
  const resumeNormalized = normalizeSkillList(resumeSkills);
  const resumeIds = new Set(resumeNormalized.resolved.map((s) => s.id));
  const resumeRaw = new Set(resumeSkills.map((s) => s.toLowerCase()));

  const exactMatches: string[] = [];
  const relatedMatches: { jdSkill: string; resumeSkill: string; similarity: number }[] = [];
  const totalMissing: string[] = [];

  const allJdSkills = [
    ...jdRequiredSkills.map((s) => ({ skill: s, weight: 1.0 })),
    ...jdPreferredSkills.map((s) => ({ skill: s, weight: 0.5 })),
  ];

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const { skill: jdSkill, weight } of allJdSkills) {
    totalWeight += weight;
    const jdNode = resolveSkill(jdSkill);

    if (jdNode && resumeIds.has(jdNode.id)) {
      exactMatches.push(jdSkill);
      earnedWeight += weight;
      continue;
    }

    if (resumeRaw.has(jdSkill.toLowerCase())) {
      exactMatches.push(jdSkill);
      earnedWeight += weight;
      continue;
    }

    // Check related skills
    let bestRelated = 0;
    let bestResumeSkill = "";
    if (jdNode) {
      for (const rNode of resumeNormalized.resolved) {
        const { similarity } = areSkillsRelated(jdSkill, rNode.name);
        if (similarity > bestRelated) {
          bestRelated = similarity;
          bestResumeSkill = rNode.name;
        }
      }
    }

    if (bestRelated >= 0.5) {
      relatedMatches.push({ jdSkill, resumeSkill: bestResumeSkill, similarity: bestRelated });
      earnedWeight += weight * bestRelated;
    } else {
      totalMissing.push(jdSkill);
    }
  }

  // Domain coverage
  const domainCoverage: Record<string, number> = {};
  for (const rNode of resumeNormalized.resolved) {
    domainCoverage[rNode.domain] = (domainCoverage[rNode.domain] || 0) + 1;
  }

  const score = totalWeight > 0 ? Math.min(1, earnedWeight / totalWeight) : 0;
  return { score, exactMatches, relatedMatches, totalMissing, domainCoverage };
}

// ─── Alias Expansion (for semantic + text matching) ────────────────────────────

let _aliasTokenMap: Map<string, string> | null = null;

function getAliasTokenMap(): Map<string, string> {
  if (_aliasTokenMap) return _aliasTokenMap;

  _aliasTokenMap = new Map();
  for (const skill of TAXONOMY) {
    const canonical = skill.name.toLowerCase().replace(/[^a-z0-9+#./-]/g, "");
    const register = (alias: string) => {
      const key = alias.toLowerCase().replace(/[^a-z0-9+#./-]/g, "");
      if (key.length < 2) return;
      _aliasTokenMap!.set(key, canonical || skill.name.toLowerCase());
    };
    register(skill.name);
    register(skill.id.replace(/_/g, ""));
    for (const alias of skill.aliases) register(alias);
  }
  return _aliasTokenMap;
}

/** Expand skill abbreviations in free text (JS → javascript, k8s → kubernetes). */
export function expandSkillAliases(text: string): string {
  if (!text) return text;
  const aliasMap = getAliasTokenMap();

  return text.replace(/[a-zA-Z0-9+#./-]+/g, (token) => {
    const expanded = aliasMap.get(token.toLowerCase());
    return expanded || token;
  });
}

/** Infer dominant professional domain from text + skill list. */
export function inferDominantDomain(text: string, skills: string[]): string | null {
  const scores: Record<string, number> = {};

  const PROFESSION_KEYWORDS: Record<string, RegExp[]> = {
    engineering: [
      /\bsoftware\b/i, /\bdeveloper\b/i, /\bengineer\b/i, /\bprogramming\b/i,
      /\bfrontend\b/i, /\bbackend\b/i, /\bfull[\s-]?stack\b/i, /\bweb\s*dev/i,
    ],
    infrastructure: [/\bdevops\b/i, /\bsre\b/i, /\bplatform\b/i, /\bcloud\b/i, /\bkubernetes\b/i, /\bk8s\b/i],
    culinary: [
      /\bchef\b/i, /\bkitchen\b/i, /\bculinary\b/i, /\bcuisine\b/i,
      /\brestaurant\b/i, /\bmenu\b/i, /\bhaccp\b/i, /\bsous\b/i, /\bcook\b/i,
    ],
    healthcare: [/\bnurse\b/i, /\bclinical\b/i, /\bpatient\b/i, /\bhospital\b/i, /\bmedical\b/i],
    finance: [/\bfinancial\b/i, /\baccounting\b/i, /\binvestment\b/i, /\baudit\b/i, /\bcpa\b/i],
    design: [/\bux\b/i, /\bui\b/i, /\bfigma\b/i, /\bgraphic\s*design/i, /\bproduct\s*design/i],
  };

  const combined = expandSkillAliases(text);
  for (const [domain, patterns] of Object.entries(PROFESSION_KEYWORDS)) {
    for (const p of patterns) {
      if (p.test(combined)) scores[domain] = (scores[domain] || 0) + 1;
    }
  }

  const normalized = normalizeSkillList(skills);
  for (const node of normalized.resolved) {
    scores[node.domain] = (scores[node.domain] || 0) + 2;
  }

  let top: string | null = null;
  let max = 0;
  for (const [domain, score] of Object.entries(scores)) {
    if (score > max) {
      max = score;
      top = domain;
    }
  }
  return max >= 2 ? top : null;
}

export { TAXONOMY, CATEGORY_HIERARCHY };
