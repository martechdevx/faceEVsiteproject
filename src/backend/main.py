import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.database import Base, engine
from routers import auth, enrollment, verification, dashboard

# ── Create all MySQL tables on startup ────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Create storage directories ─────────────────────────────────────────────
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.FAISS_DIR, exist_ok=True)

# ── FastAPI app ────────────────────────────────────────────────────────────
app = FastAPI(
    title="FaceEV API",
    description="Face Enrollment & Verification Backend",
    version="1.0.0",
)

# ── CORS — allow React dev server ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve enrolled face images as static files ─────────────────────────────
app.mount("/images", StaticFiles(directory=settings.UPLOAD_DIR), name="images")

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(enrollment.router)
app.include_router(verification.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"message": "FaceEV API is running."}
