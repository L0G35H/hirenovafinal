"""
TalentLens – FastAPI Application Entry Point
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from config import init_firebase
from routes import admin, jobs, upload, candidates, analytics

# ── Initialize Firebase on startup ─────────────────────────────────────────────
init_firebase()

# ── Create FastAPI app ─────────────────────────────────────────────────────────
app = FastAPI(
    title       = "TalentLens API",
    description = "AI Resume Analyzer & Smart Candidate Selection System",
    version     = "1.0.0",
    docs_url    = "/api/docs",
    redoc_url   = "/api/redoc",
)

# ── CORS Middleware ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── API Routers ────────────────────────────────────────────────────────────────
app.include_router(admin.router)
app.include_router(jobs.router)
app.include_router(upload.router)
app.include_router(candidates.router)
app.include_router(analytics.router)

# ── Health Check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "app": "TalentLens", "version": "1.0.0"}

# ── Serve Frontend ─────────────────────────────────────────────────────────────
FRONTEND_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
STATIC_DIR   = os.path.join(FRONTEND_DIR, "static")

print(f"📁 Frontend directory: {FRONTEND_DIR}")
print(f"📁 Static directory:   {STATIC_DIR}")
print(f"   Frontend exists: {os.path.exists(FRONTEND_DIR)}")
print(f"   Static exists:   {os.path.exists(STATIC_DIR)}")

# Serve HTML pages
@app.get("/", response_class=FileResponse)
async def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/{page}.html", response_class=FileResponse)
async def serve_page(page: str):
    path = os.path.join(FRONTEND_DIR, f"{page}.html")
    if os.path.exists(path):
        return FileResponse(path)
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

# ── Mount Static Files LAST ────────────────────────────────────────────────────
# In FastAPI, app.mount() acts as a catch-all for the given prefix.
# It must be registered AFTER all @app.get() routes so it doesn't conflict.
# The /static mount handles all /static/... requests (JS, CSS, images).
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    print("✅ Static files mounted at /static")
else:
    print("⚠️  Static directory not found, static files will not be served!")
