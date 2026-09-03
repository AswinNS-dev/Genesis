<div align="center">

# 🛡️ CrimeIntel: AI-Powered Criminal Network Analysis System

## 📌 Problem Statement (ID: 26189)

### **Title:** AI-Powered Criminal Network Analysis System

### **Background & Challenges**
Modern criminal operations are rarely isolated—they are increasingly organized, decentralized, and cross-jurisdictional. Criminal syndicates operate through loose networks of associates, front companies, proxies, and multi-layered communication and financial channels.

Law enforcement agencies collect enormous quantities of data from diverse sources:
* 📄 **First Information Reports (FIRs)** and unstructured police case narratives
* 📞 **Call Detail Records (CDRs)** and tower triangulation dumps
* 💳 **Financial Transaction Records** (bank accounts, UPI, Hawala, cash structuring)
* 📍 **Surveillance, Toll Scans & Location Logs** (ANPR, cell tower pings, GPS)
* 🏛️ **Criminal History Databases & Court Dockets**

### **The Critical Bottlenecks**
1. **Data Fragmentation & Silos**: Information is distributed across incompatible databases, police stations, and government departments with no single source of truth.
2. **Identity Obfuscation**: Suspects frequently alter name spellings (e.g., *Ramu Kumar* vs. *Ramesh Kumar*), swap burner SIMs, use shared family vehicles, or channel funds through shell entities.
3. **Manual Analysis Fatigue**: Connecting thousands of CDR records, bank statements, and FIR narratives manually is painfully slow, labor-intensive, and prone to missing crucial cross-case links.
4. **Lack of Evidentiary Auditability**: When analytical links are produced, investigators lack cryptographic provenance, making evidence susceptible to legal challenge in court.

### **Core Objective**
Develop an AI-powered system that automatically ingests structured and unstructured crime-related data to **uncover hidden networks**, **identify key influencers**, **detect anomalous behavioral patterns**, and **deliver actionable, court-admissible intelligence** for investigators.

---

## 💡 The Proposed Solution

