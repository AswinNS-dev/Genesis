# CrimeIntel

An enterprise-grade AI-assisted criminal investigation and forensic intelligence platform built with **Python (FastAPI)** and **React (TypeScript + Vite)**.

---

## Architecture Overview

```
CrimeIntel/
│
├── frontend/                         # React + TypeScript (Vite)
│   ├── public/
│   ├── src/
│   │   ├── app/                      # Router & Context Providers
│   │   ├── components/               # UI, Layout, Charts, Graph
│   │   ├── features/
│   │   │   ├── dashboard/            # Executive summary metrics & activity stream
│   │   │   ├── cases/                # FIR Case Management & Sub-resources
│   │   │   ├── entities/             # 100k+ Entity Registry & Search
│   │   │   ├── analysis/             # Graph analysis, NER, Link analysis & Anomaly
│   │   │   ├── reports/              # Case Intelligence Reports & 360° Entity Dossiers
│   │   │   ├── security/             # Security Governance, RBAC & Audit Event Trail
│   │   │   ├── blockchain/           # SHA-256 Notarized Evidence Ledger
│   │   │   └── data-workspace/       # Raw dataset ingestion & normalization
│   │   ├── services/                 # API Clients (cases, entities, auth, reports, audit)
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                          # Python + FastAPI
│   ├── app/
│   │   ├── main.py                   # FastAPI application entry & route registration
│   │   ├── api/
│   │   │   ├── routes/               # REST API endpoints (cases, entities, reports, audit, etc.)
│   │   │   ├── controllers/          # Business logic controllers
│   │   │   └── schemas/              # Pydantic validation schemas
│   │   ├── core/                     # Case & Entity domain logic
│   │   ├── data_processing/          # Parsers & Normalizers
│   │   ├── intelligence/             # AI Matchers & Anomaly detectors
│   │   │   ├── ner/                  # Named Entity Recognition (DistilBERT)
│   │   │   ├── entity_resolution/    # Multi-signal Entity Matching & Canonicalization
│   │   │   ├── location_analysis/    # Spatial anomaly detection
│   │   │   ├── lead_generator/       # XGBoost lead prioritization
│   │   │   ├── summarizer/           # FLAN-T5 case summarization
│   │   │   └── explainability/       # SHAP values & evidence provenance
│   │   ├── graph/                    # Network Graph & Shortest Path algorithms
│   │   ├── database/                 # SQLAlchemy 2.0 ORM & Supabase Service
│   │   │   ├── models.py             # Schema models (Cases, Entities, AuditLog, etc.)
│   │   │   ├── connection.py         # DB connection & table sync
│   │   │   └── repositories/         # Data access repositories
│   │   ├── security/                 # Auth, RBAC, Threat Detection & Audit Logging
│   │   │   ├── authentication.py     # JWT & bcrypt password hashing
│   │   │   ├── rbac.py               # Role hierarchy & permissions guard
│   │   │   ├── audit.py              # Centralized audit logging helper
│   │   │   └── threat_detection.py   # Brute-force & lockouts
│   │   ├── blockchain/               # SHA-256 Chained Evidence Ledger & Verification
│   │   ├── storage/                  # Supabase Storage & local uploads
│   │   ├── reports/                  # Case Report & 360° Dossier Generator
│   │   └── config/                   # Settings & Environment (.env)
│   ├── tests/                        # Pytest test suite
│   ├── requirements.txt
│   └── .env.example
│
├── data/                             # Synthetic & sample datasets
│   ├── raw/synthetic_entities_100k.csv
│   └── processed/
│
├── seed.py                           # Database seeder (Demo users, cases, audit trail, alerts)
├── .gitignore
├── README.md
└── docker-compose.yml
```

---

## Key Modules & Features

### 1. Investigation Reports & 360° Entity Dossiers
- **Official Case Reports**: Compiles live investigation data across multiple investigative vectors into official law enforcement dossiers:
  - FIR docket metadata, jurisdiction, IPC sections, and assigned investigator
  - Tracked entities with forensic risk ratings
  - Network relationship graph & connection strengths
  - Chronological timeline of all case-related events
  - Call Detail Records (CDR) with anomaly detection flags
  - Financial transaction logs with suspicious threshold alerts
  - Toll and GPS location pings
  - Evidence documents with cryptographic SHA-256 blockchain verification seals
  - AI Multi-Signal Entity Resolution findings
  - Complete chain-of-custody audit trail
  - Export capabilities (Print-ready document layout and JSON export)
- **360° Person & Entity Dossier**:
  - Live query against 100,000+ entity records
  - Complete identity profile with confidence and verification status
  - Registered phone numbers, vehicle plates, and frequent locations
  - Known aliases and street monikers
  - Linked criminal court cases and cross-jurisdiction FIRs
  - Network intelligence graph nodes and primary connections

### 2. Security Governance & Audit Trail
- **Comprehensive Audit Logging**:
  - Every critical action records `event_id`, `actor`, `role`, `action`, `resource`, `resource_id`, `timestamp`, `status`, `severity`, and session IP/User-Agent metadata
  - Tracks state transitions (e.g. `PROBABLE_MATCH` → `CONFIRMED` / `REJECTED`)
  - Audited events: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `ENTITY_RESOLUTION_ANALYSIS`, `ENTITY_MATCH_CONFIRMED`, `ENTITY_MATCH_REJECTED`, `REPORT_GENERATED`, `DOSSIER_VIEWED`, `EVIDENCE_VERIFIED`, `PROXY_ASSOCIATION_REVIEW`, `UNAUTHORIZED_ACCESS_ATTEMPT`
