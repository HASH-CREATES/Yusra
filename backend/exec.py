"""Action executor — subprocess with timeout, structured result."""
import shlex
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

from .schemas import Action, ExecResult

EXEC_TIMEOUT_S = 30


def _shell_command(code: str, shell: str) -> list[str]:
    if shell == "powershell":
        return ["powershell", "-NoProfile", "-NonInteractive", "-Command", code]
    if shell == "bash":
        return ["bash", "-c", code]
    return ["/c" if False else "cmd", "/c", code] if sys.platform == "win32" else ["sh", "-c", code]


def run(action: Action, cwd: str = "~", shell: str = "powershell") -> ExecResult:
    start = time.monotonic()
    try:
        if action.type == "shell":
            cmd = _shell_command(action.code, shell)
        elif action.type == "python":
            cmd = [sys.executable, "-c", action.code]
        elif action.type == "file_read":
            text = (Path(_expand(action.path or "")).read_text(encoding="utf-8", errors="replace"))
            return ExecResult(stdout=text[:20000], exit_code=0,
                              duration_ms=int((time.monotonic() - start) * 1000))
        elif action.type == "file_write":
            p = Path(_expand(action.path or ""))
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(action.content or "", encoding="utf-8")
            return ExecResult(stdout=f"Wrote {len(action.content or '')} bytes to {p}", exit_code=0,
                              duration_ms=int((time.monotonic() - start) * 1000))
        else:  # "done" or unknown — nothing to execute
            return ExecResult(exit_code=0, duration_ms=0)

        proc = subprocess.run(
            cmd, cwd=_expand(cwd), capture_output=True, text=True,
            timeout=EXEC_TIMEOUT_S, encoding="utf-8", errors="replace",
        )
        return ExecResult(
            stdout=proc.stdout[-20000:], stderr=proc.stderr[-20000:],
            exit_code=proc.returncode,
            duration_ms=int((time.monotonic() - start) * 1000),
        )
    except subprocess.TimeoutExpired:
        return ExecResult(stderr=f"Execution timed out after {EXEC_TIMEOUT_S}s", exit_code=-1,
                          duration_ms=EXEC_TIMEOUT_S * 1000)
    except Exception as exc:  # noqa: BLE001 — surface any failure to the LLM as stderr
        return ExecResult(stderr=str(exc), exit_code=-1,
                          duration_ms=int((time.monotonic() - start) * 1000))


def _expand(path: str) -> str:
    return str(Path(path).expanduser()) if path else str(Path.home())


def quote(arg: str) -> str:  # tiny helper, kept for future shell builders
    return shlex.quote(arg)


if __name__ == "__main__":
    r = run(Action(type="shell", code="echo yusra-exec-ok"), shell="cmd" if sys.platform == "win32" else "sh")
    assert r.exit_code == 0 and "yusra-exec-ok" in r.stdout, r
    print("exec.py: self-check passed")
