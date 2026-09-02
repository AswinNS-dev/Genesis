def calculate_entity_similarity(name_a: str, name_b: str) -> int:
    a = (name_a or "").lower().strip()
    b = (name_b or "").lower().strip()
    if not a or not b:
        return 0
    if a == b:
        return 100
    if a in b or b in a:
        return 80
    return 0
