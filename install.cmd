@echo off
REM Yusra — one-command installer (CMD, any folder)
REM Usage:
REM   curl -fsSL https://raw.githubusercontent.com/HASH-CREATES/Yusra/main/install.cmd | cmd
REM   or: install.cmd

set REPO=https://github.com/HASH-CREATES/Yusra.git
set DEST=%USERPROFILE%\Desktop\Yusra

echo — Yusra installer —
where git >nul 2>&1 || (echo git not found & exit /b 1)
where node >nul 2>&1 || (echo node not found & exit /b 1)

if exist "%DEST%" (
  echo Updating %DEST%...
  pushd "%DEST%"
  git pull --ff-only || (git fetch origin && git reset --hard origin/main)
) else (
  echo Cloning to %DEST%...
  git clone %REPO% "%DEST%"
  pushd "%DEST%"
)

if not exist "C:\tmp\rustenv.bat" (
  echo rustenv.bat not found at C:\tmp\rustenv.bat
  echo See https://tauri.app/start/prerequisites/
  exit /b 1
)

echo Installing deps...
call npm install

echo Building desktop app...
cmd.exe /c "C:\tmp\rustenv.bat npm run tauri build"
if errorlevel 1 (
  echo Build failed — try: cmd.exe /c "C:\tmp\rustenv.bat npm run tauri dev"
  exit /b 1
)

if exist "src-tauri\target\release\yusra.exe" (
  echo Done — launching Yusra...
  start "" "src-tauri\target\release\yusra.exe"
  echo Installed at %DEST%\src-tauri\target\release\yusra.exe
) else (
  echo Build finished but exe not found
)

popd
