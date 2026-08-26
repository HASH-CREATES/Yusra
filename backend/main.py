"""FastAPI app — The Brain. Run from repo root: uvicorn backend.main:app --reload --port 8000"""
from contextlib import asynccontextmanager
from platform import machine, processor, system
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import agent, llm, memory
from .schemas import (
    AgentTurn, ChatRequest, ConfirmRequest, LoadModelRequest,
    PersonaUpdate, SettingsUpdate,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    memory.init_db()
    yield


app = FastAPI(title="Yusra — The Brain", version="2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:4173", "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": llm.is_loaded(), "model": llm.active_model()}


@app.post("/chat", response_model=AgentTurn)
def chat(req: ChatRequest) -> AgentTurn:
    try:
        return agent.run_turn(req.prompt, req.session_id)
    except RuntimeError as exc:  # no model loaded etc.
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/confirm/{confirmation_id}", response_model=AgentTurn)
def confirm(confirmation_id: str, req: ConfirmRequest) -> AgentTurn:
    return agent.resume(confirmation_id, req.approved)


@app.get("/models")
def models() -> dict:
    return {"models": llm.list_models(), "active": llm.active_model(),
            "models_dir": str(memory.MODELS_DIR)}


@app.post("/models/load")
def load_model(req: LoadModelRequest) -> dict:
    try:
        name = llm.load_model(req.filename)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — llama.cpp load errors surface verbatim
        raise HTTPException(status_code=500, detail=f"Model load failed: {exc}") from exc
    return {"loaded": name}


@app.post("/models/unload")
def unload_model() -> dict:
    llm.unload_model()
    return {"unloaded": True}


DEFAULT_MODEL_URL = "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"
DEFAULT_MODEL_NAME = "qwen2.5-0.5b-instruct-q4_k_m.gguf"


@app.post("/models/download_default")
def download_default_model() -> dict:
    """One-click brain: stream the default GGUF to disk, then load it into llama.cpp."""
    import httpx

    memory.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    dest = memory.MODELS_DIR / DEFAULT_MODEL_NAME
    try:
        # follow_redirects: HF /resolve/ redirects to the CDN. read=None: never time out mid-stream.
        with httpx.Client(follow_redirects=True, timeout=httpx.Timeout(60.0, read=None)) as client:
            with client.stream("GET", DEFAULT_MODEL_URL) as resp:
                resp.raise_for_status()
                with open(dest, "wb") as f:
                    for chunk in resp.iter_bytes(chunk_size=1 << 20):
                        f.write(chunk)
    except Exception as exc:  # noqa: BLE001 — surface download failures verbatim
        dest.unlink(missing_ok=True)  # don't leave a truncated GGUF for /models to find
        raise HTTPException(status_code=502, detail=f"Download failed: {exc}") from exc

    try:
        llm.load_model(DEFAULT_MODEL_NAME)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Download ok but load failed: {exc}") from exc
    return {"status": "success", "model_loaded": True}


@app.get("/settings")
def get_settings() -> dict:
    return {k: memory.get_state(k) for k in memory.DEFAULTS}


@app.post("/settings")
def update_settings(req: SettingsUpdate) -> dict:
    memory.set_state(req.key, req.value)
    return {"set": req.key}


@app.get("/persona")
def get_persona() -> dict:
    return {
        "type": memory.get_state("active_persona", "yusra"),
        "traits": memory.get_state("singularity_traits", {}),
        "custom_prompt": memory.get_state("custom_persona", ""),
    }


@app.post("/persona")
def set_persona(req: PersonaUpdate) -> dict:
    memory.set_state("active_persona", req.type)
    if req.traits is not None:
        memory.set_state("singularity_traits", req.traits)
    if req.custom_prompt is not None:
        memory.set_state("custom_persona", req.custom_prompt)
    return {"active": req.type}


@app.get("/memory/search")
def memory_search(q: str, limit: int = 20) -> dict:
    return {"memories": memory.search_memories(q, limit)}


@app.get("/memory/all")
def memory_all(limit: int = 50) -> dict:
    return {"memories": memory.search_memories("", limit)}


@app.get("/system/info")
def system_info() -> dict:
    # ponytail: platform basics only — add psutil for the RAM gauge when the Fit Manager ships.
    return {"os": system(), "arch": machine(), "cpu": processor(), "python": __import__("sys").version}
