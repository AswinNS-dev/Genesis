from backend.app.intelligence.entity_matching import calculate_entity_similarity, EntityMatcher

def test_entity_matching_similarity():
    score = calculate_entity_similarity("Rahul Kumar", "Rahul Kumar")
    assert score == 100

    score_partial = calculate_entity_similarity("Rahul Kumar", "Rahul")
    assert score_partial == 80

def test_matcher_instance():
    matcher = EntityMatcher()
    res = matcher.match({"id": "1", "name": "Amit Sharma"}, {"id": "2", "name": "Amit Sharma"})
    assert res.confidence == 100
