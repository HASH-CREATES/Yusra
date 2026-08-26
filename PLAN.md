# YUSRA — PLAN.md
## Decoupled Viable Architecture Blueprint (Tauri/Rust Exit)

> **Status:** Definitive Build Blueprint — Pivot v2.0
> **Date:** 2026-08-26
> **Supersedes:** Tauri/Rust portions of PRD.md §2, DEV.md §1–§11
> **Preserved verbatim:** DESIGN.md (full design system), PRD.md feature set, DEV.md agentic-loop/danger/memory/persona logic (ported Rust → Python)

---

## 0. Why This Pivot

The Rust/Tauri toolchain (candle-core compilation, MSVC linking, tauri build) is blocking viability.
This pivot **decouples** the system into two independently runnable processes:

- **The Body** — a local web app (Vite dev server). No native packaging required.
- **The Brain** — a local Python process owning inference, memory, and execution.

Nothing else changes: the Earthy/Serene design system, the Open-Interpreter agentic loop,
the Danger Loop, the hybrid SQLite memory, and the persona system carry over intact.

### What Changes vs. What Is Preserved

| Area | Old (Tauri) | New (Decoupled) |
|---|---|---|
| App shell | Tauri window + custom TitleBar | Browser tab / Chrome `--app=...` kiosk mode; TitleBar becomes in-app header |
| IPC | `invoke("llm_chat", ...)` | REST `fetch()` + SSE streams |
| Inference | candle-core (Rust) | `llama-cpp-python` (GGUF, zero Ollama/Rust) |
| Memory | rusqlite | `sqlite3` (Python stdlib — same schema) |
| Execution | `std::process::Command` | `subprocess` |
| Events | Tauri `emit()` | Server-Sent Events (SSE) |
| Design/UI | Unchanged | **Unchanged** (Tailwind tokens, Framer Motion, Lucide) |

---

## 1. Tech Stack (The Viable Path)

### 1.1 Frontend — The Body
| Layer | Tech | Version |
|---|---|---|
| Build | Vite | 5.x |
| UI | React + TypeScript | 18.x |
| Styling | TailwindCSS (design tokens from DESIGN.md §13) | 3.x |
| Animation | Framer Motion (physics springs, 3D transforms) | 11.x |
| State | Zustand | 4.x |
| Icons | Lucide React (1.5px stroke) | latest |
| Chat render | react-markdown + Shiki | latest |

Runs at `http://localhost:5173`. Pure presentation layer — **zero** direct LLM/shell calls
(the DESIGN.md §11 rule survives; only the transport changes from Tauri IPC to HTTP).

### 1.2 Backend — The Brain
| Layer | Tech | Notes |
|---|---|---|
| Framework | FastAPI + Uvicorn | Async, auto OpenAPI docs at `/docs` |
| LLM Engine | `llama-cpp-python` | Loads GGUF directly in-process. CPU wheels on Windows; optional CUDA via prebuilt wheel/CMake |
| Memory | `sqlite3` (stdlib) | WAL mode, single-writer lock |
| Execution | `subprocess` | `shell=True`, timeout-bounded |
| Risk Engine | `re` (stdlib) | Compiled pattern sets |
| Config | Pydantic Settings + `entity_state` KV rows | |

### 1.3 Topology

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  FRONTEND :5173 (The Body)  │         │  BACKEND :8000 (The Brain)   │
│  Vite + React + TS          │  HTTP   │  FastAPI                     │
│                             │◄───────►│                              │
│  fetch() ── REST JSON       │  JSON   │  ├── agent.py  (loop)        │
│  EventSource ◄─ SSE stream  │  SSE    │  ├── llm.py    (GGUF)        │
│                             │         │  ├── exec.py   (subprocess)  │
│  Tailwind tokens            │         │  ├── danger.py (regex)       │
│  Framer Motion              │         │  ├── memory.py (sqlite3)     │
│  Voice Orb (SVG/CSS)        │         │  └── yusra.db                │
└─────────────────────────────┘         └──────────────────────────────┘
                    ▲
                    └── GGUF models in ~/.yusra/models/ (downloaded once)
```

**Ports:** `5173` (Vite) · `8000` (FastAPI).
**CORS (mandatory):** FastAPI `CORSMiddleware` allows `http://localhost:5173` and
`http://127.0.0.1:5173`. Without this, every call fails — it is wired in `main.py` on day one.

