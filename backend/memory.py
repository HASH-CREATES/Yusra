"""Hybrid memory — SQLite (episodic graph + KV entity state). Schema per DEV.md §6."""
import json
import sqlite3
import threading
from pathlib import Path
from typing import Any, Optional

_lock = threading.Lock()
_conn: Optional[sqlite3.Connection] = None

DATA_DIR = Path.home() / ".yusra"
DB_PATH = DATA_DIR / "yusra.db"
MODELS_DIR = DATA_DIR / "models"

SCHEMA = """
CREATE TABLE IF NOT EXISTS episodic_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    embedding_blob BLOB,
    links_json TEXT DEFAULT '[]',
    session_id TEXT,
    risk_level TEXT,
    actions_taken TEXT DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memory(timestamp);
CREATE INDEX IF NOT EXISTS idx_episodic_session ON episodic_memory(session_id);

CREATE TABLE IF NOT EXISTS entity_state (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS downloaded_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL UNIQUE,
    local_path TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    persona_used TEXT NOT NULL,
    total_messages INTEGER DEFAULT 0,
    total_actions INTEGER DEFAULT 0
);
"""

DEFAULTS = {
    "active_persona": '"yusra"',
    "singularity_traits": '{"formality":0.5,"verbosity":0.5,"warmth":0.5,"humor":0.5,"proactivity":0.5,"custom_traits":[]}',
    "custom_persona": '""',
    "inference_temperature": "0.4",
    "inference_top_p": "0.9",
    "inference_max_tokens": "1024",
    "terminal_shell": '"powershell"',
    "terminal_cwd": '"~"',
    "onboarding_complete": "false",
}


def init_db() -> None:
    global _conn
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    with _lock:
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.executescript(SCHEMA)
        for key, value in DEFAULTS.items():
            _conn.execute(
                "INSERT OR IGNORE INTO entity_state (key, value_json) VALUES (?, ?)",
                (key, value),
            )
        _conn.commit()


def store_memory(prompt: str, response: str, session_id: str, actions: list[dict]) -> int:
    with _lock:
        cur = _conn.execute(
            "INSERT INTO episodic_memory (prompt, response, session_id, actions_taken) VALUES (?, ?, ?, ?)",
            (prompt, response, session_id, json.dumps(actions)),
        )
        _conn.commit()
        return cur.lastrowid


def search_memories(query: str, limit: int = 20) -> list[dict]:
    pattern = f"%{query}%"
    with _lock:
        rows = _conn.execute(
            "SELECT id, prompt, response, timestamp, session_id FROM episodic_memory "
            "WHERE prompt LIKE ? OR response LIKE ? ORDER BY timestamp DESC LIMIT ?",
            (pattern, pattern, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def get_state(key: str, default: Any = None) -> Any:
    with _lock:
        row = _conn.execute("SELECT value_json FROM entity_state WHERE key = ?", (key,)).fetchone()
    if row is None:
        return default
    try:
        return json.loads(row["value_json"])
    except json.JSONDecodeError:
        return row["value_json"]


def set_state(key: str, value: Any) -> None:
    with _lock:
        _conn.execute(
            "INSERT OR REPLACE INTO entity_state (key, value_json, updated_at) VALUES (?, ?, datetime('now'))",
            (key, json.dumps(value)),
        )
        _conn.commit()
