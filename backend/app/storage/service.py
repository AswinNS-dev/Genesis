from backend.app.config.settings import settings
from backend.app.storage.local import LocalStorage
from backend.app.storage.supabase import SupabaseStorage

class StorageService:
    def __init__(self):
        self.local = LocalStorage()
        self.supabase = SupabaseStorage()

    def get_driver(self):
        if settings.STORAGE_DRIVER == "supabase" and self.supabase.is_configured():
            return self.supabase
        return self.local

    def save_file(self, filename: str, content: bytes) -> str:
        return self.get_driver().save(filename, content)

storage_service = StorageService()
