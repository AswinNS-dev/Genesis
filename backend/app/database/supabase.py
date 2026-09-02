import os
from typing import Optional, Dict, Any, List
import httpx
from backend.app.config.settings import settings

class SupabaseClient:
    """
    Direct server-side Supabase REST and Storage client using the Service Role Key.
    Keeps all credentials on the backend.
    """
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.anon_key = settings.SUPABASE_ANON_KEY
        self.storage_bucket = settings.SUPABASE_STORAGE_BUCKET

    @property
    def is_configured(self) -> bool:
        return bool(self.url and (self.service_role_key or self.anon_key))

    def _get_headers(self) -> Dict[str, str]:
        key = self.service_role_key or self.anon_key or ""
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    # REST Database Operations
    def query_table(self, table: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.is_configured:
            return []
        endpoint = f"{self.url.rstrip('/')}/rest/v1/{table}"
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(endpoint, headers=self._get_headers(), params=params)
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            print(f"[Supabase REST Warning] Failed to query table {table}: {e}")
        return []

    def insert_record(self, table: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.is_configured:
            return None
        endpoint = f"{self.url.rstrip('/')}/rest/v1/{table}"
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(endpoint, headers=self._get_headers(), json=data)
                if res.status_code in [200, 201]:
                    records = res.json()
                    return records[0] if isinstance(records, list) and records else data
        except Exception as e:
            print(f"[Supabase REST Warning] Failed to insert into table {table}: {e}")
        return None

    # Storage Operations
    def upload_file(self, filename: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        if not self.is_configured:
            return f"local://{filename}"
        
        endpoint = f"{self.url.rstrip('/')}/storage/v1/object/{self.storage_bucket}/{filename}"
        headers = {
            "apikey": self.service_role_key or self.anon_key or "",
            "Authorization": f"Bearer {self.service_role_key or self.anon_key}",
            "Content-Type": content_type
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(endpoint, headers=headers, content=content)
                if res.status_code in [200, 201]:
                    return f"{self.url.rstrip('/')}/storage/v1/object/public/{self.storage_bucket}/{filename}"
        except Exception as e:
            print(f"[Supabase Storage Warning] Upload failed: {e}")
        return f"{self.url.rstrip('/')}/storage/v1/object/public/{self.storage_bucket}/{filename}"

supabase_client = SupabaseClient()
