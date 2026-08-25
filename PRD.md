YUSRA — Product Requirements Document (Desktop v1.0)
1. Overview
Yusra is a 100% offline, production-grade desktop AI entity. She operates on an Open-Interpreter-style agentic loop (LLM writes code, executes it, observes results) powered by a local Rust inference engine. She features a hybrid memory system, dynamic LLM fitting, and a premium "Deep Carbon" Liquid Glass UI.

This repository (Yusra) serves as the foundational desktop application. Future mobile ports (Yusra_App) will derive from this codebase.

2. Technology Stack
Core Framework: Tauri 2.0 (Native Rust backend + Webview frontend).
Backend (Rust):
candle-core / candle-transformers: Local GGUF/BitNet inference.
rusqlite: Hybrid memory database.
sysinfo + custom llmfit logic: Device profiling and model recommendation.
std::process::Command: Agentic code execution.
Frontend (Web):
React 18 + Vite (TypeScript).
TailwindCSS (Strict design token enforcement).
Framer Motion (60fps physics-based 3D animations).
Lucide Icons (Minimalist, 1.5px stroke).
3. Design System: Deep Carbon Liquid Glass
The aesthetic is high-tech, stark, and premium (inspired by Arc, Linear, and Astryx).

Deep Carbon Base: #0A0A0C (Ultra-dark background canvas).
Glass Surface: rgba(20, 20, 24, 0.7) (Primary frosted panel fill with backdrop-filter: blur(40px)).
Refractive Edge: rgba(255, 255, 255, 0.12) (Subtle 1px top border for light refraction).
Text Primary: #FFFFFF (Crisp stark white).
Text Muted: #8E8E93 (Neutral silver-gray).
Ice Cyan Accent: #00F0FF (Exclusive for active states, focus rings, and highlights).
Interactive Glow: rgba(0, 240, 255, 0.15) (Soft cyan box-shadow for hovered elements).
Typography: 'Space Grotesk' (Headers), 'Inter' (Body).
4. Frontend Specifications (Features)
The UI is a single-window desktop app with a collapsible sidebar and floating command bar.

The Command Bar (Omni-Overlay): Triggered by Ctrl+Space. A floating, glassmorphic search bar drops down from the top. Users type natural language commands; Yusra parses them into executable code.
The Agentic Workspace (Split Pane):
Left Pane: Chat interface (Yusra's thoughts and responses).
Right Pane: Live Code/Terminal view. Renders the code Yusra is writing and the stdout/stderr of the execution in real-time.
The Memory Graph Visualizer: An interactive node graph (using D3.js or React Flow) in the sidebar. It displays Yusra's episodic memory forming in real-time.
The LLM Fit Manager: A settings panel showing a visual gauge of the device's CPU/RAM. A button "Find Best Model" scrapes HuggingFace via llmfit logic, displays a sorted list, and downloads/loads the model with a progress bar.
The Danger Loop Modal: When Yusra attempts a risky command (e.g., rm -rf), the screen dims. A stark, Ice Cyan warning modal drops down requiring explicit user confirmation before execution.
5. User Tweakable Settings
Accessible via the Settings UI:

Inference: Temperature (0.0 - 1.0), Top_P (0.1 - 1.0), Max Tokens.
Active Model: Dropdown of downloaded GGUF models.
Terminal: Default working directory (cwd), Shell preference (bash/powershell/cmd).
UI: Glass blur intensity (Low/Med/High), Motion reduction toggle.
6. Backend & Database Specifications
Agentic Loop: ask_yusra(prompt) passes context to the LLM. The LLM outputs strict JSON containing thought, speak, and action (executable code). Rust parses this, executes the code, and loops the stdout back into the LLM context.
Danger Loop: Regex/heuristic analysis of commands. If RiskLevel == High || Critical, execution halts and returns requires_confirmation: true to the frontend.
Hybrid Memory (SQLite):
episodic_memory (Graph Layer): id, prompt, response, timestamp, embedding_blob, links_json.
entity_state (KV Document Layer): key, value_json (Stores user preferences, active personality, avatar state).
downloaded_models: id, model_name, local_path, is_active.