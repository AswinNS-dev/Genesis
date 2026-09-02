from backend.app.graph.builder import NetworkGraphBuilder
from backend.app.graph.scoring import compute_relationship_strength

def test_relationship_strength_scoring():
    score = compute_relationship_strength(call_count=10, transaction_amount=100000, shared_locations=2)
    assert score >= 50
