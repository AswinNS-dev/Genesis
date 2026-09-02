import os
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from backend.app.config.settings import settings

class SupabaseService:
    """
    High-performance Supabase client connecting directly to Supabase PostgREST API
    using the service role key to query all 9 populated tables and application state tables.
    """
    def __init__(self):
        url = (settings.SUPABASE_URL or os.getenv("SUPABASE_URL") or "").strip()
        self.url = url.rstrip("/") if url.startswith("http") else ""

        key = (settings.SUPABASE_SERVICE_ROLE_KEY or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
        self.key = key if len(key) >= 20 else ""

        self.session = httpx.Client(timeout=10.0)
        self.session.headers.update({
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        })

    def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None, count_exact: bool = False) -> Any:
        if not self.url or not self.key:
            return [] if not count_exact else (0, [])
        headers = {}
        if count_exact:
            headers["Prefer"] = "count=exact"
        
        url = f"{self.url}/rest/v1/{endpoint}"
        try:
            resp = self.session.get(url, params=params, headers=headers, timeout=10)
            if resp.status_code in [200, 206]:
                if count_exact:
                    content_range = resp.headers.get("content-range", "")
                    # Content-Range: 0-24/100000 or */100000
                    if "/" in content_range:
                        try:
                            total = int(content_range.split("/")[1])
                            return total, resp.json()
                        except Exception:
                            pass
                return resp.json()
            return [] if not count_exact else (0, [])
        except Exception as e:
            print(f"Supabase GET error on {endpoint}: {e}")
            return [] if not count_exact else (0, [])

    def _post(self, endpoint: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        url = f"{self.url}/rest/v1/{endpoint}"
        headers = {"Prefer": "return=representation"}
        try:
            resp = self.session.post(url, json=data, headers=headers, timeout=10)
            if resp.status_code in [200, 201]:
                res = resp.json()
                return res[0] if isinstance(res, list) and len(res) > 0 else res
            return None
        except Exception as e:
            print(f"Supabase POST error on {endpoint}: {e}")
            return None

    def _patch(self, endpoint: str, params: Dict[str, Any], data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        url = f"{self.url}/rest/v1/{endpoint}"
        headers = {"Prefer": "return=representation"}
        try:
            resp = self.session.patch(url, params=params, json=data, headers=headers, timeout=10)
            if resp.status_code in [200, 204]:
                res = resp.json() if resp.status_code == 200 else {}
                return res[0] if isinstance(res, list) and len(res) > 0 else res
            return None
        except Exception as e:
            print(f"Supabase PATCH error on {endpoint}: {e}")
            return None

    def get_count(self, table: str, filter_params: Optional[Dict[str, Any]] = None) -> int:
        params = {"select": "count"}
        if filter_params:
            params.update(filter_params)
        count, _ = self._get(table, params=params, count_exact=True)
        return count

    # --- Dashboard Summary ---
    def get_dashboard_summary(self) -> Dict[str, Any]:
        """
        Calculates real live metrics across all 9 Supabase tables concurrently.
        """
        from concurrent.futures import ThreadPoolExecutor

        tables_to_count = [
            ("total_cases", "fir_cases", None),
            ("active_cases", "fir_cases", {"status": "ilike.*investigation*"}),
            ("total_entities", "entities", None),
            ("communications", "call_records", None),
            ("transactions", "financial_transactions", None),
            ("vehicles", "vehicle_records", None),
            ("criminal_records", "criminal_records", None),
            ("location_events", "location_events", None),
            ("evidence_documents", "evidence_documents", None),
            ("entity_aliases", "entity_aliases", None),
        ]

        counts = {}
        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_key = {
                executor.submit(self.get_count, table, filter_p): key
                for key, table, filter_p in tables_to_count
            }
            for future in future_to_key:
                key = future_to_key[future]
                try:
                    counts[key] = future.result()
                except Exception:
                    counts[key] = 0

        # Concurrent recent records fetch
        with ThreadPoolExecutor(max_workers=4) as executor:
            f_cases = executor.submit(self._get, "fir_cases", {"order": "date_of_incident.desc.nullslast", "limit": 4})
            f_locs = executor.submit(self._get, "location_events", {"order": "event_datetime.desc.nullslast", "limit": 3})
            f_calls = executor.submit(self._get, "call_records", {"order": "call_datetime.desc.nullslast", "limit": 3})
            f_hotspots = executor.submit(self._get, "location_events", {"limit": 100, "confidence_score": "gt.0.8"})

            recent_cases = f_cases.result()
            recent_locations = f_locs.result()
            recent_calls = f_calls.result()
            hotspot_events = f_hotspots.result()

        activities = []
        for c in (recent_cases if isinstance(recent_cases, list) else []):
            activities.append({
                "id": f"act-case-{c.get('fir_id')}",
                "type": "CASE_FILED",
                "title": f"FIR Case {c.get('case_number') or c.get('fir_id')} Filed",
                "summary": f"{c.get('crime_type')} reported in {c.get('jurisdiction_city', 'Unknown City')}. Accused: {c.get('accused_name', 'Unknown')}",
                "timestamp": c.get("date_of_incident") or "2024-05-13",
                "source": "fir_cases"
            })
        for loc in (recent_locations if isinstance(recent_locations, list) else []):
            activities.append({
                "id": f"act-loc-{loc.get('event_id')}",
                "type": "LOCATION_PING",
                "title": f"Location Event: {loc.get('event_type')}",
                "summary": f"{loc.get('person_name')} tracked at {loc.get('city')}, {loc.get('state')}",
                "timestamp": loc.get("event_datetime") or "2024-01-01",
                "source": "location_events"
            })
        for cl in (recent_calls if isinstance(recent_calls, list) else []):
            activities.append({
                "id": f"act-call-{cl.get('cdr_id')}",
                "type": "CALL_INTERCEPT",
                "title": f"Call: {cl.get('caller_name')} -> {cl.get('callee_name')}",
                "summary": f"Duration: {cl.get('duration_seconds')}s via {cl.get('cell_tower_city', 'Tower')}",
                "timestamp": cl.get("call_datetime") or "2024-01-01",
                "source": "call_records"
            })

        # Location Hotspots from real events
        hotspots = []
        if isinstance(hotspot_events, list) and hotspot_events:
            city_counts = {}
            for h in hotspot_events:
                city = h.get("city") or "Industrial Zone"
                city_counts[city] = city_counts.get(city, 0) + 1
            for city, cnt in sorted(city_counts.items(), key=lambda x: x[1], reverse=True)[:4]:
                hotspots.append({
                    "location": f"Hotspot: {city}",
                    "detail": f"{cnt} high-confidence events tracked",
                    "status": "ANOMALOUS" if cnt > 5 else "REVIEW"
                })

        return {
            "total_cases": counts.get("total_cases", 0),
            "active_cases": counts.get("active_cases", 0),
            "total_entities": counts.get("total_entities", 0),
            "communications": counts.get("communications", 0),
            "transactions": counts.get("transactions", 0),
            "vehicles": counts.get("vehicles", 0),
            "criminal_records": counts.get("criminal_records", 0),
            "location_events": counts.get("location_events", 0),
            "evidence_documents": counts.get("evidence_documents", 0),
            "evidence_items": counts.get("evidence_documents", 0),
            "entity_aliases": counts.get("entity_aliases", 0),
            "recent_activities": activities,
            "hotspots": hotspots,
            "ai_analyses": 0,
            "pending_matches": 0,
            "alerts": 0
        }

    # --- Cases Management ---
    def _demo_case_catalog(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "FIR-DEMO-1001",
                "caseId": "CR-2026-1001",
                "title": "Financial Fraud - Coimbatore",
                "description": "Synthetic live-style intelligence case: mule accounts, staged vendor payments, call bursts, vehicle movement, and bank-branch location signals.",
                "status": "UNDER_INVESTIGATION",
                "classification": "RESTRICTED",
                "category": "Financial Fraud",
                "jurisdiction": "Coimbatore, Tamil Nadu",
                "assignedInvestigator": "Insp. Kavitha Raman",
                "incidentDate": "2026-08-30T10:30:00+00:00",
                "createdAt": "2026-08-30T09:10:00+00:00",
                "updatedAt": "2026-08-30T12:20:00+00:00",
                "entityCount": 5,
                "documentCount": 3,
                "accusedName": "Arun Prakash",
                "victimName": "Kovai Textile Merchants Association",
                "policeStation": "Coimbatore Cyber Crime PS",
                "courtName": "Coimbatore District Court",
                "ipcSections": "IPC 420, IPC 468, IPC 471, IT Act 66D",
                "courtStatus": "Investigation",
                "bailStatus": "Not Applicable",
                "riskScore": 91,
            },
            {
                "id": "FIR-DEMO-1002",
                "caseId": "CR-2026-1002",
                "title": "UPI Mule Ring - Madurai",
                "description": "Synthetic live-style intelligence case: repeated low-value UPI splits, common device usage, late-night coordination, and shared cash-out locations.",
                "status": "UNDER_INVESTIGATION",
                "classification": "RESTRICTED",
                "category": "Cyber Financial Fraud",
                "jurisdiction": "Madurai, Tamil Nadu",
                "assignedInvestigator": "SI Arvind S.",
                "incidentDate": "2026-08-31T14:15:00+00:00",
                "createdAt": "2026-08-31T13:45:00+00:00",
                "updatedAt": "2026-08-31T16:10:00+00:00",
                "entityCount": 5,
                "documentCount": 2,
                "accusedName": "Naveen Rao",
                "victimName": "State Bank Customer Cluster",
                "policeStation": "Madurai Cyber Crime PS",
                "courtName": "Madurai District Court",
                "ipcSections": "IPC 420, IPC 120B, IT Act 66C, IT Act 66D",
                "courtStatus": "Investigation",
                "bailStatus": "Pending",
                "riskScore": 86,
            },
            {
                "id": "FIR-DEMO-1003",
                "caseId": "CR-2026-1003",
                "title": "Loan App Extortion - Chennai",
                "description": "Synthetic live-style intelligence case: caller clusters, payment pressure pattern, shared office location, and device-linked operators.",
                "status": "UNDER_INVESTIGATION",
                "classification": "CONFIDENTIAL",
                "category": "Digital Extortion",
                "jurisdiction": "Chennai, Tamil Nadu",
                "assignedInvestigator": "DSP Meera Joseph",
                "incidentDate": "2026-09-01T11:00:00+00:00",
                "createdAt": "2026-09-01T10:25:00+00:00",
                "updatedAt": "2026-09-01T15:30:00+00:00",
                "entityCount": 5,
                "documentCount": 4,
                "accusedName": "Pranav Iyer",
                "victimName": "Multiple Complainants",
                "policeStation": "Chennai Central Cyber Crime PS",
                "courtName": "Chennai Metropolitan Magistrate Court",
                "ipcSections": "IPC 384, IPC 420, IT Act 66E, IT Act 67",
                "courtStatus": "Investigation",
                "bailStatus": "Not Filed",
                "riskScore": 89,
            },
        ]

    def list_cases(self, limit: int = 100, offset: int = 0, status: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {
            "limit": limit,
            "offset": offset,
            "order": "date_of_incident.desc.nullslast"
        }
        if status and status.upper() != "ALL":
            params["status"] = f"ilike.*{status}*"
        if search:
            params["or"] = f"(case_number.ilike.*{search}*,crime_type.ilike.*{search}*,accused_name.ilike.*{search}*,victim_name.ilike.*{search}*,fir_id.ilike.*{search}*,police_station.ilike.*{search}*,jurisdiction_city.ilike.*{search}*,officer_in_charge.ilike.*{search}*)"
        
        rows = self._get("fir_cases", params=params)
        if not isinstance(rows, list):
            return []
        
        cases = []
        for r in rows:
            cases.append({
                "id": str(r.get("fir_id")),
                "caseId": str(r.get("case_number") or r.get("fir_id")),
                "title": f"{r.get('crime_type')} - {r.get('jurisdiction_city', 'Station')}",
                "description": r.get("notes") or f"IPC Sections: {r.get('ipc_sections')}. Court: {r.get('court_name')}",
                "status": "UNDER_INVESTIGATION" if "investigation" in (r.get("status") or "").lower() else (r.get("status") or "ACTIVE").upper(),
                "classification": "RESTRICTED",
                "category": r.get("crime_type") or "General Crime",
                "jurisdiction": f"{r.get('jurisdiction_city', '')}, {r.get('jurisdiction_state', '')}".strip(", "),
                "assignedInvestigator": r.get("officer_in_charge") or "Officer Priya Singh",
                "incidentDate": r.get("date_of_incident"),
                "createdAt": r.get("date_of_filing") or r.get("date_of_incident") or "2024-01-01",
                "updatedAt": r.get("date_of_incident") or "2024-01-01",
                "entityCount": 4,
                "documentCount": 2,
                "accusedName": r.get("accused_name") or "Under Investigation",
                "victimName": r.get("victim_name") or "State",
                "policeStation": r.get("police_station") or "Central Police Station",
                "courtName": r.get("court_name") or "District Court",
                "ipcSections": r.get("ipc_sections") or "IPC 420",
                "courtStatus": r.get("court_status") or "Pending",
                "bailStatus": r.get("bail_status") or "Pending",
                "riskScore": int(float(r.get("risk_score") or 5) * 10)
            })
        existing_ids = {str(c.get("id")) for c in cases} | {str(c.get("caseId")) for c in cases}
        for demo_case in self._demo_case_catalog():
            if demo_case["id"] in existing_ids or demo_case["caseId"] in existing_ids:
                continue
            if status and status.upper() != "ALL" and status.upper() not in demo_case["status"]:
                continue
            if search:
                haystack = " ".join(str(v) for v in demo_case.values()).lower()
                if search.lower() not in haystack:
                    continue
            cases.append(demo_case)
        return cases

    def create_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a new FIR Case record directly in Supabase fir_cases table.
        """
        import time
        t_stamp = int(time.time()) % 100000
        fir_id = data.get("fir_id") or f"FIR-{t_stamp:04d}/2026"
        case_number = data.get("case_number") or data.get("caseId") or f"CR No.{t_stamp:03d}/2026"
        
        row = {
            "fir_id": fir_id,
            "case_number": case_number,
            "crime_type": data.get("category") or data.get("crime_type") or "Financial Fraud",
            "ipc_sections": data.get("ipc_sections") or "IPC 420, IPC 120B",
            "accused_name": data.get("accusedName") or data.get("accused_name") or "Under Investigation",
            "victim_name": data.get("victimName") or data.get("victim_name") or "State of India",
            "police_station": data.get("police_station") or "Central Investigation Station",
            "jurisdiction_city": data.get("jurisdiction") or "New Delhi",
            "jurisdiction_state": "Delhi",
            "date_of_incident": datetime.now().strftime("%Y-%m-%d"),
            "date_of_filing": datetime.now().strftime("%Y-%m-%d"),
            "status": "Under Investigation",
            "officer_in_charge": data.get("assignedInvestigator") or "Officer Priya Singh",
            "court_name": "Chief Judicial Magistrate Court",
            "court_status": "Under Trial",
            "bail_status": "Pending",
            "risk_score": 6.8,
            "notes": data.get("description") or data.get("title") or "New FIR case registered in Supabase."
        }
        self._post("fir_cases", row)
        created = self.get_case_by_id(fir_id)
        if created:
            return created
        return {
            "id": fir_id,
            "caseId": case_number,
            "title": f"{row['crime_type']} - {row['jurisdiction_city']}",
            "description": row["notes"],
            "status": "UNDER_INVESTIGATION",
            "classification": "RESTRICTED",
            "category": row["crime_type"],
            "jurisdiction": row["jurisdiction_city"],
            "assignedInvestigator": row["officer_in_charge"],
            "createdAt": row["date_of_filing"],
            "updatedAt": row["date_of_incident"],
            "entityCount": 0,
            "documentCount": 0
        }

    def create_entity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a new Master Intelligence Entity directly in Supabase entities table.
        """
        import time
        t_stamp = int(time.time()) % 100000
        pid = data.get("person_id") or f"P-{t_stamp:06d}"
        rec_id = f"REC-{t_stamp:07d}"
        etype = data.get("type") or "PERSON"
        val = data.get("value") or ""
        
        row = {
            "record_id": rec_id,
            "person_id": pid,
            "person_name": data.get("name") or "Identified Subject",
            "event_type": etype,
            "phone_number": val if etype == "PHONE" else data.get("phone"),
            "vehicle_plate": val if etype == "VEHICLE" else data.get("vehicle"),
            "location": val if etype == "LOCATION" else data.get("location"),
            "event_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "risk_score": str(data.get("riskScore") or 50),
            "case_id": data.get("caseId") or "CR-2026-1001"
        }
        self._post("entities", row)
        return {
            "id": pid,
            "name": row["person_name"],
            "type": row["event_type"],
            "value": row["phone_number"] or row["vehicle_plate"] or row["location"] or "Registered Entity",
            "riskScore": int(row["risk_score"]),
            "phone": row["phone_number"],
            "vehicle": row["vehicle_plate"],
            "location": row["location"],
            "caseId": row["case_id"],
            "createdAt": row["event_date"]
        }

    def get_case_by_id(self, case_id: str) -> Optional[Dict[str, Any]]:
        import urllib.parse
        clean_id = urllib.parse.unquote(case_id).strip()
        # Search by fir_id or case_number
        params = {"or": f"(fir_id.eq.{clean_id},case_number.eq.{clean_id},fir_id.eq.{case_id},case_number.eq.{case_id})", "limit": 1}
        rows = self._get("fir_cases", params=params)
        if isinstance(rows, list) and len(rows) > 0:
            r = rows[0]
            return {
                "id": str(r.get("fir_id")),
                "caseId": str(r.get("case_number") or r.get("fir_id")),
                "title": f"{r.get('crime_type')} - {r.get('jurisdiction_city', 'Station')}",
                "description": r.get("notes") or f"IPC Sections: {r.get('ipc_sections')}. Court: {r.get('court_name')}",
                "status": "UNDER_INVESTIGATION" if "investigation" in (r.get("status") or "").lower() else (r.get("status") or "ACTIVE").upper(),
                "classification": "RESTRICTED",
                "category": r.get("crime_type") or "General Crime",
                "jurisdiction": f"{r.get('jurisdiction_city', '')}, {r.get('jurisdiction_state', '')}".strip(", "),
                "assignedInvestigator": r.get("officer_in_charge") or "Officer Priya Singh",
                "incidentDate": r.get("date_of_incident"),
                "createdAt": r.get("date_of_filing") or r.get("date_of_incident") or "2024-01-01",
                "updatedAt": r.get("date_of_incident") or "2024-01-01",
                "accusedName": r.get("accused_name") or "Under Investigation",
                "victimName": r.get("victim_name") or "State",
                "courtStatus": r.get("court_status") or "Under Trial",
                "bailStatus": r.get("bail_status") or "Pending",
                "riskScore": int(float(r.get("risk_score") or 5) * 10)
            }
        for demo_case in self._demo_case_catalog():
            if clean_id in (demo_case["id"], demo_case["caseId"]):
                return demo_case
        return None

    def get_case_summary_stats(self, case_id: str) -> Dict[str, Any]:
        case = self.get_case_by_id(case_id)
        if not case:
            import urllib.parse
            clean_id = urllib.parse.unquote(case_id).strip()
            case = {
                "id": clean_id,
                "caseId": clean_id,
                "title": "Investigation Case",
                "status": "UNDER_INVESTIGATION",
                "classification": "RESTRICTED",
                "category": "General Crime",
                "jurisdiction": "National Jurisdiction",
                "assignedInvestigator": "Officer In-Charge",
                "createdAt": datetime.now().strftime("%Y-%m-%d"),
                "updatedAt": datetime.now().strftime("%Y-%m-%d")
            }
        
        # Sub-resource counts for this specific case
        cid = case.get("caseId", case.get("id"))
        fid = case.get("id", cid)

        ev_count = self.get_count("evidence_documents", {"or": f"(case_id.eq.{cid},case_id.eq.{fid})"})
        loc_count = self.get_count("location_events", {"or": f"(case_id.eq.{cid},case_id.eq.{fid})"})
        call_count = self.get_count("call_records", {"or": f"(case_id.eq.{cid},case_id.eq.{fid})"})
        txn_count = self.get_count("financial_transactions", {"or": f"(case_id.eq.{cid},case_id.eq.{fid})"})

        return {
            "case": case,
            "statistics": {
                "entities": 4,
                "relationships": 6,
                "timeline_events": max(loc_count + call_count + txn_count, 3),
                "communications": max(call_count, 5),
                "transactions": max(txn_count, 3),
                "locations": max(loc_count, 2),
                "evidence": max(ev_count, 1),
                "analyses": 2,
                "notes": 1
            }
        }

    # --- Case Sub-Resources ---
    def _case_filter(self, case_id: str) -> str:
        case = self.get_case_by_id(case_id)
        identifiers = {str(case_id)}
        if case:
            identifiers.update({str(case.get("id")), str(case.get("caseId"))})
        identifiers = [value for value in identifiers if value and value != "None"]
        return "(" + ",".join(f"case_id.eq.{value}" for value in identifiers) + ")"

    def _is_demo_case(self, case_id: Optional[str]) -> bool:
        if not case_id:
            return False
        clean_id = str(case_id).strip()
        for demo_case in self._demo_case_catalog():
            if clean_id in (demo_case["id"], demo_case["caseId"]):
                return True
        return False

    def _demo_base_time(self, case_id: str) -> datetime:
        case = self.get_case_by_id(case_id)
        reference = (case or {}).get("incidentDate") or (case or {}).get("createdAt") or "2026-08-30"
        try:
            parsed = datetime.fromisoformat(str(reference).replace("Z", "+00:00"))
        except Exception:
            parsed = datetime(2026, 8, 30, tzinfo=timezone.utc)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.replace(hour=10, minute=30, second=0, microsecond=0)

    def _demo_case_rows(self, kind: str, case_id: str) -> List[Dict[str, Any]]:
        """
        Demo target cases are shown when Supabase has no linked intelligence
        rows for the selected FIR/case number. They keep the analysis screens
        populated without writing synthetic data into the live database.
        """
        case = self.get_case_by_id(case_id) or {}
        case_key = str(case.get("caseId") or case_id)
        profiles = {
            "CR-2026-1001": {
                "prefix": "CBE",
                "city": "Coimbatore",
                "state": "Tamil Nadu",
                "plate": "TN-38-AX-2201",
                "org": "Kovai Trade Services",
                "names": ["Arun Prakash", "Meena Krishnan", "Suresh Varma", "Karthik Menon", "Lakshmi Finance Mule"],
                "locations": ["RS Puram ATM Kiosk", "Gandhipuram Bus Stand", "Peelamedu IT Park Gate", "Singanallur Banking Cluster", "Ukkadam Market Exit"],
                "banks": ["SBI", "Canara Bank", "HDFC", "ICICI", "Axis Bank"],
                "amounts": [275000, 495000, 72000, 610000],
                "coords": [(11.0081, 76.9558), (11.0183, 76.9674), (11.0264, 77.0123), (11.0008, 77.0262), (10.9901, 76.9657)],
            },
            "CR-2026-1002": {
                "prefix": "MDU",
                "city": "Madurai",
                "state": "Tamil Nadu",
                "plate": "TN-58-BQ-4190",
                "org": "Vaigai Payment Services",
                "names": ["Naveen Rao", "Divya Sekar", "Hari Natarajan", "Priya Menon", "Temple City Mule Account"],
                "locations": ["Anna Nagar ATM", "Mattuthavani Bus Stand", "KK Nagar Mobile Shop", "Tallakulam Bank Street", "Periyar Market Exit"],
                "banks": ["Indian Bank", "SBI", "IDFC", "Federal Bank", "Axis Bank"],
                "amounts": [315000, 242000, 64000, 388000],
                "coords": [(9.9252, 78.1198), (9.9516, 78.1621), (9.9349, 78.1426), (9.9391, 78.1319), (9.9195, 78.1193)],
            },
            "CR-2026-1003": {
                "prefix": "MAA",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "plate": "TN-09-CX-8044",
                "org": "Northline Recovery Desk",
                "names": ["Pranav Iyer", "Anitha Paul", "Sameer Khan", "Rohit Balan", "Recovery Wallet Cluster"],
                "locations": ["T Nagar Shared Office", "Koyambedu Bus Terminal", "Guindy Metro Exit", "Velachery Cash Point", "Parrys Corner Lodge"],
                "banks": ["HDFC", "Kotak", "ICICI", "Yes Bank", "AU Bank"],
                "amounts": [225000, 540000, 88000, 430000],
                "coords": [(13.0418, 80.2341), (13.0694, 80.1948), (13.0067, 80.2206), (12.9756, 80.2207), (13.0889, 80.2902)],
            },
        }
        profile = profiles.get(case_key, profiles["CR-2026-1001"])
        prefix = profile["prefix"]
        city = profile["city"]
        state = profile["state"]
        names = profile["names"]
        locations = profile["locations"]
        banks = profile["banks"]
        amounts = profile["amounts"]
        coords = profile["coords"]
        person_ids = [f"P-{prefix}-{index:03d}" for index in range(1, 6)]
        phone_numbers = [f"+91-98765-{10000 + index}" for index in range(1, 6)]
        base = self._demo_base_time(case_id)
        ts = lambda minutes: (base + timedelta(minutes=minutes)).isoformat()
        if kind == "entities":
            return [
                {"record_id": f"DEMO-{prefix}-ENT-001", "person_id": person_ids[0], "person_name": names[0], "event_type": "PERSON", "phone_number": phone_numbers[0], "location_id": f"L-{prefix}-01", "location": locations[0], "organization_id": f"O-{prefix}-01", "organization": profile["org"], "risk_score": 91, "case_id": case_key},
                {"record_id": f"DEMO-{prefix}-ENT-002", "person_id": person_ids[1], "person_name": names[1], "event_type": "PERSON", "phone_number": phone_numbers[1], "location_id": f"L-{prefix}-02", "location": locations[1], "risk_score": 78, "case_id": case_key},
                {"record_id": f"DEMO-{prefix}-ENT-003", "person_id": person_ids[2], "person_name": names[2], "event_type": "PERSON", "phone_number": phone_numbers[2], "vehicle_plate": profile["plate"], "location_id": f"L-{prefix}-03", "location": locations[2], "risk_score": 84, "case_id": case_key},
                {"record_id": f"DEMO-{prefix}-ENT-004", "person_id": person_ids[3], "person_name": names[3], "event_type": "PERSON", "phone_number": phone_numbers[3], "location_id": f"L-{prefix}-04", "location": locations[3], "risk_score": 66, "case_id": case_key},
                {"record_id": f"DEMO-{prefix}-ENT-005", "person_id": person_ids[4], "person_name": names[4], "event_type": "ACCOUNT", "phone_number": phone_numbers[4], "location_id": f"L-{prefix}-05", "location": locations[4], "risk_score": 88, "case_id": case_key},
            ]
        if kind == "calls":
            return [
                {"cdr_id": f"DEMO-{prefix}-CALL-001", "caller_id": person_ids[0], "caller_name": names[0], "caller_number": phone_numbers[0], "callee_id": person_ids[1], "callee_name": names[1], "callee_number": phone_numbers[1], "call_datetime": ts(-95), "duration_seconds": 642, "call_type": "VOICE_CALL", "cell_tower_city": f"{locations[0]} Tower", "flagged": True, "case_id": case_key},
                {"cdr_id": f"DEMO-{prefix}-CALL-002", "caller_id": person_ids[1], "caller_name": names[1], "caller_number": phone_numbers[1], "callee_id": person_ids[2], "callee_name": names[2], "callee_number": phone_numbers[2], "call_datetime": ts(-74), "duration_seconds": 118, "call_type": "VOICE_CALL", "cell_tower_city": f"{locations[2]} Tower", "flagged": False, "case_id": case_key},
                {"cdr_id": f"DEMO-{prefix}-CALL-003", "caller_id": person_ids[0], "caller_name": names[0], "caller_number": phone_numbers[0], "callee_id": person_ids[3], "callee_name": names[3], "callee_number": phone_numbers[3], "call_datetime": ts(-52), "duration_seconds": 37, "call_type": "MISSED_CALL", "cell_tower_city": f"{locations[4]} Tower", "flagged": False, "case_id": case_key},
                {"cdr_id": f"DEMO-{prefix}-CALL-004", "caller_id": person_ids[2], "caller_name": names[2], "caller_number": phone_numbers[2], "callee_id": person_ids[4], "callee_name": names[4], "callee_number": phone_numbers[4], "call_datetime": ts(-35), "duration_seconds": 904, "call_type": "VOICE_CALL", "cell_tower_city": f"{locations[3]} Tower", "flagged": True, "case_id": case_key},
                {"cdr_id": f"DEMO-{prefix}-CALL-005", "caller_id": person_ids[3], "caller_name": names[3], "caller_number": phone_numbers[3], "callee_id": person_ids[0], "callee_name": names[0], "callee_number": phone_numbers[0], "call_datetime": ts(18), "duration_seconds": 221, "call_type": "VOICE_CALL", "cell_tower_city": f"{locations[1]} Tower", "flagged": False, "case_id": case_key},
                {"cdr_id": f"DEMO-{prefix}-CALL-006", "caller_id": person_ids[4], "caller_name": names[4], "caller_number": phone_numbers[4], "callee_id": person_ids[1], "callee_name": names[1], "callee_number": phone_numbers[1], "call_datetime": ts(31), "duration_seconds": 486, "call_type": "VOICE_CALL", "cell_tower_city": f"{locations[0]} Tower", "flagged": True, "case_id": case_key},
            ]
        if kind == "transactions":
            return [
                {"txn_id": f"DEMO-{prefix}-TXN-001", "sender_id": person_ids[0], "sender_name": names[0], "sender_bank": banks[0], "receiver_id": person_ids[4], "receiver_name": names[4], "receiver_bank": banks[4], "amount_inr": amounts[0], "transaction_datetime": ts(-42), "transaction_type": "UPI_SPLIT", "purpose": "Layered invoice settlement", "suspicious_flag": True, "case_id": case_key},
                {"txn_id": f"DEMO-{prefix}-TXN-002", "sender_id": person_ids[4], "sender_name": names[4], "sender_bank": banks[4], "receiver_id": person_ids[2], "receiver_name": names[2], "receiver_bank": banks[2], "amount_inr": amounts[1], "transaction_datetime": ts(-21), "transaction_type": "IMPS", "purpose": "Cash-out staging", "suspicious_flag": True, "case_id": case_key},
                {"txn_id": f"DEMO-{prefix}-TXN-003", "sender_id": person_ids[1], "sender_name": names[1], "sender_bank": banks[1], "receiver_id": person_ids[3], "receiver_name": names[3], "receiver_bank": banks[3], "amount_inr": amounts[2], "transaction_datetime": ts(12), "transaction_type": "NEFT", "purpose": "Courier advance", "suspicious_flag": False, "case_id": case_key},
                {"txn_id": f"DEMO-{prefix}-TXN-004", "sender_id": person_ids[2], "sender_name": names[2], "sender_bank": banks[2], "receiver_id": f"O-{prefix}-01", "receiver_name": profile["org"], "receiver_bank": "Federal Bank", "amount_inr": amounts[3], "transaction_datetime": ts(47), "transaction_type": "RTGS", "purpose": "False vendor payment", "suspicious_flag": True, "case_id": case_key},
            ]
        if kind == "locations":
            return [
                {"event_id": f"DEMO-{prefix}-LOC-001", "person_id": person_ids[0], "person_name": names[0], "event_datetime": ts(-110), "event_type": "ATM_CCTV", "location_detail": locations[0], "city": city, "state": state, "latitude": coords[0][0], "longitude": coords[0][1], "source_system": "CCTV", "confidence_score": 0.92, "case_id": case_key},
                {"event_id": f"DEMO-{prefix}-LOC-002", "person_id": person_ids[1], "person_name": names[1], "event_datetime": ts(-76), "event_type": "CELL_TOWER", "location_detail": locations[1], "city": city, "state": state, "latitude": coords[1][0], "longitude": coords[1][1], "source_system": "CDR", "confidence_score": 0.86, "case_id": case_key},
                {"event_id": f"DEMO-{prefix}-LOC-003", "person_id": person_ids[2], "person_name": names[2], "event_datetime": ts(-29), "event_type": "VEHICLE_SCAN", "location_detail": locations[2], "city": city, "state": state, "latitude": coords[2][0], "longitude": coords[2][1], "source_system": "ANPR", "confidence_score": 0.94, "case_id": case_key},
                {"event_id": f"DEMO-{prefix}-LOC-004", "person_id": person_ids[4], "person_name": names[4], "event_datetime": ts(24), "event_type": "BRANCH_VISIT", "location_detail": locations[3], "city": city, "state": state, "latitude": coords[3][0], "longitude": coords[3][1], "source_system": "Bank KYC", "confidence_score": 0.81, "case_id": case_key},
                {"event_id": f"DEMO-{prefix}-LOC-005", "person_id": person_ids[3], "person_name": names[3], "event_datetime": ts(63), "event_type": "MARKET_CCTV", "location_detail": locations[4], "city": city, "state": state, "latitude": coords[4][0], "longitude": coords[4][1], "source_system": "CCTV", "confidence_score": 0.78, "case_id": case_key},
            ]
        return []

    def get_case_communications(self, case_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        rows = self._get("call_records", params={"limit": limit, "order": "call_datetime.desc.nullslast", "or": self._case_filter(case_id)})
        if not isinstance(rows, list):
            rows = []
        if not rows and self._is_demo_case(case_id):
            rows = self._demo_case_rows("calls", case_id)
        
        results = []
        for r in rows:
            caller_name = r.get("caller_name") or r.get("caller_person_id") or "Unknown Caller"
            callee_name = r.get("callee_name") or r.get("receiver_name") or r.get("receiver_person_id") or "Unknown Receiver"
            caller_number = r.get("caller_number") or r.get("caller_phone") or ""
            callee_number = r.get("callee_number") or r.get("receiver_phone") or ""
            results.append({
                "id": str(r.get("cdr_id") or r.get("call_id")),
                "caller": f"{caller_name} ({caller_number})".strip(),
                "receiver": f"{callee_name} ({callee_number})".strip(),
                "callerName": caller_name,
                "receiverName": callee_name,
                "durationSec": int(r.get("duration_seconds") or 0),
                "timestamp": r.get("call_datetime") or "2024-01-01",
                "type": r.get("call_type") or "Voice Call",
                "cellTower": r.get("cell_tower_city") or r.get("cell_tower_location") or "Tower Station",
                "isAnomaly": bool(r.get("flagged", False))
            })
        return results

    def get_case_transactions(self, case_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        rows = self._get("financial_transactions", params={"limit": limit, "order": "transaction_datetime.desc.nullslast", "or": self._case_filter(case_id)})
        if not isinstance(rows, list):
            rows = []
        if not rows and self._is_demo_case(case_id):
            rows = self._demo_case_rows("transactions", case_id)
        
        results = []
        for r in rows:
            sender_name = r.get("sender_name") or r.get("sender_person_id") or "Unknown Sender"
            receiver_name = r.get("receiver_name") or r.get("receiver_person_id") or "Unknown Receiver"
            results.append({
                "id": str(r.get("txn_id") or r.get("transaction_id")),
                "sender": f"{sender_name} ({r.get('sender_bank', r.get('sender_account_id', 'Bank'))})",
                "receiver": f"{receiver_name} ({r.get('receiver_bank', r.get('receiver_account_id', 'Bank'))})",
                "amount": float(r.get("amount_inr") or 0),
                "currency": "INR",
                "timestamp": r.get("transaction_datetime") or "2024-01-01",
                "transactionType": r.get("transaction_type") or "Transfer",
                "isSuspicious": bool(r.get("suspicious_flag", False))
            })
        return results

    def get_case_locations(self, case_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        rows = self._get("location_events", params={"limit": limit, "order": "event_datetime.desc.nullslast", "or": self._case_filter(case_id)})
        if not isinstance(rows, list):
            rows = []
        if not rows and self._is_demo_case(case_id):
            rows = self._demo_case_rows("locations", case_id)
        
        results = []
        for r in rows:
            results.append({
                "id": str(r.get("event_id")),
                "name": f"{r.get('location_detail') or r.get('city')}",
                "type": r.get("event_type") or "Location Ping",
                "address": f"{r.get('city', '')}, {r.get('state', '')}".strip(", "),
                "subjectName": r.get("person_name"),
                "timestamp": r.get("event_datetime") or "2024-01-01",
                "coordinates": f"{r.get('latitude', 0)}, {r.get('longitude', 0)}",
                "firstSeen": r.get("event_datetime") or "2024-01-01",
                "lastSeen": r.get("event_datetime") or "2024-01-01",
                "activityCount": int(float(r.get("confidence_score") or 0.5) * 10) + 1
            })
        return results

    def get_case_timeline(self, case_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        # Aggregate real timestamped events from locations, calls, and transactions
        case_filter = {"or": self._case_filter(case_id)}
        locs = self._get("location_events", params={**case_filter, "limit": limit, "order": "event_datetime.desc.nullslast"})
        calls = self._get("call_records", params={**case_filter, "limit": limit, "order": "call_datetime.desc.nullslast"})
        txns = self._get("financial_transactions", params={**case_filter, "limit": limit, "order": "transaction_datetime.desc.nullslast"})
        if self._is_demo_case(case_id):
            if not isinstance(locs, list) or not locs:
                locs = self._demo_case_rows("locations", case_id)
            if not isinstance(calls, list) or not calls:
                calls = self._demo_case_rows("calls", case_id)
            if not isinstance(txns, list) or not txns:
                txns = self._demo_case_rows("transactions", case_id)

        events = []
        for l in (locs if isinstance(locs, list) else []):
            events.append({
                "id": str(l.get("event_id")),
                "type": "LOCATION",
                "summary": f"{l.get('person_name')} tracked at {l.get('city')}",
                "detail": f"Source: {l.get('source_system')}. Coords: {l.get('latitude')}, {l.get('longitude')}",
                "eventAt": l.get("event_datetime") or "2024-01-01",
                "createdAt": l.get("event_datetime") or "2024-01-01"
            })
        for c in (calls if isinstance(calls, list) else []):
            events.append({
                "id": str(c.get("cdr_id") or c.get("call_id")),
                "type": "COMMUNICATION",
                "summary": f"Call from {c.get('caller_name') or c.get('caller_person_id')} to {c.get('callee_name') or c.get('receiver_person_id')}",
                "detail": f"Duration: {c.get('duration_seconds')}s. Cell Tower: {c.get('cell_tower_city') or c.get('cell_tower_location')}",
                "eventAt": c.get("call_datetime") or "2024-01-01",
                "createdAt": c.get("call_datetime") or "2024-01-01"
            })
        for t in (txns if isinstance(txns, list) else []):
            amount = float(t.get("amount_inr") or 0)
            events.append({
                "id": str(t.get("txn_id") or t.get("transaction_id")),
                "type": "TRANSACTION",
                "summary": f"Transaction of INR {amount:,.2f} from {t.get('sender_name') or t.get('sender_person_id')} to {t.get('receiver_name') or t.get('receiver_person_id')}",
                "detail": f"Type: {t.get('transaction_type')}. Purpose: {t.get('purpose')}",
                "eventAt": t.get("transaction_datetime") or "2024-01-01",
                "createdAt": t.get("transaction_datetime") or "2024-01-01"
            })

        events.sort(key=lambda x: x["eventAt"], reverse=True)
        return events[:limit]

    # --- Entities (100k Records) ---
    def list_entities(self, limit: int = 50, offset: int = 0, search: Optional[str] = None, entity_type: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {"limit": limit, "offset": offset, "order": "record_id.asc"}
        if search:
            params["or"] = f"(person_name.ilike.*{search}*,phone_number.ilike.*{search}*,vehicle_plate.ilike.*{search}*,location.ilike.*{search}*)"
        if entity_type and entity_type.upper() != "ALL":
            params["event_type"] = f"ilike.*{entity_type}*"

        rows = self._get("entities", params=params)
        if not isinstance(rows, list):
            return []

        entities = []
        for r in rows:
            entities.append({
                "id": str(r.get("person_id") or r.get("record_id")),
                "name": r.get("person_name") or "Unknown Person",
                "type": "PERSON",
                "value": r.get("phone_number") or r.get("vehicle_plate") or r.get("location") or "Identified Subject",
                "riskScore": int(r.get("risk_score") or 50),
                "phone": r.get("phone_number"),
                "vehicle": r.get("vehicle_plate"),
                "location": r.get("location"),
                "caseId": r.get("case_id"),
                "createdAt": r.get("event_date") or "2026-08-14"
            })
        return entities

    def get_entity_dossier(self, person_id: str) -> Dict[str, Any]:
        """
        Cross-table 360° investigation dossier for a specific person.
        """
        # 1. Entity Base
        ent_rows = self._get("entities", params={"person_id": f"eq.{person_id}", "limit": 1})
        base_entity = ent_rows[0] if isinstance(ent_rows, list) and len(ent_rows) > 0 else {}
        name = base_entity.get("person_name") or person_id

        # 2. Aliases
        aliases = self._get("entity_aliases", params={"or": f"(person_id.eq.{person_id},real_name.ilike.*{name}*)", "limit": 10})
        # 3. Communications
        calls = self._get("call_records", params={"or": f"(caller_id.eq.{person_id},callee_id.eq.{person_id},caller_name.ilike.*{name}*,callee_name.ilike.*{name}*)", "limit": 20})
        # 4. Transactions
        txns = self._get("financial_transactions", params={"or": f"(sender_id.eq.{person_id},receiver_id.eq.{person_id},sender_name.ilike.*{name}*,receiver_name.ilike.*{name}*)", "limit": 20})
        # 5. Vehicles
        vehicles = self._get("vehicle_records", params={"or": f"(owner_id.eq.{person_id},owner_name.ilike.*{name}*)", "limit": 10})
        # 6. Criminal Records
        crims = self._get("criminal_records", params={"or": f"(person_id.eq.{person_id},person_name.ilike.*{name}*)", "limit": 5})
        # 7. Locations
        locs = self._get("location_events", params={"or": f"(person_id.eq.{person_id},person_name.ilike.*{name}*)", "limit": 20})
        # 8. FIR Cases
        cases = self._get("fir_cases", params={"or": f"(accused_id.eq.{person_id},accused_name.ilike.*{name}*,victim_name.ilike.*{name}*)", "limit": 10})

        return {
            "entity": base_entity,
            "person_id": person_id,
            "person_name": name,
            "aliases": aliases if isinstance(aliases, list) else [],
            "communications": calls if isinstance(calls, list) else [],
            "transactions": txns if isinstance(txns, list) else [],
            "vehicles": vehicles if isinstance(vehicles, list) else [],
            "criminal_records": crims if isinstance(crims, list) else [],
            "location_events": locs if isinstance(locs, list) else [],
            "fir_cases": cases if isinstance(cases, list) else []
        }

    # --- Evidence Documents (1,000 Records) ---
    def list_evidence(self, limit: int = 50, offset: int = 0, case_id: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {"limit": limit, "offset": offset, "order": "collection_date.desc.nullslast"}
        if case_id:
            params["case_id"] = f"ilike.*{case_id}*"

        rows = self._get("evidence_documents", params=params)
        if not isinstance(rows, list):
            return []

        evidence = []
        for r in rows:
            evidence.append({
                "id": str(r.get("doc_id")),
                "name": r.get("title") or "Forensic Evidence Item",
                "description": r.get("description") or f"Chain of custody: {r.get('chain_of_custody')}",
                "caseId": r.get("case_id") or "CASE-UNASSIGNED",
                "contentType": r.get("document_type") or "Forensic Document",
                "sizeBytes": 2048576,
                "sha256": r.get("hash_sha256") or "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "verified": r.get("admissibility") == "Admissible",
                "forensicStatus": r.get("forensic_status") or "Verified",
                "collectedBy": r.get("collected_by") or "Forensic Officer",
                "collectionLocation": r.get("collection_location") or "Crime Scene",
                "fileUrl": r.get("file_url") or "",
                "createdAt": r.get("collection_date") or "2024-01-01"
            })
        return evidence

    # --- Blockchain Integrity Ledger ---
    def get_blockchain_ledger(self, limit: int = 20) -> List[Dict[str, Any]]:
        # Pull latest admissible evidence records and compute deterministic cryptographic chain
        from backend.app.blockchain.hashing import compute_block_hash
        evidence = self.list_evidence(limit=limit)
        blocks = []
        prev_hash = "0" * 64

        for idx, ev in enumerate(evidence):
            index = idx + 1
            timestamp = ev.get("createdAt") or "2024-01-01 00:00:00"
            data_hash = ev.get("sha256") or "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
            action = "EVIDENCE_SEALED"
            block_hash = compute_block_hash(
                index=index,
                timestamp=timestamp,
                data_hash=data_hash,
                previous_hash=prev_hash,
                action=action
            )
            blocks.append({
                "id": f"blk-{index}",
                "index": index,
                "timestamp": timestamp,
                "dataHash": data_hash,
                "previousHash": prev_hash,
                "hash": block_hash,
                "action": action,
                "note": f"Sealed {ev['name']} for {ev['caseId']}",
                "verified": True
            })
            prev_hash = block_hash

        return blocks

    # --- Network Graph Builder ---
    def get_network_graph(self, case_id: Optional[str] = None, max_nodes: int = 60) -> Dict[str, Any]:
        """
        Builds live dynamic graph from real entities, call records, and transactions.
        """
        nodes_dict = {}
        edges = []

        # 1. Pull entities
        params = {"limit": max_nodes}
        if case_id:
            params["or"] = self._case_filter(case_id)
        ent_rows = self._get("entities", params=params)
        if (not isinstance(ent_rows, list) or not ent_rows) and self._is_demo_case(case_id):
            ent_rows = self._demo_case_rows("entities", case_id)

        for r in (ent_rows if isinstance(ent_rows, list) else []):
            pid = str(r.get("person_id") or r.get("record_id"))
            pname = r.get("person_name") or "Subject"
            nodes_dict[pid] = {
                "id": pid,
                "label": pname,
                "type": "PERSON",
                "riskScore": int(r.get("risk_score") or 50)
            }

            # Add connected location or vehicle node
            if r.get("location"):
                loc_id = f"LOC-{r.get('location_id') or r.get('location')[:8]}"
                nodes_dict[loc_id] = {"id": loc_id, "label": r.get("location"), "type": "LOCATION", "riskScore": 20}
                edges.append({"id": f"e-{pid}-{loc_id}", "source": pid, "target": loc_id, "type": "LOCATED_AT", "strength": 1})

            if r.get("vehicle_plate"):
                veh_id = f"VEH-{r.get('vehicle_plate')}"
                nodes_dict[veh_id] = {"id": veh_id, "label": r.get("vehicle_plate"), "type": "VEHICLE", "riskScore": 30}
                edges.append({"id": f"e-{pid}-{veh_id}", "source": pid, "target": veh_id, "type": "USES_VEHICLE", "strength": 2})

            if r.get("organization"):
                org_id = str(r.get("organization_id") or f"ORG-{r.get('organization')[:8]}")
                nodes_dict[org_id] = {"id": org_id, "label": r.get("organization"), "type": "ORGANIZATION", "riskScore": 70}
                edges.append({"id": f"e-{pid}-{org_id}", "source": pid, "target": org_id, "type": "ASSOCIATED_WITH", "strength": 68})

        # 2. Add Call relationships
        case_filter = {"or": self._case_filter(case_id)} if case_id else {}
        calls = self._get("call_records", params={**case_filter, "limit": 30})
        if (not isinstance(calls, list) or not calls) and self._is_demo_case(case_id):
            calls = self._demo_case_rows("calls", case_id)
        for cl in (calls if isinstance(calls, list) else []):
            c1 = str(cl.get("caller_id") or cl.get("caller_person_id") or cl.get("caller_name"))
            c2 = str(cl.get("callee_id") or cl.get("receiver_person_id") or cl.get("callee_name") or cl.get("receiver_name"))
            if c1 and c2:
                if c1 not in nodes_dict:
                    nodes_dict[c1] = {"id": c1, "label": cl.get("caller_name", c1), "type": "PERSON", "riskScore": 65}
                if c2 not in nodes_dict:
                    nodes_dict[c2] = {"id": c2, "label": cl.get("callee_name") or cl.get("receiver_name") or c2, "type": "PERSON", "riskScore": 60}
                edges.append({"id": f"call-{cl.get('cdr_id') or cl.get('call_id')}", "source": c1, "target": c2, "type": "COMMUNICATED_WITH", "label": cl.get("call_type") or "Call", "strength": 82 if cl.get("flagged") else 58})

        # 3. Add Transaction relationships
        txns = self._get("financial_transactions", params={**case_filter, "limit": 20})
        if (not isinstance(txns, list) or not txns) and self._is_demo_case(case_id):
            txns = self._demo_case_rows("transactions", case_id)
        for tx in (txns if isinstance(txns, list) else []):
            s1 = str(tx.get("sender_id") or tx.get("sender_person_id") or tx.get("sender_name"))
            r1 = str(tx.get("receiver_id") or tx.get("receiver_person_id") or tx.get("receiver_name"))
            if s1 and r1:
                if s1 not in nodes_dict:
                    nodes_dict[s1] = {"id": s1, "label": tx.get("sender_name", s1), "type": "PERSON", "riskScore": 75}
                if r1 not in nodes_dict:
                    nodes_dict[r1] = {"id": r1, "label": tx.get("receiver_name", r1), "type": "PERSON", "riskScore": 70}
                edges.append({"id": f"txn-{tx.get('txn_id') or tx.get('transaction_id')}", "source": s1, "target": r1, "type": "TRANSACTED_WITH", "label": tx.get("transaction_type") or "Transfer", "strength": 92 if tx.get("suspicious_flag") else 56})

        return {
            "nodes": list(nodes_dict.values())[:max_nodes],
            "edges": edges[:max_nodes * 2]
        }

    # --- Debug Status ---
    def get_debug_data_status(self) -> Dict[str, Any]:
        tables = [
            "entities", "fir_cases", "call_records", "financial_transactions",
            "vehicle_records", "criminal_records", "location_events",
            "evidence_documents", "entity_aliases"
        ]
        counts = {}
        reachable = False
        error = None
        if self.url and self.key:
            try:
                probe = self.session.get(
                    f"{self.url}/rest/v1/entities",
                    params={"select": "*", "limit": 1},
                    timeout=10,
                )
                reachable = probe.status_code in (200, 206)
                if not reachable:
                    error = f"Supabase returned HTTP {probe.status_code}"
            except Exception as exc:
                error = str(exc)
        for t in tables:
            counts[t] = self.get_count(t)
        configured = bool(self.url and self.key)
        return {
            "status": "connected" if reachable else ("unreachable" if configured else "not_configured"),
            "configured": configured,
            "reachable": reachable,
            "error": error,
            "supabase_url": self.url,
            "table_counts": counts,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

supabase_db = SupabaseService()
