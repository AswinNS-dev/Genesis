import difflib

def exact_match(str1: str, str2: str) -> float:
    if not str1 or not str2:
        return 0.0
    return 1.0 if str1 == str2 else 0.0

def fuzzy_match(str1: str, str2: str) -> float:
    if not str1 or not str2:
        return 0.0
    matcher = difflib.SequenceMatcher(None, str1, str2)
    return float(matcher.ratio())

def partial_match(str1: str, str2: str) -> float:
    """Checks if one string is fully contained in another"""
    if not str1 or not str2:
        return 0.0
    if str1 in str2 or str2 in str1:
        len_ratio = min(len(str1), len(str2)) / max(len(str1), len(str2))
        return float(0.8 * len_ratio + 0.2)
    return 0.0
