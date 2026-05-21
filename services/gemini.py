import json

from google import genai
from google.genai import types

from config import GEMINI_API_KEY, MODEL_NAME

client = genai.Client(api_key=GEMINI_API_KEY)

CHAT_SYSTEM = (
    "You are a helpful cybersecurity AI assistant. "
    "Answer questions clearly and concisely."
)

DECISION_SYSTEM = (
    "You are a cybersecurity AI assistant that classifies user requests. "
    "You respond ONLY with valid JSON — no markdown, no explanation, no extra text."
)


_EXCLUDE = {"tts", "image", "audio", "live", "robotics", "computer-use", "embedding"}


def list_models() -> list[dict]:
    try:
        result = []
        for m in client.models.list():
            model_id = m.name.removeprefix("models/")
            if not model_id.startswith("gemini-"):
                continue
            if any(kw in model_id for kw in _EXCLUDE):
                continue
            result.append({
                "id": model_id,
                "label": m.display_name or model_id,
                "default": model_id == MODEL_NAME,
            })
        return result
    except Exception:
        return [{"id": MODEL_NAME, "label": MODEL_NAME, "default": True}]


def ask_ai(
    prompt: str,
    history: list[dict] | None = None,
    attachments: list[dict] | None = None,
    *,
    model: str = MODEL_NAME,
) -> tuple[str, None]:
    user_parts = []
    for att in (attachments or []):
        user_parts.append(types.Part.from_bytes(data=att["data"], mime_type=att["mime_type"]))
    user_parts.append(types.Part(text=prompt))

    if history:
        contents = []
        for msg in history[-20:]:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
        contents.append(types.Content(role="user", parts=user_parts))
    else:
        contents = [types.Content(role="user", parts=user_parts)]

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=CHAT_SYSTEM),
    )
    return response.text, None


def answer_with_data(question: str, data: dict | list, *, model: str = MODEL_NAME) -> tuple[str, None]:
    payload = json.dumps(data, indent=2)
    combined = (
        f"The user asked: {question}\n\n"
        f"Here is the raw API data to answer from:\n{payload}\n\n"
        "Answer the user's question concisely and accurately using only the data above."
    )
    response = client.models.generate_content(
        model=model,
        contents=combined,
        config=types.GenerateContentConfig(system_instruction=CHAT_SYSTEM),
    )
    return response.text, None


def stream_ai(
    prompt: str,
    history: list[dict] | None = None,
    attachments: list[dict] | None = None,
    *,
    model: str = MODEL_NAME,
    system_prompt: str | None = None,
):
    user_parts = []
    for att in (attachments or []):
        user_parts.append(types.Part.from_bytes(data=att["data"], mime_type=att["mime_type"]))
    user_parts.append(types.Part(text=prompt))

    if history:
        contents = []
        for msg in history[-20:]:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
        contents.append(types.Content(role="user", parts=user_parts))
    else:
        contents = [types.Content(role="user", parts=user_parts)]

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=system_prompt or CHAT_SYSTEM),
    ):
        if chunk.text:
            yield chunk.text


def stream_answer_with_data(question: str, data: dict | list, *, model: str = MODEL_NAME, system_prompt: str | None = None):
    payload = json.dumps(data, indent=2)
    combined = (
        f"The user asked: {question}\n\n"
        f"Here is the raw API data to answer from:\n{payload}\n\n"
        "Answer the user's question concisely and accurately using only the data above."
    )
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=combined,
        config=types.GenerateContentConfig(system_instruction=system_prompt or CHAT_SYSTEM),
    ):
        if chunk.text:
            yield chunk.text


