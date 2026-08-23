#!/usr/bin/env node
// Yusra CLI — like `opencode` / `hermes` bin
// npm install -g yusra  ->  yusra
// npm install -g github:HASH-CREATES/Yusra -> yusra
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const dest = path.resolve(__dirname, "..");
const exeWin = path.join(dest, "src-tauri/target/release/yusra.exe");
const exeUnix = path.join(dest, "src-tauri/target/release/yusra");

function hasExe() {
  return fs.existsSync(exeWin) || fs.existsSync(exeUnix);
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`Yusra — local desktop entity
Usage:
  yusra              launch desktop app (builds if needed)
  yusra dev          hot-reload dev
  yusra build        production bundle
  yusra --help

Install (like opencode/hermes):
  # Windows
  iex (irm https://raw.githubusercontent.com/HASH-CREATES/Yusra/main/install.ps1)
  # macOS/Linux/WSL2
  curl -fsSL https://raw.githubusercontent.com/HASH-CREATES/Yusra/main/install.sh | bash
  # npm
  npm install -g yusra   (or: npm install -g github:HASH-CREATES/Yusra)

Repo: https://github.com/HASH-CREATES/Yusra
`);
  process.exit(0);
}

if (args[0] === "build") {
  const cmd = process.platform === "win32" && fs.existsSync("C:\\tmp\\rustenv.bat")
    ? `cmd.exe /c "C:\\tmp\\rustenv.bat npm run tauri build"`
    : `npx tauri build`;
  const r = spawnSync(cmd, { shell: true, stdio: "inherit", cwd: dest });
  process.exit(r.status ?? 0);
}

if (args[0] === "dev") {
  const cmd = process.platform === "win32" && fs.existsSync("C:\\tmp\\rustenv.bat")
    ? `cmd.exe /c "C:\\tmp\\rustenv.bat npm run tauri dev"`
    : `npx tauri dev`;
  const p = spawn(cmd, { shell: true, stdio: "inherit", cwd: dest });
  p.on("exit", c => process.exit(c ?? 0));
} else {
  // default: launch built exe or dev
  const exe = fs.existsSync(exeWin) ? exeWin : fs.existsSync(exeUnix) ? exeUnix : null;
  if (exe) {
    const p = spawn(exe, args, { stdio: "inherit", detached: false });
    p.on("exit", c => process.exit(c ?? 0));
  } else {
    console.log("No release build found — starting dev (first run builds ~2m)...");
    const cmd = process.platform === "win32" && fs.existsSync("C:\\tmp\\rustenv.bat")
      ? `cmd.exe /c "C:\\tmp\\rustenv.bat npm run tauri dev"`
      : `npx tauri dev`;
    const p = spawn(cmd, { shell: true, stdio: "inherit", cwd: dest });
    p.on("exit", c => process.exit(c ?? 0));
  }
}
