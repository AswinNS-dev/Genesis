#!/usr/bin/env python3
"""
CrimeIntel — Synthetic dataset generator (FICTION ONLY).

Generates 5 coordinated CSV datasets from a single shared synthetic entity
universe so that every foreign reference is internally consistent and the
graph / matching / pattern analytics produce meaningful results.

  synthetic_data/
  ├── master_intelligence.csv        100,000 rows
  ├── fir_cases.csv                   1,000 rows
  ├── call_records.csv               50,000 rows
  ├── financial_transactions.csv     30,000 rows
  ├── vehicle_records.csv            10,000 rows
  ├── entity_universe.json            shared stable ID universe (sidecar)
  └── relationships_summary.json      aggregated intentional relationships (sidecar)

Deterministic: seed=42 by default. All data is fictional.

Usage:
    py generate_synthetic_data.py [--seed 42] [--out synthetic_data]
"""

import argparse
import csv
import json
import os
import random

# ---------------------------------------------------------------------------
# Stable universe sizes
# ---------------------------------------------------------------------------
N_PERSONS = 2000
N_PHONES = 1000
N_VEHICLES = 700
N_LOCATIONS = 200
N_ORGANIZATIONS = 250
N_CASES = 20
N_ACCOUNTS = 2600

ROWS = {
    "master_intelligence.csv": 100_000,
    "fir_cases.csv": 1_000,
    "call_records.csv": 50_000,
    "financial_transactions.csv": 30_000,
    "vehicle_records.csv": 10_000,
}

# ---------------------------------------------------------------------------
# Fictional name / value pools (all invented, no real persons)
# ---------------------------------------------------------------------------
FIRST_M = [
    "Aditya", "Ajay", "Akshay", "Aman", "Amit", "Anand", "Anil", "Ankit",
    "Arjun", "Arun", "Ashok", "Bharat", "Chandan", "Chetan", "Deepak", "Dev",
    "Dhruv", "Dinesh", "Gaurav", "Gopal", "Harish", "Ishaan", "Jatin",
    "Karan", "Kartik", "Keshav", "Kiran", "Kunal", "Manoj", "Mohan", "Nikhil",
    "Nirav", "Prakash", "Pranav", "Punit", "Rahul", "Rajesh", "Rakesh",
    "Ramesh", "Ravi", "Rohit", "Sachin", "Sandeep", "Sanjay", "Santosh",
    "Saurabh", "Shashank", "Siddharth", "Sourav", "Suresh", "Varun", "Vikram",
    "Vivek", "Yash",
]
FIRST_F = [
    "Aarti", "Ananya", "Anjali", "Bhavna", "Divya", "Jaya", "Kavita",
    "Kirti", "Lakshmi", "Meera", "Megha", "Neha", "Nisha", "Pooja",
    "Poonam", "Priya", "Radhika", "Rekha", "Ritu", "Riya", "Shalini",
    "Shikha", "Shreya", "Simran", "Sneha", "Sonia", "Sunita", "Swati",
    "Tanvi", "Vandana", "Vaishnavi", "Zoya",
]
LAST = [
    "Agarwal", "Bansal", "Banerjee", "Bhat", "Bhattacharya", "Bose", "Chakraborty",
    "Chauhan", "Chavan", "Chettiar", "Chopra", "Das", "Desai", "Deshpande",
    "Deshmukh", "Dubey", "Dutta", "Eswaran", "Gaikwad", "Ganesan", "Ghosh",
    "Gupta", "Halder", "Hegde", "Iyer", "Joshi", "Kamath", "Kamble", "Kapoor",
    "Karthikeyan", "Khanna", "Krishnan", "Kulkarni", "Kulkarni", "Kumar",
    "Mahapatra", "Malhotra", "Mehta", "Menon", "Mishra", "Mukherjee",
    "Murugan", "Nair", "Naidu", "Natarajan", "Nayak", "Pandey", "Patel",
    "Patil", "Pawar", "Pillai", "Pradhan", "Prakash", "Rajan", "Rao",
    "Reddy", "Saha", "Sen", "Sharma", "Shetty", "Shinde", "Singh", "Subramanian",
    "Sundaram", "Swain", "Tiwari", "Tripathi", "Venkatesh", "Verma", "Yadav",
]
CITIES = [
    "Chennai", "Madurai", "Coimbatore", "Tiruchirappalli", "Salem",
    "Tirunelveli", "Vellore", "Erode", "Thanjavur", "Dindigul",
    "Nagapattinam", "Kanniyakumari", "Thoothukudi", "Karur", "Nagercoil",
    "Hosur", "Krishnagiri", "Cuddalore",
]
AREA_TYPES = [
    "Market Road", "Industrial Estate", "Technology Park", "Railway Station",
    "Bus Stand", "Warehouse Zone", "Port Area", "IT Park", "Residential Colony",
    "University Road", "Ring Road", "Bypass", "Old Town", "Grain Market",
    "Textile Market", "Auto Nagar", "SIPCOT", "Highway Junction",
]

