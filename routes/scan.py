from fastapi import APIRouter, Depends

from services.auth import get_current_user
from services.zap import get_results

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/results")
def results(target: str, risk: str | None = None):
    return get_results(target=target, risk=risk)
