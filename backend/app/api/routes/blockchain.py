from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user
from backend.app.database.repositories.evidence_repository import EvidenceRepository
from backend.app.blockchain.verification import verify_blockchain_chain
from backend.app.api.schemas.evidence_schema import BlockchainRecordSchema

router = APIRouter(prefix="/blockchain", tags=["blockchain"])

@router.get("", response_model=List[BlockchainRecordSchema])
def list_blockchain_records(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    repo = EvidenceRepository(db)
    return repo.list_blocks()

@router.post("/verify-chain")
def verify_blockchain_chain_endpoint(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    repo = EvidenceRepository(db)
    blocks = repo.list_blocks()
    res = verify_blockchain_chain(blocks)
    return {
        "intact": res["intact"],
        "brokenIndex": res["broken_index"],
        "totalBlocks": len(blocks),
        "status": "VALID" if res["intact"] else "CHAIN_BROKEN"
    }
