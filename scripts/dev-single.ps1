#Requires -Version 5.1
<#
.SYNOPSIS
  Ensure a single Vite dev server on port 3000 for browser QA.

.EXAMPLE
  .\scripts\dev-single.ps1
#>
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

foreach ($port in @(3001, 3002, 3003)) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    Write-Host "Stopping stale listener on port $port (PID $($c.OwningProcess))"
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

$on3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($on3000) {
  Write-Host "Dev server already listening on http://localhost:3000 (PID $($on3000[0].OwningProcess))"
  exit 0
}

Write-Host "Starting npm run dev on port 3000 (background job)..."
$job = Start-Job -ScriptBlock {
  Set-Location $using:root
  npm run dev 2>&1
}
for ($i = 0; $i - 45; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) {
      Write-Host "Ready: http://localhost:3000 (job $($job.Id))"
      exit 0
    }
  } catch { Start-Sleep -Seconds 1 }
}
Receive-Job $job -ErrorAction SilentlyContinue | Select-Object -Last 5
throw "Dev server did not become ready on port 3000 within 45s"
