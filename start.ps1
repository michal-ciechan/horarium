#!/usr/bin/env pwsh
# Starts the Horarium API and verifies it is healthy.
# Optionally restarts Docker Desktop and Caddy.
# Run from any directory. Binds to 0.0.0.0:17000 so Caddy/Docker can reach it.

param(
    [string]$WatchFolder  = "C:\src\horarium\samples",
    [int]   $Port         = 17000,
    [int]   $TimeoutSec   = 45,
    [switch]$RestartDocker             # pass -RestartDocker to also restart Docker Desktop + Caddy
)

$ErrorActionPreference = "Stop"

# ── Optionally restart Docker Desktop ─────────────────────────────────────────
if ($RestartDocker) {
    Write-Host "Restarting Docker Desktop..."
    Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 3
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

    Write-Host "Waiting for Docker engine..."
    $dockerDeadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $dockerDeadline) {
        $out = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) { Write-Host "Docker is up."; break }
        Start-Sleep -Seconds 3
    }
    if ($LASTEXITCODE -ne 0) { throw "Docker did not come up within 90s" }

    Write-Host "Starting Caddy..."
    Push-Location "C:\src\ClaudeBot\laptop"
    docker compose up -d | Out-Null
    Pop-Location
    Write-Host "Caddy started."
}

# ── Kill any existing process on the port ─────────────────────────────────────
$existing = netstat -ano | Select-String ":$Port\s" | ForEach-Object {
    ($_ -split '\s+')[-1]
} | Select-Object -Unique
foreach ($p in $existing) {
    if ($p -match '^\d+$') {
        Write-Host "Stopping existing process on :$Port (PID $p)..."
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1

# ── Build the UI ──────────────────────────────────────────────────────────────
Write-Host "Building UI..."
Push-Location "$PSScriptRoot\src\horarium-ui"
npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { throw "UI build failed" }
Pop-Location

# ── Launch the API ────────────────────────────────────────────────────────────
Write-Host "Starting Horarium API on port $Port (watching $WatchFolder)..."
$env:ASPNETCORE_URLS = "http://0.0.0.0:$Port"
$proc = Start-Process dotnet `
    -ArgumentList "run","--no-launch-profile","--project","$PSScriptRoot\src\Horarium.Api","--","$WatchFolder" `
    -PassThru -WindowStyle Hidden
Write-Host "  PID: $($proc.Id)"

# ── Health check ──────────────────────────────────────────────────────────────
Write-Host "Waiting for health check on http://localhost:$Port/api/plans ..."
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$ok = $false
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-RestMethod "http://localhost:$Port/api/plans" -TimeoutSec 2
        if ($r -is [array]) { $ok = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}

if (-not $ok) {
    Write-Error "Horarium did not become healthy within ${TimeoutSec}s"
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "Horarium is running:"
Write-Host "  Local:   http://localhost:$Port"
Write-Host "  Public:  https://horarium.laptop.codeperf.net"
Write-Host "  PID:     $($proc.Id)"
Write-Host ""
Write-Host "Plans found: $($r.Count)"
