from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from services import acunetix as acx
from services.auth import get_current_user

router = APIRouter(prefix="/acunetix", tags=["acunetix"], dependencies=[Depends(get_current_user)])


class AddTargetRequest(BaseModel):
    address: str
    description: str = ""


class ScheduleScanRequest(BaseModel):
    target_id: str
    profile_id: str = acx.FULL_SCAN_PROFILE_ID


# --- Targets ---

@router.get("/targets")
def list_targets():
    try:
        return acx.list_targets()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/targets", status_code=201)
def add_target(body: AddTargetRequest):
    try:
        return acx.add_target(body.address, body.description)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/targets/{target_id}")
def get_target(target_id: str):
    try:
        return acx.get_target(target_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.delete("/targets/{target_id}", status_code=204)
def delete_target(target_id: str):
    try:
        acx.delete_target(target_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# --- Scans ---

@router.get("/scans")
def list_scans():
    try:
        return acx.list_scans()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/scans", status_code=201)
def schedule_scan(body: ScheduleScanRequest):
    try:
        return acx.schedule_scan(body.target_id, body.profile_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/scans/{scan_id}")
def get_scan(scan_id: str):
    try:
        return acx.get_scan(scan_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/scans/{scan_id}/abort", status_code=204)
def abort_scan(scan_id: str):
    try:
        acx.abort_scan(scan_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/scans/{scan_id}/results")
def get_scan_results(scan_id: str):
    try:
        return acx.get_scan_results(scan_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/scans/{scan_id}/results/{result_id}/vulnerabilities")
def get_scan_vulnerabilities(scan_id: str, result_id: str):
    try:
        return acx.get_scan_vulnerabilities(scan_id, result_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# --- Vulnerabilities ---

@router.get("/vulnerabilities")
def list_vulnerabilities(
    q: str | None = Query(None, description="Acunetix query filter, e.g. severity:3"),
):
    try:
        return acx.list_vulnerabilities(query=q)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/vulnerabilities/{vuln_id}")
def get_vulnerability(vuln_id: str):
    try:
        return acx.get_vulnerability_detail(vuln_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
