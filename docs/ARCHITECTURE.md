# CrimeIntel System Architecture

CrimeIntel is an enterprise-grade AI-assisted criminal investigation platform designed for law enforcement intelligence teams.

```
┌─────────────────────────────────────────────────────────────┐
│                 React + TypeScript Frontend                 │
│  (Dashboard, Case Docket, Graph Explorer, Evidence Vault)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON (JWT / RBAC)
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Python Backend                   │
│                                                             │
│  ┌────────────────────────┐    ┌─────────────────────────┐  │
│  │   Core Domain Logic    │    │  Data Processing & ETL  │  │
│  │ (Cases, Entities, Rel) │    │  (CSV, JSON, PDF, DOCX) │  │
│  └───────────┬────────────┘    └────────────┬────────────┘  │
│              │                              │               │
│  ┌───────────▼────────────┐    ┌────────────▼────────────┐  │
│  │   Intelligence & AI    │    │   Graph & Pathfinding   │  │
│  │ (Extraction, Matching) │    │ (D3 Net, Centrality)    │  │
│  └───────────┬────────────┘    └────────────┬────────────┘  │
│              │                              │               │
│  ┌───────────▼────────────┐    ┌────────────▼────────────┐  │
│  │ SHA-256 Ledger (Chain) │    │  Security & Audit Logs  │  │
│  └───────────┬────────────┘    └────────────┬────────────┘  │
└──────────────┼──────────────────────────────┼───────────────┘
               │ SQLAlchemy 2.0 ORM           │ Local / Supabase
┌──────────────▼────────────┐    ┌────────────▼───────────────┐
│       SQLite / PG DB      │    │    Evidence File Store     │
└───────────────────────────┘    └────────────────────────────┘
```

## Core Subsystems

1. **Investigation Case Management**: Formal case dockets, classifications, activity logs, investigator assignments.
2. **Entity Resolution & Matching**: Normalization for Person, Phone, Vehicle, Location, Organization with Jaro-Winkler/Levenshtein matching.
3. **Graph Intelligence**: Network topology, degree centrality, community detection, shortest-path BFS traversal.
4. **Blockchain Evidence Vault**: Immutable SHA-256 chained notarization blocks guaranteeing forensic evidence integrity.
5. **AI Investigative Lead Engine**: Deterministic pattern extraction, off-hours anomaly detection, structured dossier reports.
