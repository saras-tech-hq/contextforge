param(
  [switch]$Execute,
  [string]$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutputRoot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "artifacts\history-clean")
)

$ErrorActionPreference = "Stop"

function Invoke-Native {
  param([string]$Exe, [string[]]$ExeArgs)
  # Native tools legitimately write progress to stderr (for example
  # "git bundle verify" prints "... is okay"). Merge streams without letting
  # PowerShell promote those records into terminating errors.
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $Exe @ExeArgs 2>&1 | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { $_ }
    }
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
  if ($exitCode -ne 0) {
    throw "$Exe $($ExeArgs -join ' ') failed with exit code $exitCode"
  }
  return $output
}

function Invoke-Git {
  param([string[]]$GitArgs)
  return Invoke-Native "git" $GitArgs
}

$repoRoot = (Invoke-Git @("-C", $Repo, "rev-parse", "--show-toplevel")).Trim()
$head = (Invoke-Git @("-C", $repoRoot, "rev-parse", "HEAD")).Trim()
$trackedWrangler = @(Invoke-Git @("-C", $repoRoot, "ls-files", "workers/license-verify/.wrangler"))
$commitCount = [int](Invoke-Git @("-C", $repoRoot, "rev-list", "--count", "HEAD"))
$objectCount = @(Invoke-Git @("-C", $repoRoot, "rev-list", "--objects", "--all")).Count
$dirty = @(Invoke-Git @("-C", $repoRoot, "status", "--porcelain"))

$plan = [ordered]@{
  repo = $repoRoot
  head = $head
  commits = $commitCount
  objects = $objectCount
  trackedWranglerFiles = $trackedWrangler.Count
  workingTreeEntries = $dirty.Count
  filterRepo = "python -m git_filter_repo (v2.47.0)"
  target = "workers/license-verify/.wrangler"
  mode = if ($Execute) { "execute" } else { "plan" }
}

if (-not $Execute) {
  Write-Output ($plan | ConvertTo-Json -Depth 4)
  Write-Output "NO CHANGES MADE. Re-run with -Execute to create backups and a cleaned clone."
  exit 0
}

if ($dirty.Count -gt 0) {
  throw "Working tree is not clean. Commit or stash changes first so the cleaned clone includes them."
}

Invoke-Native "python" @("-m", "git_filter_repo", "--version") | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runDir = Join-Path $OutputRoot $stamp
$backupDir = Join-Path $runDir "backups"
$cleanDir = Join-Path $runDir "clean-repo"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$bundle = Join-Path $backupDir "contextforge-all-refs.bundle"
$mirror = Join-Path $backupDir "contextforge-mirror.git"

Write-Output "STEP 1/5 creating backup bundle"
Invoke-Git @("-C", $repoRoot, "bundle", "create", $bundle, "--all") | Out-Null
Invoke-Git @("-C", $repoRoot, "bundle", "verify", $bundle) | Out-Null

Write-Output "STEP 2/5 creating mirror backup"
Invoke-Git @("clone", "--mirror", $repoRoot, $mirror) | Out-Null

Write-Output "STEP 3/5 cloning disposable working copy"
Invoke-Git @("clone", "--no-hardlinks", $repoRoot, $cleanDir) | Out-Null

Write-Output "STEP 4/5 rewriting only the disposable clone"
Push-Location $cleanDir
try {
  Invoke-Native "python" @("-m", "git_filter_repo", "--path", "workers/license-verify/.wrangler", "--invert-paths", "--force") | Out-Null
} finally {
  Pop-Location
}

Write-Output "STEP 5/5 verifying rewrite and recovery"
$afterWranglerPaths = @(Invoke-Git @("-C", $cleanDir, "log", "--all", "--name-only", "--pretty=format:") | Select-String -SimpleMatch "workers/license-verify/.wrangler")
$afterWranglerObjects = @(Invoke-Git @("-C", $cleanDir, "rev-list", "--objects", "--all") | Select-String -SimpleMatch "workers/license-verify/.wrangler")
$recoveryPaths = @(Invoke-Git @("--git-dir", $mirror, "rev-list", "--objects", "--all") | Select-String -SimpleMatch "workers/license-verify/.wrangler")
$afterCommits = [int](Invoke-Git @("-C", $cleanDir, "rev-list", "--count", "HEAD"))
$afterObjects = @(Invoke-Git @("-C", $cleanDir, "rev-list", "--objects", "--all")).Count
$bundleHash = (Get-FileHash $bundle -Algorithm SHA256).Hash

if ($afterWranglerPaths.Count -ne 0 -or $afterWranglerObjects.Count -ne 0) {
  throw "Verification failed: .wrangler still present in the cleaned clone"
}
if ($recoveryPaths.Count -eq 0) {
  throw "Verification failed: backup does not contain the original .wrangler objects"
}
if ($afterCommits -ne $commitCount) {
  throw "Verification failed: commit count changed ($commitCount -> $afterCommits)"
}

$report = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  sourceRepo = $repoRoot
  originalHead = $head
  originalCommits = $commitCount
  originalObjects = $objectCount
  cleanedCommits = $afterCommits
  cleanedObjects = $afterObjects
  removedWranglerFiles = $trackedWrangler.Count
  cleanedWranglerPathMatches = $afterWranglerPaths.Count
  cleanedWranglerObjectMatches = $afterWranglerObjects.Count
  recoveryBackupContainsWrangler = ($recoveryPaths.Count -gt 0)
  backupBundle = $bundle
  backupBundleSha256 = $bundleHash
  backupMirror = $mirror
  cleanedClone = $cleanDir
  remotePushPerformed = $false
}
$reportPath = Join-Path $runDir "report.json"
$report | ConvertTo-Json -Depth 5 | Set-Content -Path $reportPath -Encoding UTF8

Write-Output ($report | ConvertTo-Json -Depth 5)
Write-Output "SOURCE REPOSITORY AND REMOTE WERE NOT MODIFIED."
Write-Output "Recovery: git clone `"$mirror`" contextforge-restored"
Write-Output "After owner approval only: re-add origin in the cleaned clone and push with --force-with-lease."
