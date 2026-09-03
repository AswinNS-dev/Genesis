import os
from backend.app.config.settings import settings

class LocalStorage:
    def __init__(self, upload_dir: str = settings.UPLOAD_DIR):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    def save(self, filename: str, content: bytes) -> str:
        safe_filename = os.path.basename(filename).replace("..", "_")
        filepath = os.path.join(self.upload_dir, safe_filename)
        with open(filepath, "wb") as f:
            f.write(content)
        return filepath

    def read(self, filepath: str) -> bytes:
        with open(filepath, "rb") as f:
            return f.read()

    def exists(self, filepath: str) -> bool:
        return os.path.exists(filepath)
