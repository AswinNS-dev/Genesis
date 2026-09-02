#!/usr/bin/env python3
"""
CrimeIntel â€” Synthetic dataset importer for Supabase PostgreSQL.

Implements the audited CrimeIntel ingestion architecture:

    CSV â†’ Dataset â†’ DatasetRecord â†’ normalization
        â†’ entity matching (candidate + review) â†’ DatasetEntity
        â†’ (optional --hydrate-graph) Entity / Relationship / TimelineEvent

The service-role key is used ONLY server-side by this script and must never
ship to browser code. Config is read from environment variables or `env.json`
in this folder.

Two backends:
  * pg   â€” direct PostgreSQL over psycopg2 (transactional, fastest bulk COPY)
            Used automatically when a database connection succeeds.
  * api  â€” Supabase REST API (PostgREST, service-role key) + Management SQL API
            for DDL. Used when the direct Postgres port is unreachable.

Usage:
  py import_to_supabase.py import --all
  py import_to_supabase.py import --dataset master_intelligence.csv
  py import_to_supabase.py import --all --replace
  py import_to_supabase.py import --all --hydrate-graph
  py import_to_supabase.py clear [--also-drop-staging]

Set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_MGMT_TOKEN / DATABASE_URL
(or create env.json alongside this script).
"""

import argparse
import csv
import json
import os
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "synthetic_data")
SCHEMA_SQL = os.path.join(SCRIPT_DIR, "schema.sql")
ENV_JSON = os.path.join(SCRIPT_DIR, "env.json")

DATASETS = {
    "master_intelligence.csv": "MASTER",
    "fir_cases.csv": "FIR",
    "call_records.csv": "CDR",
    "financial_transactions.csv": "FIN",
    "vehicle_records.csv": "VEHICLE",
}

BATCH = 500
BATCH_JSON = 300

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------


def load_config():
    cfg = {}
    if os.path.exists(ENV_JSON):
        with open(ENV_JSON, encoding="utf-8") as f:
            cfg.update(json.load(f))

    env_map = {
        "SUPABASE_URL": "supabase_url",
        "SUPABASE_SERVICE_ROLE_KEY": "service_role_key",
        "SUPABASE_ANON_KEY": "anon_key",
        "SUPABASE_MGMT_TOKEN": "management_token",
        "DATABASE_URL": "database_url",
    }
    for env_name, key in env_map.items():
        val = os.environ.get(env_name, "").strip()
        if val:
            cfg[key] = val

    missing = [k for k in ("service_role_key", "supabase_url") if not cfg.get(k)]
    if missing:
        print("Missing required config:", ", ".join(missing))
        print(f"Set env vars or create {ENV_JSON}")
        sys.exit(2)
    return cfg


# ---------------------------------------------------------------------------
# Backends
# ---------------------------------------------------------------------------


