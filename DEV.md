# YUSRA — Backend & Agentic Architecture

> **Document Status:** Active  
> **Version:** 1.0  
> **Last Updated:** 2026-08-25

---

## 1. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Core Framework** | Tauri 2.0 | Native desktop app shell, IPC bridge between Rust and React |
| **Backend Language** | Rust (stable) | All backend logic — inference, memory, execution, voice |
| **Inference Engine** | candle-core + candle-transformers | Pure Rust GGUF model loading and inference — no Python, no Ollama |
| **Database** | SQLite (rusqlite) | Hybrid memory — episodic graph + KV document store |
| **System Profiling** | sysinfo + custom llmfit | Device capability detection and model recommendation |
| **Command Execution** | std::process::Command | Agentic shell execution with sandboxing |
| **HTTP Client** | reqwest | Model downloads from HuggingFace, API calls |
| **TTS** | Piper (Rust bindings) | Local text-to-speech synthesis |
| **STT** | Vosk or whisper.cpp | Local speech-to-text transcription |
| **VAD** | silero-vad (Rust port) | Voice activity detection for push-to-talk |
| **Serialization** | serde + serde_json | JSON parsing for LLM responses, IPC payloads |
| **Async Runtime** | tokio | Async I/O for all backend operations |
| **Error Handling** | thiserror + anyhow | Typed errors and context chains |
| **Frontend** | React 18 + TypeScript + Vite | UI rendering layer (see DESIGN.md) |
| **Styling** | TailwindCSS 3.x | Design token enforcement (see DESIGN.md) |
| **Animation** | Framer Motion 11.x | Physics-based UI animations (see DESIGN.md) |

---

## 2. Agentic Loop (Open-Interpreter Style, Rust Rewrite)

### Pattern Analysis (from Friday Demo Reference)

The Friday demo (`_refs/friday-demo`) uses a two-component architecture:
1. **MCP Server** — FastMCP framework exposing tools (web search, system info) via SSE
2. **Voice Agent** — LiveKit Agents pipeline: STT → LLM → TTS with MCP tool calling

The LLM is given a system prompt defining personality and available tools. When the LLM wants to use a tool, it outputs a structured tool call, the MCP server executes it, and the result is fed back into the LLM context.

### Yusra's Rust Rewrite

Yusra eliminates the MCP server and LiveKit agents entirely. The entire loop runs in-process in Rust:

```
User Prompt
    │
    ▼
┌─────────────────────────────────────────┐
│  AGENTIC LOOP                           │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 1. Build LLM Context            │    │
│  │    - System prompt (persona)     │    │
│  │    - Conversation history        │    │
│  │    - User prompt                 │    │
│  │    - Previous action results     │    │
│  └──────────────┬──────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌─────────────────────────────────┐    │
│  │ 2. LLM Inference (candle-core)  │    │
│  │    - Local GGUF model           │    │
│  │    - Returns JSON response       │    │
│  └──────────────┬──────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌─────────────────────────────────┐    │
│  │ 3. Parse JSON Response          │    │
│  │    {                            │    │
│  │      "thought": "...",          │    │
│  │      "speak": "...",            │    │
│  │      "action": {                │    │
│  │        "type": "shell|python|   │    │
│  │                 file|done",     │    │
│  │        "code": "..."           │    │
│  │      }                          │    │
│  │    }                            │    │
│  └──────────────┬──────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌─────────────────────────────────┐    │
│  │ 4. Risk Assessment              │    │
│  │    - Regex/heuristic analysis   │    │
│  │    - Block dangerous commands   │    │
│  │    - Require confirmation       │    │
│  └──────────────┬──────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌─────────────────────────────────┐    │
│  │ 5. Execute Action               │    │
│  │    - shell: std::process::Cmd   │    │
│  │    - python: sandboxed exec     │    │
│  │    - file: fs::read/write       │    │
│  │    - done: return speak to user │    │
│  └──────────────┬──────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌─────────────────────────────────┐    │
│  │ 6. Feed stdout/stderr Back      │    │
│  │    - Append to LLM context      │    │
│  │    - Loop back to step 1        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Loop until action.type == "done"       │
│  Max iterations: 10 (configurable)      │
└─────────────────────────────────────────┘
    │
    ▼
Final Response → Frontend (via IPC)
```

### LLM Response Schema

