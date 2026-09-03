<div align="center">

# 🛡️ CrimeIntel Platform
### *Enterprise AI-Assisted Criminal Investigation & Forensic Intelligence Engine*

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud%20Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Blockchain](https://img.shields.io/badge/Blockchain-SHA--256%20Vault-F7931A?style=for-the-badge&logo=blockchaindotcom&logoColor=white)](https://en.wikipedia.org/wiki/SHA-2)

<p align="center">
  <b>A state-of-the-art forensic intelligence system designed for law enforcement agencies, cybercrime cells, and investigative officers to connect fragmented records, resolve identities across jurisdictions, and automate investigative reporting with end-to-end cryptographic auditability.</b>
</p>

[Key Features](#-key-modules--features) • [System Architecture](#-system-architecture) • [AI Pipeline](#-unified-intelligence-pipeline) • [Quickstart Guide](#-quickstart-guide) • [API Reference](#-core-api-reference) • [Demo Credentials](#-pre-seeded-demo-credentials)

</div>

---

## 🌟 Executive Summary

Modern law enforcement agencies face a severe intelligence silo problem: **suspects change names, swap SIM cards, operate shell companies, and move across state lines.** Critical evidence is scattered across call detail records (CDR), bank statements, toll scans, FIR registries, and handwritten police logs.

**CrimeIntel** solves this by unifying cross-jurisdictional data through a **multi-stage AI pipeline** and **cryptographic governance layer**:
1. **Multi-Signal Entity Resolution**: Deduplicates identities (e.g. *Ramu Kumar* ↔ *Ramesh Kumar*) using phonetics, DOB, shared telephone numbers, co-location pings, and proxy associations.
2. **Interactive 360° Subject Dossiers**: Compiles full suspect profiles across 100,000+ records in milliseconds.
3. **Automated FIR Investigation Reports**: Assembles court-admissible dossiers with chronological timelines, call graphs, transaction flows, and AI lead scoring.
4. **Immutable Security & Audit Trail**: Cryptographically seals every investigator decision, access attempt, and evidence verification in an tamper-evident ledger.
5. **Blockchain Evidence Vault**: Protects chain of custody with SHA-256 chained notarization.

---

## 🚀 Key Modules & Features

### 1. 📂 Investigation Reports & Case Dossiers
*Transform weeks of manual docket compilation into instant, court-ready intelligence briefings.*
- **Automated Multi-Vector Aggregation**: Pulls case metadata, IPC sections, tracked entities, call logs, bank transfers, toll scans, and physical evidence into a unified view.
- **Forensic Risk Scoring**: Color-coded risk indicators highlighting primary targets vs. secondary associates.
- **Visual AI Evidence Seals**: Embedded multi-signal entity matching breakdowns showing match confidence (e.g. 91% match with supporting vs. counter-evidence).
- **Export & Print Ready**: Browser-native print styling and JSON data export for inter-departmental distribution.

### 2. 👤 360° Person & Entity Dossier
*Full-spectrum suspect profiling queried directly from over 100,000 master entities.*
- **Identifier Correlator**: Links primary names with street aliases, phone numbers, registered vehicles, and addresses.
- **Linked FIR Cross-Search**: Uncovers related court dockets and criminal records filed across different police stations.
- **Network Intelligence**: Interactive ego-network showing connected associates, relationship types (*CO_CONSPIRATOR*, *OPERATES_VEHICLE*, *DIRECTOR*), and tie strengths.

### 3. 🛡️ Cryptographic Security Governance & Audit Trail
*Zero-trust auditing designed for rigorous evidentiary compliance and chain-of-custody integrity.*
- **Granular Event Capture**: Every system action logs `event_id`, `actor`, `role`, `action`, `resource`, `resource_id`, `timestamp`, `status`, `severity`, and session IP/User-Agent metadata.
- **State Transition Auditing**: Tracks before-and-after states for critical investigator decisions (e.g. `PROBABLE_MATCH` → `CONFIRMED` / `REJECTED`).
- **Real-Time Security Feed**: Automated brute-force detection, suspicious login flagging, and off-hours query monitoring.
- **Multi-Attribute Filters**: Filter thousands of audit records by action type, severity, user, resource, date range, or free text.
- **Deep Inspection Modal**: Click any audit event to reveal complete provenance and session context.

### 4. 🔗 SHA-256 Blockchain Evidence Vault
*Mathematical proof that forensic documents have not been tampered with or replaced.*
- **Cryptographic Chaining**: Every piece of digital evidence is hashed (SHA-256) and notarized in an immutable block containing the previous block's hash.
- **Instant Tamper Detection**: Real-time blockchain validator verifies chain continuity and flags any modified blocks immediately.

### 5. 🕸️ Graph Intelligence & Link Analysis
- Force-directed graph visualization rendering complex suspect syndicates.
- Dijkstra-based shortest pathfinding between suspects, bank accounts, and shell entities.
- Centrality metrics (Degree, Betweenness, PageRank) identifying network ringleaders and critical financial bridges.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  PRESENTATION LAYER                                    │
│       React 18  •  TypeScript  •  Vite  •  TailwindCSS  •  Lucide Icons  •  Zustand     │
│                                                                                        │
│  [ Executive Dashboard ]   [ FIR Case Manager ]   [ 360° Entity Dossiers ]             │
│  [ Link Analysis Graph ]   [ Evidence Vault ]     [ Security Governance & Audit Trail ]│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / REST / Secure JWT
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                   API GATEWAY & SECURITY                                │
│        FastAPI  •  Pydantic v2  •  HS256 JWT  •  RBAC Hierarchy  •  Threat Detection   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                 CORE APPLICATION SERVICES                               │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌────────────────────────────┐ │
│  │   Report Generator    │  │   Audit & Security    │  │   Blockchain Vault Engine  │ │
│  │   Case Dossier Engine │  │   State Transition Log│  │   SHA-256 Chained Notary   │ │
│  └───────────────────────┘  └───────────────────────┘  └────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                            AI / ML INTELLIGENCE SUITE                            │  │
│  │  • DistilBERT NER (Named Entity Extraction)                                      │  │
│  │  • Multi-Signal Entity Resolver (Jaro-Winkler + Levenshtein + Phone/DOB Matching)│  │
│  │  • IsolationForest & DBSCAN (Geospatial & Spatio-Temporal Anomaly Detection)     │  │
│  │  • XGBoost Lead Ranker (Cross-Case Association Prioritization)                   │  │
│  │  • Seq2Seq FLAN-T5 (Forensic Briefing Summarizer)                                │  │
│  │  • SHAP Explainability & Evidence Provenance Layer                               │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                    DATA STORAGE TIER                                   │
│   • Local SQLite Database (SQLAlchemy 2.0 ORM for low-latency session & state)          │
│   • Supabase Cloud Database (PostgreSQL hosting 100,000+ Master Synthetic Entities)    │
│   • Supabase Storage (Encrypted Evidence Documents & CDR Uploads)                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Unified Intelligence Pipeline

```
[ Raw Intelligence ]
(Uploaded Evidence, Telecom CDR Dumps, Bank Feeds, Toll Scans, Handwritten Logs)
         │
         ▼
[ DistilBERT NER Extraction ]
(Discovers Persons, Organizations, Vehicles, Locations, and Identifiers)
         │
         ▼
[ Multi-Signal Entity Resolution ]
(Calculates similarity matrix across Names, DOB, Telephones, Addresses, and Associates)
         │
         ▼
[ Canonical Master Entities ]
(Resolves duplicate profiles across separate police stations into one single truth)
         │
         ▼
[ Knowledge Graph Builder ]
(Constructs dynamic nodes & typed edges: CO_CONSPIRATOR, TRANSACTED_WITH, CALL_INTERCEPT)
         │
         ▼
[ Anomaly & Temporal Analysis ]
(IsolationForest flags off-hours communications, rapid burner swaps, and toll pings)
         │
         ▼
[ XGBoost Lead Prioritizer ]
(Scores cross-case criminal associations to surface high-priority investigatory leads)
         │
         ▼
[ SHAP Explainability & Provenance ]
(Generates human-interpretable reasons why an entity was flagged without black-box bias)
         │
         ▼
[ Investigator Review & Dossier Export ]
(Officer verifies or rejects findings; actions are permanently sealed in Audit Log)
```

> [!NOTE]
> *All AI models operate under a **Weak Supervision** framework. The platform provides explainable leads to empower human officers; AI never makes final criminal determinations.*

---

## ⚡ Quickstart Guide

### Prerequisites
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** & **npm**
- **Git**

### 1. Clone & Set Up Environment
```bash
git clone https://github.com/AswinNS-dev/Genesis.git
cd Genesis

# Create and configure .env from template
cp .env.example .env
```

### 2. Backend Installation & Database Seeding
```bash
# Install Python requirements
pip install -r backend/requirements.txt

# Seed the database with demo accounts, sample FIR cases, entity links, and audit history
python seed.py
```

### 3. Frontend Installation
```bash
cd frontend
npm install
cd ..
```

### 4. Launch the Platform
You can run both backend and frontend concurrently with a single command:
```bash
npm run dev:all
```
- **Web Console**: `http://localhost:3000`
- **FastAPI Documentation (Swagger)**: `http://localhost:8000/docs`
- **FastAPI ReDoc**: `http://localhost:8000/redoc`

---

## 🔑 Pre-Seeded Demo Credentials

The platform includes 4 role-tiered demo accounts matching real-world law enforcement hierarchies:

| Role Title | Email | Default Password | Permissions & Access Scope |
|---|---|---|---|
| **Chief Inspector / Admin** | `admin@crimeintel.demo` | `Admin@1234` | Full system governance, security audit logs, user management, and ledger verification |
| **Lead Investigator** | `investigator@crimeintel.demo` | `Investigator@1234` | Case creation, suspect tracking, entity match review, report generation, and evidence sealing |
| **Forensic Analyst** | `analyst@crimeintel.demo` | `Analyst@1234` | Graph link analysis, anomaly detection, temporal queries, and lead generation |
| **Field Officer / Viewer** | `viewer@crimeintel.demo` | `Viewer@1234` | Read-only access to published dossiers, evidence documents, and public reports |

---

## 📡 Core API Reference

### 📑 Reports & Dossiers
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/reports/cases` | List all cases available for report generation |
| `GET` | `/api/reports/generate?caseId={id}` | Generate full comprehensive investigation report (audited) |
| `GET` | `/api/reports/preview?caseId={id}` | Preview report without recording permanent generation seal |
| `GET` | `/api/reports/dossier/{entity_id}` | Generate 360° subject intelligence dossier (audited) |
| `GET` | `/api/reports/entities/search?q={query}` | Search registry for suspects, vehicles, or phone identifiers |

### 🛡️ Security & Audit
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/audit/summary` | Dashboard metric counts & cryptographic vault integrity status |
| `GET` | `/api/audit/events` | Filtered, paginated audit log (filters: action, severity, user, dates) |
| `GET` | `/api/audit/events/{id}` | Complete event inspection with state transition and session IP |
| `GET` | `/api/audit/security-alerts` | Real-time threat feeds (e.g. brute-force, anomalous bulk queries) |
| `GET` | `/api/audit/login-attempts` | History of all successful and failed authentication attempts |

### 🔐 Authentication & Session
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/auth/demo-users` | Retrieve pre-seeded demo officers with role descriptions |
| `POST` | `/api/auth/login` | Authenticate officer, issue secure JWT cookie, evaluate threat rules |
| `POST` | `/api/auth/logout` | Invalidate active session and record `LOGOUT` in audit ledger |
| `GET` | `/api/auth/me` | Retrieve profile and RBAC clearance level of current officer |

### 📁 Cases & Entities
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/cases` | List FIR cases with search, jurisdiction, and category filters |
| `GET` | `/api/cases/{id}` | Detailed case dossier with summary metrics |
| `GET` | `/api/cases/{id}/network` | Graph nodes and edges for suspects linked to case |
| `GET` | `/api/cases/{id}/timeline` | Chronological activity timeline (CDR, transactions, toll events) |
| `GET` | `/api/entities` | Query 100,000+ Master Entity Registry with type filtering |

### 🤖 Intelligence & Graph Analysis
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/intelligence/ner` | Extract forensic entities from unstructured case narrative |
| `POST` | `/api/intelligence/entity-resolution`| Multi-signal entity resolution against master registry |
| `PATCH`| `/api/intelligence/entity-matches/{id}`| Confirm or reject candidate entity link (records audit transition) |
| `GET` | `/api/analysis/graph` | Global network graph nodes & edges |
| `GET` | `/api/analysis/path?source={a}&target={b}` | Shortest pathfinder between two suspects |
| `GET` | `/api/blockchain/ledger` | Query notarized evidence blocks and verify integrity |

---

## 🧪 Testing & Verification

Run the automated test suite to ensure backend APIs and AI pipelines are functioning:

```bash
# Run pytest test suite
pytest -v

# Run frontend production build check (TypeScript + Vite)
npm --prefix frontend run build
```

---

## 📜 Compliance, Integrity & Legal Disclaimer

1. **Law Enforcement Use Only**: CrimeIntel is designed strictly as an assistive intelligence platform for authorized law enforcement and forensic investigators.
2. **Weak Supervision Protocol**: All machine learning predictions (lead scoring, entity matching, anomaly detection) must be human-reviewed and confirmed by an authorized investigator before being entered into legal proceedings.
3. **Data Provenance Preservation**: When resolving identities (e.g. *Ramu Kumar* vs. *Ramesh Kumar*), source records are **never** overwritten or destroyed. Both original station records are preserved with full chain-of-custody provenance.

---

<div align="center">
  <sub>Built with ❤️ for the Smart India Hackathon (SIH) • CrimeIntel Platform</sub>
</div>