- **Interactive Security Dashboard**:
  - Top-level metrics for total events, successful logins, failed attempts, investigator ops, and active security alerts
  - Searchable and multi-attribute filterable audit event table (by action, resource, severity, status, keyword, date range)
  - Modal inspection showing complete event provenance and state transitions
  - Real-time Security Alerts feed (e.g., brute-force attack attempts, off-hours batch queries)
  - Authentication Gate Attempt history log
- **Multi-Tier RBAC**:
  - Strict hierarchical permissions: `VIEWER` < `ANALYST` < `INVESTIGATOR` < `ADMIN`
  - Automated threat evaluation locking accounts after consecutive invalid attempts
- **Blockchain Integrity Verification**:
  - SHA-256 linked blocks ensuring digital evidence and audit integrity cannot be altered without breaking the cryptographic chain

### 3. Unified Intelligence Pipeline
1. **Raw Intelligence** (Uploaded Evidence, CSVs, Telecom Dumps, Bank Feeds)
   ↓
2. **NER** (Extracts unstructured text into structured Entities using DistilBERT)
   ↓
3. **Entity Resolution** (Matches names, aliases, phones, DOB, and addresses into Canonical Entities with confidence scores)
   ↓
4. **Canonical Entities** (Unified profiles across police stations and departments)
   ↓
5. **Knowledge Graph** (Nodes & Edges representing links, call frequencies, and financial flows)
   ↓
6. **Location Analysis** (IsolationForest / DBSCAN for tracking movement anomalies and hotspots)
   ↓
7. **Investigation Lead Generator** (XGBoost Ranker prioritizing cross-case associations)
   ↓
8. **Explainability Layer** (SHAP values & Evidence Provenance ensuring transparent decision-making)
   ↓
9. **AI Investigation Summarizer** (Seq2Seq FLAN-T5 converting tabular facts into natural language briefings)
   ↓
10. **Investigator Dashboard & Dossiers** (Interactive review where officers verify leads and export confidential reports)

*All models emphasize Weak Supervision and maintain the strict principle that AI provides investigative assistance and never determines guilt.*

---

## Core API Endpoints

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `GET` | `/api/auth/demo-users` | Fetch demo accounts with role badges |
| **Auth** | `POST` | `/api/auth/login` | JWT authentication with threat evaluation |
| **Auth** | `POST` | `/api/auth/logout` | Session termination and audit record |
| **Auth** | `GET` | `/api/auth/me` | Current authenticated officer profile |
| **Reports** | `GET` | `/api/reports/cases` | List cases available for reporting |
| **Reports** | `GET` | `/api/reports/generate?caseId={id}` | Generate full confidential investigation report |
| **Reports** | `GET` | `/api/reports/preview?caseId={id}` | Preview report without final audit seal |
| **Reports** | `GET` | `/api/reports/dossier/{entity_id}` | Generate 360° person/entity dossier |
| **Reports** | `GET` | `/api/reports/entities/search?q={term}` | Search registry for subjects & assets |
| **Audit** | `GET` | `/api/audit/summary` | Dashboard metrics & vault integrity status |
| **Audit** | `GET` | `/api/audit/events` | Paginated and filterable audit event log |
| **Audit** | `GET` | `/api/audit/events/{id}` | Detailed audit record & state transition |
| **Audit** | `GET` | `/api/audit/security-alerts` | Real-time threat alerts feed |
| **Audit** | `GET` | `/api/audit/login-attempts` | Recent authentication attempts log |
| **Cases** | `GET` | `/api/cases` | List FIR cases with filters and pagination |
| **Cases** | `GET` | `/api/cases/{id}` | FIR case details and summary metrics |
| **Cases** | `GET` | `/api/cases/{id}/network` | Graph nodes and edges for case |
| **Cases** | `GET` | `/api/cases/{id}/timeline` | Case activity history & timeline |
| **Entities** | `GET` | `/api/entities` | Query 100k+ master entity registry |
| **Intelligence** | `POST` | `/api/intelligence/ner` | Forensic Named Entity Recognition |
| **Intelligence** | `POST` | `/api/intelligence/entity-resolution` | Multi-signal entity resolution |
| **Intelligence** | `PATCH`| `/api/intelligence/entity-matches/{id}`| Confirm or reject entity match (audited) |
| **Blockchain** | `GET` | `/api/blockchain/ledger` | Query notarized evidence chain |

---

## Quickstart

### 1. Python Backend Setup
```bash
# 1. Install Python dependencies
pip install -r backend/requirements.txt

# 2. Seed database with demo accounts, sample cases, entity matches, and audit trail
python seed.py

# 3. Launch FastAPI backend (http://localhost:8000)
python backend/app/main.py
```

### 2. React Frontend Setup
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Launch Vite development server (http://localhost:3000)
npm run dev
```

Or run both concurrently from the project root:
```bash
npm run dev:all
```

### 3. Demo Credentials
The database comes pre-seeded with ready-to-test RBAC accounts:
- **Chief Inspector / Admin**: `admin@crimeintel.demo` / `Admin@1234`
- **Lead Investigator**: `investigator@crimeintel.demo` / `Investigator@1234`
- **Forensic Analyst**: `analyst@crimeintel.demo` / `Analyst@1234`
- **Field Officer / Viewer**: `viewer@crimeintel.demo` / `Viewer@1234`

### 4. Running Tests
```bash
# Run backend test suite
pytest
```
