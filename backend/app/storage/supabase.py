from backend.app.config.settings import settings

class SupabaseStorage:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.bucket = settings.SUPABASE_STORAGE_BUCKET

    def is_configured(self) -> bool:
        return bool(self.url and self.key)

    def save(self, filename: str, content: bytes) -> str:
        return f"supabase://{self.bucket}/{filename}"