**CrimeIntel** addresses every facet of Problem Statement 26189 by combining modern **Natural Language Processing (NLP)**, **Multi-Signal Entity Resolution**, **Graph Analytics**, **Machine Learning Anomaly Detection**, and **Cryptographic Governance**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CRIMEINTEL SOLUTION MATRIX                                     │
├──────────────────────────────┬──────────────────────────────────┬────────────────────────────────┤
│ SIH Requirement (PS 26189)   │ CrimeIntel Capability            │ Core Technology Stack          │
├──────────────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ Multi-source Ingestion       │ Unified Forensic Data Workspace  │ FastAPI, Supabase, Pandas      │
│ Entity Extraction            │ Automated Forensic NER Engine    │ DistilBERT Transformer         │
│ Identity Resolution          │ Multi-Signal Link Resolver       │ Jaro-Winkler, Levenshtein, ML │
│ Relationship Mapping         │ Dynamic Knowledge Graph          │ Force-Directed D3 Graph        │
│ Key Influencer Discovery     │ Graph Centrality Metrics         │ PageRank, Betweenness, Degree  │
│ Suspicious Pattern Detection │ Spatial-Temporal Anomaly Engine  │ IsolationForest, DBSCAN        │
│ Lead Generation & Scoring    │ Cross-Case Association Ranker    │ XGBoost Ranker + SHAP Values   │
│ Evidentiary Audit Trail      │ Immutable State Audit Ledger     │ Relational Audit Log + RBAC    │
│ Tamper-Evident Evidence      │ Digital Custody Chain Vault      │ SHA-256 Blockchain Ledger      │
│ Actionable Output            │ Official Reports & 360° Dossiers │ React 18, Vite, Tailored PDF   │
└──────────────────────────────┴──────────────────────────────────┴────────────────────────────────┘
```

---

## ⚙️ How It Is Implemented

### 1. 🔍 Automated Forensic Named Entity Recognition (NER)
- **Problem Addressed**: Unstructured narrative FIRs and witness transcripts conceal crucial suspect names, vehicle plates, phone numbers, and meeting spots.
- **Implementation**:
  - Implemented a fine-tuned **DistilBERT** transformer model (`backend/app/intelligence/ner/`) specialized on Indian law enforcement text.
  - Automatically parses free-text FIR summaries to extract typed entities: `PERSON`, `ORGANIZATION`, `VEHICLE`, `PHONE`, `LOCATION`, and `IPC_SECTION`.
  - Normalizes extracted values (E.164 phone standards, standard vehicle registration formats, Indian Penal Code sections).

### 2. 🪪 Multi-Signal Entity Resolution (Identity Deduplication)
- **Problem Addressed**: Suspects appear under different aliases across police stations (e.g., *Ramu Kumar* in Delhi vs. *Ramesh Kumar* in Noida).
- **Implementation**:
  - A deterministic & probabilistic multi-signal resolution engine (`backend/app/intelligence/entity_resolution/`).
  - Evaluates five independent weighted forensic signals:
    $$\text{Match Confidence} = w_1 \cdot \text{NameSim} + w_2 \cdot \text{PhoneMatch} + w_3 \cdot \text{DOBMatch} + w_4 \cdot \text{AddressSim} + w_5 \cdot \text{VehicleOverlap}$$
  - Preserves data provenance: **original police records are never overwritten**. Both source stations' records remain untouched while generating a unified canonical profile.
  - Allows investigators to review proposed candidate matches (`PROBABLE_MATCH` → `CONFIRMED` / `REJECTED`) with an automatic audit trail.

### 3. 🕸️ Dynamic Knowledge Graph & Key Influencer Identification
- **Problem Addressed**: Identifying hidden ringleaders, cut-outs, and money laundering conduits within large networks.
- **Implementation**:
  - Graph builder (`backend/app/graph/builder.py`) unifies entities into typed nodes (`PERSON`, `ORGANIZATION`, `LOCATION`, `VEHICLE`, `ACCOUNT`) and weighted edges (`COMMUNICATED_WITH`, `TRANSACTED_WITH`, `CO_LOCATED`, `DIRECTOR_OF`, `OPERATES_VEHICLE`).
  - Computes network centrality algorithms (`backend/app/services/graph_analysis_service.py`):
    - **PageRank**: Detects the most influential actors receiving structural coordination.
    - **Betweenness Centrality**: Pinpoints critical "gatekeepers" and financial intermediaries connecting otherwise disjointed crews.
    - **Degree Centrality**: Highlights highly active operatives with high call/transaction volumes.
  - Interactive force-directed frontend visualization with shortest path discovery between any two selected targets.

### 4. 🚨 Suspicious Pattern & Anomaly Detection
- **Problem Addressed**: Criminals exploit off-hours communication bursts, rapid phone swaps, and cash structuring to avoid detection.
- **Implementation**:
  - **Spatio-Temporal Analysis** (`backend/app/intelligence/location_analysis/`): Utilizes **IsolationForest** and **DBSCAN** spatial clustering to detect unusual travel velocities (e.g., physically impossible transit between cell towers) and sudden off-hours visits to remote warehouses.
  - **Communication Anomaly Detection**: Flags late-night calling bursts (e.g., 3:00 AM spikes between unassociated burner handsets).
  - **Financial Structuring Alerts**: Automatically flags repeated sub-threshold transactions structured to bypass statutory reporting limits.

### 5. 📑 Automated Investigation Reports & 360° Entity Dossiers
- **Problem Addressed**: Officers waste days manually drafting case files and cross-referencing dockets.
- **Implementation**:
  - **Case Intelligence Report Engine** (`backend/app/reports/generator.py`): Aggregates FIR docket details, suspects, network links, chronological timelines, CDRs, transaction logs, and AI lead findings into an official court-ready document with print and JSON export.
  - **360° Subject Dossier**: Instant live lookup over **100,000+ Master Entities** hosted on Supabase, revealing primary identity, street aliases, registered vehicle assets, phone numbers, linked FIR court cases, and network ties in a single view.

### 6. 🛡️ Cryptographic Security Governance & Audit Trail
- **Problem Addressed**: Preventing unauthorized data tampering, preserving evidentiary admissibility in court, and enforcing strict officer access control.
- **Implementation**:
  - **Hierarchical RBAC**: Strict role enforcement (`VIEWER` < `ANALYST` < `INVESTIGATOR` < `ADMIN`) with automated brute-force lockout shields.
  - **Immutable Audit Ledger** (`backend/app/api/routes/audit_routes.py`): Every access, search, report generation, dossier view, and entity match confirmation records `event_id`, `actor`, `role`, `action`, `resource`, `timestamp`, `status`, `severity`, before-and-after state transitions, and session IP/User-Agent metadata.
  - **SHA-256 Blockchain Evidence Vault** (`backend/app/blockchain/`): Notarizes every piece of digital evidence in a cryptographically chained block ledger. Any alteration to evidence instantly breaks the hash continuity, alerting investigators to data tampering.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  PRESENTATION TIER                                     │
│       React 18  •  TypeScript  •  Vite  •  TailwindCSS  •  Lucide Icons  •  Zustand     │
│                                                                                        │
│  [ Executive Dashboard ]   [ FIR Case Manager ]   [ 360° Entity Dossiers ]             │
│  [ Graph Link Analysis ]   [ Evidence Vault ]     [ Security Governance & Audit Trail ]│
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
│  │  • DistilBERT NER (Named Entity Extraction from narratives)                      │  │
│  │  • Multi-Signal Entity Resolver (Jaro-Winkler + Levenshtein + Phone/DOB Matching)│  │
│  │  • IsolationForest & DBSCAN (Geospatial & Spatio-Temporal Anomaly Detection)     │  │
│  │  • XGBoost Lead Ranker (Cross-Case Association Prioritizer)                      │  │
│  │  • Seq2Seq FLAN-T5 (Forensic Briefing Summarizer)                                │  │
│  │  • SHAP Explainability & Evidence Provenance Layer                               │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                    DATA STORAGE TIER                                   │
│   • Local SQLite Database (SQLAlchemy 2.0 ORM for session, case, and audit state)       │
│   • Supabase Cloud Database (PostgreSQL hosting 100,000+ Master Synthetic Entities)    │
│   • Supabase Storage (Encrypted Evidence Documents & CDR Uploads)                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

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
# Install Python dependencies
pip install -r backend/requirements.txt

# Seed the database with demo officers, sample cases, entity links, and audit history
python seed.py
```

