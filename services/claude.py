import base64
import json

import anthropic

from config import ANTHROPIC_API_KEY, CLAUDE_INPUT_COST_PER_MTK, CLAUDE_MODEL_NAME, CLAUDE_OUTPUT_COST_PER_MTK

_default_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None


def _client(api_key: str | None = None):
    if api_key:
        return anthropic.Anthropic(api_key=api_key)
    if _default_client:
        return _default_client
    raise ValueError("No Anthropic API key provided")

SYSTEM = (
    "You are a helpful cybersecurity AI assistant. "
    "Answer questions clearly and concisely."
)

_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def _calc_usage(usage) -> dict:
    inp, out = usage.input_tokens, usage.output_tokens
    cost = (inp * CLAUDE_INPUT_COST_PER_MTK + out * CLAUDE_OUTPUT_COST_PER_MTK) / 1_000_000
    return {"input_tokens": inp, "output_tokens": out, "cost_usd": round(cost, 6)}


def _build_content(prompt: str, attachments: list[dict] | None) -> list:
    blocks = []
    for att in (attachments or []):
        mime = att["mime_type"]
        if mime in _IMAGE_TYPES:
            blocks.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime,
                    "data": base64.standard_b64encode(att["data"]).decode(),
                },
            })
        else:
            try:
                text = att["data"].decode("utf-8", errors="replace")
                blocks.append({"type": "text", "text": f"[File: {att['name']}]\n{text}"})
            except Exception:
                pass
    blocks.append({"type": "text", "text": prompt})
    return blocks


def stream_ai(
    prompt: str,
    history: list[dict] | None = None,
    attachments: list[dict] | None = None,
    *,
    api_key: str | None = None,
    system_prompt: str | None = None,
):
    messages = []
    for msg in (history or [])[-20:]:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg["content"]})
    messages.append({"role": "user", "content": _build_content(prompt, attachments)})

    with _client(api_key).messages.stream(
        model=CLAUDE_MODEL_NAME,
        max_tokens=4096,
        system=system_prompt or SYSTEM,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text


def stream_answer_with_data(question: str, data: dict | list, *, api_key: str | None = None, system_prompt: str | None = None):
    payload = json.dumps(data, indent=2)
    combined = (
        f"The user asked: {question}\n\n"
        f"Here is the raw API data to answer from:\n{payload}\n\n"
        "Answer the user's question concisely and accurately using only the data above."
    )
    with _client(api_key).messages.stream(
        model=CLAUDE_MODEL_NAME,
        max_tokens=4096,
        system=system_prompt or SYSTEM,
        messages=[{"role": "user", "content": combined}],
    ) as stream:
        for text in stream.text_stream:
            yield text


