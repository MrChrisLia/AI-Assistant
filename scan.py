import os
import re
import subprocess
import time

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

SCANNED_EXTENSIONS = {".py", ".ts", ".tsx", ".js"}
MAX_DIFF_CHARS = 30000
EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def get_diff(before: str, after: str) -> str:
    if not before or before == "0" * 40:
        before = EMPTY_TREE
    result = subprocess.run(
        ["git", "diff", before, after],
        capture_output=True,
        text=True,
    )
    lines = []
    current_file_included = False
    for line in result.stdout.splitlines():
        if line.startswith("diff --git"):
            ext = os.path.splitext(line.split()[-1])[1]
            current_file_included = ext in SCANNED_EXTENSIONS
        if current_file_included:
            lines.append(line)
    return "\n".join(lines)


def scan(diff: str) -> str:
    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + "\n\n[diff truncated]"

    prompt = (
        "Review this code diff for security vulnerabilities.\n"
        "Check for: injection (SQL/command/XSS), auth issues, hardcoded secrets, "
        "missing input validation, sensitive data exposure.\n\n"
        "If issues found, list each with:\n"
        "- **Severity**: Critical / High / Medium / Low\n"
        "- **File + line** (from the diff)\n"
        "- **Issue** and **recommended fix**\n\n"
        "If nothing found, write: ✅ No security issues detected.\n\n"
        f"```diff\n{diff}\n```"
    )

    print("Scanning with gemini-3.0-flash...")
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-3.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=(
                        "You are a security code reviewer. Be concise. "
                        "Only report real, confirmed issues — not theoretical ones."
                    ),
                ),
            )
            return response.text
        except genai_errors.ClientError as e:
            if e.status_code != 429 or attempt == 2:
                raise
            match = re.search(r'retry in (\d+(?:\.\d+)?)s', str(e))
            delay = float(match.group(1)) + 2 if match else 30
            print(f"Rate limited. Retrying in {delay:.0f}s...")
            time.sleep(delay)


def write_summary(text: str):
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "w") as f:
            f.write("## 🔍 AI Security Scan\n\n")
            f.write(text)
            f.write("\n")


def main():
    before = os.environ.get("BEFORE_SHA", "")
    after = os.environ.get("AFTER_SHA", "HEAD")

    diff = get_diff(before, after)
    if not diff.strip():
        print("No code changes to scan.")
        write_summary("✅ No code changes to scan.")
        return

    findings = scan(diff)
    print(findings)
    write_summary(findings)


if __name__ == "__main__":
    main()
