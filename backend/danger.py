"""Danger Loop — regex risk engine. SAFE < LOW < MEDIUM < HIGH < CRITICAL."""
import re
from typing import Literal

RiskLevel = Literal["safe", "low", "medium", "high", "critical"]

# ponytail: pure regex blocklist, not a sandbox. Upgrade path: allowlist + seccomp/job objects.
_PATTERNS: dict[str, list[str]] = {
    "critical": [
        r"rm\s+-rf\s+/", r"rm\s+-rf\s+~", r"rmdir\s+/s\s+/q",
        r"format\s+[cCdD]:", r"del\s+/[sS]\s+[cC]:\\",
        r"mkfs\.", r"dd\s+if=.*of=/dev/",
    ],
    "high": [
        r"rm\s+-rf\s+", r"rm\s+-r\s+", r"rmdir\s+", r"del\s+/[sS]\s+",
        r"sudo\s+rm", r"chmod\s+777", r"kill\s+-9", r"taskkill\s+/f",
        r"remove-item\s+-recurse", r"remove-item\s+.*-force",
    ],
    "medium": [
        r"\brm\s+", r"\bdel\s+", r"\bmv\s+", r"\bchmod\s+", r"\bchown\s+",
        r"\bsudo\b", r"net\s+user", r"net\s+localgroup",
    ],
    "low": [
        r"mkdir\s+", r"touch\s+", r"echo\s+.*>", r"\bcp\s+", r"\bcopy\s+",
    ],
}

_COMPILED = {lvl: [re.compile(p, re.IGNORECASE) for p in pats] for lvl, pats in _PATTERNS.items()}
_ORDER = ["critical", "high", "medium", "low"]


def assess(command: str) -> RiskLevel:
    cmd = (command or "").strip()
    for level in _ORDER:
        if any(rx.search(cmd) for rx in _COMPILED[level]):
            return level  # type: ignore[return-value]
    return "safe"


if __name__ == "__main__":
    cases = {
        "rm -rf /": "critical",
        "mkfs.ext4 /dev/sda1": "critical",
        "Remove-Item -Recurse -Force C:\\Users": "high",
        "format C:": "critical",
        "rm -rf build/": "high",
        "taskkill /f /IM app.exe": "high",
        "rm notes.txt": "medium",
        "sudo apt install": "medium",
        "mkdir test": "low",
        "echo hi > a.txt": "low",
        "ls -la": "safe",
        "git status": "safe",
    }
    for cmd, expected in cases.items():
        got = assess(cmd)
        assert got == expected, f"{cmd!r}: expected {expected}, got {got}"
    print(f"danger.py: {len(cases)} self-checks passed")
