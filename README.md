# Yusra — Local Desktop Entity

Yusra is a 100% offline desktop entity. She reasons, writes code, executes locally, observes results, and learns — no cloud.

**Stack:** Tauri 2 + Rust (candle, rusqlite, sysinfo, std::process) + React + Tailwind + Framer Motion

## One-Command Install (no browser download)

Windows blocks `.exe/.msi` downloads — use terminal:

**PowerShell (any folder):**
```powershell
irm https://raw.githubusercontent.com/HASH-CREATES/Yusra/main/install.ps1 | iex
```

**CMD (any folder):**
```cmd
curl -fsSL https://raw.githubusercontent.com/HASH-CREATES/Yusra/main/install.cmd -o %TEMP%\yusra-install.cmd && call %TEMP%\yusra-install.cmd
```

**Already cloned? Single command in `Yusra` folder:**
```powershell
Set-Location "C:\Users\admin\OneDrive\Desktop\Yusra"
cmd.exe /c "C:\tmp\rustenv.bat npm run tauri dev"   # dev (hot reload)
# or
cmd.exe /c "C:\tmp\rustenv.bat npm run tauri build" # release → src-tauri/target/release/bundle/
```

Requires: `git`, `Node 20+`, `Rust` + VS Build Tools (`C:\tmp\rustenv.bat`), WebView2 (Win11 has it).

## Run

```powershell
Set-Location "C:\Users\admin\OneDrive\Desktop\Yusra"
cmd.exe /c "C:\tmp\rustenv.bat npm run tauri dev"
```
- `Ctrl+Space` omni bar (everywhere)
- `Ctrl+Shift+K` tasks rail
- `Ctrl+,` device & harness

## Features

- **Borderless HUD** `src-tauri/tauri.conf.json:12` `decorations:false`, custom titlebar drag
- **Split workspace** `src/App.tsx:213` Reasoning Stream + Live Terminal, draggable `ratio 0.34–0.72`
- **Tasks** `src-tauri/src/tasks.rs:14` SQLite `tasks` (title/prompt/status/result/run_count/favorite) — re-runnable forever, harness-driven `run_task()`
- **Harness** `src-tauri/src/agent.rs:7` recall top-2 episodic hits, `harness:runs` `entity_state`, capped output 64KiB `src-tauri/src/exec.rs:44`
- **Memory** `src-tauri/src/memory.rs:17` hybrid `episodic_memory` + `entity_state` + `tasks` at `%APPDATA%\Yusra\memory.db`, `store_memory`/`search_memory` `LIKE %query%`
- **Onboarding** `src/components/Onboarding.tsx:10` 5-step structured flow (welcome → personalize → consent → aha → done) with `rotateY` 3D, `Splash` 1.1s with `yusra-grid`/`yusra-aurora`/`scan`
- **Safety** `src-tauri/src/exec.rs:4` expanded deny-list, isolated `dd` token, `CSP strict` `tauri.conf.json:25`

## Tests

```powershell
cmd.exe /c "C:\tmp\rustenv.bat cargo test --manifest-path src-tauri\Cargo.toml" # 9 tests
npm run build  # 1777 modules, 328kB
npx tsc --noEmit
```

## Build Release (local)

```powershell
cmd.exe /c "C:\tmp\rustenv.bat npm run tauri build" # → src-tauri/target/release/bundle/
```
