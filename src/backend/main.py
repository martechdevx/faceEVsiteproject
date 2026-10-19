from datetime import datetime
import os
from sqlalchemy import inspect, or_, text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.audit import prune_audit_logs
from core.database import Base, SessionLocal, engine
from faiss_engine.faiss_manager import faiss_manager
from models.models import EnrolledFace, RefreshToken
from routers import auth, enrollment, verification, dashboard, admin

# ── Create all MySQL tables on startup 
Base.metadata.create_all(bind=engine)

# Add the admin flag for databases created before admin management existed.
if "is_admin" not in {column["name"] for column in inspect(engine).get_columns("users")}:
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE"))

# Keep existing image storage wide enough for Base64-encoded images up to 100 KB.
if engine.dialect.name == "mysql":
    image_column = next(
        column
        for column in inspect(engine).get_columns("enrolled_faces")
        if column["name"] == "image_base64"
    )
    image_type = type(image_column["type"]).__name__.upper()
    if image_type not in {"MEDIUMTEXT", "LONGTEXT"}:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE enrolled_faces MODIFY image_base64 MEDIUMTEXT NOT NULL")
            )

    # Remove explicit indexes that duplicate primary keys or unique indexes.
    index_tables = {
        "users": {"id", "email"},
        "enrolled_faces": {"id"},
        "audit_logs": {"id"},
        "refresh_tokens": {"id", "token_hash"},
    }
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table_name, redundant_columns in index_tables.items():
            if table_name not in inspector.get_table_names():
                continue
            indexes = inspector.get_indexes(table_name)
            unique_columns = {
                tuple(index["column_names"])
                for index in indexes
                if index.get("unique") and all(index.get("column_names") or [])
            }
            primary_key_columns = tuple(
                inspector.get_pk_constraint(table_name).get("constrained_columns") or []
            )
            for index in indexes:
                columns = tuple(index.get("column_names") or [])
                is_primary_key_duplicate = columns == primary_key_columns
                is_unique_duplicate = (
                    not index.get("unique")
                    and columns in unique_columns
                )
                if (
                    len(columns) == 1
                    and columns[0] in redundant_columns
                    and (is_primary_key_duplicate or is_unique_duplicate)
                ):
                    index_name = index["name"].replace("`", "``")
                    connection.execute(text(
                        f"ALTER TABLE `{table_name}` DROP INDEX `{index_name}`"
                    ))

    with engine.begin() as connection:
        connection.execute(text(
            "INSERT IGNORE INTO enrollment_claims (user_id, created_at) "
            "SELECT DISTINCT enrolled_by, UTC_TIMESTAMP() FROM enrolled_faces"
        ))

# Prune historical records and expired/revoked sessions when the API starts.
with SessionLocal() as db:
    prune_audit_logs(db)
    db.query(RefreshToken).filter(
        or_(
            RefreshToken.revoked.is_(True),
            RefreshToken.expires_at <= datetime.utcnow(),
        )
    ).delete(synchronize_session=False)
    db.commit()

# Discard stale FAISS vectors left behind by failed enrollment writes and repair positions.
with SessionLocal() as db:
    face_rows = db.query(EnrolledFace.id, EnrolledFace.faiss_index_id).all()
    face_ids = {face_id for face_id, _ in face_rows}
    faiss_positions, removed_vectors = faiss_manager.reconcile(face_ids)
    stored_positions = dict(face_rows)
    for face_id, position in faiss_positions.items():
        if stored_positions.get(face_id) != position:
            db.query(EnrolledFace).filter(EnrolledFace.id == face_id).update(
                {EnrolledFace.faiss_index_id: position},
                synchronize_session=False,
            )
    db.commit()
    if removed_vectors:
        print(f"[FAISS] Removed {removed_vectors} vectors without enrollment records.")

# ── Create storage directories───
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.FAISS_DIR, exist_ok=True)

# ── FastAPI app 
app = FastAPI(
    title="FaceEV API",
    description="Face Enrollment & Verification Backend",
    version="2.0.0",
)

# ── CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    #local url
        "http://127.0.0.1:5173",    #local alt
        "http://localhost:3000",    #local alt
        "http://127.0.0.1:3000",    #local alt
        "https://faceio.pages.dev/" #production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve enrolled face images as static files 
app.mount("/images", StaticFiles(directory=settings.UPLOAD_DIR), name="images")

# ── Routers
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(enrollment.router)
app.include_router(verification.router)
app.include_router(dashboard.router)

@app.get("/")
def root():
    return {"message": "FaceEV API is running."}
