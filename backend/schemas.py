from typing import Optional, Literal
from pydantic import BaseModel, Field


class Action(BaseModel):
    type: Literal["shell", "python", "file_read", "file_write", "done"] = "shell"
    code: str = ""
    path: Optional[str] = None
    content: Optional[str] = None


class LlmResponse(BaseModel):
    thought: Optional[str] = None
    speak: str = ""
    action: Optional[Action] = None


class ExecResult(BaseModel):
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    duration_ms: int = 0


class Step(BaseModel):
    thought: Optional[str] = None
    speak: str = ""
    action: Optional[Action] = None
    observation: Optional[ExecResult] = None


class ChatRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None


class ConfirmRequest(BaseModel):
    approved: bool


class LoadModelRequest(BaseModel):
    filename: str


class SettingsUpdate(BaseModel):
    key: str
    value: str


class PersonaUpdate(BaseModel):
    type: Literal["yusra", "singularity", "custom"]
    traits: Optional[dict] = None
    custom_prompt: Optional[str] = None


class AgentTurn(BaseModel):
    session_id: str
    status: Literal["done", "pending_confirmation", "blocked", "error"]
    steps: list[Step] = Field(default_factory=list)
    final_speak: str = ""
    confirmation_id: Optional[str] = None
    command: Optional[str] = None
    risk_level: Optional[str] = None
