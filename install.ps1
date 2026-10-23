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
$appId   = "IbbeHome01.Hemskarm"

foreach ($f in @($tizen, $sdb)) {
  if (-not (Test-Path $f)) { throw "Cannot find $f. Set the correct path with -TizenHome." }
}

Write-Host "1/4 Connecting to the TV ($serial)..." -ForegroundColor Cyan
& $sdb connect $serial | Out-Host
$devices = & $sdb devices | Out-String
if ($devices -notmatch [regex]::Escape($serial)) {
  throw "The TV does not show up in 'sdb devices'. Check Developer Mode, Host PC IP and that the TV has been restarted."
}

Write-Host "2/4 Packaging the app..." -ForegroundColor Cyan
if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force }
New-Item -ItemType Directory -Path $distDir | Out-Null
& $tizen package -t wgt -s $CertProfile -o $distDir -- $appDir | Out-Host
$wgt = Get-ChildItem $distDir -Filter *.wgt | Select-Object -First 1
if (-not $wgt) { throw "No .wgt was created. Check the certificate profile '$CertProfile'." }

Write-Host "3/4 Installing $($wgt.Name)..." -ForegroundColor Cyan
& $tizen install -n $wgt.Name -s $serial -- $distDir | Out-Host

Write-Host "4/4 Launching the app..." -ForegroundColor Cyan
& $tizen run -p $appId -s $serial | Out-Host

Write-Host "Done! The home screen should now be showing on the TV." -ForegroundColor Green
