# Git commit hygiene

Optional helpers to keep commit messages and GitHub contributor attribution clean.

## Optional commit-msg hook

Point Git at these hooks once per clone (only if you want automatic trailer stripping):

```bash
git config core.hooksPath scripts/git-hooks
chmod +x scripts/git-hooks/commit-msg   # macOS / Linux / Git Bash
```

The `commit-msg` hook removes `Co-authored-by: Cursor <cursoragent@cursor.com>` lines if they appear.

## Recommended: commit with empty hooks path

When creating commits from an IDE or agent, bypass all hooks and set author explicitly:

```bash
git -c core.hooksPath=.git-empty-hooks commit -m "your message"
```

Windows PowerShell:

```powershell
$env:GIT_AUTHOR_NAME = "rohitkumarrai7"
$env:GIT_AUTHOR_EMAIL = "rohitkumarrai008@gmail.com"
$env:GIT_COMMITTER_NAME = "rohitkumarrai7"
$env:GIT_COMMITTER_EMAIL = "rohitkumarrai008@gmail.com"
git -c core.hooksPath=.git-empty-hooks commit -m "your message"
```

## Bulk history script

[`../make-37-commits.ps1`](../make-37-commits.ps1) initializes the repo with 37 logical commits using the settings above.

## Verify before push

```powershell
git log --format=fuller | Select-String -Pattern 'cursor|Co-authored'
```

Output should be empty.