ORG_PREFIX = [
    "Global", "National", "United", "Prime", "Apex", "Bluebird", "Silver",
    "Metro", "Eastern", "Union", "City", "Highland", "Crystal", "Regal",
    "Trustline", "Vantage", "Summit", "Pinnacle", "Orbit", "Nexus",
]
ORG_SECTOR = [
    "Logistics", "Trading", "Pharma", "Exports", "Textiles", "Infrastructure",
    "Freight", "Financial", "Agro", "Steel", "Energy", "Construction",
    "Automotive", "Digital", "Retail", "Distributors", "Importers", "Shipping",
]
ORG_SUFFIX = ["Pvt Ltd", "Group", "& Co", "Enterprises", "Ltd", "Udyog", "Traders", "Movers"]

CASE_CATEGORIES = [
    "FINANCIAL_FRAUD", "NARCOTICS", "HUMAN_TRAFFICKING", "CYBER_FRAUD",
    "VEHICLE_THEFT", "GOLD_SMUGGLING", "ORGANIZED_EXTORTION",
    "ILLEGAL_TRADE", "PHONE_FRAUD", "LOGISTICS_CRIME",
]

EVENT_TYPES = [
    "FINANCIAL_TXN", "CALL_LOG", "VEHICLE_MOVEMENT", "LOCATION_PING",
    "SIGHTING_REPORT", "REGISTRATION_RECORD",
]
EVENT_WEIGHTS = [0.20, 0.18, 0.18, 0.16, 0.14, 0.14]

INCIDENT_TYPES = [
    "FINANCIAL_FRAUD", "THEFT", "EXTORTION", "ASSAULT", "SMUGGLING",
    "FRAUDULENT_TRANSFER", "RECOVERY_NOTICE", "CROSS_BORDER_TRADE",
]
STATUS_VALUES = ["OPEN", "CLOSED", "UNDER_REVIEW"]
STATUS_WEIGHTS = [0.50, 0.30, 0.20]
SEVERITY_VALUES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
SEVERITY_WEIGHTS = [0.05, 0.30, 0.45, 0.20]

VEHICLE_TYPES = ["CAR", "BIKE", "VAN", "TRUCK"]
VEHICLE_MAKES = {
    "CAR": ["Maruti", "Hyundai", "Tata", "Mahindra", "Toyota", "Honda"],
    "BIKE": ["Bajaj", "TVS", "Hero", "Honda", "Yamaha"],
    "VAN": ["Maruti", "Tata", "Mahindra", "Force"],
    "TRUCK": ["Ashok Leyland", "Tata", "Eicher", "Bharat Benz"],
}
VEHICLE_MODELS = {
    "CAR": ["Swift", "Verna", "Nexon", "Thar", "Innova", "City"],
    "BIKE": ["Pulsar", "Apache", "Splendor", "Shine", "FZ"],
    "VAN": ["Eeco", "Winger", "Supro", "Trax"],
    "TRUCK": ["Truck 3520", "LP 1613", "Pro 3015", "3223"],
}
STATE_CODES = ["AP", "KA", "TN", "KL", "MH", "RJ", "UP", "TS", "GJ", "PB", "MP", "DL", "WB", "HR", "BR", "CG"]

BANKS = [
    ("BOK-SBI", "State Cooperative Bank of India"), ("BOK-HDFC", "Hind Central Bank"),
    ("BOK-ICICI", "Industrial Credit Bank"), ("BOK-BOA", "Bank of Adyar"),
    ("BOK-PNB", "Punjab National Combine"), ("BOK-KVB", "Karur Vysya & Co"),
    ("BOK-CBI", "Central Banking Institute"), ("BOK-IB", "Indus Bharat Bank"),
    ("BOK-YES", "Yash Bank"), ("BOK-AXIS", "Axis Commercial Bank"),
    ("BOK-CUB", "City Union Co-op"), ("BOK-IDFC", "Infrastructure Dev Bank"),
    ("BOK-INDUS", "IndusUnion Bank"), ("BOK-BOB", "Bank of Baroda Combine"),
    ("BOK-CAN", "Canara Federal Bank"), ("BOK-UCO", "United Commercial"),
    ("BOK-DBS", "DBS India"), ("BOK-FED", "Federal Reserve Bank (fictional)"),
    ("BOK-RBL", "Ratnakar Finance"), ("BOK-ESAF", "East South Agro Finance"),
]

