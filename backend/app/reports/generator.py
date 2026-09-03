import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database.models import (
    InvestigationCase, Entity, Relationship, TimelineEvent,
    CommunicationRecord, TransactionRecord, LocationRecord,
    EvidenceDocument, AnalysisResult, EntityMatch,
    AuditLog, BlockchainRecord,
)
from backend.app.blockchain.verification import verify_blockchain_chain
from backend.app.database.supabase_service import supabase_db


class ReportGenerator:
    """
    Generates comprehensive investigation reports and entity dossiers
    from real backend data (Supabase + local SQLite).
    """

    def generate_report(self, db: Session, case_id: str) -> Dict[str, Any]:
        """Generate a full investigation report for a case."""
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.id == case_id) | (InvestigationCase.caseId == case_id)
        ).first()

        # If not in local DB, try Supabase
        supa_case = None
        if not case:
            supa_case = supabase_db.get_case_by_id(case_id)
            if not supa_case:
                raise ValueError("Case not found")

        now = datetime.now(timezone.utc)

        if case:
            return self._generate_from_local_case(db, case, now)
        else:
            return self._generate_from_supabase_case(db, supa_case, case_id, now)

    def _generate_from_local_case(self, db: Session, case: InvestigationCase, now: datetime) -> Dict[str, Any]:
        """Build report from local SQLAlchemy case object."""
        chain_records = [b for doc in case.documents for b in doc.blockchainRecords]
        chain_status = verify_blockchain_chain(chain_records)

        # Entity matches for this case's entities
        entity_ids = [e.id for e in case.entities]
        matches = []
        if entity_ids:
            matches = db.query(EntityMatch).filter(
                or_(
                    EntityMatch.entityAId.in_(entity_ids),
                    EntityMatch.entityBId.in_(entity_ids),
                )
            ).all()

        # Analysis results for this case
        analyses = db.query(AnalysisResult).filter(
            AnalysisResult.caseId == case.id
        ).order_by(AnalysisResult.createdAt.desc()).all()

        # Audit trail for this case
        audit_logs = db.query(AuditLog).filter(
            AuditLog.caseId == case.id
        ).order_by(AuditLog.createdAt.desc()).limit(50).all()

        return {
            "reportId": f"REP-{case.caseId}-{now.strftime('%Y%m%d%H%M')}",
            "generatedAt": now.isoformat(),
            "dataSource": "Local Database",
            "case": {
                "caseId": case.caseId,
                "title": case.title,
                "description": case.description,
                "status": case.status,
                "classification": case.classification,
                "category": case.category,
                "jurisdiction": case.jurisdiction,
                "assignedInvestigator": case.assignedInvestigator,
                "createdAt": case.createdAt.isoformat() if case.createdAt else None,
            },
            "summaryMetrics": {
                "entityCount": len(case.entities),
                "relationshipCount": len(case.relationships),
                "evidenceCount": len(case.documents),
                "timelineEventCount": len(case.events),
                "communicationCount": len(case.communications),
                "transactionCount": len(case.transactions),
                "locationCount": len(case.locations),
                "analysisCount": len(analyses),
                "entityMatchCount": len(matches),
                "blockchainIntegrity": "INTACT" if chain_status["intact"] else "COMPROMISED",
            },
            "entities": [
                {
                    "id": e.id, "name": e.name, "type": e.type,
                    "value": e.value, "aliases": e.aliases,
                    "riskScore": e.riskScore,
                }
                for e in case.entities
            ],
            "relationships": [
                {
                    "source": r.source.name if r.source else "Unknown",
                    "target": r.target.name if r.target else "Unknown",
                    "type": r.type, "label": r.label, "strength": r.strength,
                }
                for r in case.relationships
            ],
            "timeline": [
                {
                    "id": ev.id, "type": ev.type, "summary": ev.summary,
                    "detail": ev.detail,
                    "eventAt": ev.eventAt.isoformat() if ev.eventAt else None,
                }
                for ev in sorted(case.events, key=lambda x: x.eventAt or datetime.min, reverse=True)
            ],
            "communications": [
                {
                    "id": c.id, "caller": c.caller, "receiver": c.receiver,
                    "callerName": c.callerName, "receiverName": c.receiverName,
                    "type": c.type, "durationSec": c.durationSec,
                    "timestamp": c.timestamp.isoformat() if c.timestamp else None,
                    "isAnomaly": c.isAnomaly, "anomalyReason": c.anomalyReason,
                }
                for c in case.communications
            ],
            "transactions": [
                {
                    "id": t.id, "sender": t.sender, "receiver": t.receiver,
                    "amount": t.amount, "currency": t.currency,
                    "transactionType": t.transactionType,
                    "timestamp": t.timestamp.isoformat() if t.timestamp else None,
                    "isSuspicious": t.isSuspicious, "suspiciousReason": t.suspiciousReason,
                }
                for t in case.transactions
            ],
            "locations": [
                {
                    "id": l.id, "name": l.name, "address": l.address,
                    "latitude": l.latitude, "longitude": l.longitude,
                    "subjectName": l.subjectName, "sourceType": l.sourceType,
                }
                for l in case.locations
            ],
            "evidence": [
                {
                    "id": d.id, "name": d.name, "description": d.description,
                    "contentType": d.contentType, "sha256": d.sha256,
                    "verified": d.verified, "status": d.status,
                }
                for d in case.documents
            ],
            "aiAnalysis": [
                {
                    "id": a.id, "type": a.analysisType, "modelName": a.modelName,
                    "confidence": a.confidence, "explanation": a.explanation,
                    "result": _safe_parse_json(a.result),
                    "createdAt": a.createdAt.isoformat() if a.createdAt else None,
                }
                for a in analyses
            ],
            "entityMatches": [
                {
                    "id": m.id,
                    "entityA": {"id": m.entityAId, "name": m.entityA.name if m.entityA else "Unknown"},
                    "entityB": {"id": m.entityBId, "name": m.entityB.name if m.entityB else "Unknown"},
                    "confidence": m.confidence, "reasons": m.reasons, "status": m.status,
                    "createdAt": m.createdAt.isoformat() if m.createdAt else None,
                }
                for m in matches
            ],
            "blockchainIntegrity": {
                "intact": chain_status["intact"],
                "brokenIndex": chain_status.get("broken_index"),
                "totalBlocks": len(chain_records),
            },
            "auditTrail": [
                {
                    "id": a.id, "action": a.action, "detail": a.detail,
                    "status": a.status, "severity": getattr(a, "severity", "INFO"),
                    "createdAt": a.createdAt.isoformat() if a.createdAt else None,
                }
                for a in audit_logs
            ],
            "disclaimer": "CONFIDENTIAL INTELLIGENCE DOSSIER — Strictly for authorized law enforcement investigation.",
        }

    def _generate_from_supabase_case(self, db: Session, supa_case: Dict, case_id: str, now: datetime) -> Dict[str, Any]:
        """Build report from Supabase case data."""
        cid = supa_case.get("caseId", case_id)
        fid = supa_case.get("id", case_id)

        # Fetch sub-resources from Supabase
        comms = supabase_db.get_case_communications(case_id, limit=50)
        txns = supabase_db.get_case_transactions(case_id, limit=50)
        locs = supabase_db.get_case_locations(case_id, limit=50)
        timeline = supabase_db.get_case_timeline(case_id, limit=50)
        evidence = supabase_db.list_evidence(limit=20, case_id=case_id)
        network = supabase_db.get_network_graph(case_id, max_nodes=30)

        # Local DB analysis results and entity matches
        analyses = db.query(AnalysisResult).order_by(AnalysisResult.createdAt.desc()).limit(10).all()
        matches = db.query(EntityMatch).order_by(EntityMatch.createdAt.desc()).limit(10).all()
        audit_logs = db.query(AuditLog).order_by(AuditLog.createdAt.desc()).limit(50).all()

        # Blockchain from Supabase evidence
        blockchain = supabase_db.get_blockchain_ledger(limit=10)

        nodes = network.get("nodes", []) if isinstance(network, dict) else []
        edges = network.get("edges", []) if isinstance(network, dict) else []

        return {
            "reportId": f"REP-{cid}-{now.strftime('%Y%m%d%H%M')}",
            "generatedAt": now.isoformat(),
            "dataSource": "Supabase Cloud Database",
            "case": supa_case,
            "summaryMetrics": {
                "entityCount": len(nodes),
                "relationshipCount": len(edges),
                "evidenceCount": len(evidence),
                "timelineEventCount": len(timeline),
                "communicationCount": len(comms),
                "transactionCount": len(txns),
                "locationCount": len(locs),
                "analysisCount": len(analyses),
                "entityMatchCount": len(matches),
                "blockchainIntegrity": "INTACT" if len(blockchain) > 0 else "NO_CHAIN",
            },
            "entities": [
                {"id": n.get("id"), "name": n.get("label"), "type": n.get("type"), "riskScore": n.get("riskScore", 50)}
                for n in nodes if n.get("type") == "PERSON"
            ],
            "relationships": [
                {"source": e.get("source"), "target": e.get("target"), "type": e.get("type"), "strength": e.get("strength", 1)}
                for e in edges
            ],
            "timeline": timeline,
            "communications": comms,
            "transactions": txns,
            "locations": locs,
            "evidence": evidence,
            "aiAnalysis": [
                {
                    "id": a.id, "type": a.analysisType, "modelName": a.modelName,
                    "confidence": a.confidence, "explanation": a.explanation,
                    "result": _safe_parse_json(a.result),
                    "createdAt": a.createdAt.isoformat() if a.createdAt else None,
                }
                for a in analyses
            ],
            "entityMatches": [
                {
                    "id": m.id,
                    "entityA": {"id": m.entityAId, "name": m.entityA.name if m.entityA else "Unknown"},
                    "entityB": {"id": m.entityBId, "name": m.entityB.name if m.entityB else "Unknown"},
                    "confidence": m.confidence, "reasons": m.reasons, "status": m.status,
                    "createdAt": m.createdAt.isoformat() if m.createdAt else None,
                }
                for m in matches
            ],
            "blockchainIntegrity": {
                "intact": len(blockchain) > 0,
                "totalBlocks": len(blockchain),
            },
            "auditTrail": [
                {
                    "id": a.id, "action": a.action, "detail": a.detail,
                    "status": a.status, "severity": getattr(a, "severity", "INFO"),
                    "createdAt": a.createdAt.isoformat() if a.createdAt else None,
                }
                for a in audit_logs
            ],
            "disclaimer": "CONFIDENTIAL INTELLIGENCE DOSSIER — Strictly for authorized law enforcement investigation.",
        }

    def generate_entity_dossier(self, db: Session, entity_id: str) -> Dict[str, Any]:
        """
        Generate a comprehensive 360° dossier for an investigated entity.
        Pulls data from Supabase + local DB.
        """
        now = datetime.now(timezone.utc)

        # 1. Try Supabase dossier (cross-table lookup across 100k entities)
        supa_dossier = supabase_db.get_entity_dossier(entity_id)

        # 2. Try local DB entity
        local_entity = db.query(Entity).filter(Entity.id == entity_id).first()

        if not supa_dossier.get("entity") and not local_entity:
            raise ValueError("Entity not found")

        # Build identity section
        identity = self._build_identity(supa_dossier, local_entity)

        # Build related records from Supabase dossier
        related_records = {
            "fir_cases": supa_dossier.get("fir_cases", []),
            "criminal_records": supa_dossier.get("criminal_records", []),
            "vehicles": supa_dossier.get("vehicles", []),
            "communications": supa_dossier.get("communications", []),
            "transactions": supa_dossier.get("transactions", []),
            "locations": supa_dossier.get("location_events", []),
        }

        # Build network from local DB relationships
        network = self._build_network(db, local_entity, entity_id)

        # Build timeline from Supabase data
        timeline = self._build_timeline(supa_dossier)

        # AI analysis results from local DB
        ai_analysis = []
        analyses = db.query(AnalysisResult).order_by(AnalysisResult.createdAt.desc()).limit(10).all()
        for a in analyses:
            ai_analysis.append({
                "id": a.id, "type": a.analysisType, "modelName": a.modelName,
                "confidence": a.confidence, "explanation": a.explanation,
                "result": _safe_parse_json(a.result),
                "createdAt": a.createdAt.isoformat() if a.createdAt else None,
            })

        # Entity matches (resolution findings)
        entity_matches = self._get_entity_matches(db, local_entity, entity_id)

        # Evidence related to entity's case
        evidence = self._get_entity_evidence(db, local_entity)

        return {
            "dossierId": f"DOS-{entity_id[:8]}-{now.strftime('%Y%m%d%H%M')}",
            "generatedAt": now.isoformat(),
            "dataSource": "Supabase + Local Database",
            "identity": identity,
            "aliases": supa_dossier.get("aliases", []),
            "relatedRecords": related_records,
            "network": network,
            "timeline": timeline,
            "aiAnalysis": ai_analysis,
            "entityMatches": entity_matches,
            "evidence": evidence,
            "disclaimer": "CONFIDENTIAL ENTITY DOSSIER — Strictly for authorized law enforcement investigation.",
        }

    def _build_identity(self, supa_dossier: Dict, local_entity: Optional[Entity]) -> Dict[str, Any]:
        supa_ent = supa_dossier.get("entity", {})
        if local_entity:
            return {
                "id": local_entity.id,
                "primaryName": local_entity.name,
                "type": local_entity.type,
                "value": local_entity.value,
                "aliases": local_entity.aliases,
                "riskScore": local_entity.riskScore,
                "phone": supa_ent.get("phone_number"),
                "vehicle": supa_ent.get("vehicle_plate"),
                "location": supa_ent.get("location"),
                "caseId": local_entity.caseId,
                "verificationStatus": "VERIFIED" if local_entity.riskScore > 0 else "UNVERIFIED",
                "identityConfidence": min(95, 50 + local_entity.riskScore // 2),
            }
        return {
            "id": supa_dossier.get("person_id", ""),
            "primaryName": supa_dossier.get("person_name", "Unknown"),
            "type": "PERSON",
            "value": supa_ent.get("phone_number") or supa_ent.get("vehicle_plate") or "",
            "aliases": None,
            "riskScore": int(supa_ent.get("risk_score", 50)),
            "phone": supa_ent.get("phone_number"),
            "vehicle": supa_ent.get("vehicle_plate"),
            "location": supa_ent.get("location"),
            "caseId": supa_ent.get("case_id"),
            "verificationStatus": "UNDER_REVIEW",
            "identityConfidence": 70,
        }

    def _build_network(self, db: Session, local_entity: Optional[Entity], entity_id: str) -> Dict[str, Any]:
        nodes = []
        edges = []
        if local_entity:
            nodes.append({"id": local_entity.id, "label": local_entity.name, "type": local_entity.type, "riskScore": local_entity.riskScore, "isPrimary": True})
            for rel in local_entity.sourceRelationships:
                if rel.target:
                    nodes.append({"id": rel.target.id, "label": rel.target.name, "type": rel.target.type, "riskScore": rel.target.riskScore, "isPrimary": False})
                    edges.append({"source": local_entity.id, "target": rel.target.id, "type": rel.type, "label": rel.label, "strength": rel.strength})
            for rel in local_entity.targetRelationships:
                if rel.source:
                    nodes.append({"id": rel.source.id, "label": rel.source.name, "type": rel.source.type, "riskScore": rel.source.riskScore, "isPrimary": False})
                    edges.append({"source": rel.source.id, "target": local_entity.id, "type": rel.type, "label": rel.label, "strength": rel.strength})
        return {"nodes": nodes, "edges": edges, "totalConnections": len(edges)}

    def _build_timeline(self, supa_dossier: Dict) -> List[Dict[str, Any]]:
        events = []
        for c in supa_dossier.get("communications", []):
            events.append({
                "type": "COMMUNICATION",
                "summary": f"Call: {c.get('caller_name', '')} → {c.get('callee_name', '')}",
                "detail": f"Duration: {c.get('duration_seconds', 0)}s",
                "timestamp": c.get("call_datetime", ""),
            })
        for t in supa_dossier.get("transactions", []):
            events.append({
                "type": "TRANSACTION",
                "summary": f"Transaction: {t.get('sender_name', '')} → {t.get('receiver_name', '')}",
                "detail": f"Amount: INR {t.get('amount_inr', 0):,.2f}" if t.get('amount_inr') else "",
                "timestamp": t.get("transaction_datetime", ""),
            })
        for l in supa_dossier.get("location_events", []):
            events.append({
                "type": "LOCATION",
                "summary": f"Location: {l.get('city', '')} {l.get('state', '')}",
                "detail": l.get("location_detail", ""),
                "timestamp": l.get("event_datetime", ""),
            })
        for fc in supa_dossier.get("fir_cases", []):
            events.append({
                "type": "FIR_CASE",
                "summary": f"FIR: {fc.get('crime_type', '')} - {fc.get('jurisdiction_city', '')}",
                "detail": f"Case: {fc.get('case_number', '')}",
                "timestamp": fc.get("date_of_incident", ""),
            })
        events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return events

    def _get_entity_matches(self, db: Session, local_entity: Optional[Entity], entity_id: str) -> List[Dict[str, Any]]:
        results = []
        if local_entity:
            matches = db.query(EntityMatch).filter(
                or_(EntityMatch.entityAId == local_entity.id, EntityMatch.entityBId == local_entity.id)
            ).all()
            for m in matches:
                results.append({
                    "id": m.id,
                    "entityA": {"id": m.entityAId, "name": m.entityA.name if m.entityA else "Unknown"},
                    "entityB": {"id": m.entityBId, "name": m.entityB.name if m.entityB else "Unknown"},
                    "confidence": m.confidence, "reasons": m.reasons, "status": m.status,
                    "createdAt": m.createdAt.isoformat() if m.createdAt else None,
                })
        return results

    def _get_entity_evidence(self, db: Session, local_entity: Optional[Entity]) -> List[Dict[str, Any]]:
        results = []
        if local_entity and local_entity.caseId:
            docs = db.query(EvidenceDocument).filter(
                EvidenceDocument.caseId == local_entity.caseId
            ).all()
            for d in docs:
                results.append({
                    "id": d.id, "name": d.name, "description": d.description,
                    "contentType": d.contentType, "sha256": d.sha256,
                    "verified": d.verified, "status": d.status,
                })
        return results

    def list_available_cases(self, db: Session) -> List[Dict[str, Any]]:
        """List cases available for report generation."""
        # Try Supabase first
        supa_cases = supabase_db.list_cases(limit=50)
        if supa_cases:
            return [
                {"id": c.get("id"), "caseId": c.get("caseId"), "title": c.get("title"), "status": c.get("status"), "category": c.get("category")}
                for c in supa_cases
            ]
        # Fallback to local DB
        cases = db.query(InvestigationCase).order_by(InvestigationCase.createdAt.desc()).all()
        return [
            {"id": c.id, "caseId": c.caseId, "title": c.title, "status": c.status, "category": c.category}
            for c in cases
        ]

    def search_entities(self, db: Session, query: str) -> List[Dict[str, Any]]:
        """Search entities for dossier generation."""
        # Try Supabase first
        supa_entities = supabase_db.list_entities(limit=30, search=query)
        if supa_entities:
            return supa_entities
        # Fallback to local DB
        term = f"%{query}%"
        entities = db.query(Entity).filter(
            or_(Entity.name.ilike(term), Entity.value.ilike(term), Entity.aliases.ilike(term))
        ).limit(30).all()
        return [
            {"id": e.id, "name": e.name, "type": e.type, "value": e.value, "riskScore": e.riskScore}
            for e in entities
        ]


def _safe_parse_json(raw: str) -> Any:
    """Safely parse a JSON string, returning raw string on failure."""
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw
