import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import ACUNETIX_ENABLED, MODEL_NAME
from database import init_db
from routes.admin import router as admin_router
from routes.agent import router as agent_router
from routes.auth import router as auth_router
from routes.personalities import router as personalities_router
from routes.sessions import router as sessions_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Anthropic-Key"],
)

init_db()

app.include_router(auth_router)
app.include_router(admin_router)
if ACUNETIX_ENABLED:
    from routes.acunetix import router as acunetix_router
    app.include_router(acunetix_router)
app.include_router(agent_router)
app.include_router(personalities_router)

app.include_router(sessions_router)

# Serve built React frontend if dist/ exists
_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.isdir(_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str = ""):
        return FileResponse(os.path.join(_DIST, "index.html"))
else:
    @app.get("/")
    def home():
        return {"status": "running", "model": MODEL_NAME}
