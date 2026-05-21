import requests
import urllib3

from config import ACUNETIX_API_KEY, ACUNETIX_URL

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Full Scan profile — built-in Acunetix default
FULL_SCAN_PROFILE_ID = "11111111-1111-1111-1111-111111111111"


def _headers() -> dict:
    return {"X-Auth": ACUNETIX_API_KEY, "Content-Type": "application/json"}


def _get(path: str, params: dict | None = None) -> dict:
    resp = requests.get(
        f"{ACUNETIX_URL}{path}", headers=_headers(), params=params, verify=False, timeout=30
    )
    resp.raise_for_status()
    return resp.json()


def _post(path: str, body: dict | None = None) -> requests.Response:
    return requests.post(
        f"{ACUNETIX_URL}{path}", headers=_headers(), json=body, verify=False, timeout=30
    )


def _delete(path: str) -> requests.Response:
    return requests.delete(
        f"{ACUNETIX_URL}{path}", headers=_headers(), verify=False, timeout=30
    )


def _get_all(path: str, list_key: str, extra_params: dict | None = None) -> dict:
    """Fetch every page of a paginated endpoint and return a merged result dict.

    The API hard caps each page at 100 items. Pages are walked using a numeric
    offset cursor: if a full page (100 items) is returned, request the next 100
    starting at the current total. Stop when a partial page is returned.
    """
    params = dict(extra_params or {})
    params["l"] = 100

    all_items: list = []
    offset = 0
    last_data: dict = {}

    while True:
        if offset > 0:
            params["c"] = str(offset)

        try:
            last_data = _get(path, params)
        except Exception:
            if not all_items:
                raise
            break  # partial page already collected — return what we have

        batch = last_data.get(list_key, [])
        all_items.extend(batch)

        if len(batch) < 100:
            break

        offset += 100

    last_data[list_key] = all_items
    if "pagination" in last_data:
        last_data["pagination"]["count"] = len(all_items)
    return last_data


# --- Targets ---

def add_target(address: str, description: str = "") -> dict:
    resp = _post("/targets", {"address": address, "description": description, "type": "default"})
    resp.raise_for_status()
    return resp.json()


def list_targets() -> dict:
    return _get_all("/targets", "targets")


def get_target(target_id: str) -> dict:
    return _get(f"/targets/{target_id}")


def delete_target(target_id: str) -> bool:
    resp = _delete(f"/targets/{target_id}")
    return resp.status_code == 204


# --- Scans ---

def schedule_scan(target_id: str, profile_id: str = FULL_SCAN_PROFILE_ID) -> dict:
    resp = _post("/scans", {
        "target_id": target_id,
        "profile_id": profile_id,
        "schedule": {"disable": False, "start_date": None, "time_sensitive": False},
    })
    resp.raise_for_status()
    scan_id = resp.headers.get("Location", "").rstrip("/").split("/")[-1]
    return {"scan_id": scan_id, "location": resp.headers.get("Location")}


def list_scans() -> dict:
    return _get_all("/scans", "scans")


def get_scan(scan_id: str) -> dict:
    return _get(f"/scans/{scan_id}")


def abort_scan(scan_id: str) -> bool:
    resp = _post(f"/scans/{scan_id}/abort")
    return resp.status_code == 204


# --- Vulnerabilities ---

def list_vulnerabilities(query: str | None = None) -> dict:
    extra = {"q": query} if query else {}
    return _get_all("/vulnerabilities", "vulnerabilities", extra_params=extra)


def get_scan_vulnerabilities(scan_id: str, result_id: str) -> dict:
    return _get_all(
        f"/scans/{scan_id}/results/{result_id}/vulnerabilities",
        "vulnerabilities",
    )


def get_scan_results(scan_id: str) -> dict:
    return _get_all(f"/scans/{scan_id}/results", "results")


# ── latest-first helpers ─────────────────────────────────────────────────────

def get_latest_scan() -> dict:
    scans = list_scans().get("scans", [])
    if not scans:
        return {"error": "No scans found in Acunetix"}
    scans.sort(key=lambda s: s.get("current_session", {}).get("start_date", ""), reverse=True)
    return scans[0]


