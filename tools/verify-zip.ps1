$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$src = Join-Path $root "chrome-extension"
$zip = Join-Path $root "contextforge-v1.0.0.zip"
$stage = Join-Path $root "artifacts\zip-stage"
$check = Join-Path $root "artifacts\zip-check"

if (Test-Path $zip) { Remove-Item $zip -Force }
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
if (Test-Path $check) { Remove-Item $check -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

$items = @(
  "background.js",
  "config.js",
  "license.js",
  "storage.js",
  "manifest.json",
  "popup.css",
  "popup.html",
  "popup.js",
  "icons",
  "lib",
  "scripts",
  "package.json"
)
foreach ($item in $items) {
  $from = Join-Path $src $item
  if (-not (Test-Path $from)) { throw "MISSING_SOURCE: $item" }
  Copy-Item -Path $from -Destination $stage -Recurse -Force
}
# Ship the license text next to the extension code.
Copy-Item -Path (Join-Path $root "LICENSE") -Destination (Join-Path $stage "LICENSE") -Force

Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -CompressionLevel Optimal
Write-Output "ZIP_CREATED=$zip"
Write-Output "ZIP_BYTES=$((Get-Item $zip).Length)"

Expand-Archive -Path $zip -DestinationPath $check -Force

$mismatches = @()
$zipped = Get-ChildItem $check -Recurse -File
foreach ($file in $zipped) {
  $rel = $file.FullName.Substring($check.Length + 1)
  $source = Join-Path $stage $rel
  if (-not (Test-Path $source)) {
    $mismatches += "EXTRA_IN_ZIP: $rel"
    continue
  }
  $a = (Get-FileHash $file.FullName -Algorithm SHA256).Hash
  $b = (Get-FileHash $source -Algorithm SHA256).Hash
  if ($a -ne $b) { $mismatches += "HASH_MISMATCH: $rel" }
}

$expected = @(
  "LICENSE",
  "background.js",
  "config.js",
  "license.js",
  "storage.js",
  "manifest.json",
  "popup.css",
  "popup.html",
  "popup.js",
  "package.json",
  "icons\icon.svg",
  "icons\icon16.png",
  "icons\icon32.png",
  "icons\icon48.png",
  "icons\icon128.png",
  "lib\.gitkeep",
  "lib\Readability.js",
  "lib\turndown.js",
  "lib\shared\cleanMarkdown.js",
  "lib\shared\estimateTokens.js",
  "lib\shared\htmlToMarkdown.js",
  "lib\shared\index.js",
  "lib\shared\types.js",
  "scripts\sync-lib.mjs"
)
foreach ($rel in $expected) {
  if (-not (Test-Path (Join-Path $check $rel))) { $mismatches += "MISSING_IN_ZIP: $rel" }
}

Write-Output "ZIP_FILE_COUNT=$($zipped.Count)"
Write-Output "EXPECTED_FILE_COUNT=$($expected.Count)"
Write-Output "MISMATCH_COUNT=$($mismatches.Count)"
$mismatches | ForEach-Object { Write-Output $_ }
if ($mismatches.Count -gt 0) { exit 1 }
Write-Output "ZIP_MATCHES_SOURCE=true"
exit 0
