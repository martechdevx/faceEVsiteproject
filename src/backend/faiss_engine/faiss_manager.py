"""
FaissManager
------------
A singleton that keeps the FAISS index in memory for the lifetime of the
FastAPI process.  On startup it loads an existing index from disk (if one
exists); on every new enrolment it adds the embedding and saves back to disk.
"""

import os
import pickle
import numpy as np
import faiss
from core.config import settings

DIMENSION = 512          # InsightFace buffalo_l embedding size
INDEX_PATH = os.path.join(settings.FAISS_DIR, "faces.index")
META_PATH  = os.path.join(settings.FAISS_DIR, "metadata.pkl")


class FaissManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        os.makedirs(settings.FAISS_DIR, exist_ok=True)
        self._load()
        self._initialized = True

    # ── Internal helpers ───────────────────────────────────────────────────

    def _load(self):
        index_exists = os.path.exists(INDEX_PATH) and os.path.getsize(INDEX_PATH) > 0
        meta_exists  = os.path.exists(META_PATH) and os.path.getsize(META_PATH) > 0

        if index_exists and meta_exists:
            try:
                self.index = faiss.read_index(INDEX_PATH)
                with open(META_PATH, "rb") as f:
                    self.metadata: list[int] = pickle.load(f)
                print(f"[FAISS] Loaded index with {self.index.ntotal} faces.")
            except Exception as e:
                print(f"[FAISS] Failed to load index, creating fresh. Error: {e}")
                self.index = faiss.IndexFlatIP(DIMENSION)
                self.metadata: list[int] = []
        else:
            self.index = faiss.IndexFlatIP(DIMENSION)
            self.metadata: list[int] = []
            print("[FAISS] Created fresh index.")


    def _save(self):
        faiss.write_index(self.index, INDEX_PATH)
        with open(META_PATH, "wb") as f:
            pickle.dump(self.metadata, f)

    # ── Public API ─────────────────────────────────────────────────────────

    def add_embedding(self, embedding: np.ndarray, db_row_id: int) -> int:
        """
        Normalise, add to index, persist, and return the FAISS position.
        """
        vec = embedding.astype("float32").reshape(1, -1)
        faiss.normalize_L2(vec)
        self.index.add(vec)
        position = len(self.metadata)
        self.metadata.append(db_row_id)
        self._save()
        return position

    def search(self, embedding: np.ndarray, top_k: int = 5):
        """
        Returns list of (db_row_id, similarity_score) tuples.
        Similarity score is in [0, 1] — higher is more similar.
        """
        if self.index.ntotal == 0:
            return []

        vec = embedding.astype("float32").reshape(1, -1)
        faiss.normalize_L2(vec)
        top_k = min(top_k, self.index.ntotal)
        scores, indices = self.index.search(vec, top_k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            db_id = self.metadata[idx]
            results.append((db_id, float(score)))
        return results

    @property
    def total(self) -> int:
        return self.index.ntotal


# Singleton instance — imported everywhere
faiss_manager = FaissManager()
