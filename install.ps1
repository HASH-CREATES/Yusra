# Yusra — one-line installer (like hermes/opencode)
# Windows PowerShell (native, no WSL)
# Usage: iex (irm https://raw.githubusercontent.com/HASH-CREATES/Yusra/main/install.ps1)
#    or: irm https://raw.githubusercontent.com/HASH-CREATES/Yusra/main/install.ps1 | iex
$ErrorActionPreference = "Stop"
$Repo = "https://github.com/HASH-CREATES/Yusra.git"
$Dest = "$env:USERPROFILE\Yusra"
$BinDir = "$env:USERPROFILE\.local\bin"

Write-Host "— Yusra installer —" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Host "git not found — https://git-scm.com" -ForegroundColor Red; exit 1 }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "node 20+ not found — https://nodejs.org" -ForegroundColor Red; exit 1 }

# Rust check
$hasCargo = Get-Command cargo -ErrorAction SilentlyContinue
if (-not $hasCargo -and -not (Test-Path "$env:USERPROFILE\.cargo\bin\cargo.exe")) {
  Write-Host "cargo not found — https://rustup.rs then add to PATH" -ForegroundColor Yellow
  Write-Host "  winget install Rustlang.Rustup" -ForegroundColor Gray
}

if (Test-Path $Dest) {
  Write-Host "Updating $Dest..." -ForegroundColor Yellow
  Set-Location $Dest
  git pull --ff-only 2>$null; if ($LASTEXITCODE -ne 0) { git fetch origin; git reset --hard origin/main }
} else {
  Write-Host "Cloning to $Dest..." -ForegroundColor Yellow
  git clone $Repo $Dest
  Set-Location $Dest
}

if (-not (Test-Path "C:\tmp\rustenv.bat") -and -not $hasCargo) {
  Write-Host "C:\tmp\rustenv.bat not found and cargo not on PATH — Tauri build needs VS Build Tools" -ForegroundColor Yellow
  Write-Host "  https://tauri.app/start/prerequisites/#windows" -ForegroundColor Gray
}

Write-Host "Installing deps..." -ForegroundColor Yellow
npm install

Write-Host "Building desktop app (release, ~2m)..." -ForegroundColor Yellow
$built = $false
try {
  if (Test-Path "C:\tmp\rustenv.bat") { cmd.exe /c "C:\tmp\rustenv.bat npm run tauri build"; if ($LASTEXITCODE -eq 0) { $built = $true } }
  if (-not $built) { npx tauri build; if ($LASTEXITCODE -eq 0) { $built = $true } }
} catch { }

# launcher: yusra.cmd on PATH
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
$launcher = @'
@echo off
set DEST=%USERPROFILE%\Yusra
if exist "%DEST%\src-tauri\target\release\yusra.exe" (
  start "" "%DEST%\src-tauri\target\release\yusra.exe" %*
  exit /b 0
)
pushd "%DEST%"
cmd.exe /c "C:\tmp\rustenv.bat npm run tauri dev" %*
'@
Set-Content -Path "$BinDir\yusra.cmd" -Value $launcher -Encoding ASCII
$psLauncher = 'Set-Location "$env:USERPROFILE\Yusra"; if (Test-Path "src-tauri\target\release\yusra.exe") { Start-Process "src-tauri\target\release\yusra.exe" } else { cmd.exe /c "C:\tmp\rustenv.bat npm run tauri dev" }'
Set-Content -Path "$BinDir\yusra.ps1" -Value $psLauncher -Encoding UTF8

# PATH
$envPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($envPath -notlike "*$BinDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$envPath;$BinDir", "User")
  Write-Host "Added $BinDir to PATH — restart terminal, then run: yusra" -ForegroundColor Green
} else {
  Write-Host "Installed — run: yusra" -ForegroundColor Green
}

$exe = "src-tauri\target\release\yusra.exe"
if (Test-Path $exe) { Write-Host "Done — $Dest\$exe" -ForegroundColor Gray; Start-Process $exe -ErrorAction SilentlyContinue }
else { Write-Host "Build finished — run: yusra  or  npm run tauri dev" -ForegroundColor Yellow }
