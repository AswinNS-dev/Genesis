import hashlib
from datetime import datetime, timezone
from typing import Any

def sha256(data: Any) -> str:
    if isinstance(data, bytes):
        return hashlib.sha256(data).hexdigest()
    return hashlib.sha256(str(data).encode("utf-8")).hexdigest()

def sha256_bytes(buffer: bytes) -> str:
    return hashlib.sha256(buffer).hexdigest()

def format_timestamp(ts: Any) -> str:
    if isinstance(ts, datetime):
        return ts.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(ts, str):
        return ts[:19]
    return str(ts)

def compute_block_hash(index: int, timestamp: Any, data_hash: str, previous_hash: str, action: str = "") -> str:
    ts_str = format_timestamp(timestamp)
    raw = f"{index}|{ts_str}|{data_hash}|{previous_hash}|{action or ''}"
    return sha256(raw)