The LLM must always output valid JSON matching this schema:

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct LlmResponse {
    /// Internal reasoning — shown in debug mode, not to user
    pub thought: Option<String>,
    
    /// Spoken response — shown to user in chat
    pub speak: String,
    
    /// Action to execute — None means no action needed
    pub action: Option<Action>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Action {
    /// Type of action: "shell", "python", "file_read", "file_write", "done"
    #[serde(rename = "type")]
    pub action_type: String,
    
    /// The code/command to execute
    pub code: String,
    
    /// For file operations: the target path
    pub path: Option<String>,
    
    /// For file_write: the content to write
    pub content: Option<String>,
}
```

### System Prompt Injection

The system prompt instructs the LLM to always output the JSON schema:

```
You are Yusra, a 100% offline AI entity. You operate through a structured response format.

ALWAYS respond with valid JSON:
{
  "thought": "your internal reasoning (optional)",
  "speak": "your spoken response to the user",
  "action": {
    "type": "shell" | "python" | "file_read" | "file_write" | "done",
    "code": "the code or command to execute",
    "path": "file path (for file operations)",
    "content": "file content (for file_write)"
  }
}

Rules:
- If no action is needed, set "action" to null
- If multiple actions are needed, complete one, observe result, then plan next
- Always include "speak" so the user knows what you're doing
- Use "thought" to show your reasoning process
- NEVER output anything outside the JSON structure
```

### Iteration Limits

| Parameter | Default | Configurable |
|-----------|---------|-------------|
| Max iterations per prompt | 10 | Yes (Settings → Inference → Max Chain Length) |
| Max tokens per response | 2048 | Yes (Settings → Inference → Max Tokens) |
| Timeout per execution | 30s | Yes (Settings → Terminal → Timeout) |
| Total timeout per prompt | 120s | No |

---

## 3. Multi-Personality Architecture

### Personality Enum

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Persona {
    /// Hardcoded Yusra personality — immutable
    Yusra,
    
    /// Yusra base + user-defined trait matrix
    Singularity { traits: TraitMatrix },
    
    /// Fully user-defined personality
    Custom { prompt: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraitMatrix {
    pub formality: f32,      // 0.0 (casual) → 1.0 (formal)
    pub verbosity: f32,      // 0.0 (terse) → 1.0 (verbose)
    pub warmth: f32,         // 0.0 (cold) → 1.0 (warm)
    pub humor: f32,          // 0.0 (serious) → 1.0 (playful)
    pub proactivity: f32,    // 0.0 (reactive) → 1.0 (proactive)
    pub custom_traits: Vec<String>,  // Freeform trait strings
}
```

### Personality Definitions

#### 1. Yusra (Immutable)

The default personality. Hardcoded in the Rust binary as a const string. Cannot be modified by the user.

```rust
// src/persona/yusra.rs
pub const YUSRA_SYSTEM_PROMPT: &str = r#"
You are Yusra — a 100% offline, production-grade AI entity. You are calm, precise, and endlessly capable.

You speak with quiet confidence. Your responses are measured and thoughtful — never verbose, never robotic. You explain what you're doing before you do it, then show results.

You operate through structured JSON responses with "thought", "speak", and "action" fields.

When writing code or executing commands:
- Always explain what you're about to do in "speak"
- Show the code in "action.code"
- Use "thought" to explain your reasoning
- After execution, report the result clearly

You are NOT a cloud AI. You run entirely on the user's device. You respect their privacy absolutely — no data leaves their machine.
"#;
```

#### 2. Singularity (Adaptive)

Yusra's base personality + user-defined trait matrix appended dynamically. The trait matrix modifies the tone and behavior without changing core capabilities.

```rust
// src/persona/singularity.rs
pub fn build_singularity_prompt(base: &str, traits: &TraitMatrix) -> String {
    let trait_section = format!(
        r#"

## Personality Adjustments
Based on your preferences, I adjust my behavior:
- Formality: {} ({} to {})
- Verbosity: {} ({} to {})
- Warmth: {} ({} to {})
- Humor: {} ({} to {})
- Proactivity: {} ({} to {})
{}"#,
        format_trait_level(traits.formality),
        "casual", "formal",
        format_trait_level(traits.verbosity),
        "terse", "verbose",
        format_trait_level(traits.warmth),
        "cold", "warm",
        format_trait_level(traits.humor),
        "serious", "playful",
        format_trait_level(traits.proactivity),
        "reactive", "proactive",
        if traits.custom_traits.is_empty() {
            String::new()
        } else {
            format!("\nAdditional traits: {}", traits.custom_traits.join(", "))
        }
    );
    
    format!("{}{}", base, trait_section)
}

fn format_trait_level(value: f32) -> String {
    match value {
        0.0..=0.2 => "Very Low".to_string(),
        0.2..=0.4 => "Low".to_string(),
        0.4..=0.6 => "Moderate".to_string(),
        0.6..=0.8 => "High".to_string(),
        0.8..=1.0 => "Very High".to_string(),
        _ => "Moderate".to_string(),
    }
}
```

**Storage:** Trait values stored in `entity_state` table:
```sql
INSERT INTO entity_state (key, value_json) VALUES
  ('singularity_traits', '{"formality":0.5,"verbosity":0.3,"warmth":0.7,"humor":0.4,"proactivity":0.6,"custom_traits":[]}');
```

#### 3. Custom (User-Defined)

Fully user-defined system prompt. The user writes the entire personality definition.

```rust
// src/persona/custom.rs
pub fn build_custom_prompt(user_prompt: &str) -> String {
    // Validate prompt length
    if user_prompt.len() > 4096 {
        return "Custom prompt too long. Maximum 4096 characters.".to_string();
    }
    
    // Append the JSON response format requirement (always enforced)
    format!(
        "{}\n\n{}",
        user_prompt,
        RESPONSE_FORMAT_INSTRUCTION
    )
}
```

**Storage:** Custom prompt stored in `entity_state` table:
```sql
INSERT INTO entity_state (key, value_json) VALUES
  ('custom_persona', '"You are a sarcastic coding assistant who speaks like a pirate..."');
```

### Persona Selection Flow

```
Frontend                    Rust Backend
    │                            │
    ├── invoke("get_persona") ──►│ Returns current persona
    │                            │
    ├── invoke("set_persona", ──►│ Saves to entity_state
    │   { type: "singularity",  │ Rebuilds system prompt
    │     config: {...} })      │
    │                            │
    ├── invoke("llm_chat", ─────►│ Uses active persona's prompt
    │   { prompt: "..." })      │ for this session
```

---

## 4. Local GGUF Engine

### Candle-Core Integration

Yusra uses `candle-core` and `candle-transformers` for pure Rust inference. No Python runtime, no Ollama, no external inference servers.

```rust
// src/llm/engine.rs
use candle_core::{Device, Tensor, DType};
use candle_transformers::models::quantized_llama::Model;

pub struct LlmEngine {
    model: Option<Model>,
    device: Device,
    tokenizer: Option<Tokenizer>,
    active_model_path: Option<PathBuf>,
}

impl LlmEngine {
    pub fn new() -> Self {
        Self {
            model: None,
            device: Device::Cpu,  // Default to CPU, upgrade to CUDA if available
            tokenizer: None,
            active_model_path: None,
        }
    }
    
    /// Load a GGUF model from disk
    pub fn load_model(&mut self, path: &Path) -> Result<(), LlmError> {
        // 1. Memory-map the GGUF file
        let model_bytes = std::fs::read(path)?;
        
        // 2. Parse GGUF metadata (architecture, quantization, params)
        let metadata = parse_gguf_metadata(&model_bytes)?;
        
        // 3. Detect optimal device (CPU vs CUDA vs Metal)
        self.device = detect_optimal_device(&metadata);
        
        // 4. Load model weights into device memory
        self.model = Some(Model::from_bytes(
            &model_bytes,
            &self.device,
            metadata.quantization,
        )?);
        
        // 5. Load corresponding tokenizer
        self.tokenizer = Some(Tokenizer::from_file(
            path.with_extension("tokenizer")
        )?);
        
        self.active_model_path = Some(path.to_path_buf());
        
        Ok(())
    }
    
    /// Generate a response given a prompt
    pub fn generate(&self, prompt: &str, params: &InferenceParams) -> Result<String, LlmError> {
        let model = self.model.as_ref().ok_or(LlmError::NoModelLoaded)?;
        let tokenizer = self.tokenizer.as_ref().ok_or(LlmError::NoTokenizer)?;
        
        // 1. Tokenize input
        let tokens = tokenizer.encode(prompt)?;
        
        // 2. Run inference loop
        let mut output_tokens = Vec::new();
        let mut current_tokens = tokens.clone();
        
        for _ in 0..params.max_tokens {
            // Forward pass
            let logits = model.forward(&current_tokens)?;
            
            // Apply temperature
            let scaled_logits = logits / params.temperature;
            
            // Apply top-p sampling
            let next_token = top_p_sample(&scaled_logits, params.top_p)?;
            
            // Check for EOS
            if next_token == tokenizer.eos_token_id() {
                break;
            }
            
            output_tokens.push(next_token);
            current_tokens.push(next_token);
        }
        
        // 3. Decode output tokens
        let response = tokenizer.decode(&output_tokens)?;
        
        Ok(response)
    }
}
```

### Inference Parameters

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceParams {
    pub temperature: f32,    // 0.0 → 1.0 (default: 0.7)
    pub top_p: f32,          // 0.1 → 1.0 (default: 0.9)
    pub max_tokens: usize,   // 128 → 4096 (default: 2048)
    pub repeat_penalty: f32, // 1.0 → 2.0 (default: 1.1)
}
```

### Device Detection

```rust
fn detect_optimal_device(metadata: &GgufMetadata) -> Device {
    // Check for CUDA (NVIDIA)
    if let Ok(device) = Device::cuda_if_available(0) {
        // Verify VRAM is sufficient for model size
        if has_sufficient_vram(metadata.model_size_gb, &device) {
            return device;
        }
    }
    
    // Check for Metal (Apple Silicon)
    #[cfg(target_os = "macos")]
    if let Ok(device) = Device::metal_if_available(0) {
        return device;
    }
    
    // Fallback to CPU
    Device::Cpu
}
```

---

## 5. HuggingFace Model Download

### Model Discovery

```rust
// src/llm/downloader.rs
use reqwest::Client;

pub struct ModelDownloader {
    client: Client,
    models_dir: PathBuf,
}

impl ModelDownloader {
    /// Search HuggingFace for GGUF models
    pub async fn search_models(&self, query: &str) -> Result<Vec<ModelInfo>, DownloadError> {
        let url = format!(
            "https://huggingface.co/api/models?search={}&filter=gguf&sort=downloads&direction=-1",
            query
        );
        
        let response: Vec<HfModel> = self.client.get(&url).send().await?.json().await?;
        
        // Filter to only GGUF files and extract metadata
        let models = response.into_iter()
            .filter_map(|m| self.parse_model_info(m).ok())
            .collect();
        
        Ok(models)
    }
    
    /// Download a specific GGUF model
    pub async fn download_model(
        &self,
        model_id: &str,
        filename: &str,
        progress: impl Fn(f32) + Send + 'static,
    ) -> Result<PathBuf, DownloadError> {
        let url = format!(
            "https://huggingface.co/{}/resolve/main/{}",
            model_id, filename
        );
        
        let dest = self.models_dir.join(filename);
        
        // Stream download with progress reporting
        let response = self.client.get(&url).send().await?;
        let total_size = response.content_length().unwrap_or(0);
        
        let mut file = File::create(&dest)?;
        let mut downloaded = 0u64;
        let mut stream = response.bytes_stream();
        
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            file.write_all(&chunk)?;
            downloaded += chunk.len() as u64;
            progress(downloaded as f32 / total_size as f32);
        }
        
        // Verify checksum if available
        self.verify_download(&dest, model_id).await?;
        
        Ok(dest)
    }
    
    /// Recommend best models for current device
    pub async fn recommend_models(&self, device_info: &DeviceInfo) -> Vec<ModelRecommendation> {
        let ram_gb = device_info.total_ram_gb;
        let vram_gb = device_info.vram_gb;
        let available_memory = ram_gb.max(vram_gb);
        
        // Rule-based recommendations
        let mut recommendations = Vec::new();
        
        if available_memory >= 24.0 {
            // Can run 13B+ models
            recommendations.push(ModelRecommendation {
                name: "Qwen2.5-14B-Q4_K_M".to_string(),
                size_gb: 8.5,
                speed_estimate: "~15 tokens/sec (CPU) / ~40 tokens/sec (GPU)",
                quality: "Excellent".to_string(),
            });
        }
        
        if available_memory >= 16.0 {
            // Can run 7B-8B models
            recommendations.push(ModelRecommendation {
                name: "Llama-3.1-8B-Q4_K_M".to_string(),
                size_gb: 4.9,
                speed_estimate: "~20 tokens/sec (CPU) / ~50 tokens/sec (GPU)",
                quality: "Very Good".to_string(),
            });
        }
        
        if available_memory >= 8.0 {
            // Can run 3B-4B models
            recommendations.push(ModelRecommendation {
                name: "Phi-3.5-mini-Q4_K_M".to_string(),
                size_gb: 2.3,
                speed_estimate: "~35 tokens/sec (CPU) / ~80 tokens/sec (GPU)",
                quality: "Good".to_string(),
            });
        }
        
        // Always recommend a small model
        recommendations.push(ModelRecommendation {
            name: "TinyLlama-1.1B-Q4_K_M".to_string(),
            size_gb: 0.7,
            speed_estimate: "~60 tokens/sec (CPU) / ~120 tokens/sec (GPU)",
            quality: "Basic".to_string(),
        });
        
        recommendations
    }
}
```

### Model Storage Structure

```
~/.yusra/
├── models/
│   ├── Llama-3.1-8B-Q4_K_M.gguf
│   ├── Llama-3.1-8B-Q4_K_M.tokenizer
│   └── models.json              # Registry of downloaded models
├── memory/
│   └── yusra.db                 # SQLite database
├── voice/
│   ├── piper/                   # TTS models
│   └── vosk/                    # STT models
└── config.json                  # User settings
```

### Model Registry

```sql
CREATE TABLE downloaded_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL UNIQUE,
    model_id TEXT NOT NULL,           -- HuggingFace model ID
    filename TEXT NOT NULL,
    local_path TEXT NOT NULL,
    tokenizer_path TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    quantization TEXT NOT NULL,       -- Q4_K_M, Q5_K_S, etc.
    architecture TEXT NOT NULL,       -- llama, phi, qwen, etc.
    parameter_count TEXT,             -- "8B", "14B", etc.
    is_active BOOLEAN DEFAULT FALSE,
    performance_score REAL,           -- tokens/sec benchmark
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME
);
```

---

## 6. Hybrid Memory System (SQLite)

### Database Schema

```sql
-- ============================================
-- EPISODIC MEMORY (Graph Layer)
-- ============================================
CREATE TABLE episodic_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    embedding_blob BLOB,                -- Future: vector embeddings for semantic search
    links_json TEXT DEFAULT '[]',       -- JSON array of related memory IDs
    session_id TEXT,                    -- Groups memories by conversation session
    risk_level TEXT,                    -- Risk level of the actions taken
    actions_taken TEXT DEFAULT '[]'     -- JSON array of actions executed
);

