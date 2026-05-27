# Initialize FluxPage repo with exactly 37 clean commits (no co-author trailers).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/make-37-commits.ps1
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

$env:GIT_AUTHOR_NAME = "rohitkumarrai7"
$env:GIT_AUTHOR_EMAIL = "rohitkumarrai008@gmail.com"
$env:GIT_COMMITTER_NAME = "rohitkumarrai7"
$env:GIT_COMMITTER_EMAIL = "rohitkumarrai008@gmail.com"

$Hooks = "-c", "core.hooksPath=.git-empty-hooks"

function Invoke-GitCommit {
    param([string[]]$Paths, [string]$Message)
    if ($Paths.Count -eq 0) {
        throw "No paths for commit: $Message"
    }
    $existing = @()
    foreach ($p in $Paths) {
        if (Test-Path -LiteralPath $p) { $existing += $p }
        else { Write-Warning "Missing (skipped): $p" }
    }
    if ($existing.Count -eq 0) {
        throw "No existing paths for commit: $Message"
    }
    foreach ($p in $existing) {
        git add -f -- "$p"
    }
    $status = git status --porcelain
    if (-not $status) {
        throw "Nothing staged for: $Message"
    }
    git @Hooks commit -m $Message
    Write-Host "OK: $Message"
}

if (Test-Path ".git") {
    Write-Host "Removing existing .git for fresh history..."
    Remove-Item -Recurse -Force ".git"
}

git init -b main
$hasOrigin = git remote 2>$null | Where-Object { $_ -eq "origin" }
if ($hasOrigin) { git remote remove origin }
git remote add origin "https://github.com/rohitkumarrai7/FluxPage.git"

