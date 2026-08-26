"""The agentic loop — Open-Interpreter style: infer → parse → risk → execute → feed back."""
import uuid
from typing import Optional

from . import danger, exec as executor, llm, memory, persona
from .schemas import Action, AgentTurn, ExecResult, LlmResponse, Step

MAX_ITERATIONS = 10

# Paused loop frames awaiting Danger Loop confirmation.
_PENDING: dict[str, dict] = {}
# In-process conversation context per session (v1; episodic rows are persisted).
_SESSIONS: dict[str, list[dict]] = {}


def _build_context(prompt: str, session_id: str) -> list[dict]:
    traits = memory.get_state("singularity_traits", None) if memory.get_state("active_persona", "yusra") == "singularity" else None
    system = persona.build_system_prompt(
        memory.get_state("active_persona", "yusra"),
        traits=traits,
        custom_prompt=memory.get_state("custom_persona", ""),
    )
    memories = memory.search_memories(prompt, limit=3)
    mem_block = "\n".join(f"- {m['prompt']} → {m['response'][:200]}" for m in memories) if memories else ""
    if mem_block:
        system += f"\n\n## Relevant memories\n{mem_block}"
    messages: list[dict] = [{"role": "system", "content": system}]
    messages.extend(_SESSIONS.get(session_id, []))
    messages.append({"role": "user", "content": prompt})
    return messages


def _infer_json(messages: list[dict]) -> tuple[str, LlmResponse]:
    raw = llm.generate(messages)
    data = llm.extract_json(raw)
    if data is None:
        # One-shot repair: show the model its bad output, demand JSON again.
        retry = messages + [
            {"role": "assistant", "content": raw},
            {"role": "user", "content": "That was not valid JSON per the schema. Respond AGAIN with ONLY valid JSON."},
        ]
        raw = llm.generate(retry)
        data = llm.extract_json(raw)
    if data is None:
        return raw, LlmResponse(speak=raw.strip()[:2000] or "I could not format my response.")
    try:
        return raw, LlmResponse(**data)
    except Exception:  # noqa: BLE001 — schema drift: degrade to plain speak
        speak = str(data.get("speak", ""))[:2000]
        return raw, LlmResponse(speak=speak or "I could not format my response.")


def _observation_message(obs: ExecResult) -> str:
    return (
        f"OBSERVATION (exit={obs.exit_code}):\nSTDOUT:\n{obs.stdout or '(empty)'}\n"
        f"STDERR:\n{obs.stderr or '(empty)'}\n"
        "Continue. Respond with JSON only. Use action.type \"done\" when finished."
    )


def _loop(messages: list[dict], session_id: str, prompt: str, steps: list[Step]) -> AgentTurn:
    for _ in range(MAX_ITERATIONS):
        raw, resp = _infer_json(messages)
        steps.append(Step(thought=resp.thought, speak=resp.speak, action=resp.action))

        if resp.action is None or resp.action.type == "done":
            _finish(session_id, prompt, resp, steps, messages)
            return AgentTurn(session_id=session_id, status="done",
                             steps=steps, final_speak=resp.speak)

        action = resp.action
        risk = danger.assess(action.code)

        if risk == "critical":
            _finish(session_id, prompt, resp, steps, messages, blocked=True)
            return AgentTurn(session_id=session_id, status="blocked", steps=steps,
                             final_speak=f"{resp.speak}\n\nThat command is too dangerous and has been blocked.",
                             command=action.code, risk_level=risk)

        if risk in ("medium", "high"):
            cid = uuid.uuid4().hex
            _PENDING[cid] = {
                "messages": messages + [{"role": "assistant", "content": raw}],
                "action": action, "session_id": session_id,
                "prompt": prompt, "steps": steps,
            }
            return AgentTurn(session_id=session_id, status="pending_confirmation",
                             steps=steps, final_speak=resp.speak,
                             confirmation_id=cid, command=action.code, risk_level=risk)

        obs = executor.run(action, cwd=memory.get_state("terminal_cwd", "~"),
                           shell=memory.get_state("terminal_shell", "powershell"))
        steps[-1].observation = obs
        messages.append({"role": "assistant", "content": raw})
        messages.append({"role": "user", "content": _observation_message(obs)})

    last_speak = steps[-1].speak if steps else "I hit my iteration limit."
    _finish(session_id, prompt, LlmResponse(speak=last_speak), steps, messages)
    return AgentTurn(session_id=session_id, status="done", steps=steps, final_speak=last_speak)


def run_turn(prompt: str, session_id: Optional[str] = None) -> AgentTurn:
    session_id = session_id or uuid.uuid4().hex
    messages = _build_context(prompt, session_id)
    return _loop(messages, session_id, prompt, steps=[])


def resume(confirmation_id: str, approved: bool) -> AgentTurn:
    frame = _PENDING.pop(confirmation_id, None)
    if frame is None:
        return AgentTurn(session_id="", status="error", final_speak="Unknown or expired confirmation id.")

    messages: list[dict] = frame["messages"]
    action: Action = frame["action"]
    steps: list[Step] = frame["steps"]

    if approved:
        obs = executor.run(action, cwd=memory.get_state("terminal_cwd", "~"),
                           shell=memory.get_state("terminal_shell", "powershell"))
        if steps and steps[-1].action is not None:
            steps[-1].observation = obs
        messages.append({"role": "user", "content": _observation_message(obs)})
    else:
        messages.append({"role": "user", "content": "OBSERVATION: The user DENIED this command. Do not retry it. Continue with the task another way or finish."})

    return _loop(messages, frame["session_id"], frame["prompt"], steps)


def _finish(session_id: str, prompt: str, resp: LlmResponse, steps: list[Step],
            messages: list[dict], blocked: bool = False) -> None:
    _SESSIONS[session_id] = (
        messages + [{"role": "assistant", "content": resp.model_dump_json()}]
    )[-20:]
    actions = [s.action.model_dump() for s in steps if s.action]
    memory.store_memory(
        prompt=prompt,
        response=("BLOCKED: " if blocked else "") + resp.speak,
        session_id=session_id,
        actions=actions,
    )


if __name__ == "__main__":
    # Parse-path self-check (no model needed).
    raw, resp = _infer_json.__wrapped__ if hasattr(_infer_json, "__wrapped__") else (None, None)  # type: ignore[operator]
    data = llm.extract_json('{"thought":"t","speak":"hello","action":{"type":"shell","code":"dir"}}')
    assert data and LlmResponse(**data).action.code == "dir"
    assert danger.assess("rm -rf /") == "critical"
    assert danger.assess("echo hi") in ("safe", "low")
    print("agent.py: parse self-checks passed")
