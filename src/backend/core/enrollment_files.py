from collections import Counter
import hashlib
import os

from core.config import settings


def remove_enrollment_image_files(images: list[str]) -> None:
    if not images or not os.path.isdir(settings.UPLOAD_DIR):
        return

    image_hashes = Counter(hashlib.sha256(image.encode("ascii")).digest() for image in images)
    for entry in os.scandir(settings.UPLOAD_DIR):
        if not entry.is_file() or not entry.name.endswith(".txt"):
            continue
        try:
            with open(entry.path, "rb") as image_file:
                file_hash = hashlib.sha256(image_file.read()).digest()
            if image_hashes[file_hash]:
                os.remove(entry.path)
                image_hashes[file_hash] -= 1
        except OSError:
            continue
