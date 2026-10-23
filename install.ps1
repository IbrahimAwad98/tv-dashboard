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
  if (-not (Test-Path $f)) { throw "Hittar inte $f. Ange rätt sökväg med -TizenHome." }
}

Write-Host "1/4 Ansluter till TV:n ($serial)..." -ForegroundColor Cyan
& $sdb connect $serial | Out-Host
$devices = & $sdb devices | Out-String
if ($devices -notmatch [regex]::Escape($serial)) {
  throw "TV:n syns inte i 'sdb devices'. Kontrollera Developer Mode, Host PC IP och att TV:n är omstartad."
}

Write-Host "2/4 Paketerar appen..." -ForegroundColor Cyan
if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force }
New-Item -ItemType Directory -Path $distDir | Out-Null
& $tizen package -t wgt -s $CertProfile -o $distDir -- $appDir | Out-Host
$wgt = Get-ChildItem $distDir -Filter *.wgt | Select-Object -First 1
if (-not $wgt) { throw "Ingen .wgt skapades. Kontrollera certifikatprofilen '$CertProfile'." }

Write-Host "3/4 Installerar $($wgt.Name)..." -ForegroundColor Cyan
& $tizen install -n $wgt.Name -s $serial -- $distDir | Out-Host

Write-Host "4/4 Startar appen..." -ForegroundColor Cyan
& $tizen run -p $appId -s $serial | Out-Host

Write-Host "Klart! Hemskärmen ska nu synas på TV:n." -ForegroundColor Green
