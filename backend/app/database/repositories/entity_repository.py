from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database.models import Entity
from backend.app.database.supabase_service import supabase_db

class EntityRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, entity_type: Optional[str] = None, search: Optional[str] = None, case_id: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        # Query the 100k Supabase entities
        supa_entities = supabase_db.list_entities(limit=limit, offset=offset, search=search, entity_type=entity_type)
        if supa_entities:
            return supa_entities

        # Fallback to local DB
        q = self.db.query(Entity)
        if entity_type and entity_type.upper() != "ALL":
            q = q.filter(Entity.type == entity_type.upper())
        if case_id:
            q = q.filter(Entity.caseId == case_id)
        if search:
            term = f"%{search}%"
            q = q.filter(
                or_(
                    Entity.name.ilike(term),
                    Entity.value.ilike(term),
                    Entity.aliases.ilike(term),
                )
            )
        rows = q.order_by(Entity.createdAt.desc()).limit(limit).offset(offset).all()
        return [{
            "id": e.id,
            "name": e.name,
            "type": e.type,
            "value": e.value,
            "riskScore": e.riskScore,
            "caseId": e.caseId,
            "createdAt": e.createdAt.isoformat() if e.createdAt else None,
            "updatedAt": e.updatedAt.isoformat() if e.updatedAt else None,
        } for e in rows]

    def get_by_id(self, entity_id: str) -> Optional[Dict[str, Any]]:
        dossier = supabase_db.get_entity_dossier(entity_id)
        if dossier and dossier.get("entity"):
            e = dossier["entity"]
            return {
                "id": str(e.get("person_id") or e.get("record_id")),
                "name": e.get("person_name") or "Unknown Person",
                "type": "PERSON",
                "value": e.get("phone_number") or e.get("vehicle_plate") or e.get("location") or "Identified Subject",
                "riskScore": int(e.get("risk_score") or 50),
                "phone": e.get("phone_number"),
                "vehicle": e.get("vehicle_plate"),
                "location": e.get("location"),
                "caseId": e.get("case_id"),
                "createdAt": e.get("event_date") or "2026-08-14",
                "dossier": dossier
            }

        ent = self.db.query(Entity).filter(Entity.id == entity_id).first()
        if not ent:
            return None
        return {
            "id": ent.id,
            "name": ent.name,
            "type": ent.type,
            "value": ent.value,
            "riskScore": ent.riskScore,
            "caseId": ent.caseId,
            "createdAt": ent.createdAt.isoformat() if ent.createdAt else None,
            "updatedAt": ent.updatedAt.isoformat() if ent.updatedAt else None,
        }

    def get_dossier(self, entity_id: str) -> Dict[str, Any]:
        return supabase_db.get_entity_dossier(entity_id)

    def create(self, **kwargs) -> Dict[str, Any]:
        try:
            return supabase_db.create_entity(kwargs)
        except Exception as e:
            print(f"Supabase create_entity error: {e}")
            entity = Entity(**kwargs)
            self.db.add(entity)
            self.db.commit()
            self.db.refresh(entity)
            return {
                "id": entity.id,
                "name": entity.name,
                "type": entity.type,
                "value": entity.value,
                "riskScore": entity.riskScore,
                "caseId": entity.caseId,
                "createdAt": entity.createdAt.isoformat() if entity.createdAt else None,
                "updatedAt": entity.updatedAt.isoformat() if entity.updatedAt else None,
            }

    def update(self, entity_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        entity = self.db.query(Entity).filter(Entity.id == entity_id).first()
        if entity:
            for k, v in kwargs.items():
                if v is not None and hasattr(entity, k):
                    setattr(entity, k, v)
            self.db.commit()
            self.db.refresh(entity)
            return self.get_by_id(entity.id)

        ent = self.get_by_id(entity_id)
        if ent:
            for k, v in kwargs.items():
                if v is not None:
                    ent[k] = v
            return ent
        return None
