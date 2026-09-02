from typing import Dict
from sqlalchemy.orm import Session
from backend.app.database.models import Relationship

def calculate_degree_centrality(db: Session) -> Dict[str, int]:
    rels = db.query(Relationship).all()
    degree: Dict[str, int] = {}
    for r in rels:
        degree[r.sourceId] = degree.get(r.sourceId, 0) + 1
        degree[r.targetId] = degree.get(r.targetId, 0) + 1
    return degree