class ApiBackend:
    """Supabase REST (PostgREST) + Management SQL API â€” works over HTTPS only."""

    def __init__(self, cfg):
        self.base = cfg["supabase_url"].rstrip("/") + "/rest/v1/"
        self.mgmt = f"https://api.supabase.com/v1/projects/{project_ref(cfg['supabase_url'])}/database/query"
        self.headers = {
            "apikey": cfg["service_role_key"],
            "Authorization": f"Bearer {cfg['service_role_key']}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self.mgmt_headers = {
            "Authorization": f"Bearer {cfg.get('management_token') or ''}",
            "Content-Type": "application/json",
        }

    # -- DDL / admin queries -----------------------------------------------
    def run_sql(self, sql: str):
        if not self.mgmt_headers["Authorization"] or self.mgmt_headers["Authorization"] == "Bearer ":
            raise RuntimeError("management_token required for DDL in api mode")
        import httpx

        r = httpx.post(self.mgmt, headers=self.mgmt_headers, json={"query": sql}, timeout=120)
        if r.status_code not in (200, 201):
            raise RuntimeError(f"SQL failed ({r.status_code}): {r.text[:400]}")
        return r.json()

    def tables(self):
        rows = self.run_sql(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        )
        return {r["tablename"] for r in rows}

    def apply_schema(self):
        import re

        sql = _read_schema()
        statements = split_sql(sql)
        existing = self.tables()
        created = 0
        for stmt in statements:
            m = re.search(r'(?:CREATE TABLE|ALTER TABLE|CREATE UNIQUE INDEX .*? ON) "([^"]+)"', stmt)
            if m and m.group(1) in existing:
                continue
            if stmt.lstrip().startswith("CREATE TABLE "):
                stmt = stmt.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ", 1)
            self.run_sql(stmt)
            created += 1
        return created

    # -- DML ---------------------------------------------------------------
    def select_ids(self, table: str, column: str, eq_value: str):
        import httpx

        r = httpx.get(
            self.base + table,
            headers=self.headers,
            params=[("select", column), (column, "eq." + eq_value)],
            timeout=30,
        )
        if r.status_code != 200:
            raise RuntimeError(f"select failed ({r.status_code}): {r.text[:300]}")
        return [row[column] for row in r.json()]

    def upsert_rows(self, table: str, rows: list, conflict_col: str = "id"):
        if not rows:
            return
        import httpx

        headers = dict(self.headers)
        headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
        r = httpx.post(
            self.base + table,
            headers=headers,
            params={"on_conflict": conflict_col},
            json=rows,
            timeout=180,
        )
        if r.status_code not in (200, 201, 204):
            raise RuntimeError(f"upsert INTO {table} failed ({r.status_code}): {r.text[:500]}")

    def insert_rows(self, table: str, rows: list):
        if not rows:
            return
        import httpx

        headers = dict(self.headers)
        headers["Prefer"] = "return=minimal"
        r = httpx.post(
            self.base + table,
            headers=headers,
            json=rows,
            timeout=180,
        )
        if r.status_code not in (200, 201, 204):
            raise RuntimeError(f"insert INTO {table} failed ({r.status_code}): {r.text[:500]}")

    def count(self, table: str, filter_col: str = None, eq_value: str = None):
        import httpx

        params = [("select", "id")]
        if filter_col and eq_value:
            params.append((filter_col, "eq." + eq_value))
        headers = dict(self.headers)
        headers["Prefer"] = "count=exact"
        headers["Range"] = "0-0"
        r = httpx.get(self.base + table, headers=headers, params=params, timeout=30)
        cr = r.headers.get("content-range", "")
        if cr and "/" in cr:
            return int(cr.split("/")[1])
        return 0


class PgBackend:
    """Direct PostgreSQL via psycopg2 (transactional)."""

    def __init__(self, cfg):
        import psycopg2

        self.conn = psycopg2.connect(cfg["database_url"])
        self.conn.autocommit = False
        self.cur = self.conn.cursor()

    def run_sql(self, sql: str):
        self.cur.execute(sql)
        self.conn.commit()
        try:
            return self.cur.fetchall()
        except Exception:
            return []

    def tables(self):
        self.cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
        return {r[0] for r in self.cur.fetchall()}

    def apply_schema(self):
        import re

        sql = _read_schema()
        statements = split_sql(sql)
        existing = self.tables()
        for stmt in statements:
            m = re.search(r'(?:CREATE TABLE|ALTER TABLE|CREATE UNIQUE INDEX .*? ON) "([^"]+)"', stmt)
            if m and m.group(1) in existing:
                continue
            if stmt.lstrip().startswith("CREATE TABLE "):
                stmt = stmt.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ", 1)
            self.cur.execute(stmt)
        self.conn.commit()
        return len(statements)

    def select_ids(self, table: str, column: str, eq_value: str):
        self.cur.execute(f'SELECT "{column}" FROM "{table}" WHERE "{column}" = %s', (eq_value,))
        return [r[0] for r in self.cur.fetchall()]

    def _col_str(self, rows):
        return rows[0].keys()

    def upsert_rows(self, table: str, rows: list, conflict_col: str = "id"):
        if not rows:
            return
        from psycopg2.extras import execute_values

        cols = [c for c in rows[0].keys()]
        col_sql = ", ".join(f'"{c}"' for c in cols)
        excluded = ", ".join(f'"{c}"=EXCLUDED."{c}"' for c in cols)
        template = "(" + ",".join(["%s"] * len(cols)) + ")"
        sql = (
            f'INSERT INTO "{table}" ({col_sql}) VALUES %s '
            f'ON CONFLICT ("{conflict_col}") DO UPDATE SET {excluded}'
        )
        values = [tuple(r[c] for c in cols) for r in rows]
        execute_values(self.cur, sql, values, template=template)
        self.conn.commit()

    def insert_rows(self, table: str, rows: list):
        if not rows:
            return
        from psycopg2.extras import execute_values

        cols = [c for c in rows[0].keys()]
        col_sql = ", ".join(f'"{c}"' for c in cols)
        template = "(" + ",".join(["%s"] * len(cols)) + ")"
        values = [tuple(r[c] for c in cols) for r in rows]
        execute_values(self.cur, f'INSERT INTO "{table}" ({col_sql}) VALUES %s', values, template=template)
        self.conn.commit()

    def count(self, table: str, filter_col: str = None, eq_value: str = None):
        if filter_col and eq_value:
            self.cur.execute(f'SELECT count(*) FROM "{table}" WHERE "{filter_col}" = %s', (eq_value,))
        else:
            self.cur.execute(f'SELECT count(*) FROM "{table}"')
        return self.cur.fetchone()[0]

    def close(self):
        try:
            self.conn.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Entity IDs (deterministic â†’ idempotent upserts)
