import re
from datetime import datetime
from typing import Dict, Any, List, Optional

class ValidationService:
    def validate_record(self, raw: Dict[str, Any], source: str = "POLICE_STATION_FEED") -> Dict[str, Any]:
        errors = []
        warnings = []

        original_name = str(raw.get("name") or "").strip()
        if not original_name:
            errors.append("Missing required field: Name")

        normalized_name = self.normalize_name(original_name)
        phonetic_key = self.compute_soundex(normalized_name)

        normalized_phone = self.normalize_phone(raw.get("phone"))
        if raw.get("phone") and not normalized_phone:
            warnings.append(f"Invalid phone format: '{raw.get('phone')}'")

        dob, birth_year = self.normalize_dob(raw.get("dob"), raw.get("age"))

        normalized = {
            "name": normalized_name,
            "namePhoneticKey": phonetic_key,
            "phone": normalized_phone,
            "dob": dob,
            "birthYear": birth_year,
            "address": (raw.get("address") or "").strip().lower() or None,
            "city": (raw.get("city") or "").strip().lower() or None,
            "vehicleNo": (raw.get("vehicleNo") or "").strip().upper() or None,
            "caseId": raw.get("caseId"),
            "firNo": raw.get("firNo"),
            "observedAt": raw.get("observedAt") or datetime.utcnow().isoformat()
        }

        return {
            "id": raw.get("id") or f"REC-{int(datetime.utcnow().timestamp())}",
            "original": raw,
            "normalized": normalized,
            "errors": errors,
            "warnings": warnings,
            "isValid": len(errors) == 0,
            "provenance": {
                "source": raw.get("source") or source,
                "ingestedAt": datetime.utcnow().isoformat()
            }
        }

    def normalize_name(self, name: str) -> str:
        if not name:
            return ""
        s = name.lower().strip()
        s = re.sub(r'^(mr\.|mrs\.|ms\.|shri|smt\.|dr\.|late|thiru)\s+', '', s)
        s = re.sub(r'\s+(s/o|d/o|w/o)\s+.*$', '', s)
        s = re.sub(r'[^a-z0-9\s]', ' ', s)
        return re.sub(r'\s+', ' ', s).strip()

    def normalize_phone(self, phone: Optional[str]) -> Optional[str]:
        if not phone:
            return None
        digits = re.sub(r'\D', '', str(phone))
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        elif len(digits) == 11 and digits.startswith("0"):
            digits = digits[1:]
        if re.match(r'^[6-9]\d{9}$', digits):
            return digits
        return None

    def normalize_dob(self, dob_raw: Optional[str], age_raw: Optional[Any]) -> tuple:
        if dob_raw:
            match = re.search(r'\b(19\d{2}|20\d{2})\b', str(dob_raw))
            if match:
                year = int(match.group(1))
                return f"{year}-01-01", year
        if age_raw:
            try:
                age = int(age_raw)
                current_year = datetime.utcnow().year
                return f"{current_year - age}-01-01", current_year - age
            except:
                pass
        return None, None

    def compute_soundex(self, name: str) -> str:
        if not name:
            return "0000"
        s = re.sub(r'[^A-Z]', '', name.upper())
        if not s:
            return "0000"
        mapping = {
            'B':'1','F':'1','P':'1','V':'1',
            'C':'2','G':'2','J':'2','K':'2','Q':'2','S':'2','X':'2','Z':'2',
            'D':'3','T':'3',
            'L':'4',
            'M':'5','N':'5',
            'R':'6'
        }
        res = s[0]
        prev = mapping.get(s[0], '0')
        for char in s[1:]:
            code = mapping.get(char, '0')
            if code != '0' and code != prev:
                res += code
                prev = code
            elif code == '0':
                prev = '0'
            if len(res) == 4:
                break
        return (res + "000")[:4]

validation_service = ValidationService()