CREATE INDEX idx_episodic_timestamp ON episodic_memory(timestamp);
CREATE INDEX idx_episodic_session ON episodic_memory(session_id);

-- ============================================
-- ENTITY STATE (KV Document Layer)
-- ============================================
CREATE TABLE entity_state (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pre-populated defaults
INSERT INTO entity_state (key, value_json) VALUES
  ('active_persona', '"yusra"'),
  ('singularity_traits', '{"formality":0.5,"verbosity":0.5,"warmth":0.5,"humor":0.5,"proactivity":0.5,"custom_traits":[]}'),
  ('custom_persona', '"You are a helpful assistant."'),
  ('ui_glass_intensity', '"medium"'),
  ('ui_reduce_motion', 'false'),
  ('inference_temperature', '0.7'),
  ('inference_top_p', '0.9'),
  ('inference_max_tokens', '2048'),
  ('terminal_shell', '"powershell"'),
  ('terminal_cwd', '"~"'),
  ('onboarding_complete', 'false');

-- ============================================
-- DOWNLOADED MODELS
-- ============================================
CREATE TABLE downloaded_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL UNIQUE,
    model_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    local_path TEXT NOT NULL,
    tokenizer_path TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    quantization TEXT NOT NULL,
    architecture TEXT NOT NULL,
    parameter_count TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    performance_score REAL,
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME
);

