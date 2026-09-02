# CrimeIntel

An enterprise-grade AI-assisted criminal investigation platform built with **Python (FastAPI)** and **React (TypeScript + Vite)**.

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
│   │   ├── features/                 # Cases, Entities, Analysis, Evidence, Blockchain
│   │   ├── services/                 # API Clients (Cases, Entities, Auth, Reports)
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   └── styles/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                          # Python + FastAPI
│   ├── app/
│   │   ├── main.py                   # FastAPI application entry
│   │   ├── api/routes/               # REST API endpoints
│   │   ├── core/                     # Case & Entity domain logic
│   │   ├── data_processing/          # Parsers & Normalizers
│   │   ├── intelligence/             # AI Matchers & Anomaly detectors
│   │   ├── graph/                    # Network Graph & Pathfinding
│   │   ├── ai/                       # Summarizers & Explainability
│   │   ├── database/                 # SQLAlchemy 2.0 ORM & Repositories
│   │   ├── security/                 # Auth, RBAC & Audit
│   │   ├── blockchain/               # SHA-256 Chained Evidence Ledger
│   │   ├── storage/                  # Local / Supabase storage
│   │   ├── reports/                  # Case dossier generator
│   │   ├── services/                 # Service layer
│   │   └── config/                   # Settings & Environment
│   ├── tests/                        # Pytest test suite
│   ├── requirements.txt
│   └── .env.example
│
├── data/                             # Synthetic & sample datasets
│   ├── raw/synthetic_entities_100k.csv
│   ├── processed/
│   └── samples/
│
├── docs/                             # Architecture & API specifications
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DATASET.md
│
├── .gitignore
├── README.md
└── docker-compose.yml
```

---

## Quickstart

### 1. Python Backend Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Seed database with demo records & blockchain ledger
python seed.py

# Launch FastAPI backend (http://localhost:8000)
python backend/app/main.py
```

### 2. React Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Run Automated Tests
```bash
pytest
```
## 🧠 Unified Intelligence Pipeline

The CrimeIntel system employs a multi-stage machine learning pipeline to turn raw data into actionable insights:

1. **Raw Intelligence** (Uploaded Evidence, CSVs, JSON)
   ↓
2. **NER** (Extracts unstructured text into structured Entities using DistilBERT)
   ↓
3. **Entity Resolution** (Matches names, aliases, phones into Canonical Entities)
   ↓
4. **Canonical Entities** (Unified profiles)
   ↓
5. **Knowledge Graph** (Nodes & Edges representing relationships)
   ↓
6. **Location Analysis** (IsolationForest / DBSCAN for tracking anomalies and hotspots)
   ↓
7. **Investigation Lead Generator** (XGBoost Ranker prioritizing cross-case associations)
   ↓
8. **Explainability Layer** (SHAP values & Provenance ensuring transparent decision-making)
   ↓
9. **AI Investigation Summarizer** (Seq2Seq FLAN-T5 converting tabular facts into natural language briefings)
   ↓
10. **Investigator Dashboard** (Where officers review the final actionable leads)

*All models emphasize Weak Supervision and maintain the strict restriction that AI never determines guilt.*
