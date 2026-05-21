import re
import shlex
import subprocess

_TARGET_RE = re.compile(r'^[a-zA-Z0-9._:,/\*\[\]-]+$')

def validate_target(target: str) -> bool:
    target = target.strip()
    return bool(target) and not target.startswith('-') and bool(_TARGET_RE.match(target))

ALLOWED_FLAGS = {
    "-sV", "-sC", "-sS", "-sT", "-sU", "-sn", "-Pn",
    "-A", "-O", "-p", "--open", "-T0", "-T1", "-T2",
    "-T3", "-T4", "-T5", "--version-intensity", "-v", "-vv",
    "--script", "-F", "-r", "--top-ports",
}


def sanitize_nmap_flags(flags_str: str) -> list[str]:
    parts = shlex.split(flags_str)
    safe = []
    i = 0
    while i < len(parts):
        part = parts[i]
        base = part.split("=")[0]
        if base in ALLOWED_FLAGS:
            safe.append(part)
            if base in ("-p", "--script", "--top-ports") and i + 1 < len(parts):
                i += 1
                safe.append(parts[i])
        i += 1
    return safe if safe else ["-sV"]


def run_nmap(target: str, flags: list[str]) -> str:
    cmd = ["nmap"] + flags + [target]
    print("Running:", " ".join(cmd))

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        output = result.stdout or ""
        stderr = result.stderr or ""

        if not output and stderr:
            return f"nmap error:\n```\n{stderr}\n```"

        return f"**nmap scan:** `{' '.join(cmd)}`\n\n```\n{output}\n```"

    except FileNotFoundError:
        return "nmap is not installed or not in PATH."
    except subprocess.TimeoutExpired:
        return "nmap scan timed out after 120 seconds."
    except Exception as e:
        return f"Error running nmap: {e}"
