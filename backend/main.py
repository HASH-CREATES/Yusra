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
