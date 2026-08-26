"""LLM engine — llama-cpp-python, GGUF in-process. Zero Ollama/Rust."""
import json
import re
from pathlib import Path
from typing import Any, Optional

from .memory import MODELS_DIR, get_state

_llm: Any = None
_active_path: Optional[Path] = None


def is_loaded() -> bool:
    return _llm is not None


def active_model() -> Optional[str]:
    return _active_path.name if _active_path else None


def list_models() -> list[dict]:
    if not MODELS_DIR.exists():
        return []
    return [
        {"filename": p.name, "size_bytes": p.stat().st_size}
        for p in sorted(MODELS_DIR.glob("*.gguf"))
    ]


def load_model(filename: str) -> str:
    """Load a GGUF from ~/.yusra/models. Raises FileNotFoundError if missing."""
    global _llm, _active_path
    from llama_cpp import Llama  # deferred import: keeps /health alive without the wheel

    path = MODELS_DIR / filename
    if not path.is_file():
        raise FileNotFoundError(f"No such model: {path}")
    if _llm is not None:
        _llm.close()  # free VRAM/RAM before swapping
    _llm = Llama(
        model_path=str(path),
        n_ctx=4096,
        n_gpu_layers=-1,  # offload whatever fits; CPU handles the rest
        verbose=False,
    )
    _active_path = path
    return filename


def unload_model() -> None:
    global _llm, _active_path
    if _llm is not None:
        _llm.close()
    _llm, _active_path = None, None


def inference_params() -> dict:
    return {
        "temperature": float(get_state("inference_temperature", 0.4)),
        "top_p": float(get_state("inference_top_p", 0.9)),
        "max_tokens": int(get_state("inference_max_tokens", 1024)),
    }


def generate(messages: list[dict]) -> str:
    if _llm is None:
        raise RuntimeError("No model loaded. Place a .gguf in ~/.yusra/models and POST /models/load.")
    out = _llm.create_chat_completion(messages=messages, **inference_params())
    return out["choices"][0]["message"]["content"] or ""


def _balanced_extract(text: str) -> Optional[dict]:
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start:i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def _salvage_fields(text: str) -> Optional[dict]:
    """Small models emit broken envelopes like `"speak": "path: " + Get-Location` —
    unquoted code perches inside strings. Recover the fields by regex instead of
    dropping the whole turn."""
    def field(name: str) -> Optional[str]:
        m = re.search(rf'"{name}"\s*:\s*"((?:[^"\\]|\\.)*)"', text)
        if not m:
            return None
        try:
            return json.loads(f'"{m.group(1)}"')
        except json.JSONDecodeError:
            return m.group(1)

    speak = field("speak")
    a_type = field("type")
    a_code = field("code")
    if not (speak or a_code):
        return None
    out: dict = {"thought": None, "speak": speak or "", "action": None}
    if a_type in ("shell", "python", "file_read", "file_write", "done") and a_code:
        out["action"] = {"type": a_type, "code": a_code}
    return out


def extract_json(raw: str) -> dict:
    """Bulletproof — always returns a dict shaped {thought, speak, action}.
    Tries: balanced braces → regex field salvage → raw-text fallback. Never raises, never returns None."""
    text = re.sub(r"```(?:json)?", "", raw).strip()
    data = _balanced_extract(text)
    if data is None:
        data = _salvage_fields(text)
    if data is None:
        return {
            "thought": "",
            "speak": (text[:2000] if text else "I couldn't format a response."),
            "action": None,
        }
    # Normalize so LlmResponse(**data) always succeeds
    data.setdefault("thought", "")
    data.setdefault("speak", "")
    data.setdefault("action", None)
    return data


if __name__ == "__main__":
    valid = {"thought": "", "speak": "hi", "action": None}
    assert extract_json('```json\n{"speak": "hi", "action": null}\n```') == valid
    assert extract_json('Sure! {"speak":"a}{b","thought":null} hope that helps')["speak"] == "a}{b"
    # Broken small-model envelope: unquoted code expression inside "speak"
    broken = '{"thought":"t","speak":"The path is: " + Get-Location -ErrorAction Continue,"action":{"type":"shell","code":"Get-Location","path":"","content":""}}'
    salvaged = extract_json(broken)
    assert salvaged is not None and salvaged["action"]["code"] == "Get-Location", salvaged
    # Garbage in → raw-text fallback (always a dict, never None, never raises)
    fallback = extract_json("nothing parseable here at all")
    assert isinstance(fallback, dict) and fallback["action"] is None and "nothing" in fallback["speak"], fallback
    print("llm.py: extract_json bulletproof — balanced + salvage + fallback all pass")