# ---------------------------------------------------------------------------


def ent(type_: str, source_id: str) -> str:
    return f"ent_{type_.lower()}_{source_id.lower().replace('-', '-')}"


def dataset_id(filename: str) -> str:
    return "ds_" + filename.split(".")[0]


def record_id(filename: str, row: int) -> str:
    return f"dsr_{filename.split('.')[0]}_{row}"


def to_iso(dt: str) -> str:
    if len(dt) == 19 and dt[10] == " ":
        return dt[:10] + "T" + dt[11:] + ".000Z"
    return dt


def project_ref(url: str) -> str:
    return url.split("//")[1].split(".")[0]


# ---------------------------------------------------------------------------
# Normalization (canonical fields consumed by CrimeIntel pipeline/matching)
# ---------------------------------------------------------------------------


def normalize_row(filename: str, row: dict) -> dict:
    if filename == "master_intelligence.csv":
        return {
            "name": row.get("person_name", ""),
            "phone": row.get("phone_number", ""),
            "vehicle": row.get("vehicle_plate", ""),
            "amount": row.get("amount_inr", ""),
            "date": row.get("event_date", ""),
            "identifier": row.get("record_id", ""),
            "description": row.get("notes", ""),
            "person_id": row.get("person_id", ""),
            "event_type": row.get("event_type", ""),
            "case_id": row.get("case_id", ""),
        }
    if filename == "fir_cases.csv":
        return {
            "name": row.get("victim_id", ""),
            "date": row.get("fir_date", ""),
            "identifier": row.get("fir_id", ""),
            "description": (row.get("incident_type", "") + " | " + row.get("jurisdiction", "")) if row.get("jurisdiction") else row.get("incident_type", ""),
            "case_id": row.get("case_id", ""),
        }
    if filename == "call_records.csv":
        return {
            "name": row.get("caller_person_id", ""),
            "phone": row.get("caller_phone", ""),
            "date": row.get("call_datetime", ""),
            "identifier": row.get("call_id", ""),
            "description": row.get("call_type", ""),
            "caller_person_id": row.get("caller_person_id", ""),
            "receiver_person_id": row.get("receiver_person_id", ""),
            "case_id": row.get("case_id", ""),
        }
    if filename == "financial_transactions.csv":
        return {
            "name": row.get("sender_person_id", ""),
            "amount": row.get("amount_inr", ""),
            "date": row.get("transaction_datetime", ""),
            "identifier": row.get("transaction_id", ""),
            "description": row.get("transaction_type", ""),
            "sender_person_id": row.get("sender_person_id", ""),
            "receiver_person_id": row.get("receiver_person_id", ""),
            "case_id": row.get("case_id", ""),
        }
    if filename == "vehicle_records.csv":
        return {
            "name": row.get("owner_person_id", ""),
            "vehicle": row.get("registration_number", ""),
            "date": row.get("event_datetime", ""),
            "identifier": row.get("vehicle_record_id", ""),
            "description": row.get("vehicle_type", ""),
            "owner_person_id": row.get("owner_person_id", ""),
            "case_id": row.get("case_id", ""),
        }
    return dict(row)


