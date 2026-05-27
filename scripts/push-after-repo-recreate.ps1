# Run AFTER you delete and recreate https://github.com/rohitkumarrai7/FluxPage (empty repo).
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$env:GIT_AUTHOR_NAME = "rohitkumarrai7"
$env:GIT_AUTHOR_EMAIL = "rohitkumarrai008@gmail.com"
$env:GIT_COMMITTER_NAME = "rohitkumarrai7"
$env:GIT_COMMITTER_EMAIL = "rohitkumarrai008@gmail.com"

git remote set-url origin "https://github.com/rohitkumarrai7/FluxPage.git"
git -c core.hooksPath=.git-empty-hooks push -u origin main

Write-Host "Done. Refresh https://github.com/rohitkumarrai7/FluxPage — Contributors should show only rohitkumarrai7."
