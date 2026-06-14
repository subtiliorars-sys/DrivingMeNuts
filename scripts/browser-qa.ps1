#Requires -Version 5.1
<#
.SYNOPSIS
  Canvas-aware browser QA for Driving Me Nuts (corps-browser / agent-browser).

.EXAMPLE
  .\scripts\browser-qa.ps1 -Action boot-screenshot
  .\scripts\browser-qa.ps1 -Action click -Target buy-raw
  .\scripts\browser-qa.ps1 -Action tutorial-smoke
#>
param(
  [ValidateSet("open", "boot-screenshot", "click", "tutorial-smoke", "screenshot", "close")]
  [string]$Action = "boot-screenshot",
  [string]$Target = "buy-raw",
  [string]$Url = "",
  [string]$ShotDir = "$env:USERPROFILE\screenshots"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $ShotDir | Out-Null

if (-not $Url) {
  foreach ($port in @(3000, 3001, 3002)) {
    try {
      $r = Invoke-WebRequest -Uri "http://localhost:$port" -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $Url = "http://localhost:$port"; break }
    } catch { }
  }
  if (-not $Url) { $Url = "http://localhost:3000" }
}

$clickMap = @{
  "boot-start"   = @{ x = 240; y = 149 }
  "buy-raw"      = @{ x = 402; y = 121 }
  "roast-slot-0" = @{ x = 80;  y = 42  }
  "price-minus"  = @{ x = 346; y = 55  }
  "price-plus"   = @{ x = 376; y = 55  }
  "upgrades"     = @{ x = 402; y = 145 }
  "end-day"      = @{ x = 430; y = 255 }
}

function Invoke-GameEval {
  param([string]$Js)
  corps-browser eval $Js
}

function Wait-ForPageReady {
  param([int]$MaxSeconds = 20)
  for ($i = 0; $i -lt $MaxSeconds; $i++) {
    $state = Invoke-GameEval "(function(){return (document.querySelector('canvas')&&window.__DMN_GAME__)?'ready':'wait';})()"
    if ($state -match 'ready') { return $state }
    Start-Sleep -Seconds 1
  }
  throw "Page not ready after ${MaxSeconds}s at $Url (last: $state)"
}

function Clear-GameStorage {
  Invoke-GameEval "(function(){try{localStorage.removeItem('dmn_save_v1');localStorage.removeItem('dmn_tutorial_seen');}catch(e){}return 'cleared';})()"
}

function Restart-FreshGameScene {
  $day = Invoke-GameEval "(function(){var g=window.__DMN_GAME__;if(!g)return 'no-game';try{localStorage.removeItem('dmn_save_v1');localStorage.removeItem('dmn_tutorial_seen');}catch(e){}if(g.scene.isActive('GameScene'))g.scene.stop('GameScene');g.scene.start('GameScene');var s=g.scene.getScene('GameScene');return s&&s.state?'day-'+s.state.dayNumber:'fail';})()"
  if ($day -notmatch 'day-1') { throw "Restart-FreshGameScene failed (expected day 1): $day" }
  return $day
}

function Open-AndWait {
  corps-browser open $Url
  corps-browser wait --load networkidle 2>$null
  if ($LASTEXITCODE -ne 0) { corps-browser wait 8000 | Out-Null }
  try {
    Wait-ForPageReady -MaxSeconds 15 | Out-Null
  } catch {
    corps-browser open $Url
    corps-browser wait 8000 | Out-Null
    Wait-ForPageReady -MaxSeconds 15 | Out-Null
  }
}

function Enter-GameScene {
  $r = Invoke-GameEval "(function(){var g=window.__DMN_GAME__;if(!g)return 'no-game';if(!g.scene.isActive('GameScene'))g.scene.start('GameScene');return g.scene.isActive('GameScene')?'game-scene':'fail';})()"
  if ($r -notmatch 'game-scene') { throw "Enter-GameScene failed: $r" }
  return $r
}

function Get-QaFlags {
  Invoke-GameEval "(function(){var q=window.__DMN_QA__;return q&&q.flags()?JSON.stringify(q.flags()):'null';})()"
}

function Invoke-QaClick {
  param([string]$TargetKey)
  $r = Invoke-GameEval "(function(){var q=window.__DMN_QA__;return q?q.click('$TargetKey'):'no-qa';})()"
  if ($r -notmatch 'ok') { throw "QA click '$TargetKey' failed: $r" }
  return $r
}

function Test-QaFlagTrue {
  param([string]$Json, [string]$FlagName)
  return ($Json -like "*${FlagName}*true*")
}