def candidate_columns(filename: str, row: dict):
    """Return (person_id, verdict) for entity-matching candidates."""
    pid = {
        "master_intelligence.csv": row.get("person_id", ""),
        "fir_cases.csv": row.get("victim_id", ""),
        "call_records.csv": row.get("caller_person_id", ""),
        "financial_transactions.csv": row.get("sender_person_id", ""),
        "vehicle_records.csv": row.get("owner_person_id", ""),
    }.get(filename, "")
    return pid, filename in ("master_intelligence.csv", "call_records.csv", "vehicle_records.csv", "financial_transactions.csv")


# ---------------------------------------------------------------------------
# DSL helpers
# ---------------------------------------------------------------------------


def _read_schema():
    with open(SCHEMA_SQL, encoding="utf-8-sig") as f:
        return f.read()


def split_sql(sql: str) -> list:
    out = []
    buf = []
    for line in sql.splitlines():
        if line.strip().startswith("--"):
            if buf:
                out.append("\n".join(buf).strip())
                buf = []
            continue
        buf.append(line)
        if line.rstrip().endswith(";"):
            out.append("\n".join(buf).strip())
            buf = []
    if buf and "".join(buf).strip():
        out.append("\n".join(buf).strip())
    return [s for s in out if s]


# ---------------------------------------------------------------------------
# Entity registry hydration
# ---------------------------------------------------------------------------


def hydrate_entities(backend: ApiBackend, universe: dict):
    rows = []

    def person_row(pid, p):
        return {
            "id": ent("person", pid),
            "type": "PERSON",
            "name": p["name"],
            "aliases": json.dumps(p.get("aliases", [])),
            "value": None,
            "metadata": json.dumps({
                "source_id": pid,
                "gender": p.get("gender", ""),
                "phones": p.get("phones", []),
                "vehicles": p.get("vehicles", []),
                "org_id": p.get("org_id"),
                "cases": p.get("cases", []),
            }),
            "riskScore": p.get("risk_base", 40),
            "updatedAt": "2026-09-01T00:00:00.000Z",
        }

    for pid, p in universe["persons"].items():
        rows.append(person_row(pid, p))
    for phid, ph in universe["phones"].items():
        rows.append({
            "id": ent("phone", phid),
            "type": "PHONE", "aliases": None,
            "name": ph["number"],
            "value": "synthetic subscriber line",
            "metadata": json.dumps({"source_id": phid, "owners": ph.get("owners", [])}),
            "riskScore": 0,
            "updatedAt": "2026-09-01T00:00:00.000Z",
        })
    for vid, v in universe["vehicles"].items():
        rows.append({
            "id": ent("vehicle", vid),
            "type": "VEHICLE", "aliases": None,
            "name": v["plate"],
            "value": f"{v['make']} {v['model']} ({v['type']})",
            "metadata": json.dumps({"source_id": vid, "type": v["type"], "owners": v.get("owners", [])}),
            "riskScore": 0,
            "updatedAt": "2026-09-01T00:00:00.000Z",
        })
    for lid, l in universe["locations"].items():
        rows.append({
            "id": ent("location", lid),
            "type": "LOCATION", "aliases": None,
            "name": l["name"],
            "value": l.get("type", ""),
            "metadata": json.dumps({"source_id": lid}),
            "riskScore": 0,
            "updatedAt": "2026-09-01T00:00:00.000Z",
        })
    for oid, o in universe["organizations"].items():
        rows.append({
            "id": ent("organization", oid),
            "type": "ORGANIZATION", "aliases": None,
            "name": o["name"],
            "value": o.get("type", ""),
            "metadata": json.dumps({"source_id": oid, "persons": o.get("persons", [])}),
            "riskScore": 0,
            "updatedAt": "2026-09-01T00:00:00.000Z",
        })
    for aid, a in universe["accounts"].items():
        rows.append({
            "id": ent("bankaccount", aid),
            "type": "BANK_ACCOUNT", "aliases": None,
            "name": aid,
            "value": a.get("bank", ""),
            "metadata": json.dumps({"branch": a.get("branch", ""), "source_id": aid}),
            "riskScore": 0,
            "updatedAt": "2026-09-01T00:00:00.000Z",
        })

    total = len(rows)
    for i in range(0, total, BATCH_JSON):
        backend.upsert_rows("Entity", rows[i:i + BATCH_JSON])
        print(f"  entities: {min(i + BATCH_JSON, total)}/{total}")
    return total


