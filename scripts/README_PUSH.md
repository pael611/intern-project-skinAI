Push-to-GitHub CLI (PowerShell)

Quick usage

- From the project root open PowerShell and run:

```powershell
# interactive (will prompt for remote)
.\scripts\push-to-github.ps1

# provide remote and force .gitignore updates
.\scripts\push-to-github.ps1 -RemoteUrl "https://github.com/USERNAME/REPO.git" -Force

# set branch and commit message
.\scripts\push-to-github.ps1 -RemoteUrl "git@github.com:USER/REPO.git" -Branch main -CommitMessage "Initial commit" -Force
```

What the script does
- Verifies `git` is installed.
- Ensures `.gitignore` contains `node_modules/`, `.env`, `.env.local` (appends when allowed).
- Initializes a git repo if none exists.
- Adds remote `origin` (prompts if replacing an existing origin).
- Stages files, commits (if there are staged changes), and pushes to the specified branch.

Notes & security
- Do NOT include secrets in your git repo. Keep `.env` and `node_modules/` ignored.
- The script assumes you have authentication configured for GitHub (credential manager, SSH keys, or PAT in remote URL). Avoid embedding tokens in URLs in shared scripts.

If you want, I can also:
- Add a cross-platform Node.js CLI version that can create a GitHub repo via the API (requires a token).
- Run a quick sanity check on your existing `.gitignore` and show missing entries.
