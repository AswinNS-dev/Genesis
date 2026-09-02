from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.database.models import Entity, Relationship

ENTITY_COLORS = {
    "PERSON": "#E07A5F",
    "PHONE": "#3D5A80",
    "VEHICLE": "#81B29A",
    "LOCATION": "#F4A261",
    "ORGANIZATION": "#9B5DE5",
    "BANK_ACCOUNT": "#F15BB5",
    "TRANSACTION": "#00BBF9",
    "DEFAULT": "#6C757D",
}

RELATION_COLORS = {
    "COMMUNICATION": "#3D5A80",
    "TRANSACTION": "#00BBF9",
    "LOCATION": "#F4A261",
    "CASE": "#E07A5F",
    "TRANSPORT": "#81B29A",
    "FINANCIAL": "#F15BB5",
    "DEFAULT": "#94A3B8",
}

class NetworkGraphBuilder:
    def build_network(self, db: Session) -> Dict[str, Any]:
        entities = db.query(Entity).all()
        rels = db.query(Relationship).all()

        nodes = [
            {
                "id": e.id,
                "label": e.name,
                "type": e.type,
                "color": ENTITY_COLORS.get(e.type, ENTITY_COLORS["DEFAULT"]),
                "riskScore": e.riskScore or 0,
            }
            for e in entities
        ]

        links = [
            {
                "source": r.sourceId,
                "target": r.targetId,
                "type": r.type,
                "color": RELATION_COLORS.get(r.type, RELATION_COLORS["DEFAULT"]),
                "weight": min(4, 1 + round((r.strength or 0) / 30)),
                "label": r.label or "",
            }
            for r in rels
        ]

        return {"nodes": nodes, "links": links}
