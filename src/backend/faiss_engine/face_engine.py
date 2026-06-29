import cv2
import numpy as np
from fastapi import HTTPException
from insightface.app import FaceAnalysis

# ── Load InsightFace model once (module-level singleton) ───────────────────
# ctx_id=0  → GPU if available
# ctx_id=-1 → CPU only (change to -1 if you have no NVIDIA GPU)
_app = FaceAnalysis(name="buffalo_l")
_app.prepare(ctx_id=0, det_size=(640, 640), det_thresh=0.3)


# ── Original function (kept intact — used by index_faces.py) ───────────────

def get_face_embedding(image_path: str) -> np.ndarray | None:
    """
    Original function: accepts a file path, returns embedding or None.
    Used by index_faces.py (your bulk-indexing script).
    """
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not load image: {image_path}")

    faces = _app.get(image)
    if not faces:
        print(f"No detectable face in: {image_path}")
        return None

    largest_face = max(
        faces,
        key=lambda face: (face.bbox[2] - face.bbox[0]) * (face.bbox[3] - face.bbox[1]),
    )
    return largest_face.embedding


# ── New function (used by FastAPI routers) ─────────────────────────────────

def get_embedding_from_bytes(image_bytes: bytes) -> np.ndarray:
    """
    API-friendly version: accepts raw image bytes from an uploaded file.
    Raises FastAPI HTTPException on failure (no file-system dependency).
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode the uploaded image.")

    faces = _app.get(image)
    if not faces:
        raise HTTPException(status_code=422, detail="No face detected in the uploaded image.")

    largest_face = max(
        faces,
        key=lambda face: (face.bbox[2] - face.bbox[0]) * (face.bbox[3] - face.bbox[1]),
    )
    return largest_face.embedding
