# Yusra — one-command installer (no MSI download, builds locally)
# Usage (PowerShell, any folder):
#   irm https://raw.githubusercontent.com/HASH-CREATES/Yusra/main/install.ps1 | iex
# or local:
#   powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"
$Repo = "https://github.com/HASH-CREATES/Yusra.git"
$Dest = "$env:USERPROFILE\Desktop\Yusra"

Write-Host "— Yusra installer —" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Host "git not found — install Git for Windows" -ForegroundColor Red; exit 1 }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "node not found — install Node 20+" -ForegroundColor Red; exit 1 }

if (Test-Path $Dest) {
  Write-Host "Updating existing $Dest..." -ForegroundColor Yellow
  Set-Location $Dest; git pull --ff-only; if ($LASTEXITCODE -ne 0) { git fetch origin; git reset --hard origin/main }
} else {
  Write-Host "Cloning to $Dest..." -ForegroundColor Yellow
  git clone $Repo $Dest
  Set-Location $Dest
}

if (-not (Test-Path "C:\tmp\rustenv.bat")) {
  Write-Host "rustenv.bat not found at C:\tmp\rustenv.bat — install Rust + VS Build Tools" -ForegroundColor Red
  Write-Host "  See https://tauri.app/start/prerequisites/" -ForegroundColor Gray
  exit 1
}

Write-Host "Installing deps..." -ForegroundColor Yellow
npm install

Write-Host "Building desktop app (release)..." -ForegroundColor Yellow
cmd.exe /c "C:\tmp\rustenv.bat npm run tauri build"
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed — try: cmd.exe /c `"C:\tmp\rustenv.bat npm run tauri dev`"" -ForegroundColor Red; exit 1 }

$exe = "src-tauri\target\release\yusra.exe"
if (Test-Path $exe) {
  Write-Host "Done — launching Yusra..." -ForegroundColor Green
  Start-Process $exe
  Write-Host "Installed at $exe" -ForegroundColor Gray
  Write-Host "Run again: & `"$Dest\src-tauri\target\release\yusra.exe`"" -ForegroundColor Gray
} else {
  Write-Host "Build finished but exe not found at $exe" -ForegroundColor Yellow
}
