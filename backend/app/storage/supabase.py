import os
from backend.app.config.settings import settings
from backend.app.database.supabase import supabase_client

class SupabaseStorage:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        self.bucket = settings.SUPABASE_STORAGE_BUCKET

    def is_configured(self) -> bool:
        return supabase_client.is_configured

    def save(self, filename: str, content: bytes, content_type: str = "application/pdf") -> str:
        # 1. Also keep a local backup in uploads dir for high-speed local processing
        local_path = os.path.join(settings.UPLOAD_DIR, filename)
        try:
            with open(local_path, "wb") as f:
                f.write(content)
        except Exception:
            pass

        # 2. Upload to Supabase Storage Bucket
        if self.is_configured():
            return supabase_client.upload_file(filename, content, content_type=content_type)
        return local_path
