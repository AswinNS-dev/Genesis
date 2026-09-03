import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from collections import Counter
from backend.app.database.supabase_service import supabase_db

# Standard Indian State Coordinates (Centroids)
# Standard Indian State Coordinates (Centroids)
STATE_COORDINATES: Dict[str, Tuple[float, float]] = {
    "Andhra Pradesh": (15.9129, 79.7400),
    "Arunachal Pradesh": (28.2180, 94.7278),
    "Assam": (26.2006, 92.9376),
    "Bihar": (25.0961, 85.3131),
    "Chandigarh": (30.7333, 76.7794),
    "Chhattisgarh": (21.2787, 81.8661),
    "Delhi": (28.6139, 77.2090),
    "Delhi NCR": (28.6139, 77.2090),
    "Goa": (15.2993, 74.1240),
    "Gujarat": (22.2587, 71.1924),
    "Haryana": (29.0588, 76.0856),
    "Himachal Pradesh": (31.1048, 77.1734),
    "Jammu and Kashmir": (33.7782, 76.5762),
    "Jharkhand": (23.6102, 85.2799),
    "Karnataka": (15.3173, 75.7139),
    "Kerala": (10.8505, 76.2711),
    "Ladakh": (34.1526, 77.5771),
    "Madhya Pradesh": (22.9734, 78.6569),
    "Maharashtra": (19.7515, 75.7139),
    "Manipur": (24.6637, 93.9063),
    "Meghalaya": (25.4670, 91.3662),
    "Mizoram": (23.1645, 92.9376),
    "Nagaland": (26.1584, 94.5624),
    "Odisha": (20.9517, 85.0985),
    "Puducherry": (11.9416, 79.8083),
    "Punjab": (31.1471, 75.3412),
    "Rajasthan": (27.0238, 74.2179),
    "Sikkim": (27.5330, 88.5122),
    "Tamil Nadu": (11.1271, 78.6569),
    "Telangana": (18.1124, 79.0193),
    "Tripura": (23.9408, 91.9882),
    "Uttar Pradesh": (26.8467, 80.9462),
    "Uttarakhand": (30.0668, 79.0193),
    "West Bengal": (22.9868, 87.8550),
}

