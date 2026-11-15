param(
  [string]$AppUrl = "http://localhost:3000/?autostart=gaze",
  [switch]$SkipServerCheck
)

$ErrorActionPreference = "Stop"

$browserCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)

$browser = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $browser) {
  throw "Google Chrome or Microsoft Edge was not found. Install one of them or edit this script with the full browser path."
}

if (-not $SkipServerCheck) {
  try {
    $uri = [System.Uri]$AppUrl
    $client = New-Object System.Net.Sockets.TcpClient
    try {
      $connect = $client.ConnectAsync($uri.Host, $uri.Port)
      if (-not $connect.Wait(1200)) {
        Write-Warning "The app server at $($uri.Host):$($uri.Port) did not respond. Start it with 'npm run dev' if needed."
      }
    } catch {
      Write-Warning "The app server at $($uri.Host):$($uri.Port) is not reachable. Start it with 'npm run dev' if needed."
    } finally {
      $client.Dispose()
    }
  } catch {
    Write-Warning "Could not parse the app URL. Continuing without the server check."
  }
}

$profileDir = Join-Path $env:LOCALAPPDATA "AccessBridge\HandsFreeProfile"
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

$browserArguments = @(
  "--user-data-dir=`"$profileDir`"",
  "--use-fake-ui-for-media-stream",
  "--autoplay-policy=no-user-gesture-required",
  "--no-first-run",
  "--no-default-browser-check",
  "--start-maximized",
  "`"$AppUrl`""
)

Write-Host "Launching hands-free AccessBridge"
Write-Host "  Browser: $browser"
Write-Host "  URL:     $AppUrl"
Write-Host "  Profile: $profileDir"
Write-Host "Camera and microphone permission prompts are auto-accepted for this dedicated profile."

Start-Process -FilePath $browser -ArgumentList $browserArguments