def decide_action(prompt: str, history: list[dict] | None = None) -> str:
    context = ""
    if history:
        lines = []
        for msg in history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role}: {msg['content'][:400]}")
        context = "Recent conversation (for context only):\n" + "\n".join(lines) + "\n\n"

    user_message = f"""
You are an API router.

Classify the user's request into EXACTLY one JSON object.

Possible actions:

1. General chat:
{{"action":"chat"}}

0. List all available commands/functions/actions (any tool, not just Acunetix):
{{"action":"help"}}

2. Run an nmap scan:
{{"action":"nmap","target":"<ip or hostname>","flags":"<nmap flags>"}}

3. START a ZAP scan:
{{"action":"scan","target":"<url>"}}

4. RETRIEVE EXISTING ZAP scan results:
{{"action":"results","target":"<url>"}}

5. List all Acunetix targets:
{{"action":"acunetix_list_targets"}}

6. Add a new Acunetix target:
{{"action":"acunetix_add_target","address":"<url>"}}

7. List all Acunetix scans:
{{"action":"acunetix_list_scans"}}

8. Start an Acunetix scan against a target address (will add target if needed):
{{"action":"acunetix_scan","address":"<url>"}}

9. List all Acunetix vulnerabilities:
{{"action":"acunetix_vulnerabilities"}}

10. Get a specific Acunetix target by ID:
{{"action":"acunetix_get_target","target_id":"<uuid>"}}

11. Delete an Acunetix target by ID:
{{"action":"acunetix_delete_target","target_id":"<uuid>"}}

12. Get details of a scan (omit scan_id for the latest scan):
{{"action":"acunetix_get_scan","scan_id":"<uuid or omit>"}}

13. Abort a running Acunetix scan:
{{"action":"acunetix_abort_scan","scan_id":"<uuid>"}}

14. Get result sessions for a scan (omit scan_id for the latest scan):
{{"action":"acunetix_scan_results","scan_id":"<uuid or omit>"}}

15. Get vulnerabilities (omit IDs to get the latest scan's results automatically):
{{"action":"acunetix_scan_vulnerabilities","scan_id":"<uuid or omit>","result_id":"<uuid or omit>"}}

16. Get vulnerabilities for a host by hostname (auto-resolves target and latest scan — use when user provides a hostname/domain, not a UUID):
{{"action":"acunetix_host_vulnerabilities","hostname":"<hostname or url>"}}

17. Get scan history for a host by hostname:
{{"action":"acunetix_host_scans","hostname":"<hostname or url>"}}

18. Get vulnerabilities for the LATEST scan of a host (regardless of scan status — shows partial results if still running):
{{"action":"acunetix_current_scan_vulnerabilities","hostname":"<hostname or url>"}}

19. Get full vulnerability details for a host (includes HTTP request/response, description, remediation):
{{"action":"acunetix_host_vuln_details","hostname":"<hostname or url>"}}

20. Get HTTP request and response for a specific vulnerability (extract vuln_name and hostname from conversation context — look at the previous assistant message for URLs/hostnames and vulnerability names):
{{"action":"acunetix_vuln_http","vuln_name":"<vulnerability name e.g. SQL Injection>","hostname":"<hostname extracted from previous URL in context>","vuln_id":"<uuid if explicitly given>"}}

Decision rules:

- Use "scan" ONLY for ZAP scans. Use "acunetix_scan" for Acunetix scans.
- Use "acunetix_list_targets" when user asks to list, show, or get Acunetix targets.
- Use "acunetix_list_scans" when user asks to list or show Acunetix scans.
- Use "acunetix_vulnerabilities" when user asks for ALL Acunetix vulnerabilities with no specific host.
- Use "acunetix_host_vulnerabilities" when user asks for vulnerabilities for a specific hostname or domain.
- Use "acunetix_host_scans" when user asks for scans for a specific hostname or domain.
- Use "acunetix_current_scan_vulnerabilities" when user asks for vulnerabilities from the latest/current scan specifically, or asks what a running scan has found so far.
- Use "acunetix_host_vuln_details" when user asks for full details, HTTP request/response, description, or remediation for vulnerabilities on a host.
- Use "acunetix_vuln_http" when user asks for the HTTP request/response of a specific vulnerability — extract vuln_name from the vulnerability name mentioned and hostname from any URL visible in the recent conversation (e.g. if the previous message showed "https://qat-optimus-boapi.yjtech.tw/..." then hostname is "qat-optimus-boapi.yjtech.tw").
- Use "acunetix_get_target" / "acunetix_delete_target" when a target_id UUID is mentioned.
- Use "acunetix_get_scan" when the user wants scan details — omit scan_id if no ID is given (defaults to latest).
- Use "acunetix_abort_scan" when the user wants to stop or abort a scan (scan_id required).
- Use "acunetix_scan_results" when the user asks for scan result sessions — omit scan_id if not provided.
- Use "acunetix_scan_vulnerabilities" when the user asks for vulnerabilities without a hostname — omit scan_id and result_id if not provided (defaults to latest).
- NEVER ask the user for scan_id or result_id if they did not provide one — just omit the field.
- Use "help" when the user asks what actions, functions, or commands are available (for any tool).
- Use "results" ONLY for ZAP scan results.

Examples:

User: what acunetix functions are available
Response:
{{"action":"help"}}

User: what can you do with acunetix
Response:
{{"action":"help"}}

User: what can you do
Response:
{{"action":"help"}}

User: help
Response:
{{"action":"help"}}

User: what functions are available
Response:
{{"action":"help"}}

User: list all acunetix targets
Response:
{{"action":"acunetix_list_targets"}}

User: show me acunetix targets
Response:
{{"action":"acunetix_list_targets"}}

User: get all targets
Response:
{{"action":"acunetix_list_targets"}}

User: add https://example.com to acunetix
Response:
{{"action":"acunetix_add_target","address":"https://example.com"}}

User: acunetix scan https://example.com
Response:
{{"action":"acunetix_scan","address":"https://example.com"}}

User: show acunetix vulnerabilities
Response:
{{"action":"acunetix_vulnerabilities"}}

User: get target abc-123
Response:
{{"action":"acunetix_get_target","target_id":"abc-123"}}

User: delete acunetix target abc-123
Response:
{{"action":"acunetix_delete_target","target_id":"abc-123"}}

User: show acunetix scan abc-123
Response:
{{"action":"acunetix_get_scan","scan_id":"abc-123"}}

User: abort scan abc-123
Response:
{{"action":"acunetix_abort_scan","scan_id":"abc-123"}}

User: get results for scan abc-123
Response:
{{"action":"acunetix_scan_results","scan_id":"abc-123"}}

User: show vulnerabilities for scan abc-123 result def-456
Response:
{{"action":"acunetix_scan_vulnerabilities","scan_id":"abc-123","result_id":"def-456"}}

User: show vulnerabilities for example.com
Response:
{{"action":"acunetix_host_vulnerabilities","hostname":"example.com"}}

User: what vulnerabilities were found on testphp.vulnweb.com
Response:
{{"action":"acunetix_host_vulnerabilities","hostname":"testphp.vulnweb.com"}}

User: show scans for example.com
Response:
{{"action":"acunetix_host_scans","hostname":"example.com"}}

User: what scans have been run against 192.168.1.1
Response:
{{"action":"acunetix_host_scans","hostname":"192.168.1.1"}}

User: scan https://testphp.vulnweb.com
Response:
{{"action":"scan","target":"https://testphp.vulnweb.com"}}

User: show me the zap results for https://testphp.vulnweb.com
Response:
{{"action":"results","target":"https://testphp.vulnweb.com"}}

User: run nmap against 10.10.10.10
Response:
{{"action":"nmap","target":"10.10.10.10","flags":"-sV"}}

Rules:
- Default nmap flags: -sV
- Return ONLY valid JSON
- No markdown
- No explanation

{context}User request:
{prompt}
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=DECISION_SYSTEM,
                temperature=0,
                response_mime_type="application/json",
            ),
        )
        return response.text
    except Exception as e:
        print(f"decide_action error: {e}")
        return '{"action":"chat"}'
