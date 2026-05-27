# Remove unwanted contributors from GitHub (only if repo already has bad history)

> **Note:** Only needed if FluxPage was previously pushed with `Co-authored-by: Cursor` trailers or `cursoragent@cursor.com` as author. A fresh empty repo does not need this.

GitHub **keeps old commits forever** on the server, even after force-push.  
Commits with `Co-authored-by: Cursor` can make **cursoragent** appear in the Contributors sidebar.

**Fix:** delete the repo, create it again, push clean history (e.g. run `make-37-commits.ps1` then `push-after-repo-recreate.ps1`).

## Steps (about 2 minutes)

### 1. Delete the old repository

1. Open: https://github.com/rohitkumarrai7/FluxPage/settings
2. Scroll to **Danger Zone** → **Delete this repository**
3. Type `rohitkumarrai7/FluxPage` to confirm → delete

### 2. Create a new empty repository

1. https://github.com/new
2. Name: **FluxPage**
3. Owner: **rohitkumarrai7**
4. **Do not** add README, .gitignore, or license (empty repo)
5. Create repository

### 3. Push clean code from your PC

In PowerShell:

```powershell
cd E:\hackathon\resumod-ats-extension

$env:GIT_AUTHOR_NAME = "rohitkumarrai7"
$env:GIT_AUTHOR_EMAIL = "rohitkumarrai008@gmail.com"
$env:GIT_COMMITTER_NAME = "rohitkumarrai7"
$env:GIT_COMMITTER_EMAIL = "rohitkumarrai008@gmail.com"

git remote set-url origin https://github.com/rohitkumarrai7/FluxPage.git
git push -u origin main
```

### 4. Reconnect Vercel

In Vercel → Project → Settings → Git → reconnect **FluxPage** (repo was recreated).

## Result

- **Contributors:** only **rohitkumarrai7**
- **No** cursoragent, no Co-authored-by in history
- All your code is still in the single commit on `main`
