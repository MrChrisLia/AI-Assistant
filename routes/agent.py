import json
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import services.acunetix as acx
import services.claude as claude_svc
import services.gemini as gemini_svc
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL_NAME
from database import get_db
from models import ChatSession, Message, User
from services.auth import get_current_user
from services.gemini import decide_action
from services.nmap import run_nmap, sanitize_nmap_flags, validate_target
from services.zap import get_results, zap_scan

router = APIRouter()

_SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


# ── helpers ──────────────────────────────────────────────────────────────────

def _get_svc(model: str, api_key: str | None = None):
    if model == "claude" and (api_key or ANTHROPIC_API_KEY):
        return claude_svc
    return gemini_svc


def _stream(svc, model, prompt, history, attachments, api_key=None, system_prompt=None):
    if svc is gemini_svc:
        return svc.stream_ai(prompt, history, attachments, model=model, system_prompt=system_prompt)
    return svc.stream_ai(prompt, history, attachments, api_key=api_key, system_prompt=system_prompt)


def _stream_answer(svc, model, question, data, api_key=None, system_prompt=None):
    if svc is gemini_svc:
        return svc.stream_answer_with_data(question, data, model=model, system_prompt=system_prompt)
    return svc.stream_answer_with_data(question, data, api_key=api_key, system_prompt=system_prompt)


def _sse(obj: dict) -> str:
    return f"data: {json.dumps(obj)}\n\n"


def _get_or_create_session(db, user_id, session_id, title):
    if session_id:
        sess = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )
        if sess:
            return sess
    sess = ChatSession(user_id=user_id, title=title[:80])
    db.add(sess)
    db.flush()
    return sess


def _get_history(db, session_id):
    msgs = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
        .limit(20)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in msgs]


def _save(db, session, user_text, response_text, tool, error):
    db.add(Message(session_id=session.id, role="user", content=user_text))
    db.add(Message(
        session_id=session.id, role="assistant",
        content=response_text, tool=tool, error=error,
    ))
    session.updated_at = datetime.utcnow()
    db.commit()


def _done(session_id, tool, error):
    return _sse({"t": "done", "session_id": session_id, "tool": tool, "error": error})


def _static(text, tool, session, db, prompt, error=False):
    """Single-chunk response: yield the full text then done, saving to DB."""
    _save(db, session, prompt, text, tool, error)
    yield _sse({"t": "tok", "v": text})
    yield _done(session.id, tool, error)


def _ai_stream(gen, tool, session, db, prompt):
    """Stream tokens from an AI generator, accumulate, save to DB, yield done."""
    full = ""
    had_error = False
    try:
        for chunk in gen:
            full += chunk
            yield _sse({"t": "tok", "v": chunk})
    except Exception as e:
        had_error = True
        error_text = f"Error: {e}"
        if not full:
            full = error_text
            yield _sse({"t": "tok", "v": full})
    _save(db, session, prompt, full, tool, had_error)
    yield _done(session.id, tool, had_error)


# ── main generator ────────────────────────────────────────────────────────────

_RESTRICTED = {
    "acunetix_add_target": (
        "**Action Restricted — Manual Authorisation Required**\n\n"
        "Adding a scan target modifies the Acunetix configuration and defines the scope "
        "of future security assessments. Additionally, your Acunetix licence enforces a "
        "maximum target capacity — adding targets without oversight risks exhausting the "
        "available allowance.\n\n"
        "To prevent unauthorised scope changes and unintended licence consumption, targets "
        "must be added manually through the Acunetix console or directly via the "
        "`POST /acunetix/targets` API endpoint with explicit authorisation."
    ),
    "acunetix_delete_target": (
        "**Action Restricted — Manual Authorisation Required**\n\n"
        "Deleting a target is an irreversible action that permanently removes the target and "
        "all associated scan history, results, and vulnerability data from Acunetix. "
        "To prevent accidental data loss, deletions must be performed manually through the "
        "Acunetix console or directly via the `DELETE /acunetix/targets/{target_id}` API "
        "endpoint with explicit authorisation."
    ),
    "acunetix_scan": (
        "**Action Restricted — Manual Authorisation Required**\n\n"
        "Initiating an Acunetix scan is a potentially disruptive operation that may generate "
        "significant traffic against the target, trigger security controls, or impact the "
        "availability of the scanned system.\n\n"
        "For this reason, scans must be started manually through the Acunetix console or "
        "directly via the `POST /acunetix/scans` API endpoint with explicit authorisation."
    ),
}


