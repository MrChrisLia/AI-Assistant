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

2. List all available commands:
{{"action":"help"}}

3. Run an nmap scan:
{{"action":"nmap","target":"<ip or hostname>","flags":"<nmap flags>"}}

Decision rules:
- Use "nmap" when the user asks to scan, probe, or enumerate a host/IP.
- Use "help" when the user asks what commands or actions are available.
- Use "chat" for everything else.

Examples:

User: help
Response:
{{"action":"help"}}

User: what can you do
Response:
{{"action":"help"}}

User: run nmap against 10.10.10.10
Response:
{{"action":"nmap","target":"10.10.10.10","flags":"-sV"}}

User: scan 192.168.1.1 with -A flag
Response:
{{"action":"nmap","target":"192.168.1.1","flags":"-A"}}

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
