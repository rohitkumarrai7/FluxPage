/** 22 resume × JD test matrix for comprehensive ATS + optimization audit. */

export const COMPREHENSIVE_CASES = [
  {
    id: "swe-senior-platform",
    role: "SWE senior",
    positive: true,
    jobTitle: "Senior Software Engineer",
    resumeText: `John Doe
Senior Software Engineer | john@email.com | San Francisco, CA

SUMMARY
Full-stack engineer with 8 years building scalable web applications.

EXPERIENCE
Senior Software Engineer — TechCorp (2020 – Present)
• Led team of 6 engineers building microservices on AWS using Node.js, TypeScript, React
• Architected REST and GraphQL APIs serving 2M+ daily users
• Reduced deployment time 40% with CI/CD pipelines (GitHub Actions, Docker, Kubernetes)

Software Engineer — StartupXYZ (2017 – 2020)
• Built React/TypeScript front-end and Python FastAPI backend

SKILLS
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes, PostgreSQL, GraphQL, CI/CD

EDUCATION
B.S. Computer Science — Stanford University (2017)`,
    jobDescription: `Senior Software Engineer — Platform Team
Requirements: 5+ years software engineering, React, Node.js, TypeScript, AWS, Kubernetes, PostgreSQL, GraphQL, microservices, CI/CD.
Responsibilities: Design platform services, mentor engineers, own reliability and performance.`,
    expect: { minScore: 65, maxScore: 95, knockouts: true },
  },
  {
    id: "swe-senior-staff-overqualified",
    role: "SWE senior",
    positive: false,
    jobTitle: "Staff Software Engineer",
    resumeText: `John Doe
Senior Software Engineer | john@email.com

SUMMARY
Full-stack engineer with 8 years experience.

EXPERIENCE
Senior Software Engineer — TechCorp (2020 – Present)
• Led microservices on AWS with Node.js, React, Kubernetes

SKILLS
JavaScript, TypeScript, React, Node.js, AWS, Kubernetes, PostgreSQL

EDUCATION
B.S. Computer Science (2017)`,
    jobDescription: `Staff Software Engineer
Requirements: 10+ years, distributed systems at scale, led large initiatives, Java or Go, system design.
Must have led 50+ engineer platform teams.`,
    expect: { minScore: 0, maxScore: 65, knockouts: true },
  },
  {
    id: "swe-junior-react",
    role: "SWE junior",
    positive: true,
    jobTitle: "Junior Frontend Developer",
    resumeText: `Jane Smith
Recent Graduate | jane@email.com

SUMMARY
Motivated CS graduate passionate about React and modern web development.

PROJECTS
• Todo app with React, TypeScript, and Firebase
• Portfolio site with responsive CSS and Tailwind

EXPERIENCE
Frontend Intern — WebAgency (2024)
• Built UI components with React and JavaScript

SKILLS
JavaScript, HTML, CSS, React, TypeScript, Git

EDUCATION
B.S. Computer Science — State University (2024)`,
    jobDescription: `Junior Frontend Developer
Requirements: HTML, CSS, JavaScript, React, responsive design, Git, UI/UX basics.
Responsibilities: Build UI components, collaborate with designers.`,
    expect: { minScore: 40, maxScore: 80, knockouts: true },
  },
  {
    id: "swe-junior-staff-mismatch",
    role: "SWE junior",
    positive: false,
    jobTitle: "Staff Software Engineer",
    resumeText: `Jane Smith
Recent Graduate | jane@email.com

EDUCATION
B.S. Computer Science (2024)

PROJECTS
• Todo app with React and Firebase

SKILLS
JavaScript, HTML, CSS, Python basics`,
    jobDescription: `Staff Software Engineer — 10+ years, distributed systems, Kubernetes at scale, led engineering initiatives.`,
    expect: { minScore: 0, maxScore: 25, knockouts: false },
  },
  {
    id: "qa-naukri-selenium",
    role: "QA automation",
    positive: true,
    jobTitle: "Automation Test Engineer",
    resumeText: `Sourabh Prasad
QA Engineer | sourabh@email.com

SUMMARY
QA engineer with automation and API testing experience.

EXPERIENCE
QA Engineer — TechCorp (2021 – Present)
• Built automated test suites with Selenium and Python reducing regression time 40%
• API testing with Postman and REST validation

SKILLS
Python, Selenium, Jenkins, API testing, test automation

EDUCATION
B.Tech — NIT (2020)`,
    jobDescription: `Industry Type: Industrial Equipment
This position reports to: Manager
UI test automation, Selenium WebDriver, Python, API testing, CI/CD, Jenkins required.`,
    expect: { minScore: 45, maxScore: 85, knockouts: true },
  },
  {
    id: "qa-chef-wrong-domain",
    role: "QA automation",
    positive: false,
    jobTitle: "Automation Test Engineer",
    resumeText: `Robert Chef
Executive Chef | robert@email.com

EXPERIENCE
Head Chef — Fine Dining (2015 – Present)
• Menu development and kitchen management

SKILLS
French cuisine, HACCP, menu planning`,
    jobDescription: `Automation Test Engineer — Selenium, Python, test automation, API testing, CI/CD required.`,
    expect: { minScore: 5, maxScore: 40, knockouts: false },
  },
  {
    id: "devops-k8s-match",
    role: "DevOps",
    positive: true,
    jobTitle: "DevOps Engineer",
    resumeText: `Sam Ops
DevOps Engineer | sam@email.com

EXPERIENCE
DevOps Engineer — CloudCo (2019 – Present)
• Managed AWS infrastructure with Terraform and CloudFormation
• Built CI/CD pipelines in Jenkins and GitHub Actions
• Kubernetes cluster administration (EKS), Docker containerization

SKILLS
Terraform, Jenkins, Kubernetes, Docker, AWS, Linux, Bash, Python`,
    jobDescription: `DevOps Engineer — AWS, Kubernetes, Docker, Terraform, Jenkins, CI/CD, Linux, monitoring with Prometheus.`,
    expect: { minScore: 40, maxScore: 80, knockouts: true },
  },
  {
    id: "devops-frontend-only-jd",
    role: "DevOps",
    positive: false,
    jobTitle: "Frontend Developer",
    resumeText: `Sam Ops
DevOps Engineer | sam@email.com

EXPERIENCE
DevOps Engineer — CloudCo (2019 – Present)
• Kubernetes, Terraform, AWS, Jenkins

SKILLS
Terraform, Kubernetes, Docker, AWS`,
    jobDescription: `Frontend Developer — React, Vue, CSS, Figma, UI/UX, responsive design. No infrastructure role.`,
    expect: { minScore: 10, maxScore: 50, knockouts: false },
  },
  {
    id: "data-analyst-bi",
    role: "Data analyst",
    positive: true,
    jobTitle: "Business Intelligence Analyst",
    resumeText: `Priya Sharma
Data Analyst | priya@email.com

SUMMARY
Analyst with 4 years in reporting and dashboard development.

EXPERIENCE
Data Analyst — RetailCo (2020 – Present)
• Built Tableau dashboards tracking sales KPIs across 200 stores
• SQL queries and Excel models for monthly forecasting

SKILLS
SQL, Excel, Tableau, Power BI, data visualization, Python`,
    jobDescription: `BI Analyst — SQL, Tableau, Power BI, Excel, data visualization, KPI reporting, business intelligence.`,
    expect: { minScore: 45, maxScore: 85, knockouts: true },
  },
  {
    id: "data-analyst-ml-gap",
    role: "Data analyst",
    positive: false,
    jobTitle: "Machine Learning Engineer",
    resumeText: `Priya Sharma
Data Analyst | priya@email.com

EXPERIENCE
Data Analyst — RetailCo (2020 – Present)
• Tableau dashboards and SQL reporting

SKILLS
SQL, Excel, Tableau, Power BI`,
    jobDescription: `ML Engineer — TensorFlow, PyTorch, deep learning, NLP, computer vision, MLOps, Kubernetes.`,
    expect: { minScore: 5, maxScore: 45, knockouts: false },
  },
  {
    id: "rn-icu-match",
    role: "Healthcare RN",
    positive: true,
    jobTitle: "Registered Nurse",
    resumeText: `Maria Garcia RN
Registered Nurse | maria@email.com

SUMMARY
Compassionate RN with 4 years ICU and medical-surgical experience.

EXPERIENCE
Registered Nurse — City Hospital (2020 – Present)
• Managed patient care for 12-bed ICU unit
• Clinical documentation in Epic EMR system
• Administered medications per physician orders

CERTIFICATIONS
BLS, ACLS Certified

SKILLS
Patient care, vital signs, medication administration, ICU`,
    jobDescription: `Registered Nurse — patient care, ICU experience, EMR/EHR, BLS, ACLS, clinical documentation, HIPAA compliance.`,
    expect: { minScore: 40, maxScore: 80, knockouts: true },
  },
  {
    id: "rn-swe-knockout",
    role: "Healthcare RN",
    positive: false,
    jobTitle: "Software Engineer",
    resumeText: `Maria Garcia RN
Registered Nurse | maria@email.com

EXPERIENCE
RN — City Hospital (2020 – Present)
• Patient care in ICU

SKILLS
Patient care, EMR, BLS, ACLS`,
    jobDescription: `Software Engineer — React, Node.js, TypeScript, AWS, Kubernetes, microservices.`,
    expect: { minScore: 5, maxScore: 40, knockouts: false },
  },
  {
    id: "lawyer-litigation",
    role: "Corporate lawyer",
    positive: true,
    jobTitle: "Corporate Attorney",
    resumeText: `David Chen Esq.
Corporate Attorney | david@email.com

EXPERIENCE
Associate Attorney — LawFirm LLP (2018 – Present)
• Litigation and contract drafting for Fortune 500 clients
• Legal research and regulatory compliance reviews

SKILLS
Litigation, legal research, contract drafting, compliance, regulatory`,
    jobDescription: `Corporate Attorney — litigation, legal research, contract drafting, compliance, regulatory matters, M&A support.`,
    expect: { minScore: 35, maxScore: 75, knockouts: true },
  },
  {
    id: "lawyer-marketing-mismatch",
    role: "Corporate lawyer",
    positive: false,
    jobTitle: "Digital Marketing Manager",
    resumeText: `David Chen Esq.
Corporate Attorney | david@email.com

EXPERIENCE
Associate Attorney — LawFirm LLP (2018 – Present)
• Litigation and contract drafting

SKILLS
Litigation, legal research, compliance`,
    jobDescription: `Digital Marketing Manager — SEO, SEM, Google Analytics, social media marketing, content strategy.`,
    expect: { minScore: 5, maxScore: 40, knockouts: false },
  },
  {
    id: "marketing-intern-messy-jd",
    role: "Marketing intern",
    positive: true,
    jobTitle: "Marketing Intern",
    resumeText: `Kunal Chetia
BBA Graduate | kunal@email.com

SUMMARY
BBA graduate with marketing internship experience.

EXPERIENCE
Marketing Intern — AGCL (2024)
• Supported outreach and reporting tasks

SKILLS
MS Excel, MS Word, communication

EDUCATION
BBA — Delhi University (2024)`,
    jobDescription: `Share your updated CV on WhatsApp: +91 75328 61324
Stipend: ₹15,000
Social media marketing, digital marketing, lead generation, content creation, MS Excel reporting.`,
    expect: { minScore: 25, maxScore: 65, knockouts: true },
  },
  {
    id: "marketing-intern-clean",
    role: "Marketing intern",
    positive: true,
    jobTitle: "Marketing Intern",
    resumeText: `Kunal Chetia
BBA Graduate | kunal@email.com

SUMMARY
Marketing student with internship experience in digital campaigns.

EXPERIENCE
Marketing Intern — AGCL (2024)
• Assisted social media content and lead generation campaigns

SKILLS
MS Excel, MS Word, social media, content creation`,
    jobDescription: `Marketing Intern — social media marketing, digital marketing, lead generation, content creation, MS Excel reporting.`,
    expect: { minScore: 25, maxScore: 75, knockouts: true },
  },
  {
    id: "ux-product-design",
    role: "UX designer",
    positive: true,
    jobTitle: "Product Designer",
    resumeText: `Lisa Park
UX Designer | lisa@email.com

SUMMARY
Product designer with 3 years creating user-centered digital experiences.

EXPERIENCE
UX Designer — DesignStudio (2021 – Present)
• Conducted user research and wireframing for mobile app redesign
• Created high-fidelity prototypes in Figma

SKILLS
User research, wireframing, prototyping, Figma, UI design, UX design`,
    jobDescription: `Product Designer — user research, wireframing, prototyping, Figma, UI/UX design, design systems.`,
    expect: { minScore: 40, maxScore: 80, knockouts: true },
  },
  {
    id: "ux-backend-mismatch",
    role: "UX designer",
    positive: false,
    jobTitle: "Backend Engineer",
    resumeText: `Lisa Park
UX Designer | lisa@email.com

EXPERIENCE
UX Designer — DesignStudio (2021 – Present)
• User research and Figma prototypes

SKILLS
Figma, wireframing, user research`,
    jobDescription: `Backend Engineer — Java, Spring Boot, microservices, PostgreSQL, Redis, Kafka, system design.`,
    expect: { minScore: 5, maxScore: 40, knockouts: false },
  },
  {
    id: "hr-ta-match",
    role: "HR recruiter",
    positive: true,
    jobTitle: "Talent Acquisition Specialist",
    resumeText: `Amy Wilson
HR Professional | amy@email.com

EXPERIENCE
Recruiter — HireCo (2019 – Present)
• Talent acquisition and full-cycle recruiting for tech roles
• Onboarding programs and Workday ATS administration

SKILLS
Talent acquisition, onboarding, recruiting, stakeholder management, Workday`,
    jobDescription: `Talent Acquisition Specialist — recruiting, talent acquisition, onboarding, Workday, payroll coordination, HRIS.`,
    expect: { minScore: 35, maxScore: 75, knockouts: true },
  },
  {
    id: "hr-engineering-jd",
    role: "HR recruiter",
    positive: false,
    jobTitle: "Software Engineer",
    resumeText: `Amy Wilson
HR Professional | amy@email.com

EXPERIENCE
Recruiter — HireCo (2019 – Present)
• Talent acquisition and onboarding

SKILLS
Recruiting, Workday, onboarding`,
    jobDescription: `Software Engineer — React, Node.js, TypeScript, AWS, distributed systems, Kubernetes.`,
    expect: { minScore: 5, maxScore: 40, knockouts: false },
  },
  {
    id: "finance-equity-research",
    role: "Finance analyst",
    positive: true,
    jobTitle: "Equity Research Analyst",
    resumeText: `Raj Patel CFA
Financial Analyst | raj@email.com

EXPERIENCE
Equity Research Analyst — InvestBank (2018 – Present)
• Financial modeling and valuation for coverage universe
• Bloomberg terminal analysis and earnings forecasts

SKILLS
Equity research, financial modeling, valuation, Bloomberg, Excel, DCF`,
    jobDescription: `Equity Research Analyst — financial modeling, valuation, equity research, Bloomberg, DCF, financial analysis, CFA preferred.`,
    expect: { minScore: 40, maxScore: 80, knockouts: true },
  },
  {
    id: "finance-chef-negative",
    role: "Finance analyst",
    positive: false,
    jobTitle: "Executive Chef",
    resumeText: `Raj Patel CFA
Financial Analyst | raj@email.com

EXPERIENCE
Equity Research Analyst — InvestBank (2018 – Present)
• Financial modeling and valuation

SKILLS
Financial modeling, Bloomberg, valuation`,
    jobDescription: `Executive Chef — menu planning, kitchen management, French cuisine, HACCP, culinary awards.`,
    expect: { minScore: 5, maxScore: 35, knockouts: false },
  },
];

export const PRODUCTION_SMOKE_IDS = [
  "swe-senior-platform",
  "qa-naukri-selenium",
  "rn-icu-match",
  "marketing-intern-clean",
  "finance-equity-research",
];
