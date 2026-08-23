#!/usr/bin/env bash
# Yusra — one-line installer (like opencode/hermes)
# Linux / macOS / WSL2 / Termux
# Usage: curl -fsSL https://raw.githubusercontent.com/HASH-CREATES/Yusra/main/install.sh | bash
set -e

REPO="https://github.com/HASH-CREATES/Yusra.git"
DEST="$HOME/Yusra"
BIN_DIR="$HOME/.local/bin"

echo "— Yusra installer —"

if ! command -v git >/dev/null 2>&1; then echo "git not found — install git"; exit 1; fi
if ! command -v node >/dev/null 2>&1; then echo "node 20+ not found — https://nodejs.org"; exit 1; fi
if ! command -v cargo >/dev/null 2>&1 && [ ! -f "$HOME/.cargo/env" ]; then echo "cargo not found — https://rustup.rs"; exit 1; fi
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

if [ -d "$DEST" ]; then
  echo "Updating $DEST..."
  git -C "$DEST" pull --ff-only || (git -C "$DEST" fetch origin && git -C "$DEST" reset --hard origin/main)
else
  echo "Cloning to $DEST..."
  git clone "$REPO" "$DEST"
fi

cd "$DEST"

echo "Installing deps..."
npm install

# Build Tauri bundle if cargo available
if command -v cargo >/dev/null 2>&1; then
  echo "Building desktop app (may take ~2m)..."
  if npm run tauri build 2>/dev/null || npx tauri build 2>/dev/null; then
    echo "Build done"
  else
    echo "Build failed — try dev: npm run tauri dev"
  fi
fi

# Install yusra launcher
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/yusra" << 'LAUNCHER'
#!/usr/bin/env bash
DEST="$HOME/Yusra"
EXE="$DEST/src-tauri/target/release/yusra"
if [ -x "$EXE" ]; then exec "$EXE" "$@"; fi
APP="$DEST/src-tauri/target/release/bundle"
# fallback to dev
cd "$DEST" && npm run tauri dev -- "$@"
LAUNCHER
chmod +x "$BIN_DIR/yusra"

# PATH hint
if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
  echo "Add to PATH: echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc && source ~/.bashrc"
  echo "Then run: yusra"
else
  echo "Installed — run: yusra"
fi

echo "Done — $DEST"
echo "  yusra           # launch"
echo "  npm run tauri dev # hot reload"
