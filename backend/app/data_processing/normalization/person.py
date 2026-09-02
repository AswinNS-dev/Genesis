import re

def normalize_person_name(name: str) -> str:
    if not name:
        return ""
    clean = re.sub(r"\b(mr|mrs|ms|dr|shri|smt)\b\.?", "", name, flags=re.IGNORECASE)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean.title()

def normalize_phone(phone: str) -> str:
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        return digits
    elif len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    return digits

def normalize_vehicle(plate: str) -> str:
    if not plate:
        return ""
    return re.sub(r"[\s\-]", "", plate).upper()

def normalize_location(location: str) -> str:
    if not location:
        return ""
    return re.sub(r"\s+", " ", location).strip().title()

def normalize_organization(org: str) -> str:
    if not org:
        return ""
    clean = re.sub(r"\b(pvt|ltd|inc|corp|co|limited|private)\b\.?", "", org, flags=re.IGNORECASE)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean.title()