---

## 2. Frontend Architecture (React — The Body)

### 2.1 Folder Structure

```
src/
├── components/
│   ├── ui/            # Button, Card, Modal, Toggle, GlassPanel, LoadingHexagon
│   ├── layout/        # HeaderBar (was TitleBar), Sidebar, CommandBar, SplitPane
│   ├── chat/          # ChatPane, MessageList, MessageBubble, ChatInput, TypingIndicator
│   ├── code/          # CodePane, Terminal, SyntaxHighlighter, ExecutionStatus
│   ├── memory/        # MemoryGraph, MemoryNode (Phase 2 — deferred)
│   ├── onboarding/    # OnboardingFlow, WelcomeStep, PersonalityStep,
│   │                  # PermissionsStep, ActivationStep, CompletionStep
│   ├── voice/         # VoiceOrb, OrbRing, WaveformBars   ← Siri-style orb
│   ├── settings/      # SettingsPanel, ModelManager, TerminalSettings
│   └── danger/        # DangerModal, CommandPreview
├── hooks/
│   ├── useAgentStream.ts   # POST /chat + SSE consumption, step timeline state
│   ├── useDangerConfirm.ts # Pending-confirmation handshake
│   ├── useKeyboard.ts      # Ctrl+Space command bar, Esc closes overlays
│   └── useOrbState.ts      # idle → listening → thinking → speaking
├── stores/                 # Zustand: appStore, chatStore, dangerStore,
│   ...                     # settingsStore, onboardingStore (localStorage)
├── lib/
│   ├── api.ts              # ← THE transport seam. All fetch() lives here
│   ├── types.ts            # Mirrors backend Pydantic schemas 1:1
│   ├── constants.ts        # API_BASE, breakpoints
│   └── utils.ts
├── styles/globals.css      # CSS custom properties (DESIGN.md §13, verbatim)
├── App.tsx
└── main.tsx
```

### 2.2 Backend Communication (`src/lib/api.ts`)

Single typed client. Every former `invoke(...)` maps to a REST route:

| Old Tauri invoke | New call in `api.ts` |
|---|---|
| `llm_chat` | `POST ${API_BASE}/chat` |
| `llm_stream_chat` | `POST ${API_BASE}/chat/stream` (SSE) |
| `shell_execute_with_danger` | *(internal)* handled inside the agent loop |
| `confirm_danger` *(new)* | `POST ${API_BASE}/confirm/{id}` |
| `model_list/load/download/recommend` | `GET/POST ${API_BASE}/models/*` |
| `memory_search / memory_store` | `GET/POST ${API_BASE}/memory/*` |
| `get_persona / set_persona` | `GET/POST ${API_BASE}/persona` |
| `get_settings / update_settings` | `GET/POST ${API_BASE}/settings` |
| `get_device_info` | `GET ${API_BASE}/system/info` |

```ts
// lib/api.ts — canonical shape
const API_BASE = 'http://localhost:8000';

export async function chat(prompt: string, sessionId: string): Promise<AgentTurn> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, session_id: sessionId }),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

export function streamChat(prompt: string, sessionId: string, onEvent: (e: AgentEvent) => void) {
  // fetch + ReadableStream reader parsing `text/event-stream` frames
}
```

Health gate on boot: `App.tsx` pings `GET ${API_BASE}/health`; if unreachable, render a
"The Brain isn't running — start uvicorn" panel. This makes the decoupled setup self-explaining.

### 2.3 Design Tokens (Carry-over, unchanged)

- `styles.css` receives DESIGN.md §13 CSS variables **verbatim**
  (`--bg-primary:#1C1C1E`, `--accent-moss:#4A5D23`, glass levels, shadows, radii).
- `tailwind.config.js` extended with the `space/moss/tea` palettes, font families
  (Space Grotesk / Inter / JetBrains Mono), glass blur + shadow scales.
- `.glass-panel` + `::before` refractive-edge utility classes copied from DESIGN.md §3.

### 2.4 Onboarding — 3D-Like Framer Motion Spec

Spring config (global, from DESIGN.md §9): `{ type:'spring', stiffness:300, damping:30, mass:0.8 }`.
All 3D wrapped in `perspective: 1200px` containers; `AnimatePresence mode="wait"` between steps;
every transform has a `prefers-reduced-motion` fade-only variant.

