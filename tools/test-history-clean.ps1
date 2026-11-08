$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$testRoot = Join-Path $root "artifacts\history-clean-test"

if (Test-Path $testRoot) { Remove-Item $testRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $testRoot | Out-Null

$source = Join-Path $testRoot "source"
& git clone --no-hardlinks $root $source | Out-Null
if ($LASTEXITCODE -ne 0) { throw "test source clone failed" }

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "tools\history-clean.ps1") -Execute -Repo $source -OutputRoot (Join-Path $testRoot "run")
if ($LASTEXITCODE -ne 0) { throw "history-clean execution failed" }

Write-Output "HISTORY_CLEAN_TEST=passed"
