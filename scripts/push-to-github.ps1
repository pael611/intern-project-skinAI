<#
Push-To-GitHub PowerShell helper
Usage examples:
  .\scripts\push-to-github.ps1 -RemoteUrl "https://github.com/USERNAME/REPO.git"
  .\scripts\push-to-github.ps1 -RemoteUrl "git@github.com:USERNAME/REPO.git" -Force
Parameters:
  -RemoteUrl : (optional) remote repository URL. If omitted the script will prompt.
  -Branch    : target branch (default: main)
  -CommitMessage : commit message for initial commit (default: "Initial commit")
  -Force     : skip prompts and automatically modify `.gitignore` when needed
#>
param(
    [string]$RemoteUrl = "",
    [string]$Branch = "main",
    [string]$CommitMessage = "Initial commit",
    [switch]$Force
)

function Fail([string]$msg){ Write-Error $msg; exit 1 }

# Check git available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'git is not installed or not in PATH.' }

$root = (Get-Location).ProviderPath
Write-Host "Working directory: $root"

$gitOK = $true
# Ensure .gitignore contains safe defaults
$gitignorePath = Join-Path $root '.gitignore'
$required = @('node_modules/','.env','.env.local')
if (-not (Test-Path $gitignorePath)) {
    if ($Force) {
        "# Auto-created by push-to-github script`n" | Out-File -FilePath $gitignorePath -Encoding utf8
        Write-Host "Created .gitignore"
    } else {
        New-Item -Path $gitignorePath -ItemType File -Force | Out-Null
        Write-Host "Created .gitignore (you can edit it before continuing)"
    }
}

$gitignoreContent = Get-Content $gitignorePath -Raw
$needsAppend = @()
foreach ($entry in $required) {
    if ($gitignoreContent -notmatch [regex]::Escape($entry)) { $needsAppend += $entry }
}

if ($needsAppend.Count -gt 0) {
    if ($Force) {
        Add-Content -Path $gitignorePath -Value "`n# Recommended ignores`n$( $needsAppend -join "`n" )`n"
        Write-Host "Appended recommended entries to .gitignore: $($needsAppend -join ', ')"
    } else {
        Write-Host "The following recommended .gitignore entries are missing: $($needsAppend -join ', ')"
        $resp = Read-Host "Append them now? (Y/n)"
        if ($resp -ne 'n' -and $resp -ne 'N') {
            Add-Content -Path $gitignorePath -Value "`n# Recommended ignores`n$( $needsAppend -join "`n" )`n"
            Write-Host "Appended entries to .gitignore"
        } else {
            Write-Host "Continuing without modifying .gitignore"
        }
    }
}

# Initialize git if needed
$insideRepo = $false
try { $insideRepo = (git rev-parse --is-inside-work-tree 2>$null) -eq 'true' } catch { $insideRepo = $false }
if (-not $insideRepo) {
    Write-Host "Initializing new git repository..."
    git init || Fail 'git init failed'
} else { Write-Host "Already inside a git repository." }

# Set remote
if (-not $RemoteUrl) {
    $RemoteUrl = Read-Host "Enter remote repository URL (eg https://github.com/USER/REPO.git or git@github.com:USER/REPO.git)"
}
if (-not $RemoteUrl) { Fail 'No remote URL provided.' }

# If remote 'origin' exists, ask/replace
$existing = git remote 2>$null
if ($existing -match 'origin') {
    if ($Force) {
        git remote remove origin
        Write-Host 'Removed existing origin remote.'
    } else {
        $r = Read-Host "Remote 'origin' already exists. Replace it? (y/N)"
        if ($r -eq 'y' -or $r -eq 'Y') { git remote remove origin; Write-Host 'Removed existing origin remote.' } else { Write-Host 'Keeping existing origin.' }
    }
}

# Add remote if missing or replaced
$existing = git remote 2>$null
if ($existing -notmatch 'origin') { git remote add origin $RemoteUrl || Fail 'Failed to add remote origin' }

# Add files and commit
git add . || Fail 'git add failed'
$staged = git diff --cached --name-only
if (-not [string]::IsNullOrWhiteSpace($staged)) {
    git commit -m "$CommitMessage" || Fail 'git commit failed'
    Write-Host "Committed changes."
} else {
    Write-Host "No changes to commit."
}

# Ensure branch name
try { git branch --show-current > $null } catch { }
git branch -M $Branch 2>$null | Out-Null

Write-Host "Pushing to $RemoteUrl on branch $Branch..."
$push = git push -u origin $Branch 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $push
    Fail 'git push failed. Ensure you have permission and authentication configured.'
}

Write-Host 'Push completed successfully.'
exit 0
