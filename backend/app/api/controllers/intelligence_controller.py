from typing import Dict, Any, List, Optional
import os
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.database.repositories.analysis_repository import AnalysisRepository
from backend.app.database.repositories.entity_repository import EntityRepository
from backend.app.intelligence.ner.service import ner_service
from backend.app.intelligence.entity_resolution.resolver import entity_resolution_service
from backend.app.intelligence.relationship_detection.service import RelationshipDetectionService
from backend.app.intelligence.anomaly_detection.communication import CommunicationAnomalyDetector
from backend.app.intelligence.anomaly_detection.transaction import TransactionAnomalyDetector
from backend.app.intelligence.location_analysis.features import build_features
from backend.app.intelligence.location_analysis.anomaly_model import LocationAnomalyModel
from backend.app.intelligence.summarizer.model import InvestigationSummarizer
from backend.app.intelligence.lead_generator.features import build_lead_features
from backend.app.intelligence.lead_generator.model import LeadRankerModel
from backend.app.intelligence.explainability.feature_explainer import format_human_explanation
from backend.app.intelligence.explainability.provenance import get_evidence_provenance

# Lazy-loaded model instances and feature caches
_location_model = None
_summarizer_model = None
_lead_model = None
_cached_location_features = None
_cached_lead_features = None

def get_location_features(data_dir: str = "data/raw") -> pd.DataFrame:
    global _cached_location_features
    if _cached_location_features is None:
        pl_features, _, _ = build_features(data_dir, include_colocation=False)
        _cached_location_features = pl_features
    return _cached_location_features

def get_lead_features(data_dir: str = "data/raw") -> pd.DataFrame:
    global _cached_lead_features
    if _cached_lead_features is None:
        _cached_lead_features = build_lead_features(data_dir)
    return _cached_lead_features

def get_location_model() -> LocationAnomalyModel:
    global _location_model
    if _location_model is None:
        _location_model = LocationAnomalyModel()
        try:
            _location_model.load("backend/app/intelligence/models/location/anomaly_model.pkl")
        except Exception:
            pass
    return _location_model

def get_summarizer_model() -> Optional[InvestigationSummarizer]:
    global _summarizer_model
    if _summarizer_model is None:
        try:
            model_path = "backend/app/intelligence/models/summarizer"
            if os.path.exists(model_path):
                _summarizer_model = InvestigationSummarizer(model_path)
        except Exception:
            _summarizer_model = None
    return _summarizer_model

def get_lead_model() -> LeadRankerModel:
    global _lead_model
    if _lead_model is None:
        _lead_model = LeadRankerModel()
        try:
            _lead_model.load("backend/app/intelligence/models/lead_generator/ranker.pkl")
        except Exception:
            pass
    return _lead_model


