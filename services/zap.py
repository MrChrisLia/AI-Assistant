import time
from urllib.parse import urlparse

import requests

from config import ZAP_URL


def normalize_target(target: str) -> str:
    target = target.strip()
    if not target.startswith(("http://", "https://")):
        target = "http://" + target
    return target


def zap_scan(target: str) -> dict:
    requests.get(f"{ZAP_URL}/JSON/core/action/accessUrl/", params={"url": target})
    spider = requests.get(f"{ZAP_URL}/JSON/spider/action/scan/", params={"url": target})
    spider_json = spider.json()

    if "scan" not in spider_json:
        return {"error": spider_json}

    spider_id = spider_json["scan"]
    while True:
        status = requests.get(
            f"{ZAP_URL}/JSON/spider/view/status/", params={"scanId": spider_id}
        )
        if int(status.json()["status"]) >= 100:
            break
        time.sleep(2)

    active = requests.get(f"{ZAP_URL}/JSON/ascan/action/scan/", params={"url": target})
    return {"scan_id": active.json().get("scan")}


def get_results(target: str, risk: str | None = None) -> dict:
    target = normalize_target(target)

    try:
        response = requests.get(f"{ZAP_URL}/JSON/core/view/alerts/", timeout=30)
        print("Alerts response:", response.text)
        data = response.json()
        alerts = data.get("alerts", [])

        target_host = urlparse(target).netloc
        filtered = []

        for alert in alerts:
            alert_url = alert.get("url", "")
            alert_host = urlparse(alert_url).netloc

            if alert_host != target_host:
                continue
            if risk and alert.get("risk", "").lower() != risk.lower():
                continue

            filtered.append({
                "name": alert.get("alert"),
                "risk": alert.get("risk"),
                "confidence": alert.get("confidence"),
                "url": alert_url,
                "param": alert.get("param"),
                "description": alert.get("description"),
                "solution": alert.get("solution"),
            })

        return {"target": target, "total_alerts": len(filtered), "alerts": filtered}

    except Exception as e:
        return {"error": str(e)}