| Step | Motion |
|---|---|
| 01 Welcome | Logo enters Z-axis: `initial={rotateX:-15, z:-80, opacity:0}` → `rotateX:0`, spring; headline/sub/CTA staggered fade-up 200ms apart; logo breathing loop `scale:1→1.02→1` (4s, repeat Infinity) |
| 02 Personality | Cards enter Y-axis: `initial={rotateY:15, opacity:0}` → `rotateY:0`, 100ms stagger; hover `scale:1.02` + moss glow shadow; select = `scale:0.98` spring bounce + 2px moss border + check overlay draw |
| 03 Permissions | Rows slide-in X (-24px→0) staggered; toggles animate thumb with spring, track fills `--accent-moss` |
| 04 Activation | Split pane grows from 100% chat → 50/50 via animated width; code lines type on char-by-char (30ms); terminal lines typewriter; success = 14 hexagon particles float up/fade (staggered, random x-drift) |
| 05 Completion | Checklist items sequential 200ms stagger, checkmark path draws (`pathLength:0→1`); CTA click → container `rotateY:0→90→(swap scene)→-90→0` while workspace fades in behind |

### 2.5 Siri-Style Voice Orb (SVG + CSS)

Composition (component `components/voice/VoiceOrb.tsx`):

1. **Outer halo** — `<svg>` circle with `filter: blur(18px)` + radial gradient
   `rgba(74,93,35,.35) → transparent` (moss, stays in 10% accent budget).
2. **Rotating conic ring** — SVG circle stroked with a conic gradient (moss → tea `#8993A3`),
   rotated by CSS `@keyframes spin 8s linear infinite`.
3. **Core blob** — div with layered radial gradients + organic morph:
   `@keyframes blob { border-radius: 42% 58% 61% 39%/45% 40% 60% 55% … }` (8-stop morph, 6s).
4. **Waveform bars** — 12 thin divs, `scaleY` keyframes with per-bar delays; only visible while `speaking`.

State machine (`useOrbState`) drives intensity via Framer Motion `animate` props:

| State | Ring speed | Blob scale | Bars | Halo |
|---|---|---|---|---|
| `idle` | 8s | 1.0 breathe | hidden | faint |
| `listening` | 4s | 1.06 | recording pulse | medium |
| `thinking` | 1.2s reverse | 0.94 pulse | hidden | bright |
| `speaking` | 3s | 1.04 | animating | bright |

Mic capture is a Phase-3 stub (Web Speech API behind a feature flag); the orb ships first as the
assistant-state visualizer wired to agent events (`thinking` on `step_start`, `speaking` on `speak`).

---

## 3. Backend Architecture (Python/FastAPI — The Brain)

### 3.1 File Structure

```
backend/
├── main.py        # FastAPI app: CORS, lifespan (init db + load active model), routes
├── schemas.py     # Pydantic: LlmResponse, Action, ChatRequest, AgentTurn, DangerRequest…
├── agent.py       # THE agentic loop (build context → infer → parse → risk → exec → feed back)
├── llm.py         # llama-cpp-python wrapper: load_model, generate, params, GGUF registry
├── memory.py      # sqlite3: episodic_memory, entity_state, downloaded_models, sessions
├── exec.py        # subprocess runner: timeout, cwd, shell pref, structured result
├── danger.py      # regex risk engine: SAFE→CRITICAL, confirmation token issue/await
├── persona.py     # yusra (hardcoded) / singularity (trait matrix) / custom prompt builders
├── downloads.py   # HuggingFace search/download with progress callback (Phase 2)
└── requirements.txt
```

Data dir: `%USERPROFILE%\.yusra\` → `models\`, `yusra.db`.

### 3.2 The Open-Interpreter Agentic Loop (Python Port)

```
POST /chat {prompt, session_id}
   │
   ▼
1. FORMAT      agent.py builds messages:
               [system: persona prompt + strict-JSON contract]
               [+ retrieved episodic memories] [+ conversation history]
               [+ previous tool results] [user prompt]
   │
   ▼
2. INFER       llm.generate(...)  (llama-cpp-python, temperature/top_p/max_tokens
               from entity_state; stop sequences; n_ctx 4096)
   │
   ▼
3. PARSE       Extract JSON → LlmResponse{ thought?, speak, action? }
               Robust mode: strip markdown fences, regex first {...} block,
               on failure re-prompt ONCE with the validation error appended
   │
   ▼
