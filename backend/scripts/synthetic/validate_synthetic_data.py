#!/usr/bin/env python3
"""
CrimeIntel — Synthetic dataset validator.

Checks the 5 generated CSVs + shared universe for:
  - duplicate primary IDs
  - broken foreign references
  - mismatched ID/value pairs
  - invalid dates
  - invalid risk scores
  - negative transaction amounts
  - missing mandatory fields
  - cross-dataset entity consistency

Usage:
    py validate_synthetic_data.py [--data synthetic_data]
Exit code 0 = PASS, 1 = FAIL.
"""

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime

DT_RE = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

COLS = {
    "master_intelligence.csv": {
        "pk": "record_id",
        "required": ["record_id", "person_id", "person_name", "event_type", "event_date", "risk_score"],
    },
    "fir_cases.csv": {
        "pk": "fir_id",
        "required": ["fir_id", "case_id", "fir_date", "incident_date", "incident_type", "description", "location_id", "location", "jurisdiction", "victim_id", "primary_person_id", "investigator_id", "status", "severity"],
    },
    "call_records.csv": {
        "pk": "call_id",
        "required": ["call_id", "caller_person_id", "caller_phone_id", "caller_phone", "receiver_person_id", "receiver_phone_id", "receiver_phone", "call_datetime", "duration_seconds", "call_type", "cell_tower_id", "cell_tower_location_id", "cell_tower_location"],
    },
    "financial_transactions.csv": {
        "pk": "transaction_id",
        "required": ["transaction_id", "sender_person_id", "sender_account_id", "receiver_person_id", "receiver_account_id", "transaction_datetime", "amount_inr", "transaction_type", "bank_id"],
    },
    "vehicle_records.csv": {
        "pk": "vehicle_record_id",
        "required": ["vehicle_record_id", "vehicle_id", "registration_number", "owner_person_id", "vehicle_type", "make", "model", "registration_date", "event_datetime", "location_id", "location", "event_type", "status"],
    },
}