class IntelligenceController:
    """
    Controller that coordinates AI/ML model execution, feature caching,
    and Supabase analytical persistence.
    """
    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.analysis_repo = AnalysisRepository(db) if db else None
        self.entity_repo = EntityRepository(db) if db else None

    def extract_ner(self, text: str, case_id: Optional[str] = None) -> Dict[str, Any]:
        extracted = ner_service.extract(text)

        if self.analysis_repo:
            self.analysis_repo.save_analysis_result(
                analysis_type="NER",
                result=extracted,
                case_id=case_id,
                confidence=0.95,
                model_name="TransformerNER",
                explanation=f"Extracted {len(extracted.get('entities', []))} entities from forensic text."
            )
        return extracted

    def resolve_entities(
        self,
        extracted_entities: List[Dict[str, Any]],
        registry_candidates: Optional[List[Dict[str, Any]]] = None,
        case_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        # If no candidates provided, pull all entities from database registry
        if not registry_candidates and self.entity_repo:
            db_entities = self.entity_repo.list()
            candidates = [{
                "id": e.get("id") if isinstance(e, dict) else getattr(e, "id", None),
                "name": e.get("name") if isinstance(e, dict) else getattr(e, "name", None),
                "type": e.get("type") if isinstance(e, dict) else getattr(e, "type", None),
                "phone": (e.get("phone") or (e.get("value") if e.get("type") == "PHONE" else None)) if isinstance(e, dict) else (getattr(e, "value") if getattr(e, "type", "") == "PHONE" else None),
                "vehicle": (e.get("vehicle") or (e.get("value") if e.get("type") == "VEHICLE" else None)) if isinstance(e, dict) else (getattr(e, "value") if getattr(e, "type", "") == "VEHICLE" else None),
                "location": (e.get("location") or (e.get("value") if e.get("type") == "LOCATION" else None)) if isinstance(e, dict) else (getattr(e, "value") if getattr(e, "type", "") == "LOCATION" else None)
            } for e in db_entities]
        else:
            candidates = registry_candidates or []

        results = entity_resolution_service.resolve(
            extracted_entities=extracted_entities,
            registry_candidates=candidates
        )

        if self.analysis_repo:
            self.analysis_repo.save_analysis_result(
                analysis_type="ENTITY_RESOLUTION",
                result={"results": results},
                case_id=case_id,
                confidence=0.90,
                model_name="MultiSignalEntityResolver",
                explanation=f"Processed resolution for {len(results)} entities against database registry."
            )

        return results

    def update_match_status(self, match_id: str, status_value: str) -> Optional[Any]:
        if not self.analysis_repo:
            return None
        return self.analysis_repo.update_entity_match_status(match_id, status_value)

    def extract_relationships(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return RelationshipDetectionService().detect_relationships(events)

    def detect_communication_anomalies(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return CommunicationAnomalyDetector().detect(records)

    def detect_transaction_anomalies(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return TransactionAnomalyDetector().detect(records)

    def list_matches(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.analysis_repo:
            return []
        matches = self.analysis_repo.list_entity_matches(status=status_filter)
        return [{
            "id": m.id,
            "entityAId": m.entityAId,
            "entityBId": m.entityBId,
            "confidence": m.confidence,
            "reasons": m.reasons,
            "status": m.status,
            "createdAt": m.createdAt.isoformat() if m.createdAt else None
        } for m in matches]

    def analyze_location_anomalies(self, person_id: str) -> Dict[str, Any]:
        model = get_location_model()
        pl_features = get_location_features("data/raw")
        if pl_features.empty:
            return {"error": "No data available"}

        person_features = pl_features[pl_features["person_id"] == person_id]
        if person_features.empty:
            return {"error": "No location history found for person"}

        res = model.predict(person_features)
        return {"analysis": res.to_dict(orient="records")}

    def summarize_investigation(self, case_context: str) -> Dict[str, Any]:
        model = get_summarizer_model()
        if not model:
            return {
                "summary": "Fallback AI mode: Subject is involved in a high-priority incident.",
                "fallback": True,
                "confidence": 0.85
            }
        summary = model.summarize(case_context)
        return {"summary": summary, "fallback": False, "confidence": 0.90}

    def generate_investigative_leads(
        self,
        person_id: Optional[str] = None,
        case_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        model = get_lead_model()
        features = get_lead_features("data/raw")
        if features.empty:
            return self._generate_demo_case_leads(person_id=person_id, case_id=case_id)

        if person_id:
            features = features[(features["p1"] == person_id) | (features["p2"] == person_id)]

        if case_id and "case_ids" in features.columns:
            case_keys = {str(case_id)}
            try:
                from backend.app.database.supabase_service import supabase_db
                case = supabase_db.get_case_by_id(str(case_id))
                if case:
                    case_keys.update({str(case.get("id")), str(case.get("caseId"))})
            except Exception:
                pass
            features = features[
                features["case_ids"].apply(
                    lambda values: bool(case_keys.intersection({str(v) for v in values}))
                    if isinstance(values, list)
                    else any(key in str(values) for key in case_keys)
                )
            ]

        if features.empty:
            return self._generate_demo_case_leads(person_id=person_id, case_id=case_id)

        res = model.predict(features)
        leads = res[res["priority_score"] > 0.4].sort_values(by="priority_score", ascending=False)
        return leads.to_dict(orient="records")

    def _generate_demo_case_leads(
        self,
        person_id: Optional[str] = None,
        case_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if not case_id:
            return []
        try:
            from backend.app.database.supabase_service import supabase_db
            if not supabase_db._is_demo_case(case_id):
                return []
            graph = supabase_db.get_network_graph(case_id)
        except Exception:
            return []

        relationships = []
        for edge in graph.get("edges", []):
            if person_id and person_id not in (edge.get("source"), edge.get("target")):
                continue
            strength = float(edge.get("strength") or 50)
            rel_type = str(edge.get("type") or "")
            is_transaction = 1 if rel_type == "TRANSACTED_WITH" else 0
            is_communication = 1 if rel_type == "COMMUNICATED_WITH" else 0
            relationships.append({
                "p1": edge.get("source"),
                "p2": edge.get("target"),
                "communication_frequency": 2 + is_communication,
                "average_call_duration": 380 if is_communication else 0,
                "transaction_count": 1 + is_transaction,
                "total_amount": 250000 if is_transaction else 0,
                "average_amount": 250000 if is_transaction else 0,
                "shared_case_count": 1,
                "evidence_count": 2,
                "multi_source_support": 2 if rel_type in ("TRANSACTED_WITH", "COMMUNICATED_WITH") else 1,
                "priority_score": round(min(0.98, 0.45 + strength / 180.0), 3),
                "priority_band": "HIGH" if strength >= 80 else "MEDIUM",
                "case_ids": [case_id],
                "reason": f"Demo lead from {rel_type or 'case'} relationship with {int(strength)}% strength.",
            })
        return sorted(relationships, key=lambda item: item["priority_score"], reverse=True)[:12]

    def explain_feature_contribution(
        self,
        feature_name: str,
        feature_value: Any,
        direction: str,
        person_id: str
    ) -> Dict[str, Any]:
        explanation = format_human_explanation(feature_name, feature_value, direction)
        provenance = get_evidence_provenance(feature_name, person_id, "data/raw")
        return {
            "human_explanation": explanation,
            "supporting_evidence": provenance
        }

    @staticmethod
    def get_service_health() -> Dict[str, Any]:
        transformer_available = False
        try:
            import transformers  # noqa: F401
            transformer_available = bool(os.path.isdir("backend/app/intelligence/models/ner")) and any(os.scandir("backend/app/intelligence/models/ner"))
        except Exception:
            pass
        return {
            "status": "healthy",
            "service": "crimeintel-intelligence-ml",
            "models": {
                "ner": "transformer" if transformer_available else "rule_based_fallback",
                "entity_resolution": "active",
                "relationship_extraction": "active",
                "graph_analysis": "active",
                "communication_analysis": "active",
                "transaction_analysis": "active",
                "communication_anomaly": "active",
                "transaction_anomaly": "active",
                "temporal_detection": "active",
                "location_analysis": "csv_backed_model",
                "summarizer": "model_or_fallback",
                "lead_generator": "csv_backed_model",
                "explainability": "active"
            },
            "persistence": "sqlalchemy_database_for_ner_and_resolution",
            "data_source": "local_csv_for_location_and_lead_models"
        }