def get_smart_scan_results(scan_id: str | None = None) -> dict:
    if not scan_id:
        scan = get_latest_scan()
        if "error" in scan:
            return scan
        scan_id = scan["scan_id"]
    results = get_scan_results(scan_id)
    results["_scan_id"] = scan_id
    return results


def get_smart_vulnerabilities(scan_id: str | None = None, result_id: str | None = None) -> dict:
    if not scan_id:
        scan = get_latest_scan()
        if "error" in scan:
            return scan
        scan_id = scan["scan_id"]
    if not result_id:
        results = get_scan_results(scan_id).get("results", [])
        if not results:
            return {"error": "No results found for this scan — it may still be running"}
        result_id = results[0].get("result_id") or results[0].get("scan_result_id")
    vulns = get_scan_vulnerabilities(scan_id, result_id)
    vulns["_scan_id"] = scan_id
    vulns["_result_id"] = result_id
    return vulns


# ── hostname helpers ──────────────────────────────────────────────────────────

def _strip_host(address: str) -> str:
    """Strip protocol and trailing slashes for loose hostname matching."""
    address = address.lower().strip().rstrip("/")
    for proto in ("https://", "http://"):
        if address.startswith(proto):
            address = address[len(proto):]
            break
    return address


def find_target_by_host(hostname: str) -> dict | None:
    hostname = _strip_host(hostname)
    for target in list_targets().get("targets", []):
        if hostname == _strip_host(target.get("address", "")):
            return target
    # fallback: partial match (subdomain or path differences)
    for target in list_targets().get("targets", []):
        if hostname in _strip_host(target.get("address", "")):
            return target
    return None


def _latest_scan_for_target(target_id: str, completed_only: bool = False) -> dict | None:
    all_scans = list_scans().get("scans", [])
    scans = [
        s for s in all_scans
        if s.get("target_id") == target_id
        or s.get("target", {}).get("target_id") == target_id
    ]
    if completed_only:
        scans = [
            s for s in scans
            if (s.get("current_session", {}).get("status") or "").lower() == "completed"
        ]
    if not scans:
        return None
    scans.sort(key=lambda s: s.get("current_session", {}).get("start_date", ""), reverse=True)
    return scans[0]


def get_vulnerabilities_by_host(hostname: str) -> dict:
    target = find_target_by_host(hostname)
    if not target:
        return {"error": f"No Acunetix target found matching '{hostname}'"}

    target_id = target["target_id"]

    # All scans for this target, newest first
    target_scans = sorted(
        [s for s in list_scans().get("scans", [])
         if s.get("target_id") == target_id
         or s.get("target", {}).get("target_id") == target_id],
        key=lambda s: s.get("current_session", {}).get("start_date", ""),
        reverse=True,
    )

    if not target_scans:
        return {"error": f"No scans found for '{hostname}'"}

    # Try the latest completed scan first — most authoritative result set
    for scan in target_scans:
        if (scan.get("current_session", {}).get("status") or "").lower() != "completed":
            continue
        results = get_scan_results(scan["scan_id"]).get("results", [])
        if not results:
            continue
        result_id = results[0].get("result_id") or results[0].get("scan_result_id")
        vulns = get_scan_vulnerabilities(scan["scan_id"], result_id)
        if vulns.get("vulnerabilities"):
            vulns["_target"] = target
            vulns["_scan"] = scan
            return vulns

    # No completed scan with results — aggregate across all scans (including aborted/running)
    seen: set = set()
    aggregated: list = []
    for scan in target_scans:
        try:
            for result in get_scan_results(scan["scan_id"]).get("results", []):
                result_id = result.get("result_id") or result.get("scan_result_id")
                if not result_id:
                    continue
                for v in get_scan_vulnerabilities(scan["scan_id"], result_id).get("vulnerabilities", []):
                    key = v.get("vuln_id") or v.get("vulnerability_id")
                    if key and key in seen:
                        continue
                    if key:
                        seen.add(key)
                    aggregated.append(v)
        except Exception:
            continue

    latest = target_scans[0]
    return {
        "vulnerabilities": aggregated,
        "_target": target,
        "_scan": latest,
        "_scan_status": latest.get("current_session", {}).get("status", "unknown"),
    }


def get_current_scan_vulnerabilities_for_host(hostname: str) -> dict:
    """Vulnerabilities from the latest scan for a host, regardless of scan status."""
    target = find_target_by_host(hostname)
    if not target:
        return {"error": f"No Acunetix target found matching '{hostname}'"}

    scan = _latest_scan_for_target(target["target_id"])
    if not scan:
        return {"error": f"No scans found for '{hostname}'"}

    results = get_scan_results(scan["scan_id"]).get("results", [])
    if not results:
        return {
            "error": "No results committed yet — the scan may still be starting",
            "_target": target,
            "_scan": scan,
            "_scan_status": scan.get("current_session", {}).get("status", "unknown"),
        }

    result_id = results[0].get("result_id") or results[0].get("scan_result_id")
    vulns = get_scan_vulnerabilities(scan["scan_id"], result_id)
    vulns["_target"] = target
    vulns["_scan"] = scan
    vulns["_scan_status"] = scan.get("current_session", {}).get("status", "unknown")
    return vulns


def get_vulnerability_detail(vuln_id: str) -> dict:
    return _get(f"/vulnerabilities/{vuln_id}")


def _vuln_name_str(v: dict) -> str:
    """Best-effort extraction of a human-readable vulnerability name from any field Acunetix might use."""
    return (
        v.get("vt_name") or v.get("name") or v.get("vuln_name") or
        str(v.get("vt_id") or "") or ""
    ).lower()


def _pick_and_detail(vulns: list, vuln_name: str | None) -> dict:
    """Filter by name (if given), prefer open, fetch full detail."""
    if vuln_name:
        name_lower = vuln_name.lower()
        # Search across every string value in the object — field name is unknown without inspecting API response
        matched = [
            v for v in vulns
            if any(name_lower in str(val).lower() for val in v.values() if val)
        ]
        if matched:
            vulns = matched

    if not vulns:
        return {"error": f"No vulnerability found matching '{vuln_name}'"}

    open_vulns = [v for v in vulns if v.get("status") == "open"]
    chosen = open_vulns[0] if open_vulns else vulns[0]
    vid = chosen.get("vuln_id") or chosen.get("vulnerability_id")
    if not vid:
        return {"error": "Vulnerability found but no ID available to fetch detail", "summary": chosen}

    detail = get_vulnerability_detail(vid)
    return {**chosen, **detail}


def find_vuln_with_http(hostname: str | None = None, vuln_name: str | None = None, vuln_id: str | None = None) -> dict:
    """Find a vulnerability by ID, name, or hostname and return its full detail including HTTP request/response."""
    if vuln_id:
        return get_vulnerability_detail(vuln_id)

    # Use the global vulnerability list — we know this works.
    # Filter client-side rather than relying on the scan chain which can fail.
    vulns = list_vulnerabilities().get("vulnerabilities", [])

    if hostname:
        stripped = _strip_host(hostname)
        vulns = [
            v for v in vulns
            if stripped in _strip_host(v.get("affects_url", ""))
            or stripped in str(v).lower()
        ]

    return _pick_and_detail(vulns, vuln_name)


def get_host_vuln_details(hostname: str) -> dict:
    """All vulnerabilities for a host, each enriched with full detail (HTTP req/response etc.)."""
    base = get_vulnerabilities_by_host(hostname)
    if "error" in base:
        return base

    enriched = []
    for v in base.get("vulnerabilities", []):
        vid = v.get("vuln_id") or v.get("vulnerability_id")
        if vid:
            try:
                detail = get_vulnerability_detail(vid)
                enriched.append({**v, **detail})
            except Exception:
                enriched.append(v)
        else:
            enriched.append(v)

    base["vulnerabilities"] = enriched
    return base


def get_scans_by_host(hostname: str) -> dict:
    target = find_target_by_host(hostname)
    if not target:
        return {"error": f"No Acunetix target found matching '{hostname}'"}

    scans = [
        s for s in list_scans().get("scans", [])
        if s.get("target", {}).get("target_id") == target["target_id"]
    ]
    return {"target": target, "scans": scans}
