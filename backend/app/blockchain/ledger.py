from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.database.models import BlockchainRecord
from backend.app.blockchain.hashing import compute_block_hash, sha256

def genesis_timestamp() -> datetime:
    return datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

def genesis_data_hash() -> str:
    return sha256("CrimeIntel Prototype Blockchain Ledger — Genesis")

def append_ledger_record(
    db: Session,
    data_hash: str,
    action: str = "EVIDENCE_HASH",
    note: Optional[str] = None,
    evidence_id: Optional[str] = None
) -> BlockchainRecord:
    last_block = db.query(BlockchainRecord).order_by(BlockchainRecord.index.desc()).first()
    next_index = (last_block.index + 1) if last_block else 0
    prev_hash = last_block.hash if last_block else "0" * 64
    block_ts = datetime.now(timezone.utc)

    own_hash = compute_block_hash(
        index=next_index,
        timestamp=block_ts,
        data_hash=data_hash,
        previous_hash=prev_hash,
        action=action,
    )

    block = BlockchainRecord(
        index=next_index,
        timestamp=block_ts,
        dataHash=data_hash,
        previousHash=prev_hash,
        hash=own_hash,
        action=action,
        note=note,
        evidenceId=evidence_id,
    )
    db.add(block)
    db.flush()
    return block