def _agent_stream(prompt, session_id_in, model, attachments, user, db, api_key=None, system_prompt=None):
    svc = _get_svc(model, api_key)
    session = _get_or_create_session(db, user.id, session_id_in, prompt)
    history = _get_history(db, session.id)

    routing_prompt = prompt
    if attachments:
        names = ", ".join(a["name"] for a in attachments)
        routing_prompt = f"{prompt}\n[Attached: {names}]"

    decision_raw = decide_action(routing_prompt, history)
    print("LLM decision:", decision_raw, "| model:", model)

    try:
        decision_raw = decision_raw.strip()
        if decision_raw.startswith("```"):
            decision_raw = decision_raw.split("\n", 1)[1]
            decision_raw = decision_raw.rsplit("```", 1)[0]
        action_data = json.loads(decision_raw)
    except Exception:
        action_data = {"action": "chat"}

    action = action_data.get("action")

    # ── nmap ──
    if action == "nmap":
        target = (action_data.get("target") or "").strip()
        flags_raw = (action_data.get("flags") or "-sV").strip()
        if not target:
            yield from _static("No target specified for nmap scan.", "nmap", session, db, prompt, error=True)
        elif not validate_target(target):
            yield from _static("Invalid nmap target.", "nmap", session, db, prompt, error=True)
        else:
            yield from _static(run_nmap(target, sanitize_nmap_flags(flags_raw)), "nmap", session, db, prompt)
        return

    # ── ZAP scan ──
    if action == "scan":
        target = (action_data.get("target") or "").strip()
        if not target:
            yield from _static("No target URL provided for ZAP scan.", "zap", session, db, prompt, error=True)
        else:
            try:
                zap_scan(target)
                yield from _static(f"Started ZAP scan on {target}.", "zap", session, db, prompt)
            except Exception as e:
                yield from _static(f"ZAP error: {e}\n\nMake sure OWASP ZAP is running on port 8080.", "zap", session, db, prompt, error=True)
        return

    # ── ZAP results ──
    if action == "results":
        target = (action_data.get("target") or "").strip()
        if not target:
            yield from _static("No target URL provided for results retrieval.", "zap", session, db, prompt, error=True)
            return
        try:
            alerts = get_results(target=target).get("alerts", [])
        except Exception as e:
            yield from _static(f"ZAP error: {e}\n\nMake sure OWASP ZAP is running on port 8080.", "zap", session, db, prompt, error=True)
            return
        if not alerts:
            text = "No alerts found."
        else:
            lines = []
            for a in alerts:
                lines.append(
                    f"\nName: {a.get('name')}\nRisk: {a.get('risk')}\n"
                    f"Confidence: {a.get('confidence')}\nMethod: {a.get('method')}\n"
                    f"URL: {a.get('url')}\nParameter: {a.get('param')}\nCWE: {a.get('cweid')}\n\n"
                    f"Evidence:\n{a.get('evidence')}\n\nDescription:\n{a.get('description')}\n\n"
                    f"Solution:\n{a.get('solution')}\n"
                )
            text = "\n".join(lines)
        yield from _static(text, "zap", session, db, prompt)
        return

    # ── help ──
    if action == "help":
        yield from _static(
            "**Available commands:**\n\n"
            "**Nmap**\n"
            "- `run nmap against <host>` — service scan (-sV) against a host\n"
            "- `nmap <host> with flags <flags>` — custom nmap flags\n\n"
            "**ZAP (OWASP)**\n"
            "- `scan <url>` — start a ZAP spider + active scan\n"
            "- `show zap results for <url>` — retrieve ZAP alerts for a URL\n\n"
            "**Acunetix — Targets**\n"
            "- `list all acunetix targets` — list every registered target\n"
            "- `get target <target_id>` — get details for a specific target\n\n"
            "**Acunetix — Scans**\n"
            "- `show acunetix scans` — list all scans\n"
            "- `show acunetix scan <scan_id>` — get details for a specific scan\n"
            "- `abort scan <scan_id>` — stop a running scan\n"
            "- `get results for scan <scan_id>` — list result sessions for a scan\n\n"
            "**Acunetix — Vulnerabilities**\n"
            "- `show acunetix vulnerabilities` — list all found vulnerabilities\n"
            "- `show vulnerabilities for <hostname>` — vulnerabilities for the latest scan of a host\n"
            "- `show vulnerabilities for scan <scan_id> result <result_id>` — vulnerabilities for a specific scan result\n\n"
            "**Acunetix — By Hostname**\n"
            "- `show vulnerabilities for <hostname>` — auto-resolves target and latest scan\n"
            "- `show scans for <hostname>` — scan history for a host\n\n"
            "**General**\n"
            "- anything else — answered by the AI assistant\n",
            "system", session, db, prompt,
        )
        return

    # ── restricted actions ──
    if action in _RESTRICTED:
        yield from _static(_RESTRICTED[action], "acunetix", session, db, prompt, error=True)
        return

    # ── Acunetix data actions (streamed AI summarisation) ──
    if action == "acunetix_list_targets":
        try:
            yield from _ai_stream(_stream_answer(svc, model, prompt, acx.list_targets(), api_key, system_prompt), "acunetix", session, db, prompt)
        except Exception as e:
            yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_get_target":
        target_id = (action_data.get("target_id") or "").strip()
        if not target_id:
            yield from _static("No target_id provided.", "acunetix", session, db, prompt, error=True)
        else:
            try:
                yield from _ai_stream(_stream_answer(svc, model, prompt, acx.get_target(target_id), api_key, system_prompt), "acunetix", session, db, prompt)
            except Exception as e:
                yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_list_scans":
        try:
            yield from _ai_stream(_stream_answer(svc, model, prompt, acx.list_scans(), api_key, system_prompt), "acunetix", session, db, prompt)
        except Exception as e:
            yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_get_scan":
        scan_id = (action_data.get("scan_id") or "").strip() or None
        try:
            data = acx.get_scan(scan_id) if scan_id else acx.get_latest_scan()
            yield from _ai_stream(_stream_answer(svc, model, prompt, data, api_key, system_prompt), "acunetix", session, db, prompt)
        except Exception as e:
            yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_abort_scan":
        scan_id = (action_data.get("scan_id") or "").strip()
        if not scan_id:
            yield from _static("No scan_id provided to abort.", "acunetix", session, db, prompt, error=True)
        else:
            try:
                acx.abort_scan(scan_id)
                yield from _static(f"Scan {scan_id} aborted.", "acunetix", session, db, prompt)
            except Exception as e:
                yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_scan_results":
        scan_id = (action_data.get("scan_id") or "").strip() or None
        try:
            yield from _ai_stream(_stream_answer(svc, model, prompt, acx.get_smart_scan_results(scan_id), api_key, system_prompt), "acunetix", session, db, prompt)
        except Exception as e:
            yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_scan_vulnerabilities":
        scan_id = (action_data.get("scan_id") or "").strip() or None
        result_id = (action_data.get("result_id") or "").strip() or None
        try:
            yield from _ai_stream(_stream_answer(svc, model, prompt, acx.get_smart_vulnerabilities(scan_id, result_id), api_key, system_prompt), "acunetix", session, db, prompt)
        except Exception as e:
            yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_vulnerabilities":
        query = (action_data.get("q") or "").strip() or None
        try:
            yield from _ai_stream(_stream_answer(svc, model, prompt, acx.list_vulnerabilities(query=query), api_key, system_prompt), "acunetix", session, db, prompt)
        except Exception as e:
            yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_host_vulnerabilities":
        hostname = (action_data.get("hostname") or "").strip()
        if not hostname:
            yield from _static("No hostname provided.", "acunetix", session, db, prompt, error=True)
        else:
            try:
                yield from _ai_stream(_stream_answer(svc, model, prompt, acx.get_vulnerabilities_by_host(hostname), api_key, system_prompt), "acunetix", session, db, prompt)
            except Exception as e:
                yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_vuln_http":
        vuln_id = (action_data.get("vuln_id") or "").strip() or None
        hostname = (action_data.get("hostname") or "").strip() or None
        vuln_name = (action_data.get("vuln_name") or "").strip() or None
        try:
            yield from _ai_stream(_stream_answer(svc, model, prompt, acx.find_vuln_with_http(hostname, vuln_name, vuln_id), api_key, system_prompt), "acunetix", session, db, prompt)
        except Exception as e:
            yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_current_scan_vulnerabilities":
        hostname = (action_data.get("hostname") or "").strip()
        if not hostname:
            yield from _static("No hostname provided.", "acunetix", session, db, prompt, error=True)
        else:
            try:
                yield from _ai_stream(_stream_answer(svc, model, prompt, acx.get_current_scan_vulnerabilities_for_host(hostname), api_key, system_prompt), "acunetix", session, db, prompt)
            except Exception as e:
                yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_host_vuln_details":
        hostname = (action_data.get("hostname") or "").strip()
        if not hostname:
            yield from _static("No hostname provided.", "acunetix", session, db, prompt, error=True)
        else:
            try:
                yield from _ai_stream(_stream_answer(svc, model, prompt, acx.get_host_vuln_details(hostname), api_key, system_prompt), "acunetix", session, db, prompt)
            except Exception as e:
                yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    if action == "acunetix_host_scans":
        hostname = (action_data.get("hostname") or "").strip()
        if not hostname:
            yield from _static("No hostname provided.", "acunetix", session, db, prompt, error=True)
        else:
            try:
                yield from _ai_stream(_stream_answer(svc, model, prompt, acx.get_scans_by_host(hostname), api_key, system_prompt), "acunetix", session, db, prompt)
            except Exception as e:
                yield from _static(f"Acunetix error: {e}", "acunetix", session, db, prompt, error=True)
        return

    # ── default: general AI chat (fully streamed) ──
    yield from _ai_stream(_stream(svc, model, prompt, history, attachments, api_key, system_prompt), "ai", session, db, prompt)


# ── routes ────────────────────────────────────────────────────────────────────

@router.get("/models")
def list_models():
    models = [{"id": m["id"], "label": m["label"], "default": m["default"]}
              for m in gemini_svc.list_models()]
    models.append({"id": "claude", "label": f"Claude ({CLAUDE_MODEL_NAME})", "default": False})
    return models


@router.post("/agent")
async def agent(
    prompt: str = Form(...),
    session_id: str | None = Form(None),
    model: str = Form("gemini"),
    files: list[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_anthropic_key: str | None = Header(None),
    system_prompt: str | None = Form(None),
):
    _MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB per file
    attachments = []
    for f in files:
        data = await f.read()
        if len(data) > _MAX_FILE_BYTES:
            continue
        attachments.append({
            "name": f.filename or "file",
            "mime_type": f.content_type or "application/octet-stream",
            "data": data,
        })

    return StreamingResponse(
        _agent_stream(prompt, session_id, model, attachments, current_user, db, api_key=x_anthropic_key, system_prompt=system_prompt or None),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )
