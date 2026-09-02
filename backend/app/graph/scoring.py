def compute_relationship_strength(call_count: int, transaction_amount: float = 0, shared_locations: int = 0) -> int:
    score = (call_count * 2) + int(transaction_amount / 50000) + (shared_locations * 15)
    return min(100, max(10, score))