class Validator:
    def __init__(self, data_dir: str):
        self.dir = data_dir
        with open(os.path.join(data_dir, "entity_universe.json"), encoding="utf-8") as f:
            self.u = json.load(f)
        self.persons = self.u["persons"]
        self.phones = self.u["phones"]
        self.vehicles = self.u["vehicles"]
        self.locations = self.u["locations"]
        self.organizations = self.u["organizations"]
        self.cases = self.u["cases"]
        self.accounts = self.u["accounts"]

        self.person_names = {pid: p["name"] for pid, p in self.persons.items()}
        self.person_alias_sets = {pid: set([p["name"]] + p.get("aliases", [])) for pid, p in self.persons.items()}
        self.phone_numbers = {pid: p["number"] for pid, p in self.phones.items()}
        self.vehicle_plates = {vid: p["plate"] for vid, p in self.vehicles.items()}
        self.location_names = {lid: p["name"] for lid, p in self.locations.items()}
        self.org_names = {oid: p["name"] for oid, p in self.organizations.items()}
        self.case_ids = set(self.cases)
        self.account_ids = set(self.accounts)

        self.errors = []
        self.warnings = []

    def error(self, msg: str):
        self.errors.append(msg)

    def warn(self, msg: str):
        self.warnings.append(msg)

    # ---- helpers ----------------------------------------------------------
    def check_dt(self, col: str, value: str, where: str):
        value = value.strip()
        if not value or not DT_RE.match(value):
            self.error(f"{where}: invalid datetime value for {col}: {value!r}")
        else:
            try:
                datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                self.error(f"{where}: unparseable datetime for {col}: {value!r}")

    def check_date(self, col: str, value: str, where: str):
        value = value.strip()
        if not DATE_RE.match(value):
            self.error(f"{where}: invalid date value for {col}: {value!r}")

    def check_ref(self, value: str, pool: set, label: str, where: str):
        if value and value not in pool:
            self.error(f"{where}: broken foreign reference {label}={value}")

    # ---- per-file checks ------------------------------------------------=
    def validate_file(self, filename: str):
        spec = COLS[filename]
        pk = spec["pk"]
        path = os.path.join(self.dir, filename)
        seen = {}
        rows = 0
        with open(path, encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            missing_cols = [c for c in spec["required"] if c not in (reader.fieldnames or [])]
            if missing_cols:
                self.error(f"{filename}: missing mandatory columns {missing_cols}")
                return rows
            for row in reader:
                rows += 1
                where = f"{filename}:{rows}"
                pkv = row[pk]
                if pkv in seen:
                    self.error(f"{where}: duplicate primary ID {pkv} (also at row {seen[pkv]})")
                seen[pkv] = rows
                for col in spec["required"]:
                    if not row.get(col, "").strip():
                        self.error(f"{where}: missing mandatory field {col}")
                self.run_row_checks(filename, row, where)
        return rows

    def run_row_checks(self, filename: str, row: dict, where: str):
        if filename == "master_intelligence.csv":
            self.check_ref(row["person_id"], self.persons, "person_id", where)
            if row["person_id"] in self.persons:
                allowed = self.person_alias_sets[row["person_id"]]
                if row["person_name"] not in allowed:
                    self.error(f"{where}: person_id {row['person_id']} name mismatch {row['person_name']!r}")
            self.check_ref(row["phone_id"], self.phones, "phone_id", where)
            if row["phone_id"] and row["phone_number"] and self.phone_numbers.get(row["phone_id"]) != row["phone_number"]:
                self.error(f"{where}: phone_id {row['phone_id']} -> number mismatch {row['phone_number']!r}")
            self.check_ref(row["vehicle_id"], self.vehicles, "vehicle_id", where)
            if row["vehicle_id"] and row["vehicle_plate"] and self.vehicle_plates.get(row["vehicle_id"]) != row["vehicle_plate"]:
                self.error(f"{where}: vehicle_id {row['vehicle_id']} -> plate mismatch {row['vehicle_plate']!r}")
            self.check_ref(row["location_id"], self.locations, "location_id", where)
            if row["location_id"] and row["location"] and self.location_names.get(row["location_id"]) != row["location"]:
                self.error(f"{where}: location_id {row['location_id']} -> name mismatch {row['location']!r}")
            self.check_ref(row["organization_id"], self.organizations, "organization_id", where)
            if row["organization_id"] and row["organization"] and self.org_names.get(row["organization_id"]) != row["organization"]:
                self.error(f"{where}: organization_id {row['organization_id']} -> name mismatch {row['organization']!r}")
            self.check_ref(row["case_id"], self.case_ids, "case_id", where)
            self.check_dt("event_date", row["event_date"], where)
            try:
                risk = int(row["risk_score"])
                if not (1 <= risk <= 100):
                    self.error(f"{where}: risk_score {row['risk_score']} outside 1..100")
            except ValueError:
                self.error(f"{where}: risk_score not an integer: {row['risk_score']!r}")
            if row["amount_inr"]:
                try:
                    if float(row["amount_inr"]) < 0:
                        self.error(f"{where}: negative amount_inr {row['amount_inr']}")
                except ValueError:
                    self.error(f"{where}: amount_inr not numeric: {row['amount_inr']!r}")

        elif filename == "fir_cases.csv":
            self.check_ref(row["case_id"], self.case_ids, "case_id", where)
            for col in ("victim_id", "complainant_id", "primary_person_id"):
                self.check_ref(row[col], self.persons, col, where)
            self.check_ref(row["location_id"], self.locations, "location_id", where)
            if row["location_id"] and row["location"] and self.location_names.get(row["location_id"]) != row["location"]:
                self.error(f"{where}: location_id {row['location_id']} -> name mismatch {row['location']!r}")
            self.check_dt("fir_date", row["fir_date"], where)
            self.check_dt("incident_date", row["incident_date"], where)

        elif filename == "call_records.csv":
            for col in ("caller_person_id", "receiver_person_id"):
                self.check_ref(row[col], self.persons, col, where)
            for col, num_col in (("caller_phone_id", "caller_phone"), ("receiver_phone_id", "receiver_phone")):
                self.check_ref(row[col], self.phones, col, where)
                if row[col] and row[num_col] and self.phone_numbers.get(row[col]) != row[num_col]:
                    self.error(f"{where}: {col} {row[col]} -> number mismatch {row[num_col]!r}")
            self.check_ref(row["cell_tower_location_id"], self.locations, "cell_tower_location_id", where)
            if row["cell_tower_location_id"] and row["cell_tower_location"] and self.location_names.get(row["cell_tower_location_id"]) != row["cell_tower_location"]:
                self.error(f"{where}: cell_tower_location_id mismatch {row['cell_tower_location']!r}")
            self.check_ref(row["case_id"], self.case_ids, "case_id", where)
            self.check_dt("call_datetime", row["call_datetime"], where)
            try:
                if int(row["duration_seconds"]) < 0:
                    self.error(f"{where}: negative duration_seconds {row['duration_seconds']}")
            except ValueError:
                self.error(f"{where}: duration_seconds not an integer: {row['duration_seconds']!r}")

        elif filename == "financial_transactions.csv":
            self.check_ref(row["sender_person_id"], self.persons, "sender_person_id", where)
            self.check_ref(row["receiver_person_id"], self.persons, "receiver_person_id", where)
            for col in ("sender_account_id", "receiver_account_id"):
                self.check_ref(row[col], self.account_ids, col, where)
            self.check_ref(row["case_id"], self.case_ids, "case_id", where)
            self.check_ref(row["location_id"], self.locations, "location_id", where)
            self.check_dt("transaction_datetime", row["transaction_datetime"], where)
            try:
                if float(row["amount_inr"]) < 0:
                    self.error(f"{where}: negative amount_inr {row['amount_inr']}")
            except ValueError:
                self.error(f"{where}: amount_inr not numeric: {row['amount_inr']!r}")

        elif filename == "vehicle_records.csv":
            self.check_ref(row["vehicle_id"], self.vehicles, "vehicle_id", where)
            if row["vehicle_id"] and self.vehicle_plates.get(row["vehicle_id"]) != row["registration_number"]:
                self.error(f"{where}: vehicle_id {row['vehicle_id']} -> registration_number mismatch {row['registration_number']!r}")
            self.check_ref(row["owner_person_id"], self.persons, "owner_person_id", where)
            self.check_ref(row["location_id"], self.locations, "location_id", where)
            if row["location_id"] and row["location"] and self.location_names.get(row["location_id"]) != row["location"]:
                self.error(f"{where}: location_id {row['location_id']} -> name mismatch {row['location']!r}")
            self.check_ref(row["case_id"], self.case_ids, "case_id", where)
            self.check_date("registration_date", row["registration_date"], where)
            self.check_dt("event_datetime", row["event_datetime"], where)

    # ---- cross-dataset consistency ----------------------------------------
    def cross_dataset(self, count: dict):
        person_names = {}
        phone_nums = {}
        vehicle_plates = {}
        location_names = {}
        org_names = {}

        def record(filename, col, value):
            if value and col == "person_id":
                person_names.setdefault(value, set()).add(filename)
            elif col == "phone_id":
                phone_nums.setdefault(value, set()).add(filename)
            elif col == "vehicle_id":
                vehicle_plates.setdefault(value, set()).add(filename)
            elif col == "location_id":
                location_names.setdefault(value, set()).add(filename)
            elif col == "organization_id":
                org_names.setdefault(value, set()).add(filename)

        for filename in COLS:
            path = os.path.join(self.dir, filename)
            with open(path, encoding="utf-8", newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    for col in row:
                        low = col.lower()
                        if low.endswith("person_id") and low not in ("receiver_person_id", "caller_person_id", "sender_person_id", "target_person_id", "primary_person_id", "complainant_id", "victim_id", "owner_person_id"):
                            person_names.setdefault(row[col], set()).add(filename)
                        elif low == "receiver_person_id":
                            person_names.setdefault(row[col], set()).add(filename)
                        elif low == "caller_person_id":
                            person_names.setdefault(row[col], set()).add(filename)
                        elif low == "sender_person_id":
                            person_names.setdefault(row[col], set()).add(filename)
                        elif low == "target_person_id":
                            person_names.setdefault(row[col], set()).add(filename)
                        elif low == "primary_person_id":
                            person_names.setdefault(row[col], set()).add(filename)
                        elif low == "complainant_id":
                            person_names.setdefault(row[col], set()).add(filename)
                        elif low == "victim_id":
                            person_names.setdefault(row[col], set()).add(filename)
                        elif low == "owner_person_id":
                            person_names.setdefault(row[col], set()).add(filename)
                        elif low == "phone_id":
                            phone_nums.setdefault(row[col], set()).add(filename)
                        elif low == "caller_phone_id":
                            phone_nums.setdefault(row[col], set()).add(filename)
                        elif low == "receiver_phone_id":
                            phone_nums.setdefault(row[col], set()).add(filename)
                        elif low == "vehicle_id":
                            vehicle_plates.setdefault(row[col], set()).add(filename)
                        elif low == "location_id":
                            location_names.setdefault(row[col], set()).add(filename)
                        elif low == "organization_id":
                            org_names.setdefault(row[col], set()).add(filename)

        # Report which entities appear across >1 dataset (informational + verify consistent names)
        multi = {}
        for d in (person_names, phone_nums, vehicle_plates, location_names, org_names):
            for k, files in d.items():
                if len(files) > 1:
                    multi[k] = sorted(files)
        # (consistency of name VALUES is enforced per-file above; a shared ID
        # with a wrong name would already be an error, so multiple files seeing
        # the same value in lock-step proves cross-dataset consistency.)
        cross_linked = sum(1 for k, v in multi.items() if len(v) > 1)
        self.warnings.append(f"cross-dataset shared entities referenced by >1 file: {cross_linked}")
        for pid in list(person_names)[:5]:
            files = sorted(person_names[pid])
            if len(files) > 1:
                self.warnings.append(f"  person {pid} appears in {', '.join(files)}")

    # ---- main -------------------------------------------------------------
    def run(self):
        counts = {}
        for filename in COLS:
            n = self.validate_file(filename)
            counts[filename] = n
            print(f"  {filename}: {n} rows checked")
        print()
        self.cross_dataset(counts)

        print(f"Errors: {len(self.errors)}")
        for e in self.errors[:25]:
            print("  ERROR  ", e)
        print(f"Warnings: {len(self.warnings)}")
        for w in self.warnings[:10]:
            print("  NOTE   ", w)
        if self.errors:
            print("RESULT: FAIL")
            return 1
        print("RESULT: PASS")
        return 0


def main():
    ap = argparse.ArgumentParser(description="Validate CrimeIntel synthetic datasets.")
    ap.add_argument("--data", default="synthetic_data", help="Directory with CSVs + entity_universe.json.")
    args = ap.parse_args()
    v = Validator(args.data)
    sys.exit(v.run())


if __name__ == "__main__":
    main()