4. RISK        danger.assess(action.code)
               ├─ CRITICAL           → hard-block, emit blocked event, loop ends
               ├─ MEDIUM/HIGH        → pause: persist loop frame under
               │                       confirmation_id, return requires_confirmation:true
               └─ SAFE/LOW           → continue
   │
   ▼
5. EXECUTE     exec.run(action) via subprocess (timeout 30s, cwd from settings)
               stdout/stderr/exit_code captured
   │
   ▼
6. FEED BACK   Append assistant JSON + observation to context; loop to 1
               until action.type == "done" | action == null | max_iterations(10)
   │
   ▼
RESPONSE       AgentTurn{ steps[], final_speak, status, session_id }
               → stored to episodic_memory, returned to React
```

LLM contract (identical schema to DEV.md §2 — unchanged):

```json
{
  "thought": "internal reasoning (optional)",
  "speak": "user-facing narration",
  "action": { "type": "shell|python|file_read|file_write|done",
              "code": "...", "path": null, "content": null }
}
```

Loop guards: `max_iterations=10`, per-exec timeout 30s, whole-turn budget 120s.

### 3.3 API Surface (`main.py`)

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | `{status:"ok", model_loaded:bool}` |
| POST | `/chat` | Synchronous full turn (primary v1 path) |
| POST | `/chat/stream` | Same loop as SSE: `step_start/thought/code/observation/speak/done` frames |
| POST | `/confirm/{id}` | `{approved:bool}` → resumes or aborts a paused loop frame |
| GET/POST | `/settings` | Read/write `entity_state` keys |
| GET/POST | `/persona` | Get/set persona (yusra \| singularity+traits \| custom) |
| GET/POST | `/memory/search`, `/memory/all` | Episodic queries for graph/sidebar |
| GET | `/models` · POST `/models/load` | Registry + swap active GGUF (download in Phase 2) |
| GET | `/system/info` | RAM/CPU/GPU snapshot for the Fit gauge |

---

## 4. The Danger Loop (Python)

`danger.py` compiles three pattern sets once (`re.IGNORECASE`) and scores every action:

```python
CRITICAL = [ r"rm\s+-rf\s+/",  r"rm\s+-rf\s+~",  r"rmdir\s+/s\s+/q",
             r"format\s+[cCdD]:",  r"del\s+/[sS]\s+[cC]:\\",
             r"mkfs\.",  r"dd\s+if=.*of=/dev/" ]
HIGH     = [ r"rm\s+-rf\s+",  r"rm\s+-r\s+",  r"rmdir\s+",  r"del\s+/[sS]\s+",
             r"sudo\s+rm",  r"chmod\s+777",  r"kill\s+-9",  r"taskkill\s+/f",
             r"remove-item\s+-recurse",  r"remove-item\s+.*-force" ]
MEDIUM   = [ r"\brm\s+",  r"\bdel\s+",  r"\bmv\s+",  r"\bchmod\s+",  r"\bchown\s+",
             r"\bsudo\b",  r"net\s+user",  r"net\s+localgroup" ]