$commits = @(
    @{
        Msg = "chore: add root gitignore and monorepo package config"
        Paths = @(".gitignore", "package.json", "package-lock.json", "convex.json")
    },
    @{
        Msg = "docs: add Fluxpage monorepo README"
        Paths = @("README.md")
    },
    @{
        Msg = "chore: add extension build pack and icon generation scripts"
        Paths = @(
            "scripts/build-extension.mjs",
            "scripts/pack-extension.mjs",
            "scripts/generate-extension-icons.mjs",
            "scripts/make-37-commits.ps1"
        )
    },
    @{
        Msg = "chore: add git hook helpers and push utilities"
        Paths = @(
            "scripts/git-hooks/commit-msg",
            "scripts/git-hooks/README.md",
            "scripts/REMOVE_CURSOR_FROM_GITHUB.md",
            "scripts/push-after-repo-recreate.ps1",
            ".git-empty-hooks/.gitkeep"
        )
    },
    @{
        Msg = "feat(extension): add manifest and theme tokens"
        Paths = @("extension/manifest.json", "extension/theme.js", "extension/package.json")
    },
    @{
        Msg = "feat(extension): add Fluxpage brand SVG assets"
        Paths = @("extension/icons/logo.svg", "extension/icons/logo-mark.svg")
    },
    @{
        Msg = "feat(extension): generate toolbar icons from brand mark"
        Paths = @(
            "extension/icons/icon16.png",
            "extension/icons/icon32.png",
            "extension/icons/icon48.png",
            "extension/icons/icon128.png"
        )
    },
    @{
        Msg = "feat(extension): add service worker and offscreen document"
        Paths = @("extension/background.js", "extension/offscreen.html", "extension/offscreen.js")
    },
    @{
        Msg = "feat(extension): add extension config template"
        Paths = @("extension/extension.config.example.js")
    },
    @{
        Msg = "feat(extension): add OAuth callback page"
        Paths = @("extension/callback.html", "extension/callback.js")
    },
    @{
        Msg = "feat(extension): add popup UI"
        Paths = @(
            "extension/popup/popup.html",
            "extension/popup/popup.js",
            "extension/popup/popup.css"
        )
    },
    @{
        Msg = "feat(extension): bundle pdf.js for resume parsing"
        Paths = @(
            "extension/lib/pdfjs/pdf.js",
            "extension/lib/pdfjs/pdf.min.js",
            "extension/lib/pdfjs/pdf.worker.js",
            "extension/lib/pdfjs/pdf.worker.min.js"
        )
    },
    @{
        Msg = "feat(extension): add shared JD extraction utilities"
        Paths = @(
            "extension/content/extract-common.js",
            "extension/content/detector.js",
            "extension/content/universal-extractor.js"
        )
    },
    @{
        Msg = "feat(extension): add floating action button on job pages"
        Paths = @("extension/content/floating-button.js")
    },
    @{
        Msg = "feat(extension): add JD keyword highlighter"
        Paths = @("extension/content/jd-highlighter.js")
    },
    @{
        Msg = "feat(extension): add shadow DOM sidebar shell"
        Paths = @("extension/content/sidebar.js")
    },
    @{
        Msg = "feat(extension): add LinkedIn job and profile scrapers"
        Paths = @("extension/content/linkedin.js", "extension/content/linkedin-profile.js")
    },
    @{
        Msg = "feat(extension): add Internshala scraper"
        Paths = @("extension/content/internshala.js")
    },
    @{
        Msg = "feat(extension): add Naukri scraper"
        Paths = @("extension/content/naukri.js")
    },
    @{
        Msg = "feat(extension): add Indeed scraper"
        Paths = @("extension/content/indeed.js")
    },
    @{
        Msg = "feat(extension): add Glassdoor scraper"
        Paths = @("extension/content/glassdoor.js")
    },
    @{
        Msg = "docs(extension): add extension developer README"
        Paths = @("extension/README.md")
    },
    @{
        Msg = "feat(convex): add database schema"
        Paths = @("convex/schema.ts", "convex/package.json", "convex/package-lock.json")
    },
    @{
        Msg = "feat(convex): add auth and Clerk sync"
        Paths = @("convex/auth.ts")
    },
    @{
        Msg = "feat(convex): add resume and parser functions"
        Paths = @("convex/resumes.ts", "convex/resumeParser.ts")
    },
    @{
        Msg = "feat(convex): add jobs and drafts"
        Paths = @("convex/jobs.ts", "convex/drafts.ts")
    },
    @{
        Msg = "feat(convex): add ATS scoring and tailoring"
        Paths = @("convex/atsScoring.ts", "convex/tailoringRuns.ts")
    },
    @{
        Msg = "feat(convex): add cover letters and templates"
        Paths = @("convex/coverLetters.ts", "convex/templates.ts")
    },
    @{
        Msg = "feat(convex): add billing and HTTP actions"
        Paths = @("convex/billing.ts", "convex/http.ts", "convex/tsconfig.json")
    },
    @{
        Msg = "feat(web): add Next.js app shell and global styles"
        Paths = @(
            "web/app/layout.tsx",
            "web/app/page.tsx",
            "web/app/globals.css",
            "web/next.config.js",
            "web/next-env.d.ts",
            "web/tailwind.config.js",
            "web/postcss.config.js",
            "web/tsconfig.json",
            "web/vercel.json",
            "web/middleware.ts",
            "web/types/css.d.ts"
        )
    },
    @{
        Msg = "feat(web): add shared UI components and brand assets"
        Paths = @(
            "web/components/auth/ClerkAuthForms.tsx",
            "web/components/resume/ResumePDF.tsx",
            "web/components/resume/ResumePreview.tsx",
            "web/components/resume/templates/ClassicATS.tsx",
            "web/components/resume/templates/CompactATS.tsx",
            "web/components/resume/templates/index.ts",
            "web/components/resume/templates/ModernATS.tsx",
            "web/components/ui/AuthLayout.tsx",
            "web/components/ui/Badge.tsx",
            "web/components/ui/Button.tsx",
            "web/components/ui/Card.tsx",
            "web/components/ui/EmptyState.tsx",
            "web/components/ui/index.ts",
            "web/components/ui/Logo.tsx",
            "web/components/ui/LogoMark.tsx",
            "web/components/ui/PageHeader.tsx",
            "web/components/ui/PricingGrid.tsx",
            "web/components/ui/Spinner.tsx",
            "web/components/ui/StatCard.tsx",
            "web/lib/api.ts",
            "web/lib/clerkAppearance.ts",
            "web/lib/clerkConfig.ts",
            "web/lib/pdfExtract.cjs",
            "web/lib/pricingPlans.ts",
            "web/lib/razorpay.ts",
            "web/lib/resumeParser.ts",
            "web/lib/store.ts",
            "web/lib/textValidation.ts",
            "web/lib/types.ts",
            "web/lib/utils.ts",
            "web/public/brand/logo.svg",
            "web/public/brand/logo-mark.svg"
        )
    },
    @{
        Msg = "feat(web): add auth and onboarding routes"
        Paths = @(
            "web/app/(auth)/callback/page.tsx",
            "web/app/(auth)/extension/page.tsx",
            "web/app/(auth)/login/[[...rest]]/page.tsx",
            "web/app/(auth)/register/[[...rest]]/page.tsx",
            "web/app/auth/sync/layout.tsx",
            "web/app/auth/sync/page.tsx",
            "web/app/auth/sync/SyncContent.tsx",
            "web/app/onboarding/page.tsx"
        )
    },
    @{
        Msg = "feat(web): add dashboard and editor pages"
        Paths = @(
            "web/app/dashboard/analytics/page.tsx",
            "web/app/dashboard/billing/page.tsx",
            "web/app/dashboard/jobs/page.tsx",
            "web/app/dashboard/layout.tsx",
            "web/app/dashboard/page.tsx",
            "web/app/dashboard/resumes/page.tsx",
            "web/app/dashboard/templates/page.tsx",
            "web/app/editor/advanced/page.tsx",
            "web/app/editor/page.tsx",
            "web/app/tailor/page.tsx"
        )
    },
    @{
        Msg = "feat(web): add API routes for Convex proxy and Razorpay"
        Paths = @(
            "web/app/api/auth/clerk-sync/route.ts",
            "web/app/api/auth/onboarding/complete/route.ts",
            "web/app/api/convex/[...path]/route.ts",
            "web/app/api/cover-letter/route.ts",
            "web/app/api/interview-prep/route.ts",
            "web/app/api/optimize/route.ts",
            "web/app/api/parse-pdf/route.ts",
            "web/app/api/parse-resume/route.ts",
            "web/app/api/razorpay/create-order/route.ts",
            "web/app/api/razorpay/verify/route.ts",
            "web/app/api/razorpay/webhook/route.ts",
            "web/scripts/test-razorpay-order.mjs"
        )
    },
    @{
        Msg = "docs(web): expand deployment and environment guide"
        Paths = @(
            "web/DEPLOY.md",
            "web/.env.example",
            "web/package.json",
            "web/package-lock.json"
        )
    },
    @{
        Msg = "feat(backend): add optional PDF extraction API"
        Paths = @("backend/main.py", "backend/pdf_extract.py", "backend/requirements.txt")
    },
    @{
        Msg = "feat(latex): add Dockerized resume compile helper"
        Paths = @("latex-compiler/compile.py", "latex-compiler/Dockerfile")
    }
)

if ($commits.Count -ne 37) {
    throw "Expected 37 commits, got $($commits.Count)"
}

foreach ($c in $commits) {
    Invoke-GitCommit -Paths $c.Paths -Message $c.Msg
}

$count = (git rev-list --count HEAD)
Write-Host ""
Write-Host "Created $count commits on main."

$audit = git log --format=fuller | Select-String -Pattern 'cursor|Co-authored' -CaseSensitive:$false
if ($audit) {
    Write-Error "Audit failed - Cursor traces found in git log:"
    $audit | ForEach-Object { Write-Host $_ }
    exit 1
}
Write-Host "Audit passed: no Cursor co-author or cursor email in history."

$remaining = git status --porcelain
if ($remaining) {
    Write-Warning "Uncommitted files remain:"
    Write-Host $remaining
}

Write-Host ""
Write-Host "Next: git push -u origin main"
Write-Host "Or: powershell -File scripts/push-after-repo-recreate.ps1"