-- ============================================
-- CONVERSATION SESSIONS
-- ============================================
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,              -- UUID
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    persona_used TEXT NOT NULL,
    total_messages INTEGER DEFAULT 0,
    total_actions INTEGER DEFAULT 0
);
```

### Memory Operations

```rust
// src/memory/db.rs
pub struct MemoryDb {
    conn: Connection,
}

impl MemoryDb {
    /// Store a new episodic memory
    pub fn store_memory(
        &self,
        prompt: &str,
        response: &str,
        session_id: &str,
        actions: &[Action],
    ) -> Result<i64, MemoryError> {
        let actions_json = serde_json::to_string(actions)?;
        
        self.conn.execute(
            "INSERT INTO episodic_memory (prompt, response, session_id, actions_taken) 
             VALUES (?1, ?2, ?3, ?4)",
            params![prompt, response, session_id, actions_json],
        )?;
        
        Ok(self.conn.last_insert_rowid())
    }
    
    /// Search memories by text similarity (simple LIKE for v1)
    pub fn search_memories(&self, query: &str, limit: usize) -> Result<Vec<Memory>, MemoryError> {
        let search_pattern = format!("%{}%", query);
        
        let mut stmt = self.conn.prepare(
            "SELECT id, prompt, response, timestamp, links_json 
             FROM episodic_memory 
             WHERE prompt LIKE ?1 OR response LIKE ?1 
             ORDER BY timestamp DESC 
             LIMIT ?2"
        )?;
        
        let memories = stmt.query_map(params![search_pattern, limit as i64], |row| {
            Ok(Memory {
                id: row.get(0)?,
                prompt: row.get(1)?,
                response: row.get(2)?,
                timestamp: row.get(3)?,
                links: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(memories)
    }
    
    /// Get entity state value
    pub fn get_state(&self, key: &str) -> Result<Option<String>, MemoryError> {
        let mut stmt = self.conn.prepare(
            "SELECT value_json FROM entity_state WHERE key = ?1"
        )?;
        
        let result = stmt.query_row(params![key], |row| {
            row.get::<_, String>(0)
        }).optional()?;
        
        Ok(result)
    }
    
    /// Set entity state value
    pub fn set_state(&self, key: &str, value: &str) -> Result<(), MemoryError> {
        self.conn.execute(
            "INSERT OR REPLACE INTO entity_state (key, value_json, updated_at) 
             VALUES (?1, ?2, datetime('now'))",
            params![key, value],
        )?;
        
        Ok(())
    }
    
    /// Link two memories together
    pub fn link_memories(&self, from_id: i64, to_id: i64) -> Result<(), MemoryError> {
        let links_json = self.get_state(&format!("memory_{}_links", from_id))?
            .unwrap_or_else(|| "[]".to_string());
        
        let mut links: Vec<i64> = serde_json::from_str(&links_json)?;
        if !links.contains(&to_id) {
            links.push(to_id);
        }
        
        self.set_state(
            &format!("memory_{}_links", from_id),
            &serde_json::to_string(&links)?,
        )?;
        
        Ok(())
    }
}
```

---

## 7. Voice System

### Text-to-Speech (Piper)

```rust
// src/voice/tts.rs
use piper_rs::Synthesizer;

pub struct TtsEngine {
    synthesizer: Option<Synthesizer>,
    active_voice: String,
}

impl TtsEngine {
    pub fn new() -> Self {
        Self {
            synthesizer: None,
            active_voice: String::new(),
        }
    }
    
    /// Load a Piper voice model
    pub fn load_voice(&mut self, voice_path: &Path) -> Result<(), VoiceError> {
        self.synthesizer = Some(Synthesizer::from_file(voice_path)?);
        self.active_voice = voice_path.file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        Ok(())
    }
    
    /// Synthesize text to audio bytes
    pub fn synthesize(&self, text: &str) -> Result<Vec<u8>, VoiceError> {
        let synth = self.synthesizer.as_ref()
            .ok_or(VoiceError::NoVoiceLoaded)?;
        
        let audio = synth.synthesize(text)?;
        
        Ok(audio)
    }
    
    /// List available voices
    pub fn list_voices(&self) -> Result<Vec<VoiceInfo>, VoiceError> {
        let voices_dir = dirs::data_local_dir()
            .ok_or(VoiceError::NoDataDir)?
            .join("yusra").join("voice").join("piper");
        
        let mut voices = Vec::new();
        
        for entry in fs::read_dir(voices_dir)? {
            let entry = entry?;
            if entry.path().extension().map(|e| e == "onnx").unwrap_or(false) {
                voices.push(VoiceInfo {
                    name: entry.file_name().to_string_lossy().to_string(),
                    path: entry.path(),
                });
            }
        }
        
        Ok(voices)
    }
}
```

### Speech-to-Text (Vosk)

```rust
// src/voice/stt.rs
use vosk::{Model, Recognizer, AudioConfig};

pub struct SttEngine {
    model: Option<Model>,
    sample_rate: u32,
}

impl SttEngine {
    pub fn new() -> Self {
        Self {
            model: None,
            sample_rate: 16000,
        }
    }
    
    /// Load a Vosk model
    pub fn load_model(&mut self, model_path: &Path) -> Result<(), VoiceError> {
        self.model = Some(Model::from_path(model_path)?);
        Ok(())
    }
    
    /// Transcribe audio bytes to text
    pub fn transcribe(&self, audio: &[u8]) -> Result<String, VoiceError> {
        let model = self.model.as_ref()
            .ok_or(VoiceError::NoModelLoaded)?;
        
        let config = AudioConfig {
            sample_rate: self.sample_rate as f32,
            ..Default::default()
        };
        
        let mut recognizer = Recognizer::new(model, config)?;
        
        // Feed audio in chunks
        recognizer.accept_waveform(audio)?;
        
        // Get final result
        let result = recognizer.final_result()?;
        
        Ok(result.text().to_string())
    }
}
```

### Voice Activity Detection (VAD)

```rust
// src/voice/vad.rs
pub struct VadDetector {
    model: SileroVad,
    threshold: f32,        // 0.0 → 1.0 (default: 0.5)
    sample_rate: u32,
}

impl VadDetector {
    /// Detect speech in audio chunk
    pub fn detect(&self, audio: &[f32]) -> bool {
        let probability = self.model.predict(audio);
        probability > self.threshold
    }
    
    /// Detect voice activity and return start/end timestamps
    pub fn find_speech_segments(&self, audio: &[f32]) -> Vec<SpeechSegment> {
        // Sliding window detection
        let window_size = (self.sample_rate as f32 * 0.03) as usize; // 30ms windows
        let mut segments = Vec::new();
        let mut in_speech = false;
        let mut start_sample = 0;
        
        for (i, window) in audio.windows(window_size).step_by(window_size / 2).enumerate() {
            let is_speech = self.detect(window);
            
            if is_speech && !in_speech {
                start_sample = i * window_size / 2;
                in_speech = true;
            } else if !is_speech && in_speech {
                segments.push(SpeechSegment {
                    start: start_sample as f32 / self.sample_rate as f32,
                    end: (i * window_size / 2) as f32 / self.sample_rate as f32,
                });
                in_speech = false;
            }
        }
        
        segments
    }
}
```

### Voice Pipeline Integration

```rust
// src/voice/mod.rs
pub struct VoicePipeline {
    pub tts: TtsEngine,
    pub stt: SttEngine,
    pub vad: VadDetector,
}

impl VoicePipeline {
    /// Process voice input: audio → text
    pub fn process_voice_input(&self, audio: &[u8]) -> Result<String, VoiceError> {
        // 1. Detect speech segments
        let audio_f32 = bytes_to_f32(audio)?;
        let segments = self.vad.find_speech_segments(&audio_f32);
        
        // 2. Extract speech audio (remove silence)
        let speech_audio = extract_segments(audio, &segments);
        
        // 3. Transcribe
        let text = self.stt.transcribe(&speech_audio)?;
        
        Ok(text)
    }
    
    /// Process voice output: text → audio
    pub fn process_voice_output(&self, text: &str) -> Result<Vec<u8>, VoiceError> {
        self.tts.synthesize(text)
    }
}
```

---

## 8. Danger Loop (Careful Skill)

### Risk Classification

```rust
// src/agentic/danger.rs
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum RiskLevel {
    Safe,       // Read-only operations
    Low,        // Minor modifications
    Medium,     // Potentially destructive
    High,       // Definitely destructive
    Critical,   // System-threatening
}

pub fn assess_risk(command: &str) -> RiskLevel {
    let cmd = command.trim().to_lowercase();
    
    // Critical: System destruction
    if matches_risk_pattern(&cmd, &[
        r"rm\s+-rf\s+/",
        r"rm\s+-rf\s+~",
        r"rmdir\s+/s\s+/q",
        r"format\s+[cCdD]:",
        r"del\s+/[sS]\s+[cC]:\\",
        r"mkfs\.",
        r"dd\s+if=.*of=/dev/",
    ]) {
        return RiskLevel::Critical;
    }
    
    // High: Destructive but targeted
    if matches_risk_pattern(&cmd, &[
        r"rm\s+-rf\s+",
        r"rm\s+-r\s+",
        r"rmdir\s+",
        r"del\s+/[sS]\s+",
        r"sudo\s+rm",
        r"chmod\s+777",
        r"kill\s+-9",
        r"taskkill\s+/f",
        r"Remove-Item\s+-Recurse",
        r"Remove-Item\s+.*-Force",
    ]) {
        return RiskLevel::High;
    }
    
    // Medium: Potentially problematic
    if matches_risk_pattern(&cmd, &[
        r"rm\s+",
        r"del\s+",
        r"mv\s+",
        r"chmod\s+",
        r"chown\s+",
        r"sudo\s+",
        r"su\s+",
        r"net\s+user",
        r"net\s+localgroup",
    ]) {
        return RiskLevel::Medium;
    }
    
    // Low: Minor changes
    if matches_risk_pattern(&cmd, &[
        r"mkdir\s+",
        r"touch\s+",
        r"echo\s+.*>",
        r"cp\s+",
        r"copy\s+",
    ]) {
        return RiskLevel::Low;
    }
    
    // Safe: Read-only
    RiskLevel::Safe
}

/// Check if command matches any risk pattern
fn matches_risk_pattern(cmd: &str, patterns: &[&str]) -> bool {
    patterns.iter().any(|pattern| {
        regex::Regex::new(pattern)
            .map(|re| re.is_match(cmd))
            .unwrap_or(false)
    })
}
```

### Confirmation Flow

```rust
// src/agentic/loop.rs
async fn execute_with_danger_loop(
    command: &str,
    risk_level: RiskLevel,
    app: &AppHandle,
) -> Result<String, AgenticError> {
    match risk_level {
        RiskLevel::Safe | RiskLevel::Low => {
            // Auto-execute
            execute_command(command).await
        }
        
        RiskLevel::Medium | RiskLevel::High => {
            // Send confirmation request to frontend
            let (tx, rx) = tokio::sync::oneshot::channel();
            
            // Store the channel for frontend response
            DANGER_CONFIRMATIONS.lock().await.insert(
                uuid::Uuid::new_v4().to_string(),
                tx,
            );
            
            // Emit event to frontend
            app.emit("danger:confirmation_required", DangerRequest {
                command: command.to_string(),
                risk_level: risk_level.clone(),
                requires_double_confirm: risk_level == RiskLevel::High,
            })?;
            
            // Wait for user response (with timeout)
            let response = tokio::time::timeout(
                Duration::from_secs(30),
                rx,
            ).await;
            
            match response {
                Ok(Ok(true)) => execute_command(command).await,
                _ => Err(AgenticError::UserDenied),
            }
        }
        
        RiskLevel::Critical => {
            // Block entirely
            app.emit("danger:blocked", DangerBlocked {
                command: command.to_string(),
                reason: "This command is too dangerous and has been blocked.".to_string(),
            })?;
            
            Err(AgenticError::CommandBlocked)
        }
    }
}
```

### Safe Paths Configuration

Users can define safe directories where low-risk commands auto-execute:

```sql
INSERT INTO entity_state (key, value_json) VALUES
  ('safe_paths', '["~/Desktop", "~/Documents", "~/Projects"]');
```

Commands operating within safe paths get auto-approved at the Low risk level.

---

## 9. Tauri IPC Commands

### Command Registry

All frontend → backend communication goes through these commands:

```rust
// src/commands.rs

// === LLM Commands ===
#[tauri::command]
async fn llm_chat(
    prompt: String,
    personality: Option<String>,
    app: AppHandle,
) -> Result<LlmResponse, String>

#[tauri::command]
async fn llm_complete(prompt: String) -> Result<String, String>

#[tauri::command]
async fn llm_stream_chat(
    prompt: String,
    personality: Option<String>,
    app: AppHandle,
) -> Result<(), String>

// === Voice Commands ===
#[tauri::command]
async fn voice_tts(text: String, voice: Option<String>) -> Result<Vec<u8>, String>

#[tauri::command]
async fn voice_stt(audio_data: Vec<u8>) -> Result<String, String>

#[tauri::command]
async fn voice_list_voices() -> Result<Vec<VoiceInfo>, String>

// === Shell Commands ===
#[tauri::command]
async fn shell_execute(command: String, cwd: Option<String>) -> Result<ShellResult, String>

#[tauri::command]
async fn shell_execute_with_danger(command: String, cwd: Option<String>) -> Result<ShellResult, String>

// === File Commands ===
#[tauri::command]
async fn file_read(path: String) -> Result<String, String>

#[tauri::command]
async fn file_write(path: String, content: String) -> Result<(), String>

#[tauri::command]
async fn file_list(dir: String) -> Result<Vec<FileInfo>, String>

#[tauri::command]
async fn file_exists(path: String) -> Result<bool, String>

// === Model Commands ===
#[tauri::command]
async fn model_list() -> Result<Vec<ModelInfo>, String>

#[tauri::command]
async fn model_download(
    model_id: String,
    filename: String,
    app: AppHandle,
) -> Result<PathBuf, String>

#[tauri::command]
async fn model_load(model_path: String) -> Result<(), String>

#[tauri::command]
async fn model_unload() -> Result<(), String>

#[tauri::command]
async fn model_search(query: String) -> Result<Vec<ModelSearchResult>, String>

#[tauri::command]
async fn model_recommend() -> Result<Vec<ModelRecommendation>, String>

// === Memory Commands ===
#[tauri::command]
async fn memory_search(query: String, limit: Option<usize>) -> Result<Vec<Memory>, String>

#[tauri::command]
async fn memory_store(prompt: String, response: String) -> Result<i64, String>

#[tauri::command]
async fn memory_get_all(limit: Option<usize>) -> Result<Vec<Memory>, String>

// === Persona Commands ===
#[tauri::command]
async fn get_persona() -> Result<PersonaConfig, String>

#[tauri::command]
async fn set_persona(persona_type: String, config: Option<String>) -> Result<(), String>

// === Settings Commands ===
#[tauri::command]
async fn get_settings() -> Result<Settings, String>

#[tauri::command]
async fn update_settings(key: String, value: String) -> Result<(), String>

// === System Commands ===
#[tauri::command]
async fn get_system_info() -> Result<SystemInfo, String>

#[tauri::command]
async fn get_device_info() -> Result<DeviceInfo, String>
```

### IPC Type Definitions (Frontend)

```typescript
// src/lib/types.ts — Generated from Rust structs

export interface LlmResponse {
  thought: string | null;
  speak: string;
  action: Action | null;
}

export interface Action {
  type: 'shell' | 'python' | 'file_read' | 'file_write' | 'done';
  code: string;
  path?: string;
  content?: string;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
}

export interface DangerRequest {
  command: string;
  risk_level: 'Medium' | 'High' | 'Critical';
  requires_double_confirm: boolean;
}

export interface ModelInfo {
  id: number;
  model_name: string;
  filename: string;
  local_path: string;
  size_bytes: number;
  quantization: string;
  architecture: string;
  parameter_count: string | null;
  is_active: boolean;
  performance_score: number | null;
}

export interface Memory {
  id: number;
  prompt: string;
  response: string;
  timestamp: string;
  links: number[];
}

export interface PersonaConfig {
  type: 'yusra' | 'singularity' | 'custom';
  traits?: TraitMatrix;
  custom_prompt?: string;
}

export interface TraitMatrix {
  formality: number;
  verbosity: number;
  warmth: number;
  humor: number;
  proactivity: number;
  custom_traits: string[];
}

export interface DeviceInfo {
  os: string;
  arch: string;
  total_ram_gb: number;
  vram_gb: number | null;
  cpu_cores: number;
  cpu_name: string;
  has_gpu: boolean;
}
```

---

## 10. Build Targets

### Development

```bash
# Start development server with hot-reload
cargo tauri dev

# With verbose logging
RUST_LOG=debug cargo tauri dev
```

### Production Builds

```bash
# Windows .exe installer
cargo tauri build --target x86_64-pc-windows-msvc

# macOS .app bundle (requires macOS or cross-compile)
cargo tauri build --target aarch64-apple-darwin

# macOS Intel .app bundle
cargo tauri build --target x86_64-apple-darwin

# Linux AppImage + deb
cargo tauri build --target x86_64-unknown-linux-gnu
```

### Build Configuration (tauri.conf.json)

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "Yusra",
    "version": "1.0.0"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "identifier": "com.yusra.app",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "windows": {
        "nsis": {
          "installMode": "both",
          "displayLanguageSelector": false
        }
      },
      "macOS": {
        "dmg": {
          "appPosition": { "x": 180, "y": 170 },
          "applicationFolderPosition": { "x": 480, "y": 170 }
        }
      }
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "title": "Yusra",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "decorations": false,
        "transparent": false,
        "center": true
      }
    ]
  }
}
```

---

## 11. Project Structure

```
yusra/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                    # Tauri entry point, command registration
│   │   ├── lib.rs                     # Module declarations
│   │   │
│   │   ├── agentic/
│   │   │   ├── mod.rs
│   │   │   ├── loop.rs                # Core agentic loop (LLM → parse → execute → loop)
│   │   │   ├── parser.rs              # JSON response parser (serde)
│   │   │   ├── executor.rs            # Shell/Python command executor
│   │   │   └── danger.rs              # Risk assessment + confirmation flow
│   │   │
│   │   ├── llm/
│   │   │   ├── mod.rs
│   │   │   ├── engine.rs              # candle-core inference wrapper
│   │   │   ├── gguf.rs                # GGUF file loading and parsing
│   │   │   ├── tokenizer.rs           # Tokenizer integration
│   │   │   ├── downloader.rs          # HuggingFace model download + progress
│   │   │   └── params.rs              # Inference parameters
│   │   │
│   │   ├── voice/
│   │   │   ├── mod.rs
│   │   │   ├── tts.rs                 # Piper TTS integration
│   │   │   ├── stt.rs                 # Vosk/Whisper STT integration
│   │   │   ├── vad.rs                 # Voice activity detection
│   │   │   └── pipeline.rs            # Unified voice pipeline
│   │   │
│   │   ├── memory/
│   │   │   ├── mod.rs
│   │   │   ├── db.rs                  # SQLite connection + schema init
│   │   │   ├── episodic.rs            # Episodic memory CRUD
│   │   │   └── entity.rs              # KV state operations
│   │   │
│   │   ├── persona/
│   │   │   ├── mod.rs                 # Persona enum + builder
│   │   │   ├── yusra.rs              # Hardcoded Yusra prompt
│   │   │   ├── singularity.rs        # Trait matrix prompt builder
│   │   │   └── custom.rs             # Custom prompt handling
│   │   │
│   │   ├── commands.rs                # All #[tauri::command] handlers
│   │   └── errors.rs                  # Error types (thiserror)
│   │
│   ├── Cargo.toml                     # Rust dependencies
│   ├── build.rs                       # Tauri build script
│   └── tauri.conf.json                # Tauri configuration
│
├── src/                               # React frontend
│   ├── components/
│   │   ├── ui/                        # Reusable primitives
│   │   ├── layout/                    # Sidebar, TitleBar, CommandBar
│   │   ├── chat/                      # ChatPane, MessageList, ChatInput
│   │   ├── code/                      # CodePane, Terminal, SyntaxHighlighter
│   │   ├── memory/                    # MemoryGraph, MemoryNode
│   │   ├── onboarding/                # 5-step onboarding flow
│   │   ├── settings/                  # Settings panels
│   │   └── danger/                    # Danger confirmation modal
│   ├── hooks/
│   ├── stores/
│   ├── lib/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
│
├── public/
│   └── icons/                         # App icons for all platforms
│
├── DESIGN.md                          # This document (UI/UX)
├── DEV.md                             # This document (Backend)
├── PRD.md                             # Product requirements
├── package.json                       # Node.js dependencies
├── tsconfig.json                      # TypeScript config
├── tailwind.config.ts                 # Tailwind design tokens
├── vite.config.ts                     # Vite build config
└── .gitignore
```

---

## 12. Error Handling Strategy

### Error Types

```rust
// src/errors.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum YusraError {
    #[error("LLM error: {0}")]
    Llm(#[from] LlmError),
    
    #[error("Memory error: {0}")]
    Memory(#[from] MemoryError),
    
    #[error("Voice error: {0}")]
    Voice(#[from] VoiceError),
    
    #[error("Shell execution error: {0}")]
    Shell(#[from] ShellError),
    
    #[error("Download error: {0}")]
    Download(#[from] DownloadError),
    
    #[error("User denied the operation")]
    UserDenied,
    
    #[error("Command blocked by safety system")]
    CommandBlocked,
    
    #[error("No model loaded")]
    NoModelLoaded,
    
    #[error("Configuration error: {0}")]
    Config(String),
}

#[derive(Error, Debug)]
pub enum LlmError {
    #[error("No model loaded — load a model first")]
    NoModelLoaded,
    
    #[error("Failed to parse LLM response as JSON: {0}")]
    JsonParse(String),
    
    #[error("Invalid response schema: {0}")]
    InvalidSchema(String),
    
    #[error("Inference failed: {0}")]
    Inference(String),
    
    #[error("Model file not found: {0}")]
    ModelNotFound(String),
    
    #[error("Token limit exceeded: {0} tokens")]
    TokenLimitExceeded(usize),
}
```

### Error Propagation to Frontend

All Rust errors are mapped to user-friendly messages before reaching the frontend:

```rust
// In commands.rs
impl From<YusraError> for String {
    fn from(err: YusraError) -> Self {
        match err {
            YusraError::Llm(LlmError::NoModelLoaded) => {
                "No AI model loaded. Go to Settings → Models to download and load a model.".to_string()
            }
            YusraError::UserDenied => {
                "Operation cancelled — you denied the request.".to_string()
            }
            YusraError::CommandBlocked => {
                "This command was blocked for safety reasons.".to_string()
            }
            _ => format!("An error occurred: {}", err),
        }
    }
}
```

---

*End of DEV.md*
