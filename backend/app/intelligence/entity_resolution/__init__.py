from backend.app.intelligence.entity_resolution.resolver import (
    calculate_resolution_score,
    EntityResolutionService,
    entity_resolution_service,
)
from backend.app.intelligence.entity_resolution.normalizer import (
    normalize_name,
    normalize_phone,
    normalize_vehicle,
    normalize_location,
)
from backend.app.intelligence.entity_resolution.similarity import (
    exact_match,
    fuzzy_match,
    partial_match,
)
from backend.app.intelligence.entity_resolution.embedder import compute_semantic_similarity

__all__ = [
    "calculate_resolution_score",
    "EntityResolutionService",
    "entity_resolution_service",
    "normalize_name",
    "normalize_phone",
    "normalize_vehicle",
    "normalize_location",
    "exact_match",
    "fuzzy_match",
    "partial_match",
    "compute_semantic_similarity",
]