NOTE_TEMPLATES = [
    "Repeated presence near restricted zone",
    "Frequent contact with flagged number",
    "No prior record - routine entry",
    "Cash pickup observed near market road",
    "Matches known alias spelling",
    "Vehicle observed at loading bay",
    "Inconsistent address on record",
    "High frequency evening calls",
    "Funds routed through multiple accounts",
    "Co-location with case-linked individual",
    "Documentation mismatch flagged",
    "Contact cluster under observation",
]

JURISDICTIONS = [
    "CEN-CRIME-UNIT-01", "CEN-CRIME-UNIT-02", "CEN-CRIME-UNIT-03",
    "NORTH-POL-SEC", "SOUTH-POL-SEC", "EAST-INV-DIV", "WEST-INV-DIV",
    "CYBER-CELL-01", "FIN-CRIME-CELL", "NARC-BUREAU-01",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def pad(n: int, w: int) -> str:
    return str(n).zfill(w)


def fmt_dt(dt: "datetime.datetime") -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")


class Universe:
    """Shared synthetic entity universe — all datasets reference only these IDs."""

    def __init__(self, seed: int):
        self.rng = random.Random(seed)
        self.build()

    # ---- construction ------------------------------------------------------
    def build(self):
        rng = self.rng

        # Persons
        persons = {}
        used_names = set()
        idx = 0
        while len(persons) < N_PERSONS:
            first_pool = FIRST_M if idx % 2 == 0 else FIRST_F
            name = f"{rng.choice(first_pool)} {rng.choice(LAST)}"
            if name in used_names:
                continue
            used_names.add(name)
            idx += 1
            pid = f"P-{pad(idx, 6)}"
            persons[pid] = {
                "id": pid,
                "name": name,
                "gender": "M" if idx % 2 == 0 else "F",
                "aliases": [],
                "phones": [],
                "vehicles": [],
                "org_id": None,
                "risk_base": rng.randint(10, 70),
            }
        self.persons = persons
        self.person_ids = list(persons)

        # Phones (+91 fictional numbers)
        phones = {}
        for i in range(1, N_PHONES + 1):
            phid = f"PH-{pad(i, 6)}"
            num = "+91-" + "".join(str(rng.randrange(0, 10)) for _ in range(10))
            phones[phid] = {"id": phid, "number": num, "owner": None, "owners": [], "users": []}
        self.phones = phones
        self.phone_ids = list(phones)

        # Vehicles (fictional registration numbers)
        vehicles = {}
        for i in range(1, N_VEHICLES + 1):
            vid = f"V-{pad(i, 6)}"
            plate = f"{rng.choice(STATE_CODES)}-{rng.randint(1, 99):02d}-" \
                    f"{rng.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{rng.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}-" \
                    f"{rng.randint(1000, 9999)}"
            vtype = rng.choices(VEHICLE_TYPES, weights=[0.45, 0.25, 0.2, 0.1])[0]
            vehicles[vid] = {
                "id": vid,
                "plate": plate,
                "type": vtype,
                "make": rng.choice(VEHICLE_MAKES[vtype]),
                "model": rng.choice(VEHICLE_MODELS[vtype]),
                "owners": [],
                "registered": "2026-08-01",
            }
        self.vehicles = vehicles
        self.vehicle_ids = list(vehicles)

        # Locations
        locations = {}
        for i in range(1, N_LOCATIONS + 1):
            lid = f"L-{pad(i, 6)}"
            name = f"{rng.choice(AREA_TYPES)}, {rng.choice(CITIES)}"
            locations[lid] = {"id": lid, "name": name, "type": rng.choice(AREA_TYPES).split(" ")[0]}
        self.locations = locations
        self.location_ids = list(locations)

        # Organizations
        orgs = {}
        for i in range(1, N_ORGANIZATIONS + 1):
            oid = f"O-{pad(i, 6)}"
            name = f"{rng.choice(ORG_PREFIX)} {rng.choice(ORG_SECTOR)} {rng.choice(ORG_SUFFIX)}"
            orgs[oid] = {"id": oid, "name": name, "type": "PRIVATE", "persons": []}
        self.organizations = orgs
        self.org_ids = list(orgs)

        # Cases
        cases = {}
        for i in range(1, N_CASES + 1):
            cid = f"CR-2026-{2000 + i}"
            cat = rng.choice(CASE_CATEGORIES)
            cases[cid] = {
                "id": cid,
                "title": f"Synthetic {cat.replace('_', ' ').title()} probe {pad(i, 2)}",
                "category": cat,
                "classification": rng.choices(["RESTRICTED", "SECRET", "OPEN"], weights=[0.5, 0.3, 0.2])[0],
                "status": rng.choices(["OPEN", "CLOSED", "ARCHIVED"], weights=[0.6, 0.3, 0.1])[0],
                "jurisdiction": rng.choice(JURISDICTIONS),
                "persons": [],
            }
        self.cases = cases
        self.case_ids = list(cases)

        # Accounts (person-led + org-led)
        self.accounts = {}
        for i in range(1, N_ACCOUNTS + 1):
            self.accounts[f"AC-{pad(i, 6)}"] = {
                "id": f"AC-{pad(i, 6)}",
                "bank": BANKS[i % len(BANKS)][0],
                "branch": f"BR-{rng.randint(1, 220):03d}",
            }
        self.account_ids = list(self.accounts)

        # ---- populate relationship graph over the universe ----
        self.link_persons_to_phones()
        self.link_persons_to_vehicles()
        self.link_persons_to_orgs()
        self.assign_cases()
        self.build_pattern_seeds()
        self.build_alias_clusters()

    def _assign(self, pool: list, n: int):
        return self.rng.sample(pool, n)

    def link_persons_to_phones(self):
        # 1000 phones for 2000 persons: each phone has ~2 primary owners.
        # A person gets their primary phone; a subset additionally receives a
        # second shared phone.
        phone_iter = [pid for pid in self.phone_ids]
        self.rng.shuffle(phone_iter)
        for i, pid in enumerate(self.person_ids):
            phid = phone_iter[i % N_PHONES]
            if phid not in self.persons[pid]["phones"]:
                self.persons[pid]["phones"].append(phid)
            if pid not in self.phones[phid]["owners"]:
                self.phones[phid]["owners"].append(pid)
            self.phones[phid]["owner"] = self.phones[phid]["owners"][0]
        # Shared usage: some phones are co-used by 1-2 additional persons.
        shared = self._assign(self.phone_ids, int(N_PHONES * 0.18))
        for phid in shared:
            extra = self._assign(self.person_ids, self.rng.choice([1, 2]))
            for p in extra:
                if phid not in self.persons[p]["phones"]:
                    self.persons[p]["phones"].append(phid)
                    self.phones[phid]["users"].append(p)

    def link_persons_to_vehicles(self):
        # ~60% of persons own (or are co-linked with) a vehicle.
        owners = self._assign(self.person_ids, int(N_PERSONS * 0.6))
        vidx = 0
        for p in owners:
            vid = self.vehicle_ids[vidx % N_VEHICLES]
            vidx += 1
            if vid not in self.persons[p]["vehicles"]:
                self.persons[p]["vehicles"].append(vid)
            if p not in self.vehicles[vid]["owners"]:
                self.vehicles[vid]["owners"].append(p)
        # Shared vehicles: ~60 vehicles get 1-2 additional users.
        shared = self._assign(self.vehicle_ids, 60)
        for vid in shared:
            extra = self._assign(self.person_ids, self.rng.choice([1, 2]))
            for p in extra:
                if vid not in self.persons[p]["vehicles"]:
                    self.persons[p]["vehicles"].append(vid)
                    self.vehicles[vid]["owners"].append(p)

    def link_persons_to_orgs(self):
        # ~55% of persons belong to an organization.
        members = self._assign(self.person_ids, int(N_PERSONS * 0.55))
        for oid in self.org_ids:
            deck = self._assign(members, self.rng.randint(2, 6))
            for p in deck:
                if self.persons[p]["org_id"] is None:
                    self.persons[p]["org_id"] = oid
                self.organizations[oid]["persons"].append(p)

    def assign_cases(self):
        # 20 cases, each links a cluster of 8-30 persons (repeated across cases).
        for cid in self.case_ids:
            if self.rng.randint(0, 100) < 20:
                # cross-over: reuse a subset from an earlier case
                pool = self.person_ids
            else:
                pool = self.person_ids
            members = self._assign(pool, self.rng.randint(8, 30))
            self.cases[cid]["persons"] = members
            for p in members:
                if "cases" not in self.persons[p]:
                    self.persons[p]["cases"] = []
                self.persons[p]["cases"].append(cid)

    def build_pattern_seeds(self):
        # Hot pairs — repeated communication (20–50 calls each)
        pairs = set()
        while len(pairs) < 40:
            a = self.rng.choice(self.person_ids)
            b = self.rng.choice(self.person_ids)
            if a != b:
                pairs.add(tuple(sorted((a, b))))
        self.hot_pairs = sorted(
            (a, b, self.rng.randint(20, 50)) for a, b in sorted(pairs)
        )
        # Hubs — a few individuals with many distinct contacts
        self.hubs = self._assign(self.person_ids, 25)
        # Transaction chains — 15 chains of 4–6 persons, amounts decaying.
        self.tx_chains = []
        for _ in range(15):
            chain = self._assign(self.person_ids, self.rng.randint(4, 6))
            edges = []
            amt = 80_000
            for i in range(len(chain) - 1):
                edges.append((chain[i], chain[i + 1], amt))
                amt = max(amt - self.rng.randint(3_000, 10_000), 5_000)
            self.tx_chains.append(edges)
        # Hot locations — repeated across datasets
        self.hot_locations = self._assign(self.location_ids, 30)

    def build_alias_clusters(self):
        # ~30 persons receive alias name variants (cross-dataset matcher fodder).
        for p in self._assign(self.person_ids, 30):
            parts = self.persons[p]["name"].split(" ")
            first, last = parts[0], " ".join(parts[1:])
            variants = []
            if last:
                variants.append(f"{first[0]}. {last}")
                variants.append(f"{first} {last[0]}.")
                variants.append(f"{first[0]} {last[0]}")
            self.persons[p]["aliases"] = [v for v in variants if v != self.persons[p]["name"]][:3]

    # ---- value accessors (single source of truth) --------------------------
    def person_name(self, pid: str, use_alias: bool = False) -> str:
        p = self.persons[pid]
        if use_alias and p["aliases"]:
            return self.rng.choice(p["aliases"])
        return p["name"]

    def person_aliases(self, pid: str):
        return self.persons[pid]["aliases"]

    def phone(self, phid: str) -> str:
        return self.phones[phid]["number"]

    def phone_of_person(self, pid: str):
        phones = self.persons[pid]["phones"]
        return phones[0] if phones else self.phone_ids[0]

    def vehicle_plate(self, vid: str) -> str:
        return self.vehicles[vid]["plate"]

    def location_name(self, lid: str) -> str:
        return self.locations[lid]["name"]

    def org_name(self, oid: str) -> str:
        return self.organizations[oid]["name"]

    def case(self, cid: str):
        return self.cases[cid]

    def person_case(self, pid: str):
        return (self.persons[pid].get("cases") or self.case_ids)[0]

    def interesting_person(self):
        # 70% stable / 30% random: prefer persons carrying links (hot, hubs, cases).
        if self.rng.random() < 0.7:
            pool = []
            pool += [a for (a, b, _) in self.hot_pairs]
            pool += [b for (a, b, _) in self.hot_pairs]
            pool += self.hubs
            for cid in self.case_ids:
                pool += self.cases[cid]["persons"]
            return self.rng.choice(pool)
        return self.rng.choice(self.person_ids)


# ---------------------------------------------------------------------------
# Row generators
# ---------------------------------------------------------------------------


def gen_master(u: Universe, count: int):
    rng = u.rng
    for n in range(1, count + 1):
        pid = u.interesting_person()
        p = u.persons[pid]
        etype = rng.choices(EVENT_TYPES, weights=EVENT_WEIGHTS)[0]
        phone_id, vehicle_id, location_id, org_id = "", "", "", ""
        phone_number, vehicle_plate, location, organization = "", "", "", ""

        if etype in ("CALL_LOG", "FINANCIAL_TXN"):
            phone_id = u.phone_of_person(pid)
            phone_number = u.phone(phone_id)
        if etype in ("VEHICLE_MOVEMENT", "REGISTRATION_RECORD"):
            vids = p["vehicles"]
            if vids:
                vehicle_id = rng.choice(vids) if rng.random() < 0.7 else rng.choice(u.vehicle_ids)
                vehicle_plate = u.vehicle_plate(vehicle_id)
            else:
                vehicle_id = rng.choice(u.vehicle_ids)
                vehicle_plate = u.vehicle_plate(vehicle_id)
        if etype in ("LOCATION_PING", "SIGHTING_REPORT", "VEHICLE_MOVEMENT", "REGISTRATION_RECORD"):
            location_id = rng.choice(u.hot_locations) if rng.random() < 0.6 else rng.choice(u.location_ids)
            location = u.location_name(location_id)
        if etype in ("REGISTRATION_RECORD", "FINANCIAL_TXN"):
            org_id = p["org_id"] if (p["org_id"] and rng.random() < 0.5) else rng.choice(u.org_ids)
            organization = u.org_name(org_id)

        target_pid = rng.choice(u.person_ids) if rng.random() < 0.12 else ""
        target_name = u.person_name(target_pid) if target_pid else ""
        amount = str(rng.randint(500, 250_000)) if etype == "FINANCIAL_TXN" else ""

        notes = ""
        if rng.random() < 0.25:
            notes = rng.choice(NOTE_TEMPLATES)
            if p["aliases"] and rng.random() < 0.5 and p["aliases"]:
                notes += f" | Also known as {p['aliases'][0]}"

        risk = max(1, min(100, p["risk_base"] + rng.randint(-15, 40) + (25 if pid in u.hubs else 0)))

        case_id = ""
        if rng.random() < 0.4:
            case_id = rng.choice(p.get("cases") or u.case_ids) if rng.random() < 0.6 else rng.choice(u.case_ids)

        yield [
            f"REC-MA-{pad(n, 7)}", pid, u.person_name(pid), ",".join(p["aliases"]),
            phone_id, phone_number, vehicle_id, vehicle_plate, location_id, location,
            org_id, organization, target_pid, target_name, etype,
            fmt_dt(rng_dt(rng)), amount, notes, risk, case_id,
        ]


def gen_fir(u: Universe, count: int):
    rng = u.rng
    for n in range(1, count + 1):
        cid = rng.choice(u.case_ids)
        case = u.case(cid)
        members = case["persons"] or u.person_ids
        victim = rng.choice(members)
        complainant = rng.choice(members)
        primary = rng.choice(members)
        lid = rng.choice(u.hot_locations) if rng.random() < 0.5 else rng.choice(u.location_ids)
        ict_type = rng.choice(INCIDENT_TYPES)
        sev = rng.choices(SEVERITY_VALUES, weights=SEVERITY_WEIGHTS)[0]
        status = rng.choices(STATUS_VALUES, weights=STATUS_WEIGHTS)[0]
        incident = rng_dt(rng)
        fir_dt = incident + timedelta(hours=rng.randint(4, 72))
        desc = f"Fictional {ict_type.replace('_', ' ').lower()} incident tied to {case['title']}."

        yield [
            f"FIR-{pad(n, 6)}", cid, fmt_dt(fir_dt), fmt_dt(incident), ict_type, desc,
            lid, u.location_name(lid), rng.choice(JURISDICTIONS), victim, complainant,
            primary, f"INV-{pad(rng.randint(1, 160), 4)}", status, sev,
        ]


def gen_calls(u: Universe, count: int):
    rng = u.rng
    hot = u.hot_pairs
    hot_cycle = [p for p in hot for _ in range(1)]  # weights by pair
    hub_edges = 0
    for n in range(1, count + 1):
        roll = rng.random()
        if roll < 0.45:
            a, b, _ = rng.choice(hot_cycle)
        elif roll < 0.75:
            hub = rng.choice(u.hubs)
            a = hub
            b = rng.choice(u.person_ids)
            if b == hub:
                b = rng.choice(u.person_ids)
            hub_edges += 1
        else:
            a = rng.choice(u.person_ids)
            b = rng.choice(u.person_ids)

        if not u.persons[a]["phones"] or not u.persons[b]["phones"]:
            continue

        call_type = rng.choices(["OUTGOING", "INCOMING", "MISSED"], weights=[0.6, 0.35, 0.05])[0]
        duration = 0 if call_type == "MISSED" else rng.randint(5, 3600)
        lid = rng.choice(u.hot_locations) if rng.random() < 0.5 else rng.choice(u.location_ids)
        # occasionally swap a shared phone
        ca = u.phone_of_person(a)
        cb = u.phone_of_person(b)
        if u.persons[a]["phones"] and len(u.persons[a]["phones"]) > 1 and rng.random() < 0.2:
            ca = rng.choice(u.persons[a]["phones"])
        if u.persons[b]["phones"] and len(u.persons[b]["phones"]) > 1 and rng.random() < 0.2:
            cb = rng.choice(u.persons[b]["phones"])

        case_id = ""
        if rng.random() < 0.35:
            for cid in u.case_ids:
                if a in u.cases[cid]["persons"] and b in u.cases[cid]["persons"]:
                    case_id = cid
                    break
            if not case_id:
                case_id = rng.choice(u.case_ids)

        yield [
            f"CAL-{pad(n, 7)}", a, ca, u.phone(ca), b, cb, u.phone(cb), fmt_dt(rng_dt(rng)),
            duration, call_type, f"TWR-{pad(rng.randint(1, 400), 4)}", lid, u.location_name(lid), case_id,
        ]


def gen_financial(u: Universe, count: int):
    rng = u.rng
    chains = u.tx_chains
    chain_edges = [e for chain in chains for e in chain] * 3
    acct = u.accounts
    person_account = {}
    for pid in u.person_ids:
        person_account[pid] = u.account_ids[len(person_account) % N_ACCOUNTS]
    for n in range(1, count + 1):
        roll = rng.random()
        if roll < 0.30 and chain_edges:
            sender, receiver, base_amt = rng.choice(chain_edges)
            amount = max(500, base_amt + rng.randint(-2_000, 2_000))
        else:
            if roll < 0.65:
                sender = u.interesting_person()
                receiver = rng.choice(u.cases[rng.choice(u.case_ids)]["persons"]) if rng.random() < 0.5 else rng.choice(u.person_ids)
            else:
                sender = rng.choice(u.person_ids)
                receiver = rng.choice(u.person_ids)
            amount = rng.randint(500, 250_000)

        ttype = rng.choices(["TRANSFER", "CASH", "UPI", "RTGS", "NEFT"], weights=[0.35, 0.15, 0.25, 0.15, 0.10])[0]
        send_acct = person_account.get(sender, u.account_ids[0])
        recv_acct = person_account.get(receiver, u.account_ids[1])
        bank_id = acct[recv_acct]["bank"]
        branch_id = acct[recv_acct]["branch"]
        reference = f"UTR-{rng.randint(100000, 999999)}{rng.randint(1000, 9999)}"
        lid = rng.choice(u.location_ids) if rng.random() < 0.13 else ""
        case_id = ""
        if rng.random() < 0.35:
            for cid in u.case_ids:
                if sender in u.cases[cid]["persons"]:
                    case_id = cid
                    break
            if not case_id:
                case_id = rng.choice(u.case_ids)

        yield [
            f"TXN-{pad(n, 7)}", sender, send_acct, receiver, recv_acct, fmt_dt(rng_dt(rng)),
            amount, ttype, bank_id, branch_id, reference, lid, case_id,
        ]


def gen_vehicles(u: Universe, count: int):
    rng = u.rng
    for n in range(1, count + 1):
        roll = rng.random()
        if roll < 0.65:
            vid = rng.choice(u.vehicle_ids)
            owner = rng.choice(u.vehicles[vid]["owners"]) if u.vehicles[vid]["owners"] else rng.choice(u.person_ids)
            lid = rng.choice(u.hot_locations) if rng.random() < 0.6 else rng.choice(u.location_ids)
            etype = rng.choices(["MOVED", "SEEN"], weights=[0.55, 0.45])[0]
        else:
            vid = rng.choice(u.vehicle_ids)
            owner = rng.choice(u.vehicles[vid]["owners"]) if u.vehicles[vid]["owners"] else rng.choice(u.person_ids)
            lid = rng.choice(u.location_ids)
            etype = "REGISTERED"

        v = u.vehicles[vid]
        reg_date = "2026-01-01"
        case_id = ""
        if rng.random() < 0.3:
            for cid in u.case_ids:
                if owner in u.cases[cid]["persons"]:
                    case_id = cid
                    break
            if not case_id:
                case_id = rng.choice(u.case_ids)

        yield [
            f"VREC-{pad(n, 6)}", vid, v["plate"], owner, v["type"], v["make"], v["model"],
            "2026-01-01", fmt_dt(rng_dt(rng)), lid, u.location_name(lid), etype,
            rng.choices(["ACTIVE", "INACTIVE"], weights=[0.9, 0.1])[0], case_id,
        ]


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

MASTER_COLS = [
    "record_id", "person_id", "person_name", "aliases", "phone_id", "phone_number",
    "vehicle_id", "vehicle_plate", "location_id", "location", "organization_id",
    "organization", "target_person_id", "target_person", "event_type", "event_date",
    "amount_inr", "notes", "risk_score", "case_id",
]
FIR_COLS = [
    "fir_id", "case_id", "fir_date", "incident_date", "incident_type", "description",
    "location_id", "location", "jurisdiction", "victim_id", "complainant_id",
    "primary_person_id", "investigator_id", "status", "severity",
]
CALL_COLS = [
    "call_id", "caller_person_id", "caller_phone_id", "caller_phone",
    "receiver_person_id", "receiver_phone_id", "receiver_phone", "call_datetime",
    "duration_seconds", "call_type", "cell_tower_id", "cell_tower_location_id",
    "cell_tower_location", "case_id",
]
FIN_COLS = [
    "transaction_id", "sender_person_id", "sender_account_id", "receiver_person_id",
    "receiver_account_id", "transaction_datetime", "amount_inr", "transaction_type",
    "bank_id", "branch_id", "reference", "location_id", "case_id",
]
VEHICLE_COLS = [
    "vehicle_record_id", "vehicle_id", "registration_number", "owner_person_id",
    "vehicle_type", "make", "model", "registration_date", "event_datetime",
    "location_id", "location", "event_type", "status", "case_id",
]

GENERATORS = {
    "master_intelligence.csv": (MASTER_COLS, gen_master),
    "fir_cases.csv": (FIR_COLS, gen_fir),
    "call_records.csv": (CALL_COLS, gen_calls),
    "financial_transactions.csv": (FIN_COLS, gen_financial),
    "vehicle_records.csv": (VEHICLE_COLS, gen_vehicles),
}


def build_relationships_summary(u: Universe) -> dict:
    comm = {}
    for a, b, cnt in u.hot_pairs:
        comm[tuple(sorted((a, b)))] = cnt

    ownership = []
    for phid, ph in u.phones.items():
        if ph["owners"]:
            for owner in ph["owners"]:
                ownership.append({"entity": owner, "type": "PHONE", "target_id": phid, "count": 1})
    seen_v = set()
    for vid, v in u.vehicles.items():
        for p in v["owners"]:
            ownership.append({"entity": p, "type": "VEHICLE", "target_id": vid, "count": 1})
    for pid, p in u.persons.items():
        if p["org_id"]:
            ownership.append({"entity": pid, "type": "ORGANIZATION", "target_id": p["org_id"], "count": 1})

    return {
        "communication": [{"a": a, "b": b, "count": cnt} for (a, b), cnt in comm.items()],
        "ownership": ownership,
        "transaction_chains": [
            [{"from": s, "to": t, "amount": amt} for (s, t, amt) in chain]
            for chain in u.tx_chains
        ],
        "hubs": u.hubs,
        "hot_locations": u.hot_locations,
    }


def main():
    ap = argparse.ArgumentParser(description="Generate CrimeIntel synthetic datasets (fictional).")
    ap.add_argument("--seed", type=int, default=42, help="RNG seed (deterministic).")
    ap.add_argument("--out", default="synthetic_data", help="Output directory.")
    args = ap.parse_args()

    u = Universe(args.seed)
    os.makedirs(args.out, exist_ok=True)

    # sidecar: entity universe
    with open(os.path.join(args.out, "entity_universe.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "persons": u.persons,
                "phones": u.phones,
                "vehicles": u.vehicles,
                "locations": u.locations,
                "organizations": u.organizations,
                "cases": u.cases,
                "accounts": u.accounts,
            },
            f, ensure_ascii=False, indent=1,
        )

    # sidecar: relationship summary (for graph hydration on import)
    rel = build_relationships_summary(u)
    with open(os.path.join(args.out, "relationships_summary.json"), "w", encoding="utf-8") as f:
        json.dump(rel, f, ensure_ascii=False, indent=1)

    # CSV datasets
    for name, (cols, gen) in GENERATORS.items():
        path = os.path.join(args.out, name)
        count = ROWS[name]
        written = 0
        with open(path, "w", encoding="utf-8", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(cols)
            for row in gen(u, count):
                w.writerow(row)
                written += 1
                if written % 10_000 == 0:
                    print(f"  {name}: {written}/{count}")
        print(f"WROTE {path} — {written} rows")

    print("Done.")


# ---------------------------------------------------------------------------
# datetime helpers (kept at bottom to avoid cluttering module namespace)
# ---------------------------------------------------------------------------
from datetime import datetime, timedelta  # noqa: E402

_BASE = datetime(2026, 1, 1)


def rng_dt(rng: random.Random) -> datetime:
    return _BASE + timedelta(
        days=rng.randint(0, 243), hours=rng.randint(0, 23), minutes=rng.randint(0, 59), seconds=rng.randint(0, 59)
    )


if __name__ == "__main__":
    main()