# ---------------------------------------------------------------------------
# Dataset ingestion
# ---------------------------------------------------------------------------


def import_dataset(backend: ApiBackend, filename: str, replace: bool, alias_sets: dict):
    dname = f"synthetic_{filename}"
    existing = backend.select_ids("Dataset", "name", dname)
    if existing and not replace:
        print(f"SKIP {filename}: dataset {dname} already exists (use --replace to re-import)")
        return []
    if existing and replace:
        clear_dataset(backend, [dname])

    ds_id = dataset_id(filename)
    backend.upsert_rows("Dataset", [{
        "id": ds_id,
        "name": dname,
        "sourceType": "CSV",
        "fileName": filename,
        "status": "UPLOADED",
        "recordCount": 0,
        "analysisScope": "COMBINED",
        "mapping": json.dumps({"source": "synthetic_generator", "seed": 42}),
        "normalizationRules": json.dumps(["trim", "phone-unify", "entity-key"]),
        "updatedAt": "2026-09-01T00:00:00.000Z",
    }])
    print(f"  dataset {dname} ready")

    path = os.path.join(DATA_DIR, filename)
    rows = []
    merges = []
    count = 0
    marked_persons = set()
    merged_persons = set()
    t0 = time.time()
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for ri, raw in enumerate(reader):
            count += 1
            nrm = normalize_row(filename, raw)
            rec = {
                "id": record_id(filename, count),
                "datasetId": ds_id,
                "rowIndex": ri,
                "raw": json.dumps(raw),
                "normalized": json.dumps(nrm),
                "matchStatus": "UNMATCHED",
                "matchConfidence": 0,
                "matchReasons": None,
                "matchCandidateId": None,
                "mergedEntityId": None,
                "reviewedAt": None,
                "updatedAt": "2026-09-01T00:00:00.000Z",
            }
            # Keep all keys uniform in every row (PostgREST requirement).
            pid, _is_candidate = candidate_columns(filename, raw)
            if pid and pid in alias_sets and pid not in marked_persons:
                marked_persons.add(pid)
                rec["matchStatus"] = "CANDIDATE"
                rec["matchCandidateId"] = ent("person", pid)
                rec["matchConfidence"] = 80 + (count % 18)
                rec["matchReasons"] = json.dumps([
                    "Name matches canonical registry",
                    "Alias/name variation of canonical entity",
                ])
                if pid not in merged_persons and len(merged_persons) < 25:
                    merged_persons.add(pid)
                    rec["matchStatus"] = "MERGED"
                    rec["mergedEntityId"] = ent("person", pid)
                    rec["reviewedAt"] = "2026-09-01T10:00:00.000Z"
                    merges.append((record_id(filename, count), ent("person", pid)))

            rows.append(rec)
            if len(rows) >= BATCH:
                backend.upsert_rows("DatasetRecord", rows)
                rows = []
                if count % 5000 == 0:
                    el = time.time() - t0
                    print(f"  {filename}: {count} records ({el:.1f}s)")
        if rows:
            backend.upsert_rows("DatasetRecord", rows)
    el = time.time() - t0
    print(f"  {filename}: {count} records imported ({el:.1f}s) | candidates={len(marked_persons)} merges={len(merges)}")

    # DatasetEntity links for reviewed/merged records
    if merges:
        de_rows = [
            {"id": f"de_{rid}", "datasetId": ds_id, "recordId": rid, "entityId": eid, "role": "MERGED"}
            for rid, eid in merges
        ]
        backend.upsert_rows("DatasetEntity", de_rows)
        print(f"  {filename}: linked {len(de_rows)} DatasetEntity rows (merged)")

    backend.upsert_rows("Dataset", [{
        "id": ds_id,
        "name": dname,
        "sourceType": "CSV",
        "fileName": filename,
        "status": "READY",
        "recordCount": count,
        "analysisScope": "COMBINED",
        "updatedAt": "2026-09-01T00:00:00.000Z",
    }])
    return merges


