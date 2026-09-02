# CrimeIntel Backend (Python Edition)

Production-grade modular Python backend for **CrimeIntel**, an AI-assisted criminal investigation platform.

---

## Directory Architecture

```
backend/
│
├── app.py                    # FastAPI application setup
├── main.py                   # Python backend entry point
│
├── api/
│   ├── routes/               # FastAPI endpoints
│   │   ├── cases.py
│   │   ├── entities.py
│   │   ├── datasets.py
│   │   ├── analysis.py
│   │   ├── evidence.py
│   │   ├── blockchain.py
│   │   ├── reports.py
│   │   └── auth.py
│   │
│   ├── controllers/          # Business logic handlers
│   │   ├── case_controller.py
│   │   ├── entity_controller.py
│   │   ├── dataset_controller.py
│   │   ├── analysis_controller.py
│   │   └── report_controller.py
│   │
│   └── schemas/              # Pydantic schemas
│       ├── case_schema.py
│       ├── entity_schema.py
│       ├── dataset_schema.py
│       ├── analysis_schema.py
│       ├── evidence_schema.py
│       └── auth_schema.py
│
├── core/                     # Domain entity managers
│   ├── cases/
│   ├── entities/
│   ├── relationships/
│   └── evidence/
│
├── data_processing/          # Batch file parsing & normalization
│   ├── csv/
│   │   ├── parser.py
│   │   ├── detector.py
│   │   ├── mapper.py
│   │   └── validator.py
│   ├── json/
│   ├── pdf/
│   ├── docx/
│   └── normalization/
│       ├── person.py
│       ├── phone.py
│       ├── vehicle.py
│       ├── location.py
│       └── organization.py
│
├── intelligence/             # AI entity extraction & anomaly engines
│   ├── entity_extraction/
│   ├── entity_matching/
│   ├── relationship_detection/
│   ├── anomaly_detection/
│   ├── pattern_detection/
│   └── timeline_analysis/
│
├── graph/                    # D3 network graph, BFS pathfinding & centrality
│   ├── builder/
│   ├── algorithms/
│   └── scoring/
│
├── ai/                       # AI models, summarizers & explainability
│   ├── providers/
│   ├── models/
│   ├── prompts/
│   └── explainability/
│
├── security/                 # Auth, RBAC, threat detection & audit logging
│   ├── auth.py
│   ├── rbac.py
│   ├── validation.py
│   ├── threat_detection.py
│   └── audit.py
│
├── blockchain/               # SHA-256 verifiable chained ledger
│   ├── hash.py
│   ├── ledger.py
│   └── verification.py
│
├── reports/                  # Case dossier report generator
│   └── generator.py
│
├── database/                 # SQLAlchemy 2.0 ORM & repository pattern
│   ├── connection.py
│   ├── models.py
│   ├── repositories/
│   └── queries/
│
├── storage/                  # Local disk & Supabase Storage adapter
│   ├── local.py
│   ├── supabase.py
│   └── service.py
│
├── config/                   # Centralized environment settings
│   └── settings.py
│
├── requirements.txt
└── README.md
```

---

## Quickstart

```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Seed database
python seed.py

# 3. Launch backend service
python backend/main.py
```

API Documentation will be accessible at `http://localhost:8000/docs`.
