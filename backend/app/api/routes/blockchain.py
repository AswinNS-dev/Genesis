from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.repositories.evidence_repository import EvidenceRepository
from backend.app.blockchain.verification import verify_blockchain_chain
from backend.app.api.schemas.evidence_schema import BlockchainRecordSchema

router = APIRouter(prefix="/blockchain", tags=["blockchain"])

@router.get("", response_model=List[BlockchainRecordSchema])
def list_blockchain_records(db: Session = Depends(get_db)):
    repo = EvidenceRepository(db)
    return repo.list_blocks()

@router.post("/verify-chain")
def verify_blockchain_chain_endpoint(db: Session = Depends(get_db)):
    repo = EvidenceRepository(db)
    blocks = repo.list_blocks()
    res = verify_blockchain_chain(blocks)
    return {
        "intact": res["intact"],
        "brokenIndex": res["broken_index"],
        "totalBlocks": len(blocks),
        "status": "VALID" if res["intact"] else "CHAIN_BROKEN"
    }