def clear_dataset(backend: ApiBackend, names: list):
    placeholders = ",".join("'" + n.replace("'", "''") + "'" for n in names)
    sql = f"""
      DELETE FROM "DatasetEntity"
        WHERE "datasetId" IN (SELECT id FROM "Dataset" WHERE name IN ({placeholders}));
      DELETE FROM "DatasetRecord"
        WHERE "datasetId" IN (SELECT id FROM "Dataset" WHERE name IN ({placeholders}));
      DELETE FROM "Dataset"
        WHERE name IN ({placeholders});
    """
    backend.run_sql(sql)
    print(f"  cleared datasets: {names}")


# ---------------------------------------------------------------------------
# Operational graph hydration (opt-in)
# ---------------------------------------------------------------------------


def hydrate_cases(backend: ApiBackend, universe: dict):
    rows = []
    for cid, c in universe["cases"].items():
        rows.append({
            "id": f"case_{cid.lower()}",
            "caseId": cid,
            "title": c["title"],
            "description": "Fictional synthetic case â€” generated for CrimeIntel demo.",
            "status": c["status"],
            "classification": c["classification"],
            "category": c["category"],
            "jurisdiction": c["jurisdiction"],
            "updatedAt": "2026-09-01T00:00:00.000Z",
        })
    for i in range(0, len(rows), BATCH_JSON):
        backend.upsert_rows("InvestigationCase", rows[i:i + BATCH_JSON], conflict_col="caseId")
    print(f"  cases: {len(rows)} hydrated")


def hydrate_relationships(backend: ApiBackend, universe: dict, rel: dict):
    rows = []
    n = 0

    def add(rtype, src, tgt, strength, count, label=None, records=None):
        nonlocal n
        n += 1
        rows.append({
            "id": f"rel_{n}",
            "type": rtype,
            "label": label or rtype.lower(),
            "sourceId": src,
            "targetId": tgt,
            "strength": strength,
            "count": count,
            "records": json.dumps(records) if records else None,
        })

    for e in rel.get("communication", []):
        a, b, cnt = e["a"], e["b"], e["count"]
        add("COMMUNICATION", ent("person", a), ent("person", b),
            min(100, cnt * 2), cnt, records=["synthetic call_records.csv"])
    for e in rel.get("ownership", []):
        tgt = ent(str(e["type"]).lower(), e["target_id"])
        add("OWNERSHIP", ent("person", e["entity"]), tgt, 90, e.get("count", 1),
            records={ "PHONE": ["synthetic subscriber registry"], "VEHICLE": ["synthetic vehicle_records.csv"],
                       "ORGANIZATION": ["synthetic company registry"] }[e["type"]])
    for chain in rel.get("transaction_chains", []):
        for e in chain:
            add("FINANCIAL", ent("person", e["from"]), ent("person", e["to"]),
                45, 1, records=["synthetic financial_transactions.csv"])

    for i in range(0, len(rows), BATCH_JSON):
        backend.upsert_rows("Relationship", rows[i:i + BATCH_JSON])
    print(f"  relationships core: {len(rows)}")
    return n


def aggregate_from_logs(backend: ApiBackend, filename: str):
    """Aggregate personâ†’location (master) and personâ†’vehicle (vehicle) counts."""
    pairs = {}
    path = os.path.join(DATA_DIR, filename)
    with open(path, encoding="utf-8", newline="") as f:
        for raw in csv.DictReader(f):
            if filename == "master_intelligence.csv":
                pid, lid = raw.get("person_id", ""), raw.get("location_id", "")
                if pid and lid:
                    pairs.setdefault(pid, {}).setdefault(("LOCATION", lid), 0)
                    pairs[pid][("LOCATION", lid)] += 1
            elif filename == "vehicle_records.csv":
                pid, vid = raw.get("owner_person_id", ""), raw.get("vehicle_id", "")
                if pid and vid:
                    pairs.setdefault(pid, {}).setdefault(("VEHICLE", vid), 0)
                    pairs[pid][("VEHICLE", vid)] += 1
    return pairs


