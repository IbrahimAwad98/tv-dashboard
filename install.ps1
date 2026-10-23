<#
  Home Screen – build and install on the Samsung TV with one command.

  Usage (PowerShell in the project folder):
    .\install.ps1 -TvIp 192.168.1.50 -CertProfile MyTV

  Requires: Tizen Studio with TV Extensions + Samsung Certificate Extension,
  Developer Mode on the TV and a Samsung certificate (see README).
#>
param(
  [Parameter(Mandatory = $true)] [string] $TvIp,
  [Parameter(Mandatory = $true)] [string] $CertProfile,
  [string] $TizenHome = "C:\tizen-studio"
)

$ErrorActionPreference = "Stop"
$tizen = Join-Path $TizenHome "tools\ide\bin\tizen.bat"
$sdb   = Join-Path $TizenHome "tools\sdb.exe"
$appDir  = Join-Path $PSScriptRoot "app"
$distDir = Join-Path $PSScriptRoot "dist"
$serial  = "${TvIp}:26101"

foreach ($f in @($tizen, $sdb)) {
  if (-not (Test-Path $f)) { throw "Cannot find $f. Set the correct path with -TizenHome." }
}

# App id comes from config.xml so the two can never drift apart.
$config = [xml](Get-Content (Join-Path $appDir "config.xml") -Raw)
$appId  = $config.widget.application.id
if (-not $appId) { throw "No <tizen:application id=...> found in app\config.xml." }

# Runs a tizen CLI command, echoes its output and fails if it reports an error.
function Invoke-Tizen([string] $Step, [string[]] $CliArgs) {
  $out = & $tizen @CliArgs 2>&1 | Out-String
  Write-Host $out
  if ($out -match 'failed|Failed|error|Error') { throw "$Step failed. See the output above." }
}

Write-Host "1/4 Connecting to the TV ($serial)..." -ForegroundColor Cyan
& $sdb connect $serial | Out-Host
$devices = & $sdb devices | Out-String
if ($devices -notmatch [regex]::Escape($serial)) {
  throw "The TV does not show up in 'sdb devices'. Check Developer Mode, Host PC IP and that the TV has been restarted."
}

Write-Host "2/4 Packaging the app ($appId)..." -ForegroundColor Cyan
# Stale signatures from an earlier packaging run break the new signature.
Remove-Item (Join-Path $appDir "author-signature.xml"), (Join-Path $appDir "signature*.xml"), (Join-Path $appDir ".manifest.tmp") -Force -ErrorAction Ignore
if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force }
New-Item -ItemType Directory -Path $distDir | Out-Null
Invoke-Tizen "Packaging" @("package", "-t", "wgt", "-s", $CertProfile, "-o", $distDir, "--", $appDir)
$wgt = Get-ChildItem $distDir -Filter *.wgt | Select-Object -First 1
if (-not $wgt) { throw "No .wgt was created. Check the certificate profile '$CertProfile'." }
# An unknown profile name makes the CLI build an UNSIGNED package, which the TV rejects with install failed[118].
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($wgt.FullName)
$signed = ($zip.Entries.Name -contains "author-signature.xml") -and ($zip.Entries.Name -contains "signature1.xml")
$zip.Dispose()
if (-not $signed) {
  $profiles = & $tizen security-profiles list 2>&1 | Out-String
  throw "The .wgt is not signed. Profile '$CertProfile' probably does not exist. Available profiles:`n$profiles"
}

Write-Host "3/4 Installing $($wgt.Name)..." -ForegroundColor Cyan
Invoke-Tizen "Installation" @("install", "-n", $wgt.Name, "-s", $serial, "--", $distDir)

Write-Host "4/4 Launching $appId..." -ForegroundColor Cyan
Invoke-Tizen "Launch" @("run", "-p", $appId, "-s", $serial)

Write-Host "Klart! The home screen should now be showing on the TV." -ForegroundColor Green