function Invoke-CanvasClick {
  param([int]$GameX, [int]$GameY)
  $js = '(function(){var c=document.querySelector(''canvas'');if(!c)return ''no-canvas'';var r=c.getBoundingClientRect();var cx=r.left+(' + $GameX + '/480)*r.width;var cy=r.top+(' + $GameY + '/270)*r.height;var o={clientX:cx,clientY:cy,bubbles:true,cancelable:true,view:window,pointerId:1,pointerType:''mouse'',isPrimary:true};c.dispatchEvent(new PointerEvent(''pointerdown'',o));c.dispatchEvent(new PointerEvent(''pointerup'',o));return ''clicked-''+Math.round(cx)+'',''+Math.round(cy);})()'
  $r = Invoke-GameEval $js
  if ($r -match 'no-canvas') { throw "Canvas click failed: $r" }
  return $r
}

switch ($Action) {
  "open" {
    Open-AndWait
  }
  "boot-screenshot" {
    Open-AndWait
    corps-browser screenshot (Join-Path $ShotDir "dmn-boot.png")
    corps-browser snapshot -i
  }
  "click" {
    if (-not $clickMap.ContainsKey($Target)) {
      throw "Unknown target '$Target'. See docs/QA_CLICK_MAP.md"
    }
    Open-AndWait
    if ($Target -eq "boot-start") {
      Invoke-CanvasClick -GameX 240 -GameY 149 | Out-Null
    } else {
      Enter-GameScene | Out-Null
      Start-Sleep -Seconds 1
      $pt = $clickMap[$Target]
      Invoke-CanvasClick -GameX $pt.x -GameY $pt.y | Out-Null
    }
    Start-Sleep -Milliseconds 800
    $flags = Get-QaFlags
    Write-Output "QA_FLAGS: $flags"
    corps-browser screenshot (Join-Path $ShotDir "dmn-after-$Target.png")
  }
  "tutorial-smoke" {
    Open-AndWait
    Restart-FreshGameScene | Out-Null
    Start-Sleep -Seconds 1
    Invoke-QaClick -TargetKey "buy-raw" | Out-Null
    Start-Sleep -Milliseconds 600
    $afterBuy = Get-QaFlags
    Write-Output "after buy-raw: $afterBuy"
    if (-not (Test-QaFlagTrue -Json $afterBuy -FlagName "supplyModalOpen")) {
      throw "Tutorial step 0 FAIL: buy-raw did not open supply modal ($afterBuy)"
    }
    Invoke-QaClick -TargetKey "close-supply" | Out-Null
    Start-Sleep -Milliseconds 400
    $afterClose = Get-QaFlags
    Write-Output "after close-supply: $afterClose"
    if (Test-QaFlagTrue -Json $afterClose -FlagName "supplyModalOpen") {
      throw "Tutorial step 0b FAIL: close-supply did not dismiss supply modal ($afterClose)"
    }
    Invoke-QaClick -TargetKey "roast-slot-0" | Out-Null
    Start-Sleep -Milliseconds 600
    $afterRoast = Get-QaFlags
    Write-Output "after roast-slot-0: $afterRoast"
    if (-not (Test-QaFlagTrue -Json $afterRoast -FlagName "roastModalOpen")) {
      throw "Tutorial step 1 FAIL: roast slot did not open roast modal ($afterRoast)"
    }
    Invoke-QaClick -TargetKey "close-roast" | Out-Null
    Start-Sleep -Milliseconds 400
    $afterCloseRoast = Get-QaFlags
    Write-Output "after close-roast: $afterCloseRoast"
    if (Test-QaFlagTrue -Json $afterCloseRoast -FlagName "roastModalOpen") {
      throw "Tutorial step 1b FAIL: close-roast did not dismiss roast modal ($afterCloseRoast)"
    }
    Invoke-QaClick -TargetKey "end-day" | Out-Null
    Start-Sleep -Milliseconds 800
    $afterEndDay = Get-QaFlags
    Write-Output "after end-day: $afterEndDay"
    if (-not (Test-QaFlagTrue -Json $afterEndDay -FlagName "reportOpen")) {
      throw "Tutorial step 2 FAIL: end-day did not open day report ($afterEndDay)"
    }
    Invoke-QaClick -TargetKey "dismiss-report" | Out-Null
    Start-Sleep -Milliseconds 600
    $afterDismiss = Get-QaFlags
    Write-Output "after dismiss-report: $afterDismiss"
    if (Test-QaFlagTrue -Json $afterDismiss -FlagName "reportOpen") {
      throw "Tutorial step 2b FAIL: dismiss-report did not close day report ($afterDismiss)"
    }
    corps-browser screenshot (Join-Path $ShotDir "dmn-tutorial-smoke.png")
    Write-Output "TUTORIAL-SMOKE: PASS"
  }
  "screenshot" {
    corps-browser screenshot (Join-Path $ShotDir "dmn-manual.png")
  }
  "close" {
    corps-browser close
  }
}