def hydrate_derived_links(backend: ApiBackend, universe: dict):
    rows = []
    n = 0

    def add(rtype, src, tgt, strength, count, records):
        nonlocal n
        n += 1
        rows.append({
            "id": f"rel_der_{n}",
            "type": rtype,
            "label": rtype.lower(),
            "sourceId": src,
            "targetId": tgt,
            "strength": strength,
            "count": count,
            "records": json.dumps(records),
        })

    loc_pairs = aggregate_from_logs(backend, "master_intelligence.csv")
    for pid, links in loc_pairs.items():
        for (kind, lid), cnt in sorted(links.items(), key=lambda kv: -kv[1])[:6]:
            add("LOCATION", ent("person", pid), ent("location", lid),
                min(100, cnt * 3), cnt, records=["synthetic master_intelligence.csv"])

    veh_pairs = aggregate_from_logs(backend, "vehicle_records.csv")
    for pid, links in veh_pairs.items():
        for (kind, vid), cnt in sorted(links.items(), key=lambda kv: -kv[1])[:4]:
            add("TRANSPORT", ent("person", pid), ent("vehicle", vid),
                min(100, cnt * 4), cnt, records=["synthetic vehicle_records.csv"])

    for i in range(0, len(rows), BATCH_JSON):
        backend.upsert_rows("Relationship", rows[i:i + BATCH_JSON])
    print(f"  relationships derived (location/vehicle): {len(rows)}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def cmd_import(args, cfg):
    backend = make_backend(cfg)
    existing_tables = backend.tables()
    needed = ["Dataset", "DatasetRecord", "DatasetEntity", "Entity",
              "Relationship", "TimelineEvent", "InvestigationCase", "User", "EntityMatch"]
    if not all(t in existing_tables for t in needed):
        print("Applying Prisma schema (schema.sql)â€¦")
        c = backend.apply_schema()
        print(f"  schema applied ({c} statements)")
    else:
        print("Schema already present â€” skipping DDL.")

    with open(os.path.join(DATA_DIR, "entity_universe.json"), encoding="utf-8") as f:
        universe = json.load(f)
    with open(os.path.join(DATA_DIR, "relationships_summary.json"), encoding="utf-8") as f:
        rel = json.load(f)

    alias_sets = {
        pid: p.get("aliases", [])
        for pid, p in universe["persons"].items()
        if p.get("aliases")
    }

    total_merges = 0
    if args.all:
        targets = list(DATASETS)
    elif args.dataset:
        targets = [args.dataset]
        if targets[0] not in DATASETS:
            print("Unknown dataset:", targets[0], "| choose from", list(DATASETS))
            sys.exit(2)
    else:
        print("Specify --all or --dataset <file>")
        sys.exit(2)

    print("Hydrating entity registryâ€¦")
    hydrate_entities(backend, universe)

    for filename in targets:
        print(f"Importing {filename}…")
        merges = import_dataset(backend, filename, args.replace, alias_sets) or []
        total_merges += len(merges)

    if args.hydrate_graph:
        print("Hydrating operational graphâ€¦")
        hydrate_cases(backend, universe)
        hydrate_relationships(backend, universe, rel)
        hydrate_derived_links(backend, universe)
        hydrate_timeline(backend)
    else:
        print("Dataset layer complete. Re-run with --hydrate-graph to populate "
              "Entity graph / Relationships / Timeline, or use the CrimeIntel UI.")

    print(f"DONE. datasets={' '.join(targets)} merges={total_merges}")


def hydrate_timeline(backend: ApiBackend):
    rows = []
    type_map = {
        "FINANCIAL_TXN": "FINANCIAL", "CALL_LOG": "COMMUNICATION",
        "VEHICLE_MOVEMENT": "VEHICLE", "REGISTRATION_RECORD": "GENERAL",
    }
    plane = {
        "LOCATION_PING": "LOCATION", "SIGHTING_REPORT": "LOCATION",
    }
    n = 0
    path = os.path.join(DATA_DIR, "master_intelligence.csv")
    with open(path, encoding="utf-8", newline="") as f:
        for ri, raw in enumerate(csv.DictReader(f)):
            if not raw.get("case_id"):
                continue
            if ri % 40 != 0:
                continue
            etype = raw["event_type"]
            ev_type = type_map.get(etype) or plane.get(etype) or ("VEHICLE" if etype == "VEHICLE_MOVEMENT" else "GENERAL")
            if etype in ("VEHICLE_MOVEMENT", "REGISTRATION_RECORD") and raw.get("vehicle_id"):
                entity_id = ent("vehicle", raw["vehicle_id"])
            elif raw.get("location_id") and etype in ("LOCATION_PING", "SIGHTING_REPORT"):
                entity_id = ent("location", raw["location_id"])
            else:
                entity_id = ent("person", raw["person_id"])
            n += 1
            rows.append({
                "id": f"tle_master_{n}",
                "type": ev_type,
                "summary": f"{etype.replace('_', ' ').title()} involving {raw.get('person_name', raw.get('person_id', ''))}",
                "detail": (raw.get("notes") or etype) + (f" â€” â‚¹{raw['amount_inr']}" if raw.get("amount_inr") else ""),
                "eventAt": to_iso(raw.get("event_date", "2026-08-01T00:00:00.000Z")),
                "entityId": entity_id,
                "caseId": f"case_{raw['case_id'].lower()}",
            })
    for i in range(0, len(rows), BATCH_JSON):
        backend.upsert_rows("TimelineEvent", rows[i:i + BATCH_JSON])
    print(f"  timeline events: {n}")


def cmd_clear(args, cfg):
    backend = make_backend(cfg)
    names = [f"synthetic_{d}" for d in DATASETS]
    placeholder = ",".join("'" + n.replace("'", "''") + "'" for n in names)
    sql = f"""
      DELETE FROM "DatasetEntity"
        WHERE "datasetId" IN (SELECT id FROM "Dataset" WHERE name IN ({placeholder}));
      DELETE FROM "DatasetRecord"
        WHERE "datasetId" IN (SELECT id FROM "Dataset" WHERE name IN ({placeholder}));
      DELETE FROM "Dataset" WHERE name IN ({placeholder});
      DELETE FROM "EntityMatch" WHERE "entityAId" LIKE 'ent\\_%' OR "entityBId" LIKE 'ent\\_%';
      DELETE FROM "Relationship" WHERE "sourceId" LIKE 'ent\\_%' OR "targetId" LIKE 'ent\\_%';
      DELETE FROM "TimelineEvent" WHERE "entityId" LIKE 'ent\\_%' OR "caseId" IN (SELECT id FROM "InvestigationCase" WHERE "caseId" LIKE 'CR-2026-2%');
      DELETE FROM "Entity" WHERE id LIKE 'ent\\_%';
      DELETE FROM "InvestigationCase" WHERE "caseId" LIKE 'CR-2026-2%';
    """
    if args.also_drop_staging:
        sql += '\n DROP TABLE IF EXISTS "entities";'
    backend.run_sql(sql)
    print("Cleared synthetic demo data (Datasets, DatasetRecords, Entities, Relationships, Timeline, Cases).")
    if args.also_drop_staging:
        print("Dropped stale staging table 'entities'.")


def make_backend(cfg):
    # Preferred: direct PostgreSQL (transactional, fast). Fall back to API.
    try:
        if cfg.get("database_url"):
            from psycopg2 import OperationalError as _OpErr

            b = PgBackend(cfg)
            print("Backend: PostgreSQL (direct psycopg2)")
            return b
    except Exception as e:
        print(f"Direct PostgreSQL unavailable ({e}) â€” using Supabase REST API over HTTPS.")
    if not cfg.get("management_token"):
        print("NOTE: management token absent; DDL via api mode requires it.")
    return ApiBackend(cfg)


def main():
    ap = argparse.ArgumentParser(description="Import synthetic CrimeIntel data into Supabase.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_im = sub.add_parser("import", help="Import datasets.")
    p_im.add_argument("--all", action="store_true", help="Import all 5 datasets.")
    p_im.add_argument("--dataset", help="Import a single dataset file name.")
    p_im.add_argument("--replace", action="store_true", help="Drop + re-import existing dataset.")
    p_im.add_argument("--hydrate-graph", action="store_true", help="Also populate Entity/Relationship/Timeline.")
    p_im.set_defaults(fn=cmd_import)

    p_cl = sub.add_parser("clear", help="Remove synthetic demo data (keeps app data).")
    p_cl.add_argument("--also-drop-staging", action="store_true", help="Also drop the old flat staging table 'entities'.")
    p_cl.set_defaults(fn=cmd_clear)

    args = ap.parse_args()
    cfg = load_config()
    args.fn(args, cfg)


if __name__ == "__main__":
    main()