# Authoritative State to Key District Mapping (focused on primary investigation districts)
STATE_DISTRICT_MAP: Dict[str, List[str]] = {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Kurnool", "Nellore"],
    "Arunachal Pradesh": ["Itanagar", "Tawang", "Pasighat", "Ziro"],
    "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga"],
    "Chandigarh": ["Chandigarh"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba"],
    "Delhi": ["Central Delhi", "New Delhi", "North Delhi", "South Delhi", "West Delhi", "Dwarka"],
    "Delhi NCR": ["Delhi", "Noida", "Gurugram", "Ghaziabad", "Faridabad"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Rohtak"],
    "Himachal Pradesh": ["Shimla", "Dharamshala", "Mandi", "Solan", "Kullu"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar"],
    "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Kalaburagi"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur"],
    "Ladakh": ["Leh", "Kargil"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Navi Mumbai"],
    "Manipur": ["Imphal", "Churachandpur", "Thoubal"],
    "Meghalaya": ["Shillong", "Tura", "Jowai"],
    "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri"],
    "Puducherry": ["Puducherry", "Karaikal"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Udaipur", "Ajmer", "Bikaner"],
    "Sikkim": ["Gangtok", "Namchi", "Gyalshing"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode", "Vellore"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
    "Tripura": ["Agartala", "Udaipur", "Dharmanagar"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Noida", "Ghaziabad", "Prayagraj", "Meerut"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Haldwani", "Nainital"],
    "West Bengal": ["Kolkata", "Howrah", "Asansol", "Siliguri", "Durgapur", "Darjeeling"],
}

# Reverse mapping: District to State for fast, unambiguous resolution
DISTRICT_TO_STATE: Dict[str, str] = {
    dist: st
    for st, dist_list in STATE_DISTRICT_MAP.items()
    for dist in dist_list
}
DISTRICT_TO_STATE["Vizag"] = "Andhra Pradesh"
DISTRICT_TO_STATE["Trichy"] = "Tamil Nadu"

# Major District Centroids in India
DISTRICT_COORDINATES: Dict[str, Tuple[float, float]] = {
    # Tamil Nadu
    "Chennai": (13.0827, 80.2707),
    "Coimbatore": (11.0168, 76.9558),
    "Madurai": (9.9252, 78.1198),
    "Salem": (11.6643, 78.1460),
    "Tiruchirappalli": (10.7905, 78.7047),
    "Erode": (11.3410, 77.7172),
    "Tirunelveli": (8.7139, 77.7567),
    "Vellore": (12.9165, 79.1325),
    "Thoothukudi": (8.7642, 78.1348),
    "Dindigul": (10.3673, 77.9803),
    "Thanjavur": (10.7870, 79.1378),
    "Ranipet": (12.9272, 79.3323),
    "Virudhunagar": (9.5872, 77.9574),
    "Karur": (10.9601, 78.0766),
    "Nilgiris": (11.4916, 76.7337),
    "Krishnagiri": (12.5186, 78.2137),
    "Kanchipuram": (12.8342, 79.7036),
    "Tiruvallur": (13.1432, 79.9079),
    "Cuddalore": (11.7480, 79.7714),
    "Nagapattinam": (10.7672, 79.8449),
    "Kanniyakumari": (8.0883, 77.5385),
    "Nagercoil": (8.1833, 77.4119),

    # Maharashtra
    "Mumbai": (19.0760, 72.8777),
    "Pune": (18.5204, 73.8567),
    "Nagpur": (21.1458, 79.0882),
    "Nashik": (19.9975, 73.7898),
    "Thane": (19.2183, 72.9781),
    "Aurangabad": (19.8762, 75.3433),
    "Navi Mumbai": (19.0330, 73.0297),

    # Gujarat
    "Ahmedabad": (23.0225, 72.5714),
    "Surat": (21.1702, 72.8311),
    "Vadodara": (22.3072, 73.1812),
    "Rajkot": (22.3039, 70.8022),
    "Gandhinagar": (23.2156, 72.6369),
    "Bhavnagar": (21.7645, 72.1519),

    # Karnataka
    "Bengaluru": (12.9716, 77.5946),
    "Mysuru": (12.2958, 76.6394),
    "Mangaluru": (12.9141, 74.8560),
    "Hubballi": (15.3647, 75.1240),
    "Belagavi": (15.8497, 74.4977),
    "Kalaburagi": (17.3297, 76.8343),

    # Telangana & Andhra Pradesh
    "Hyderabad": (17.3850, 78.4867),
    "Warangal": (17.9689, 79.5941),
    "Nizamabad": (18.6725, 78.0941),
    "Karimnagar": (18.4386, 79.1288),
    "Khammam": (17.2473, 80.1514),
    "Visakhapatnam": (17.6868, 83.2185),
    "Vizag": (17.6868, 83.2185),
    "Vijayawada": (16.5062, 80.6480),
    "Guntur": (16.3067, 80.4365),
    "Tirupati": (13.6288, 79.4192),
    "Kurnool": (15.8281, 78.0373),
    "Nellore": (14.4426, 79.9865),

    # West Bengal
    "Kolkata": (22.5726, 88.3639),
    "Howrah": (22.5958, 88.2636),
    "Asansol": (23.6739, 86.9524),
    "Siliguri": (26.7271, 88.3953),
    "Durgapur": (23.5204, 87.3119),
    "Darjeeling": (27.0410, 88.2663),

    # Uttar Pradesh
    "Lucknow": (26.8467, 80.9462),
    "Kanpur": (26.4499, 80.3319),
    "Varanasi": (25.3176, 82.9739),
    "Agra": (27.1767, 78.0081),
    "Prayagraj": (25.4358, 81.8463),
    "Noida": (28.5355, 77.3910),
    "Ghaziabad": (28.6692, 77.4538),
    "Meerut": (28.9845, 77.7064),

    # Delhi
    "Delhi": (28.6139, 77.2090),
    "New Delhi": (28.6139, 77.2090),
    "Central Delhi": (28.6500, 77.2200),
    "North Delhi": (28.7100, 77.1600),
    "South Delhi": (28.5300, 77.2100),
    "West Delhi": (28.6400, 77.1200),
    "Dwarka": (28.5921, 77.0460),

    # Haryana & Punjab
    "Gurugram": (28.4595, 77.0266),
    "Faridabad": (28.4089, 77.3178),
    "Panipat": (29.3909, 76.9635),
    "Ambala": (30.3782, 76.7767),
    "Karnal": (29.6857, 76.9905),
    "Rohtak": (28.8955, 76.6066),
    "Chandigarh": (30.7333, 76.7794),
    "Ludhiana": (30.9010, 75.8573),
    "Amritsar": (31.6340, 74.8723),
    "Jalandhar": (31.3260, 75.5762),
    "Patiala": (30.3398, 76.3869),
    "Bathinda": (30.2110, 74.9455),
    "Mohali": (30.7046, 76.7179),

    # Bihar & Jharkhand
    "Patna": (25.5941, 85.1376),
    "Gaya": (24.7914, 85.0002),
    "Bhagalpur": (25.2425, 86.9842),
    "Muzaffarpur": (26.1209, 85.3647),
    "Darbhanga": (26.1542, 85.8918),
    "Ranchi": (23.3441, 85.3096),
    "Jamshedpur": (22.8046, 86.2029),
    "Dhanbad": (23.7957, 86.4304),
    "Bokaro": (23.6693, 86.1511),
    "Deoghar": (24.4826, 86.7001),

    # Madhya Pradesh & Chhattisgarh
    "Bhopal": (23.2599, 77.4126),
    "Indore": (22.7196, 75.8577),
    "Gwalior": (26.2183, 78.1828),
    "Jabalpur": (23.1815, 79.9864),
    "Ujjain": (23.1765, 75.7885),
    "Sagar": (23.8388, 78.7378),
    "Raipur": (21.2514, 81.6296),
    "Bhilai": (21.2167, 81.4333),
    "Bilaspur": (22.0797, 82.1409),
    "Korba": (22.3595, 82.7501),

    # Rajasthan
    "Jaipur": (26.9124, 75.7873),
    "Jodhpur": (26.2389, 73.0243),
    "Udaipur": (24.5854, 73.7125),
    "Kota": (25.2138, 75.8648),
    "Ajmer": (26.4499, 74.6399),
    "Bikaner": (28.0229, 73.3119),

    # Kerala
    "Thiruvananthapuram": (8.5241, 76.9366),
    "Kochi": (9.9312, 76.2673),
    "Kozhikode": (11.2588, 75.7804),
    "Thrissur": (10.5276, 76.2144),
    "Kollam": (8.8932, 76.6141),
    "Kannur": (11.8745, 75.3704),

    # Odisha
    "Bhubaneswar": (20.2961, 85.8245),
    "Cuttack": (20.4625, 85.8828),
    "Rourkela": (22.2604, 84.8536),
    "Berhampur": (19.3150, 84.7941),
    "Sambalpur": (21.4669, 83.9812),
    "Puri": (19.8135, 85.8312),

    # Goa & Puducherry
    "Panaji": (15.4909, 73.8278),
    "Margao": (15.2832, 73.9862),
    "Vasco da Gama": (15.3991, 73.8124),
    "Mapusa": (15.5937, 73.8142),
    "Puducherry": (11.9416, 79.8083),
    "Karaikal": (10.9254, 79.8380),

    # Uttarakhand & Himachal Pradesh
    "Dehradun": (30.3165, 78.0322),
    "Haridwar": (29.9457, 78.1642),
    "Rishikesh": (30.0869, 78.2676),
    "Haldwani": (29.2183, 79.5130),
    "Nainital": (29.3919, 79.4542),
    "Shimla": (31.1048, 77.1734),
    "Dharamshala": (32.2190, 76.3234),
    "Mandi": (31.7087, 76.9320),
    "Solan": (30.9045, 77.0967),
    "Kullu": (31.9579, 77.1095),

    # Jammu, Kashmir & Ladakh
    "Srinagar": (34.0837, 74.7973),
    "Jammu": (32.7266, 74.8570),
    "Anantnag": (33.7311, 75.1522),
    "Baramulla": (34.2090, 74.3436),
    "Leh": (34.1526, 77.5771),
    "Kargil": (34.5539, 76.1349),

    # North-Eastern States
    "Guwahati": (26.1445, 91.7362),
    "Dibrugarh": (27.4728, 94.9120),
    "Silchar": (24.8333, 92.7789),
    "Jorhat": (26.7509, 94.2037),
    "Tezpur": (26.6528, 92.7926),
    "Itanagar": (27.0844, 93.6053),
    "Tawang": (27.5861, 91.8594),
    "Pasighat": (28.0665, 95.3267),
    "Ziro": (27.5950, 93.8340),
    "Shillong": (25.5788, 91.8933),
    "Tura": (25.5144, 90.2030),
    "Jowai": (25.4452, 92.2039),
    "Imphal": (24.8170, 93.9368),
    "Churachandpur": (24.3324, 93.6738),
    "Thoubal": (24.6366, 93.9999),
    "Aizawl": (23.7271, 92.7176),
    "Lunglei": (22.8671, 92.7656),
    "Champhai": (23.4746, 93.3274),
    "Kohima": (25.6751, 94.1086),
    "Dimapur": (25.9068, 93.7273),
    "Mokokchung": (26.3255, 94.5262),
    "Agartala": (23.8315, 91.2868),
    "Udaipur (Tripura)": (23.5333, 91.4833),
    "Dharmanagar": (24.3833, 92.1667),
    "Gangtok": (27.3389, 88.6065),
    "Namchi": (27.1666, 88.3500),
    "Gyalshing": (27.2833, 88.2500),
}


class LocationAnalysisService:
    """
    Dedicated enterprise service for Investigation Hotspot & Location Analysis.
    Supports hierarchical drill-down, multi-category filtering, temporal windows,
    incident-date comparative windows, transparent activity scoring, and data quality metrics.
    """

    def get_geographic_hierarchy(self) -> Dict[str, Any]:
        """
        Extracts available states, districts, and local areas from live investigation records
        and authoritative administrative mappings (only legitimate districts per state).
        """
        sample_locs = supabase_db._get("location_events", params={"select": "state,city,location_detail", "limit": 2000})

        # Curated standard area hotspots for top districts
        standard_areas: Dict[str, List[str]] = {
            "Chennai": ["T. Nagar", "Anna Nagar", "Adyar", "Velachery", "Guindy", "Mylapore", "Tambaram", "Ambattur"],
            "Coimbatore": ["Gandhipuram", "RS Puram", "Peelamedu", "Singanallur", "Saravanampatti", "Ukkadam", "Saibaba Colony"],
            "Madurai": ["Goripalayam", "Mattuthavani", "Anna Nagar", "Simmakkal", "KK Nagar"],
            "Salem": ["Fairlands", "Hasthampatti", "Shevapet", "Suramangalam", "Ammapet"],
            "Tiruchirappalli": ["Thillai Nagar", "Cantonment", "Srirangam", "KK Nagar", "Ponmalai"],
            "Mumbai": ["Bandra West", "Andheri East", "Colaba", "Dadar", "Kurla", "BKC Complex", "Borivali"],
            "Pune": ["Kothrud", "Shivajinagar", "Hinjewadi IT Park", "Viman Nagar", "Kalyani Nagar"],
            "Nagpur": ["Sitabuldi", "Dharampeth", "Civil Lines", "Wardhaman Nagar", "Sadat"],
            "Bengaluru": ["Koramangala", "Indiranagar", "Whitefield", "Electronic City", "Jayanagar", "HSR Layout", "MG Road"],
            "Hyderabad": ["Hitec City", "Banjara Hills", "Jubilee Hills", "Gachibowli", "Secunderabad", "Charminar"],
            "Kolkata": ["Salt Lake", "Park Street", "New Town", "Howrah Bridge", "Ballygunge", "Alipore"],
            "Lucknow": ["Hazratganj", "Gomti Nagar", "Alambagh", "Indira Nagar", "Aminabad"],
            "Ahmedabad": ["SG Highway", "Navrangpura", "Satellite", "Maninagar", "Bodakdev", "Ashram Road"],
            "Delhi": ["Connaught Place", "Dwarka Sector 10", "Rohini Sector 7", "Hauz Khas", "Saket", "Karol Bagh"],
            "New Delhi": ["Connaught Place", "Chanakyapuri", "Lodhi Colony", "Barakhamba"],
            "Visakhapatnam": ["MVP Colony", "Siripuram", "Gajuwaka", "Beach Road", "Dwaraka Nagar"],
            "Jaipur": ["Malviya Nagar", "Vaishali Nagar", "C-Scheme", "Mansarovar", "Raja Park"],
            "Bhopal": ["MP Nagar", "Arera Colony", "New Market", "Kolar Road", "Bairagarh"],
            "Patna": ["Kankarbagh", "Boring Road", "Frazer Road", "Bailey Road", "Danapur"],
            "Kochi": ["MG Road", "Marine Drive", "Kakkanad InfoPark", "Edappally", "Fort Kochi"]
        }

        areas_by_district: Dict[str, set] = {d: set(areas) for d, areas in standard_areas.items()}

        for r in (sample_locs if isinstance(sample_locs, list) else []):
            ct = (r.get("city") or "").strip()
            dt = (r.get("location_detail") or "").strip()
            if ct and dt:
                clean_area = dt.split("\n")[0].split(",")[-1].strip()
                if len(clean_area) > 2 and len(clean_area) < 30:
                    areas_by_district.setdefault(ct, set()).add(clean_area)

        formatted_states = []
        for s in sorted(list(STATE_DISTRICT_MAP.keys())):
            coords = STATE_COORDINATES.get(s, (22.5937, 78.9629))
            districts = STATE_DISTRICT_MAP[s]
            formatted_states.append({
                "name": s,
                "latitude": coords[0],
                "longitude": coords[1],
                "districtCount": len(districts),
                "districts": districts
            })

        all_districts = sorted(list(DISTRICT_TO_STATE.keys()))

        return {
            "country": "India",
            "center": [22.5937, 78.9629],
            "zoom": 5,
            "states": formatted_states,
            "allDistricts": all_districts,
            "areasByDistrict": {d: sorted(list(areas))[:15] for d, areas in areas_by_district.items()}
        }

    def get_cases_with_incidents(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieves cases with incident dates for investigator comparison workflows.
        """
        cases = supabase_db._get(
            "fir_cases",
            params={
                "select": "fir_id,case_number,crime_type,date_of_incident,jurisdiction_state,jurisdiction_city,status,risk_score",
                "order": "date_of_incident.desc.nullslast",
                "limit": limit
            }
        )
        results = []
        for c in (cases if isinstance(cases, list) else []):
            inc_date = c.get("date_of_incident")
            results.append({
                "id": c.get("fir_id"),
                "caseNumber": c.get("case_number") or c.get("fir_id"),
                "title": f"{c.get('fir_id')} — {c.get('crime_type') or 'General Docket'}",
                "crimeType": c.get("crime_type") or "General Offense",
                "incidentDate": inc_date,
                "hasIncidentDate": bool(inc_date),
                "jurisdiction": f"{c.get('jurisdiction_city', '')}, {c.get('jurisdiction_state', '')}".strip(", "),
                "status": c.get("status") or "Active"
            })
        return results

    def get_hotspots(
        self,
        level: str = "india",              # "india" | "state" | "district" | "area"
        state: Optional[str] = None,
        district: Optional[str] = None,
        area: Optional[str] = None,
        category: str = "ALL",              # "ALL" | "COMMUNICATION" | "FINANCIAL" | "VEHICLE" | "CASE" | "LOCATION"
        time_range: str = "all",           # "7d" | "30d" | "6m" | "custom" | "all"
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        case_id: Optional[str] = None,
        incident_window: int = 3,           # +/- 1, 3, 7 days around incident date
    ) -> Dict[str, Any]:
        """
        Executes bounded, server-side aggregated hotspot queries matching the investigator's
        geographic level, category, and temporal criteria.
        """
        if district and district.upper() not in ["", "ALL"] and level == "india":
            level = "district"

        start_dt, end_dt = self._resolve_time_boundaries(time_range, date_from, date_to)

        incident_meta: Dict[str, Any] = {
            "has_incident_date": False,
            "incident_date": None,
            "window_days": incident_window,
            "window_start": None,
            "window_end": None,
            "case_id": case_id,
            "message": None
        }

        if case_id:
            c_info = self._get_case_incident_meta(case_id, incident_window)
            incident_meta.update(c_info)
            if incident_meta["has_incident_date"] and incident_meta.get("window_start") and incident_meta.get("window_end"):
                start_dt = incident_meta["window_start"]
                end_dt = incident_meta["window_end"]

        records = self._query_records_by_category(
            category=category,
            state=state,
            district=district,
            start_dt=start_dt,
            end_dt=end_dt,
            case_id=case_id
        )

        hotspots, clusters, center, zoom = self._aggregate_by_hierarchy_level(
            level=level,
            state=state,
            district=district,
            area=area,
            records=records
        )

        data_quality = self._calculate_data_quality(
            records=records,
            category=category,
            level=level,
            state=state,
            district=district
        )

        return {
            "level": level,
            "filters": {
                "state": state,
                "district": district,
                "area": area,
                "category": category,
                "timeRange": time_range,
                "dateFrom": start_dt.isoformat() if start_dt else None,
                "dateTo": end_dt.isoformat() if end_dt else None,
                "caseId": case_id,
                "incidentWindow": incident_window
            },
            "incidentComparison": incident_meta,
            "center": center,
            "zoom": zoom,
            "hotspots": hotspots,
            "clusters": clusters,
            "dataQuality": data_quality,
            "explanation": (
                "Activity score is calculated transparently from investigation event density (70%), "
                "multi-stream intelligence diversity (20%), and verified anomaly/risk flags (10%). "
                "Values indicate activity concentration based on available investigation data."
            )
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Internal Query & Aggregation Helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _resolve_time_boundaries(
        self,
        time_range: str,
        date_from: Optional[str],
        date_to: Optional[str]
    ) -> Tuple[Optional[datetime], Optional[datetime]]:
        now = datetime.now()
        if time_range == "7d":
            return now - timedelta(days=7), now
        elif time_range == "30d":
            return now - timedelta(days=30), now
        elif time_range == "6m":
            return now - timedelta(days=180), now
        elif time_range == "custom" and (date_from or date_to):
            d_start = datetime.fromisoformat(date_from.replace("Z", "")) if date_from else None
            d_end = datetime.fromisoformat(date_to.replace("Z", "")) if date_to else None
            return d_start, d_end
        return None, None

    def _get_case_incident_meta(self, case_id: str, window_days: int) -> Dict[str, Any]:
        rows = supabase_db._get("fir_cases", params={"or": f"(fir_id.eq.{case_id},case_number.eq.{case_id})", "limit": 1})
        if not rows or not isinstance(rows, list):
            return {
                "has_incident_date": False,
                "message": f"Case record '{case_id}' not found."
            }

        c = rows[0]
        inc_date_str = c.get("date_of_incident")
        if not inc_date_str:
            return {
                "has_incident_date": False,
                "message": "No incident date is available for this case."
            }

        try:
            inc_dt = datetime.fromisoformat(inc_date_str.split("T")[0])
            w_start = inc_dt - timedelta(days=window_days)
            w_end = inc_dt + timedelta(days=window_days, hours=23, minutes=59)
            return {
                "has_incident_date": True,
                "incident_date": inc_date_str,
                "case_number": c.get("case_number"),
                "crime_type": c.get("crime_type"),
                "window_start": w_start,
                "window_end": w_end,
                "message": f"Analyzing activity window {w_start.strftime('%d %b %Y')} to {w_end.strftime('%d %b %Y')} (±{window_days} days around incident)."
            }
        except Exception as e:
            return {
                "has_incident_date": False,
                "message": f"Invalid incident date format: {e}"
            }

    def _query_records_by_category(
        self,
        category: str,
        state: Optional[str],
        district: Optional[str],
        start_dt: Optional[datetime],
        end_dt: Optional[datetime],
        case_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        records: List[Dict[str, Any]] = []

        # 1. Location Events (Toll, Hotel, CCTV, e-Challan, Check-in)
        if category in ["ALL", "LOCATION", "VEHICLE"]:
            params: Dict[str, Any] = {"limit": 600, "order": "event_datetime.desc.nullslast"}
            if state and state.upper() != "ALL":
                params["state"] = f"eq.{state}"
            if district and district.upper() != "ALL":
                params["city"] = f"eq.{district}"
            if case_id:
                params["case_id"] = f"eq.{case_id}"

            loc_rows = supabase_db._get("location_events", params=params)
            for r in (loc_rows if isinstance(loc_rows, list) else []):
                dt_str = r.get("event_datetime")
                if not self._is_within_time(dt_str, start_dt, end_dt):
                    continue

                records.append({
                    "id": str(r.get("event_id")),
                    "category": "LOCATION",
                    "source": r.get("source_system") or "Location Registry",
                    "eventType": r.get("event_type") or "Location Scan",
                    "subject": r.get("person_name") or "Subject",
                    "state": r.get("state"),
                    "district": r.get("city"),
                    "locationDetail": r.get("location_detail"),
                    "latitude": float(r.get("latitude") or 0),
                    "longitude": float(r.get("longitude") or 0),
                    "confidence": float(r.get("confidence_score") or 0.7),
                    "timestamp": dt_str,
                    "flagged": bool(r.get("flagged")),
                    "caseId": r.get("case_id")
                })

        # 2. Call Records (Communication Activity)
        if category in ["ALL", "COMMUNICATION"]:
            params = {"limit": 500, "order": "call_datetime.desc.nullslast"}
            if district and district.upper() != "ALL":
                params["cell_tower_city"] = f"eq.{district}"
            if case_id:
                params["case_id"] = f"eq.{case_id}"

            call_rows = supabase_db._get("call_records", params=params)
            for c in (call_rows if isinstance(call_rows, list) else []):
                dt_str = c.get("call_datetime")
                if not self._is_within_time(dt_str, start_dt, end_dt):
                    continue

                lat = float(c.get("latitude") or 0)
                lon = float(c.get("longitude") or 0)
                c_dist = c.get("cell_tower_city") or (district if district and district.upper() != "ALL" else "Chennai")
                c_state = self._infer_state_for_city(c_dist)

                # When filtering by state, keep only matching calls
                if state and state.upper() != "ALL" and c_state.lower() != state.lower():
                    continue

                records.append({
                    "id": str(c.get("cdr_id")),
                    "category": "COMMUNICATION",
                    "source": f"Cell Tower ({c.get('operator') or 'Telecom'})",
                    "eventType": f"{c.get('call_type') or 'Call'} ({c.get('duration_seconds', 0)}s)",
                    "subject": f"{c.get('caller_name', 'Caller')} → {c.get('callee_name', 'Target')}",
                    "state": c_state,
                    "district": c_dist,
                    "locationDetail": f"Tower {c.get('cell_tower_id', '')} ({c_dist})",
                    "latitude": lat,
                    "longitude": lon,
                    "confidence": 0.85,
                    "timestamp": dt_str,
                    "flagged": bool(c.get("flagged")),
                    "caseId": c.get("case_id")
                })

        # 3. FIR Cases Activity
        if category in ["ALL", "CASE"]:
            params = {"limit": 300, "order": "date_of_incident.desc.nullslast"}
            if state and state.upper() != "ALL":
                params["jurisdiction_state"] = f"eq.{state}"
            if district and district.upper() != "ALL":
                params["jurisdiction_city"] = f"eq.{district}"
            if case_id:
                params["fir_id"] = f"eq.{case_id}"

            fir_rows = supabase_db._get("fir_cases", params=params)
            for f in (fir_rows if isinstance(fir_rows, list) else []):
                dt_str = f.get("date_of_incident") or f.get("date_of_filing")
                if not self._is_within_time(dt_str, start_dt, end_dt):
                    continue

                f_dist = f.get("jurisdiction_city") or "Central Command"
                coords = DISTRICT_COORDINATES.get(f_dist, (22.5937, 78.9629))

                records.append({
                    "id": str(f.get("fir_id")),
                    "category": "CASE",
                    "source": "State Police FIR Docket",
                    "eventType": f.get("crime_type") or "Reported Offense",
                    "subject": f"Accused: {f.get('accused_name', 'Under Investigation')}",
                    "state": f.get("jurisdiction_state"),
                    "district": f_dist,
                    "locationDetail": f.get("police_station") or f"Jurisdiction {f_dist}",
                    "latitude": coords[0],
                    "longitude": coords[1],
                    "confidence": 0.95,
                    "timestamp": dt_str,
                    "flagged": float(f.get("risk_score") or 0) > 7.0,
                    "caseId": f.get("fir_id")
                })

        # 4. Vehicle Activity
        if category in ["ALL", "VEHICLE"]:
            params = {"limit": 300}
            if state and state.upper() != "ALL":
                params["registration_state"] = f"eq.{state}"
            if district and district.upper() != "ALL":
                params["registration_city"] = f"eq.{district}"
            if case_id:
                params["case_id"] = f"eq.{case_id}"

            veh_rows = supabase_db._get("vehicle_records", params=params)
            for v in (veh_rows if isinstance(veh_rows, list) else []):
                dt_str = v.get("registration_date")
                if not self._is_within_time(dt_str, start_dt, end_dt):
                    continue

                v_dist = v.get("registration_city") or "Urban RTO"
                coords = DISTRICT_COORDINATES.get(v_dist, (22.5937, 78.9629))

                records.append({
                    "id": str(v.get("vehicle_id")),
                    "category": "VEHICLE",
                    "source": "Transport Registry & ANPR",
                    "eventType": f"Vehicle: {v.get('make')} {v.get('model')} ({v.get('registration_number')})",
                    "subject": f"Owner: {v.get('owner_name', 'Registered Operator')}",
                    "state": v.get("registration_state"),
                    "district": v_dist,
                    "locationDetail": f"RTO Registration Point ({v_dist})",
                    "latitude": coords[0],
                    "longitude": coords[1],
                    "confidence": 0.90,
                    "timestamp": dt_str,
                    "flagged": bool(v.get("stolen_flag") or v.get("blacklisted")),
                    "caseId": v.get("case_id")
                })

        # 5. Financial Activity
        if category in ["ALL", "FINANCIAL"]:
            params = {"limit": 300, "order": "transaction_datetime.desc.nullslast"}
            if case_id:
                params["case_id"] = f"eq.{case_id}"

            txn_rows = supabase_db._get("financial_transactions", params=params)
            for t in (txn_rows if isinstance(txn_rows, list) else []):
                dt_str = t.get("transaction_datetime")
                if not self._is_within_time(dt_str, start_dt, end_dt):
                    continue

                if district and district.upper() != "ALL":
                    target_dist = district
                    t_state = state or self._infer_state_for_city(target_dist)
                elif state and state.upper() != "ALL":
                    t_state = state
                    key_dists = STATE_DISTRICT_MAP.get(t_state, ["Chennai"])
                    target_dist = key_dists[0] if key_dists else "Chennai"
                else:
                    target_dist = "Mumbai"
                    t_state = "Maharashtra"

                coords = DISTRICT_COORDINATES.get(target_dist, (19.0760, 72.8777))

                records.append({
                    "id": str(t.get("txn_id")),
                    "category": "FINANCIAL",
                    "source": f"{t.get('sender_bank', 'Bank')} Clearing Core",
                    "eventType": f"{t.get('transaction_type', 'Transfer')} (INR {float(t.get('amount_inr', 0)):,.0f})",
                    "subject": f"{t.get('sender_name', 'Sender')} → {t.get('receiver_name', 'Beneficiary')}",
                    "state": t_state,
                    "district": target_dist,
                    "locationDetail": f"Bank Branch ({t.get('sender_bank', 'Core Banking')})",
                    "latitude": coords[0],
                    "longitude": coords[1],
                    "confidence": 0.88,
                    "timestamp": dt_str,
                    "flagged": bool(t.get("suspicious_flag") or t.get("aml_alert")),
                    "caseId": t.get("case_id")
                })

        return records

    def _is_within_time(self, dt_str: Optional[str], start_dt: Optional[datetime], end_dt: Optional[datetime]) -> bool:
        if not dt_str:
            return True
        if not start_dt and not end_dt:
            return True
        try:
            clean_str = dt_str.replace("Z", "").split(".")[0]
            parsed = datetime.fromisoformat(clean_str)
            if start_dt and parsed < start_dt:
                return False
            if end_dt and parsed > end_dt:
                return False
            return True
        except Exception:
            return True

    def _infer_state_for_city(self, city: str) -> str:
        if not city:
            return "Tamil Nadu"
        # Direct lookup
        if city in DISTRICT_TO_STATE:
            return DISTRICT_TO_STATE[city]
        city_lower = city.lower().strip()
        for d_name, st in DISTRICT_TO_STATE.items():
            if d_name.lower() in city_lower or city_lower in d_name.lower():
                return st
        return "Tamil Nadu"

    def _aggregate_by_hierarchy_level(
        self,
        level: str,
        state: Optional[str],
        district: Optional[str],
        area: Optional[str],
        records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[float], int]:
        hotspots: List[Dict[str, Any]] = []
        clusters: List[Dict[str, Any]] = []

        center = [22.5937, 78.9629]
        zoom = 5

        valid_records = [r for r in records if r.get("latitude") and r.get("longitude")]

        if level == "india":
            state_groups: Dict[str, List[Dict[str, Any]]] = {}
            for r in valid_records:
                st = r.get("state") or self._infer_state_for_city(r.get("district") or "")
                if st in STATE_COORDINATES:
                    state_groups.setdefault(st, []).append(r)

            max_state_count = max([len(v) for v in state_groups.values()] or [1])

            for st_name, st_records in state_groups.items():
                cnt = len(st_records)
                coords = STATE_COORDINATES.get(st_name, (22.5937, 78.9629))

                sources = set(r["source"] for r in st_records)
                flagged_count = sum(1 for r in st_records if r.get("flagged"))
                score = self._compute_activity_score(cnt, max_state_count, len(sources), flagged_count)

                cluster_node = {
                    "id": f"state-{st_name.lower().replace(' ', '-')}",
                    "level": "state",
                    "title": st_name,
                    "subtitle": f"{cnt} Investigation Events across {len(sources)} Sources",
                    "state": st_name,
                    "district": None,
                    "area": None,
                    "latitude": coords[0],
                    "longitude": coords[1],
                    "activityCount": cnt,
                    "activityScore": score,
                    "intensity": round(cnt / max_state_count, 2),
                    "sourceCount": len(sources),
                    "flaggedCount": flagged_count,
                    "drillDownTarget": {"level": "state", "state": st_name}
                }
                clusters.append(cluster_node)
                hotspots.append({
                    "latitude": coords[0],
                    "longitude": coords[1],
                    "intensity": round(min(1.0, cnt / max_state_count), 2),
                    "weight": cnt,
                    "label": st_name
                })

            clusters.sort(key=lambda x: x["activityCount"], reverse=True)
            return hotspots, clusters, center, zoom

        elif level == "state":
            target_state = state or "Tamil Nadu"
            st_coords = STATE_COORDINATES.get(target_state, (11.1271, 78.6569))
            center = [st_coords[0], st_coords[1]]
            zoom = 7

            allowed_districts = STATE_DISTRICT_MAP.get(target_state, ["Chennai", "Coimbatore"])
            allowed_set = set(allowed_districts)

            district_groups: Dict[str, List[Dict[str, Any]]] = {d: [] for d in allowed_districts}

            for r in valid_records:
                r_state = r.get("state") or self._infer_state_for_city(r.get("district") or "")
                if r_state.lower() != target_state.lower():
                    continue

                dst = r.get("district")
                if dst in allowed_set:
                    district_groups[dst].append(r)
                elif allowed_districts:
                    # Allocate to first district or closest
                    district_groups[allowed_districts[0]].append(r)

            active_counts = [len(v) for v in district_groups.values() if len(v) > 0]
            max_dist_count = max(active_counts) if active_counts else 1

            for dst_name, dst_records in district_groups.items():
                cnt = len(dst_records)
                coords = DISTRICT_COORDINATES.get(dst_name, st_coords)

                sources = set(r["source"] for r in dst_records) if cnt > 0 else {"District State Command"}
                flagged_count = sum(1 for r in dst_records if r.get("flagged"))
                score = self._compute_activity_score(cnt, max_dist_count, len(sources), flagged_count)

                clusters.append({
                    "id": f"dist-{dst_name.lower().replace(' ', '-')}",
                    "level": "district",
                    "title": dst_name,
                    "subtitle": f"{cnt} Events • {target_state}" if cnt > 0 else f"Monitored District • {target_state}",
                    "state": target_state,
                    "district": dst_name,
                    "area": None,
                    "latitude": coords[0],
                    "longitude": coords[1],
                    "activityCount": cnt,
                    "activityScore": score,
                    "intensity": round(cnt / max_dist_count, 2) if cnt > 0 else 0.1,
                    "sourceCount": len(sources),
                    "flaggedCount": flagged_count,
                    "drillDownTarget": {"level": "district", "state": target_state, "district": dst_name}
                })
                if cnt > 0:
                    hotspots.append({
                        "latitude": coords[0],
                        "longitude": coords[1],
                        "intensity": round(min(1.0, cnt / max_dist_count), 2),
                        "weight": cnt,
                        "label": f"{dst_name}, {target_state}"
                    })

            clusters.sort(key=lambda x: x["activityCount"], reverse=True)
            return hotspots, clusters, center, zoom

        elif level in ["district", "area"]:
            target_dist = district or "Coimbatore"
            target_state = state or self._infer_state_for_city(target_dist)
            dist_coords = DISTRICT_COORDINATES.get(target_dist, (11.0168, 76.9558))
            center = [dist_coords[0], dist_coords[1]]
            zoom = 11

            area_groups: Dict[str, List[Dict[str, Any]]] = {}
            for r in valid_records:
                raw_loc = r.get("locationDetail") or f"{round(r['latitude'], 3)}, {round(r['longitude'], 3)}"
                clean_loc = raw_loc.split("\n")[0].split(",")[-1].strip() or "Local Sector"
                area_groups.setdefault(clean_loc, []).append(r)

            max_area_count = max([len(v) for v in area_groups.values()] or [1])

            for loc_name, loc_records in area_groups.items():
                cnt = len(loc_records)
                avg_lat = sum(r["latitude"] for r in loc_records) / cnt
                avg_lon = sum(r["longitude"] for r in loc_records) / cnt
                sources = set(r["source"] for r in loc_records)
                flagged_count = sum(1 for r in loc_records if r.get("flagged"))
                score = self._compute_activity_score(cnt, max_area_count, len(sources), flagged_count)

                clusters.append({
                    "id": f"area-{loc_name.lower().replace(' ', '-')[:20]}",
                    "level": "area",
                    "title": loc_name,
                    "subtitle": f"{cnt} Observations • {target_dist}",
                    "state": target_state,
                    "district": target_dist,
                    "area": loc_name,
                    "latitude": avg_lat,
                    "longitude": avg_lon,
                    "activityCount": cnt,
                    "activityScore": score,
                    "intensity": round(cnt / max_area_count, 2),
                    "sourceCount": len(sources),
                    "flaggedCount": flagged_count,
                    "recentEvents": [
                        {
                            "type": r["eventType"],
                            "source": r["source"],
                            "subject": r["subject"],
                            "timestamp": r["timestamp"],
                            "flagged": r["flagged"]
                        } for r in loc_records[:4]
                    ],
                    "drillDownTarget": {"level": "area", "state": target_state, "district": target_dist, "area": loc_name}
                })

                hotspots.append({
                    "latitude": avg_lat,
                    "longitude": avg_lon,
                    "intensity": round(min(1.0, cnt / max_area_count), 2),
                    "weight": cnt,
                    "label": f"{loc_name} ({target_dist})"
                })

            clusters.sort(key=lambda x: x["activityCount"], reverse=True)
            return hotspots, clusters, center, zoom

        return hotspots, clusters, center, zoom

    def _compute_activity_score(
        self,
        count: int,
        max_count: int,
        source_count: int,
        flagged_count: int
    ) -> int:
        norm_count = (count / max(max_count, 1)) * 70
        source_diversity = (min(source_count, 5) / 5) * 20
        flagged_ratio = (flagged_count / max(count, 1)) * 10
        return int(min(100, round(norm_count + source_diversity + flagged_ratio)))

    def _calculate_data_quality(
        self,
        records: List[Dict[str, Any]],
        category: str,
        level: str,
        state: Optional[str],
        district: Optional[str]
    ) -> Dict[str, Any]:
        total_records = len(records)
        records_with_coords = sum(1 for r in records if r.get("latitude") and r.get("longitude") and r.get("latitude") != 0)
        missing_location = total_records - records_with_coords
        coverage_pct = round((records_with_coords / max(total_records, 1)) * 100, 1)

        sources = set(r.get("source") for r in records if r.get("source"))
        categories = set(r.get("category") for r in records if r.get("category"))

        complete_records = sum(1 for r in records if r.get("timestamp") and (r.get("locationDetail") or r.get("district")))
        completeness_pct = round((complete_records / max(total_records, 1)) * 100, 1)

        return {
            "recordsAnalyzed": total_records,
            "recordsWithLocation": records_with_coords,
            "recordsMissingLocation": missing_location,
            "missingLocationPct": round((missing_location / max(total_records, 1)) * 100, 1),
            "coveragePercent": coverage_pct,
            "sourceCount": len(sources),
            "sourcesList": sorted(list(sources)),
            "dataCompleteness": completeness_pct,
            "scope": {
                "level": level,
                "state": state or "National (India)",
                "district": district or "All Districts",
                "category": category
            },
            "attribution": "Activity concentration based on available investigation data."
        }


location_service = LocationAnalysisService()
