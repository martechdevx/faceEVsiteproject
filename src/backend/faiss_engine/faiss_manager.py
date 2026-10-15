"""
FaissManager
------------
A singleton that keeps the FAISS index in memory for the lifetime of the
FastAPI process.  On startup it loads an existing index from disk (if one
exists); on every new enrolment it adds the embedding and saves back to disk.
"""

import os
import pickle
import threading
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
            cls._instance.lock = threading.RLock()
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        os.makedirs(settings.FAISS_DIR, exist_ok=True)
        self._load()
        self._initialized = True

    #  Internal helpers 

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
        with self.lock:
            faiss.write_index(self.index, INDEX_PATH)
            with open(META_PATH, "wb") as f:
                pickle.dump(self.metadata, f)

    #  Public API 

    def add_embedding(self, embedding: np.ndarray, db_row_id: int) -> int:
        """
        Normalise, add to index, persist, and return the FAISS position.
        """
        with self.lock:
            vec = embedding.astype("float32").reshape(1, -1)
            faiss.normalize_L2(vec)
            self.index.add(vec)
            position = len(self.metadata)
            self.metadata.append(db_row_id)
            self._save()
            return position

    def remove_embedding(self, position: int) -> None:
        with self.lock:
            if position < 0 or position >= len(self.metadata):
                raise IndexError("FAISS position is out of range")
            removed = self.index.remove_ids(np.asarray([position], dtype="int64"))
            if removed != 1:
                raise RuntimeError("FAISS index entry could not be removed")
            self.metadata.pop(position)
            self._save()

    def snapshot(self):
        with self.lock:
            return faiss.clone_index(self.index), self.metadata.copy()

    def restore(self, snapshot) -> None:
        with self.lock:
            self.index, self.metadata = snapshot
            self._save()

    def reconcile(self, valid_db_ids: set[int]) -> tuple[dict[int, int], int]:
        with self.lock:
            seen: set[int] = set()
            stale_positions = []
            for position, db_row_id in enumerate(self.metadata):
                if db_row_id not in valid_db_ids or db_row_id in seen:
                    stale_positions.append(position)
                else:
                    seen.add(db_row_id)

            for position in reversed(stale_positions):
                self.remove_embedding(position)

            positions = {db_row_id: position for position, db_row_id in enumerate(self.metadata)}
            return positions, len(stale_positions)

    def search(
        self,
        embedding: np.ndarray,
        top_k: int = 5,
        allowed_db_ids: set[int] | None = None,
    ):
        """
        Returns list of (db_row_id, similarity_score) tuples.
        Similarity score is in [0, 1] — higher is more similar.
        """
        with self.lock:
            if (
                self.index.ntotal == 0
                or (allowed_db_ids is not None and not allowed_db_ids)
                or top_k <= 0
            ):
                return []

            vec = embedding.astype("float32").reshape(1, -1)
            faiss.normalize_L2(vec)
            search_count = self.index.ntotal if allowed_db_ids is not None else min(top_k, self.index.ntotal)
            scores, indices = self.index.search(vec, search_count)

            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx == -1:
                    continue
                db_id = self.metadata[idx]
                if allowed_db_ids is not None and db_id not in allowed_db_ids:
                    continue
                results.append((db_id, float(score)))
                if len(results) == top_k:
                    break
            return results

    @property
    def total(self) -> int:
        with self.lock:
            return self.index.ntotal


# Singleton instance — imported everywhere
faiss_manager = FaissManager()