### 3. Frontend Installation
```bash
cd frontend
npm install
cd ..
```

### 4. Launch the Platform
Run both backend and frontend concurrently with a single command:
```bash
npm run dev:all
```
- **Web Application**: `http://localhost:3000`
- **FastAPI Interactive Docs (Swagger UI)**: `http://localhost:8000/docs`
- **FastAPI Alternative Docs (ReDoc)**: `http://localhost:8000/redoc`

---

## 🔑 Pre-Seeded Demo Credentials

The platform includes 4 role-tiered demo accounts matching real-world police hierarchies:

| Role Title | Email | Default Password | Clearance & Access Scope |
|---|---|---|---|
| **Chief Inspector / Admin** | `admin@crimeintel.demo` | `Admin@1234` | Full system governance, security audit logs, user management, and ledger verification |
| **Lead Investigator** | `investigator@crimeintel.demo` | `Investigator@1234` | Case creation, suspect tracking, entity match review, report generation, and evidence sealing |
| **Forensic Analyst** | `analyst@crimeintel.demo` | `Analyst@1234` | Graph link analysis, anomaly detection, temporal queries, and lead prioritization |
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
# Run pytest backend test suite
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
  <sub>Smart India Hackathon (SIH) • Problem Statement ID: 26189 • CrimeIntel Platform</sub>
</div>