LOW      = [ r"mkdir\s+",  r"touch\s+",  r"echo\s+.*>",  r"\bcp\s+",  r"\bcopy\s+" ]
```

Behavior matrix:

| Level | Action | Frontend effect |
|---|---|---|
| SAFE/LOW | Auto-execute | Terminal streams result |
| MEDIUM/HIGH | Pause loop, persist frame, respond with `requires_confirmation: true` | Screen dims → **DangerModal** (glass-heavy, moss warning hexagon, mono command preview, Approve/Deny) → `POST /confirm/{id}` resumes |
| CRITICAL | Never executed | Blocked banner: "This command is too dangerous and has been blocked." |

Wire payload shown to React on pause:

```json
{
  "status": "pending_confirmation",
  "confirmation_id": "uuid",
  "command": "Remove-Item -Recurse -Force C:\\Users\\admin\\Projects",
  "risk_level": "high",
  "explanation": "Permanently deletes the target directory tree."
}
```

Safe-path auto-approve (`safe_paths` in `entity_state`) upgrades LOW-risk ops inside
approved directories to silent execution — ported from DEV.md §8.

---

## 5. Memory System (SQLite — schema unchanged)

`~/.yusra/yusra.db`, `PRAGMA journal_mode=WAL`, guarded by a module-level `threading.Lock`.

Tables (verbatim from DEV.md §6): `episodic_memory` (graph layer: prompt, response,
timestamp, links_json, session_id, actions_taken) · `entity_state` (KV: persona, traits,
inference params, terminal prefs, safe_paths, onboarding_complete) ·
`downloaded_models` (registry, is_active) · `sessions`.

`memory.py` exposes: `init_db()`, `store_memory()`, `search_memories(q, limit)`
(LIKE-based v1), `get_state()/set_state()`, model-registry CRUD.
Every completed agent turn writes one episodic row → feeds the future Memory Graph.

---

## 6. Execution Plan

### Phase 0 — Prep (repo hygiene)
- Keep root as the frontend; leave `src-tauri/` untouched-but-orphaned (delete in cleanup commit).
- Add `.gitignore` entries: `backend/.venv/`, `*.gguf`, `backend/__pycache__/`.

### Phase 1 — Backend Skeleton (day 1)
```powershell
cd E:\Yusra
python -m venv backend\.venv
backend\.venv\Scripts\activate
pip install fastapi "uvicorn[standard]" llama-cpp-python pydantic
```
Build `schemas.py`, `memory.py`, `main.py` with CORS + `/health`.
**Verify:** `uvicorn main:app --reload --port 8000` → open `http://localhost:8000/docs` → `GET /health` = ok.

### Phase 2 — LLM Engine
- `llm.py`: `Llama(model_path, n_ctx=4096, n_gpu_layers=0, verbose=False)`;
  generate with sampling params from settings; place any Q4_K_M GGUF (e.g. Phi-3.5-mini,
  2.3GB — recommended tier for 8–16GB RAM) into `~/.yusra/models/`.
- `POST /models/load` + `GET /models`.
**Verify:** `/docs` → load model → raw completion returns text.

### Phase 3 — Agent Loop + Danger
- `agent.py` loop (§3.2), `exec.py` runner, `danger.py` engine, `/confirm/{id}`, `/chat/stream` SSE.
**Verify:** curl tests — (a) `"create hello.txt"` → shell action executes, file exists;
(b) `"run rm -rf / test"` → `requires_confirmation:true` returned, nothing executed;
(c) deny → loop aborts gracefully; (d) approve → executes.

### Phase 4 — Frontend Migration
```powershell
npm install framer-motion zustand lucide-react react-markdown shiki
```
- Delete `@tauri-apps/*` imports; replace `lib/ipc.ts` → new `lib/api.ts` (§2.2).
- Wire chat pane to `/chat/stream`; implement `DangerModal` against `/confirm/{id}`;
  boot health-gate panel.
**Verify:** `npm run dev` → full conversation with live code pane + one confirmed risky op.

### Phase 5 — Onboarding + Voice Orb Polish
- Build 5 onboarding steps with the §2.4 motion specs (persist `onboarding_complete`).
- Ship `VoiceOrb` state machine (§2.5) bound to agent events.
**Verify:** fresh-profile walkthrough; reduced-motion toggle kills 3D transforms.

### Running the App (daily driver)

```powershell
# Terminal 1 — The Brain
cd E:\Yusra\backend
.\.venv\Scripts\activate
uvicorn main:app --reload --port 8000

# Terminal 2 — The Body
cd E:\Yusra
npm run dev          # → http://localhost:5173
```

Optional kiosk feel: `chrome --app=http://localhost:5173`.

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Small GGUF emits invalid JSON | Strict prompt + fence-stripping + one-shot repair re-prompt (§3.2.3); temperature ≤0.4 default for actions |
| llama-cpp-python Windows install friction | CPU wheels exist for py3.10–3.12; pin versions; CUDA = optional prebuilt wheel, never blocks CPU path |
| CORS/port mismatch | CORS middleware day-one; health-gate panel diagnoses instantly |
| `shell=True` blast radius | Danger regex gate BEFORE exec, timeouts, cwd sandboxing, safe_paths allowlist |
| Long loops hang UI | Max 10 iterations + 120s turn budget; SSE keeps user informed per step |
| Feature creep (voice/graph/downloads) | Explicitly phased: orb visual P1, mic/STT-TTS + HF downloader + React-Flow graph = Phase 3+ |

---

*End of PLAN.md — build order: Phase 1 → 5. Do not begin coding until this file is committed.*
