# CrimeIntel — Complete Project Workflow & Feature Reference

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Complete Data Flow Workflow](#4-complete-data-flow-workflow)
5. [Authentication & Session Management](#5-authentication--session-management)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [Database Schema & Data Model](#7-database-schema--data-model)
8. [Backend Library Functions](#8-backend-library-functions)
9. [API Routes — Full Reference](#9-api-routes--full-reference)
10. [Frontend Pages & Features](#10-frontend-pages--features)
11. [AI Layer — Entity Extraction & Analysis](#11-ai-layer--entity-extraction--analysis)
12. [Blockchain Integrity Ledger](#12-blockchain-integrity-ledger)
13. [Evidence Management Workflow](#13-evidence-management-workflow)
14. [Network Graph & Pathfinding](#14-network-graph--pathfinding)
15. [Seed Data Summary](#15-seed-data-summary)
16. [Supabase Integration](#16-supabase-integration--storage--auth--database)

---

## 1. Project Overview

CrimeIntel is an AI-assisted criminal investigation platform prototype. It provides a full-stack web application where investigators, analysts, and administrators can manage cases, upload and verify evidence, explore entity relationships via an interactive graph, detect patterns with AI, and maintain an immutable blockchain-style integrity ledger.

**Key Principles:**
- All AI outputs are investigative *leads* requiring human verification — never guilt determinations
- Uses only fictional demo data; no real persons or cases
- AI runs in deterministic `mock` mode by default (no external LLM required)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS (dark saffron-accent theme) |
| State Management | Zustand (sidebar state), React Server Components |
| UI Components | Radix UI (Dialog, Dropdown, Tooltip), Lucide icons |
| Forms/Validation | Zod |
| Database | Prisma ORM → **Supabase PostgreSQL** (provider `postgresql`; switchable to SQLite for local dev) |
| File Storage | Pluggable layer (`backend/infrastructure/storage/`) → **Supabase Storage** bucket or local filesystem |
| Authentication | NextAuth.js (JWT sessions, 8hr expiry) with **credentials** + **Supabase Auth** providers |
| Security | bcryptjs / Supabase Auth, account lockout (5 attempts / 15 min), brute-force alerts |
| Integrity | Custom SHA-256 chained ledger (blockchain.ts) |
| AI | Deterministic mock extraction layer (rule-based, no LLM) |

**Supabase integration** (`backend/infrastructure/`):
- `supabase/client.ts` — server-only admin (service role) + anon client factories
- `storage/supabase.ts` — `SupabaseStorageProvider` with `supabase://<bucket>/<path>` locations
- `storage/index.ts` — driver selection (`local` | `supabase`), mixed-backend reads via `storageFor()`
- `database/setup-supabase.sql` — RLS + bucket provisioning script
- Client sign-in uses only the public anon key (see `frontend/lib/supabase-client.ts` + `/api/supabase/health`)

---

## 3. Project Structure

```
crimeintel/
├── package.json                    # Root manifest, scripts, dependencies
├── README.md                       # Project documentation
├── backend/
│   ├── lib/
│   │   ├── prisma.ts              # Singleton PrismaClient
│   │   ├── auth.ts                # NextAuth config, JWT, session, login logic
│   │   ├── rbac.ts                # Role hierarchy, path access control
│   │   ├── ai.ts                  # AI abstraction (mock entity extraction, leads, patterns)
│   │   ├── blockchain.ts          # SHA-256 hashing, block hashing, chain verification
│   │   └── graph-data.ts          # Graph builder, egocentric + dataset graphs, BFS pathfinding
│   ├── infrastructure/
│   │   ├── config/env.ts          # Typed env access (DB URL, storage driver, Supabase keys)
│   │   ├── supabase/client.ts     # Admin (service role) + anon Supabase clients (server-only)
│   │   ├── storage/               # Pluggable file storage: types, local, supabase, index
│   │   └── database/              # migrate-to-supabase.md, setup-supabase.sql (RLS + bucket)
│   ├── services/                  # pipeline, evidence, dataset, case, etc.
│   └── prisma/
│       ├── schema.prisma          # 20 data models (Supabase Postgres provider)
│       ├── seed.ts                # Demo dataset generator
│       └── dev.db                 # SQLite database file (local dev only)
├── frontend/
│   ├── middleware.ts              # Auth + RBAC route protection
│   ├── next.config.mjs            # Next.js config
│   ├── tailwind.config.ts         # Theme colors, fonts, animations
│   ├── postcss.config.mjs         # PostCSS + Tailwind
│   ├── lib/
│   │   ├── utils.ts               # cn() class-name utility
│   │   ├── api-helpers.ts         # Consistent HTTP response helpers
│   │   ├── supabase-client.ts     # Browser Supabase Auth sign-in (anon key, lazy import)
│   │   └── store/sidebar.ts       # Zustand sidebar state
│   ├── config/navigation.ts       # Sidebar nav structure
│   ├── types/next-auth.d.ts       # NextAuth type augmentation
│   ├── components/
│   │   ├── ui/                    # Button, Card, Badge, Alert, Dialog, State, StatCard
│   │   ├── layout/                # Sidebar, Topbar, UserMenu
│   │   ├── dashboard/             # PageHeader, ModuleStub
│   │   ├── data-workspace/        # FileUploadPanel, IngestPanel, DatasetList, AnalysisResultView
│   │   ├── entities/              # Entity type helpers (colors, labels, icons)
│   │   └── network/               # Interactive SVG NetworkGraph
│   └── app/
│       ├── layout.tsx             # Root layout (fonts, metadata)
│       ├── page.tsx               # Redirects to /dashboard
│       ├── globals.css
│       ├── (auth)/login/          # Login page + LoginForm client component (Supabase-aware)
│       ├── (dashboard)/           # All authenticated pages
│       │   ├── layout.tsx         # Dashboard layout (sidebar + topbar)
│       │   ├── dashboard/         # KPI overview
│       │   ├── cases/             # Case list, detail, notes, enriched new-case dialog
│       │   ├── data-workspace/    # Dataset ingestion (inline upload, mapping, analysis)
│       │   ├── analysis/          # Knowledge graph: global + person + cross-dataset
│       │   ├── documents/         # Upload, AI extraction review
│       │   ├── entities/          # Entity registry, match actions
│       │   ├── network/           # Interactive graph, pathfinding, analysis
│       │   └── ...                # timeline, locations, communications, transactions,
│       │                          # ai-insights, evidence, blockchain, reports, security,
│       │                          # audit-logs, settings
│       └── api/
│           ├── auth/[...nextauth]/ # NextAuth handler (Credentials + supabase providers)
│           ├── upload/             # Document upload → hash → ledger → extraction
│           ├── cases/              # Create cases
│           ├── cases/[id]/         # GET case + persons (for graph selectors)
│           ├── cases/[id]/notes/   # Add case notes
│           ├── cases/[id]/analyze/ # AI analysis for a case
│           ├── datasets/           # List datasets (analysisScope)
│           ├── datasets/ingest/    # Ingest structured datasets (scope-aware)
│           ├── datasets/[id]/analyze/ # Combined vs dataset-only analysis
│           ├── datasets/[id]/graph/  # Dataset → person knowledge graph
│           ├── datasets/[id]/match/  # Dataset matching
│           ├── dataset-records/     # List dataset records
│           ├── dataset-records/[id]/review/ # Review/merge a dataset record
│           ├── intel-data/         # Scoped data (documents, network, timeline, etc.)
│           ├── intel-data/analyze/ # Relationship analysis
│           ├── intel-data/path/    # Multi-hop pathfinding
│           ├── intel-data/egocentric/ # Person-focused 2/3-hop graph
│           ├── intel-data/entity/[id]/links/ # Entity connections
│           ├── evidence/[id]/verify/  # Hash integrity check
│           ├── evidence/[id]/tamper/  # Tamper simulation
│           ├── blockchain/verify-chain/ # Full chain verification
│           ├── matches/[id]/[action]/  # Entity match confirm/reject
│           ├── extraction/[id]/...  # confirm / reject / update
│           ├── reports/             # Generate investigation report
│           ├── search/              # Global search
│           ├── alerts/, security/alerts/[id]/resolve/, analysis/, ai/providers/
│           └── supabase/health/     # Supabase readiness + connectivity probe
```

---

## 4. Complete Data Flow Workflow

### 4.1 User Login Flow

```
User visits /login
    ↓
LoginForm (client component):
    ┌─ If Supabase client keys (NEXT_PUBLIC_SUPABASE_*) are set ────────────────┐
    │ 1. supabaseSignIn(email, password) → Supabase Auth signInWithPassword      │
    │    (uses the public anon key only; browser-safe, lazy-imported)            │
    │ 2. On success → signIn("supabase", {email})                                 │
    │ NextAuth supabase provider (auth.ts) maps the verified identity to the     │
    │ local investigator record by email (RBAC, lockout, audit preserved)         │
    └────────────────────────────────────────────────────────────────────────────┘
    └─ Otherwise → signIn("credentials", {email, password}) (built-in login)
    ↓
NextAuth authorize() in auth.ts (shared checks for both providers):
    1. Validates credentials present
    2. Extracts IP (x-forwarded-for) + user-agent from request
    3. Looks up user by email (lowercased) via prisma.user.findUnique()
    4. Checks account lockout (lockedUntil > now) → records ACCOUNT_LOCKED attempt
    5. Checks user not found → records NO_USER attempt
    6. Checks status !== "ACTIVE" → records ACCOUNT_DISABLED attempt
    7. (credentials only) bcrypt.compare(password, user.passwordHash)
       - Invalid → increments failedLogins; if >=5 → locks 15 min + BRUTE_FORCE SecurityAlert
       - Records login attempt with reason → returns null
    8. On success → resetAuthSuccess() resets failedLogins, clears lock, sets lastLoginAt
       - Records successful LoginAttempt + AuditLog (+ possible UNUSUAL_ACCESS alert)
       - Returns {id, email, name, role}
    ↓
jwt() callback: embeds user.id + user.role into JWT token
    ↓
session() callback: exposes token.id + token.role on session.user
    ↓
Middleware (middleware.ts):
    - Allows public assets + /api/auth/*
    - Redirects unauthenticated → /login
    - Redirects logged-in users away from /login
    - Checks canAccessPath(role, pathname) for RBAC enforcement
    ↓
Dashboard layout loads: Sidebar + Topbar + page content
```

### 4.2 Document Upload & AI Extraction Flow

```
User drags/selects file on /documents page
    ↓
Client sends FormData to POST /api/upload (INVESTIGATOR+ only)
    ↓
API Route processes upload:
    1. Validates session + role (INVESTIGATOR minimum)
    2. Reads file from FormData, validates presence
    3. Sanitizes filename, ensures unique with Date.now()
    4. Hashes file content with sha256Buffer() → SHA-256 hash
    5. Saves file via the storage provider (local `public/uploads/...` or `supabase://<bucket>/...`)
    6. Creates EvidenceDocument record in DB:
       - name, description, filePath, contentType, sizeBytes, sha256
       - status: ACTIVE, uploadedById from session
    7. Creates BlockchainRecord (EVIDENCE_HASH):
       - Links to previous block via previousHash
       - Computes block hash with hashBlock()
       - Stores dataHash = file's SHA-256
    8. Creates CaseActivity: "EVIDENCE_UPLOADED"
    9. Creates AuditLog: "DOCUMENT_UPLOADED"
    10. Runs AI entity extraction:
        - Calls extractEntities(documentText) from ai.ts
        - Scans text against fictional datasets (people, phones, vehicles, etc.)
        - Returns ExtractionResult[] with type, value, context, confidence
    11. For each extraction result:
        - Creates ExtractionCandidate (status: PENDING)
        - Links to the EvidenceDocument
    ↓
Frontend shows extraction candidates for review:
    ↓
User reviews each candidate → 3 options:
    ↓
Option A: CONFIRM → POST /api/extraction/[id]/confirm
    - Creates Entity record (or finds existing)
    - Adds to EntityMatch if duplicate detected
    - Sets candidate status: CONFIRMED
    - Logs CaseActivity + AuditLog
    ↓
Option B: REJECT → POST /api/extraction/[id]/reject
    - Sets candidate status: REJECTED
    - No entity created
    ↓
Option C: EDIT → POST /api/extraction/[id]/update
    - Updates candidate with editedValue
    - Sets candidate status: EDITED → CONFIRMED
    - Creates Entity with the edited value
```

### 4.3 Case Analysis Flow

```
User clicks "Analyze" on a case detail page (/cases/[id])
    ↓
Client sends POST /api/cases/[id]/analyze (INVESTIGATOR/ANALYST/ADMIN)
    ↓
API Route gathers case context:
    1. Fetches case with entities, relationships, events, documents
    2. Groups data by type: people, organizations, locations, relationships
    ↓
Calls AI functions in sequence:
    1. summarizeInvestigation(input):
       - Generates structured overview, keyEntities, majorRelationships
       - Produces importantPatterns, timelineHighlights, investigationAreas
       - Appends caveat: "AI-generated leads require human verification"
    2. generateLeads(ctx):
       - Up to 3 relationship leads, 2 location leads, 2 transaction leads
       - Falls back to "Broaden source material" if nothing generated
    3. detectPatterns(ctx):
       - Analyzes for: REPEATED_LOCATION, REPEATED_COMMUNICATION
       - SHARED_VEHICLE, TRANSACTION_CHAIN, UNUSUAL_ACTIVITY
       - Returns max 5 patterns with severity + relevance scores
    ↓
Persists detected patterns to DB (deduplicated)
    ↓
Returns {summary, leads, patterns} to frontend
    ↓
Frontend renders:
    - Investigation summary with key entities + relationships
    - Suggested investigative leads
    - Detected patterns with explainability
```

### 4.4 Evidence Integrity Verification Flow

```
User clicks "Verify" on an evidence item (/evidence)
    ↓
Client sends POST /api/evidence/[id]/verify
    ↓
API Route verification process:
    1. Fetches EvidenceDocument + its BlockchainRecords
    2. Reads actual file via `storageFor(doc.filePath).read(location)` (local fs or Supabase Storage)
    3. Recomputes SHA-256 hash of file content
    4. Compares against stored sha256 in DB
    5. Fetches all blockchain records for this evidence
    6. Calls verifyChain(blocks) to check chain integrity
    7. Creates EvidenceVerification record:
       - action: "INTEGRITY_CHECK"
       - result: MATCH or MISMATCH
    8. If mismatch:
       - Updates EvidenceDocument status → COMPROMISED
       - Creates SecurityAlert (severity: HIGH)
       - Creates AuditLog entry
    9. If match:
       - Updates EvidenceDocument status → VERIFIED
       - Sets verifiedAt timestamp
    ↓
Returns {match: boolean, chainIntact: boolean, details}
    ↓
Frontend shows verification result card
```

### 4.5 Tamper Simulation Flow

```
User clicks "Simulate Tamper" on evidence (/evidence) — INVESTIGATOR+ only
    ↓
Client sends POST /api/evidence/[id]/tamper
    ↓
API Route:
    1. Fetches EvidenceDocument
    2. Appends " [TAMPERED]" to stored sha256 hash (corrupts it)
    3. Creates BlockchainRecord (action: EVIDENCE_MODIFIED)
    4. Creates SecurityAlert (type: TAMPER, severity: CRITICAL)
    5. Creates AuditLog: "EVIDENCE_TAMPER_SIMULATED"
    ↓
Next verification will detect MISMATCH → shows tamper evidence
```

### 4.6 Entity Match Resolution Flow

```
User sees potential duplicate entities on /entities page
    ↓
EntityMatch records show: Entity A ↔ Entity B with confidence + reasons
    ↓
User clicks CONFIRM → POST /api/matches/[id]/confirm
    - Merges Entity B's aliases into Entity A
    - Updates EntityMatch status: CONFIRMED
    - Logs AuditLog
    ↓
User clicks REJECT → POST /api/matches/[id]/reject
    - Updates EntityMatch status: REJECTED
    - Entities remain separate
```

### 4.7 Network Graph Exploration Flow

```
User navigates to /network
    ↓
Frontend fetches GET /api/intel-data?scope=graph
    ↓
API calls buildGraph() from graph-data.ts:
    1. Fetches all Entity records → maps to GraphNode[]
       (id, label=name, type, color via entityColor())
    2. Fetches all Relationship records → maps to GraphLink[]
       (sourceId, targetId, type, color via relationColor(),
        weight = min(4, 1 + round(strength/30)))
    ↓
NetworkGraph component renders interactive SVG:
    - Deterministic circular cluster layout
    - Color-coded by entity type
    - Zoom/pan with mouse wheel + drag
    - Search bar to filter/highlight nodes
    - Type filter dropdown
    - Double-click node to expand connections
    - Click node to show detail panel
    ↓
User selects two nodes → can trigger:
    ↓
Relationship Analysis: GET /api/intel-data/analyze?sourceId=X&targetId=Y
    - Calls analyzeRelationship() from graph-data.ts
    - Groups by type: COMMUNICATION, LOCATION, FINANCIAL
    - Computes weighted strength score
    - Returns detailed analysis with records
    ↓
Path Search: GET /api/intel-data/path?sourceId=X&targetId=Y
    - Calls findPath() from graph-data.ts
    - BFS algorithm with max 5 hops
    - Returns shortest path as PathStep[] (from, to, type, label)
```

### 4.8 Blockchain Ledger Verification Flow

```
User navigates to /blockchain
    ↓
Frontend fetches GET /api/intel-data?scope=blockchain
    ↓
Displays all BlockchainRecord blocks:
    - Block index, timestamp, dataHash, previousHash, hash, action
    - Visual chain linking
    ↓
User clicks "Verify Chain" → POST /api/blockchain/verify-chain
    ↓
API Route:
    1. Fetches ALL BlockchainRecords ordered by index
    2. Calls verifyChain(blocks) from blockchain.ts:
       - Sorts by index
       - Recomputes hashBlock() for each block
       - Compares recomputed hash vs stored hash
       - Verifies previousHash links between adjacent blocks
    3. Returns {intact: boolean, brokenIndex: number | null}
    ↓
Frontend shows chain integrity status
```

### 4.9 Report Generation Flow

```
User navigates to /reports
    ↓
Frontend fetches GET /api/reports
    ↓
API Route gathers all data:
    1. All InvestigationCases
    2. All Entities (grouped by type)
    3. All Relationships
    4. All TimelineEvents
    5. All Patterns
    6. Blockchain record count + chain integrity check
    7. Recent AuditLogs
    ↓
Returns structured report object
    ↓
Frontend renders ReportView with ReportSection components:
    - Case summary
    - Entity directory
    - Relationship map
    - Timeline
    - AI patterns
    - Blockchain integrity status
    - Audit trail
    ↓
User can Print/PDF via window.print()
```

### 4.10 Data Workspace — Dataset Ingestion & Analysis Flow

```
User opens /data-workspace
    ↓
Option A — Inline file upload (structured datasets):
    POST /api/datasets/ingest with {file, sourceType, caseId, analysisScope}
    - Validates scope: COMBINED | DATASET_ONLY (DATASET_ONLY requires caseId)
    - Saves file (local or supabase:// storage location)
    - Creates Dataset (status UPLOADED) + records the scope + raw rows
    - Returns SHA-256 + candidate count + audit detail
    ↓
Option B — Paste structured content into IngestPanel
    (CSV / JSON / pipe rows) → same ingest pipeline
    ↓
Dataset lifecycle status: UPLOADED → MAPPED → NORMALIZED → MATCHING → READY | ERROR
    ↓
Dataset list shows scope badge (Combine vs Only this dataset):
    - "Analyze dataset" button → POST /api/datasets/[id]/analyze
    - COMBINED  → analyzes the linked case's full context (all entities/relationships)
    - DATASET_ONLY → restricts analysis to this dataset's entity/relationships
    - Reuses pattern/anomaly/summary/lead providers; dedupes patterns + alerts
    - Logs DATASET_ANALYZED audit
    - Renders collapsible leads + patterns result (AnalysisResultView)
    ↓
Dataset records (DatasetRecord) can be matched/merged into the entity registry:
    POST /api/datasets/[id]/match and POST /api/dataset-records/[id]/review
    - matchStatus: UNMATCHED | CANDIDATE | MERGED | SKIPPED
    - potential matches are linked via matchCandidate; never auto-merged
```

### 4.11 Knowledge Graph — Global, Person & Cross-Dataset

```
Global graph (Analysis page Network tab):
    GET /api/intel-data?scope=network → nodes/links with color/weight
    Rendered by NetworkGraph (same layout as /network)

Person-focused (egocentric) graph:
    GET /api/cases/[id] → list case + its PERSONS (fills selector)
    GET /api/intel-data/egocentric?entity=<id>&hops=<1-3>
    → BFS from the person (2 hops default), source node drawn larger
    PersonGraphCard: pick case → pick person → generator, hops selector

Cross-dataset relationship graph:
    GET /api/datasets/[id]/graph?person=<id>&expand=<bool>&hops=<1-3>
    → derives persons from DatasetRecord.normalized name fields
    → tags nodes isNew (not in entity registry), NEW nodes get thicker rings
    → marks cross-links (new ↔ existing) amber (#f59e0b)
    CrossDatasetGraphCard: "Alone / With existing data" toggle + hops selector
    + legend + cross-link count badge
    (this is the "alone vs with existing data" option)
```

---

## 5. Authentication & Session Management

### Configuration (`auth.ts`)

| Setting | Value |
|---------|-------|
| Strategy | JWT |
| Max Age | 8 hours (28800 seconds) |
| Sign-in Page | /login |
| Providers | Credentials (email + password), Supabase Auth (`supabase` provider, optional) |

### Login Logic

```
1. Validate credentials present
2. Extract IP from x-forwarded-for header + User-Agent
3. resolveLocalUserForAuth(email, ip, userAgent):
   - Lookup user: prisma.user.findUnique({where: {email: email.toLowerCase()}})
   - Check lockout: user.lockedUntil > new Date() → record ACCOUNT_LOCKED → return null
   - Check existence: user not found → record NO_USER → return null
   - Check status: user.status !== "ACTIVE" → record ACCOUNT_DISABLED → return null
4. (credentials only) Password check: bcrypt.compare(password, user.passwordHash)
   - Fail → increment failedLogins
     - If failedLogins >= 5 → lock account 15 min + create SecurityAlert (BRUTE_FORCE)
   - Record login attempt → return null
5. recordAuthSuccess(user, ip, userAgent):
   - Reset failedLogins, clear lockedUntil, set lastLoginAt
   - Create LoginAttempt (success: true)
   - Optionally create UNUSUAL_ACCESS SecurityAlert for a new IP
   - Create AuditLog (action: "LOGIN_SUCCESS")
6. Return {id, email, name, role}
```

### Supabase Auth Sign-in

When `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, the login
form first verifies the password against **Supabase Auth** (`signInWithPassword`,
public anon key only), then maps the verified identity to the matching local
investigator record via the `supabase` NextAuth provider. This keeps password
verification with Supabase while preserving the app's RBAC roles, account
lockout, login-attempt records, and audit log.

- Client helper: `frontend/lib/supabase-client.ts` (`isSupabaseEnabled()`, `supabaseSignIn()`)
- Server mapping: the `supabase` CredentialsProvider in `backend/lib/auth.ts`
  (no bcrypt — Supabase already verified the password)
- No Supabase client keys are set → login falls back to built-in credentials
- The service-role key is never used for sign-in or shipped to the browser

### Session Data

After login, `session.user` contains:
- `id`: User's database ID
- `email`: User's email
- `name`: User's display name
- `role`: ADMIN | INVESTIGATOR | ANALYST | VIEWER

---

## 6. Role-Based Access Control (RBAC)

### Role Hierarchy

```
VIEWER (1) < ANALYST (2) < INVESTIGATOR (3) < ADMIN (4)
```

### Access Matrix

| Path | VIEWER | ANALYST | INVESTIGATOR | ADMIN |
|------|--------|---------|-------------|-------|
| /dashboard | Read | Read | Read | Read |
| /cases | Read | Read | **Read + Write** | **Read + Write** |
| /documents | Read | Read | **Read + Write** | **Read + Write** |
| /data-workspace | Read | Read | **Read + Write** | **Read + Write** |
| /analysis | Read | Read | Read | Read |
| /entities | Read | Read | Read | Read |
| /network | Read | Read | Read | Read |
| /timeline | Read | Read | Read | Read |
| /locations | Read | Read | Read | Read |
| /communications | Read | Read | Read | Read |
| /transactions | Read | Read | Read | Read |
| /ai-insights | Read | Read | Read | Read |
| /evidence | Read | Read | **Read + Write** | **Read + Write** |
| /blockchain | Read | Read | **Read + Write** | **Read + Write** |
| /reports | Read | Read | Read | Read |
| /security | Denied | Denied | Denied | **Full Access** |
| /audit-logs | Denied | Denied | Denied | **Full Access** |
| /settings | Denied | Denied | Denied | **Full Access** |

### API Write Protection

| API Endpoint | Minimum Role |
|-------------|-------------|
| POST /api/cases | INVESTIGATOR |
| POST /api/cases/[id]/notes | INVESTIGATOR |
| POST /api/cases/[id]/analyze | INVESTIGATOR |
| POST /api/upload | INVESTIGATOR |
| POST /api/datasets/ingest | INVESTIGATOR |
| POST /api/datasets/[id]/analyze | INVESTIGATOR |
| POST /api/datasets/[id]/match | INVESTIGATOR |
| POST /api/dataset-records/[id]/review | INVESTIGATOR |
| POST /api/extraction/[id]/confirm | INVESTIGATOR |
| POST /api/extraction/[id]/reject | INVESTIGATOR |
| POST /api/extraction/[id]/update | INVESTIGATOR |
| POST /api/evidence/[id]/verify | INVESTIGATOR |
| POST /api/evidence/[id]/tamper | INVESTIGATOR |
| POST /api/matches/[id]/confirm | INVESTIGATOR |
| POST /api/matches/[id]/reject | INVESTIGATOR |
| POST /api/blockchain/verify-chain | INVESTIGATOR |
| GET /api/reports | Any authenticated |

---

## 7. Database Schema & Data Model

### 20 Prisma Models

#### Auth & Security

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | Auth accounts | id, email (unique), name, passwordHash, role (enum), status (ACTIVE/DISABLED/LOCKED), failedLogins, lockedUntil, lastLoginAt |
| **LoginAttempt** | Login audit trail | id, email, success, ip, userAgent, reason, attemptAt, userId |
| **SecurityAlert** | Security events | id, severity (LOW/MEDIUM/HIGH/CRITICAL), type, message, detail, resolved, resolvedAt, userId |
| **AuditLog** | Action audit trail | id, action, detail, caseId, ip, userAgent, status, createdAt, userId |

#### Investigation Core

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **InvestigationCase** | Core case entity | id, caseId (unique, e.g. CR-2026-1042), title, description, status (OPEN/CLOSED/ARCHIVED), classification (OPEN/RESTRICTED/SECRET), category, caseSource, incidentDate, jurisdiction, assignedInvestigator, createdById |
| **CaseNote** | Case notes | id, body, author, authorId, caseId |
| **CaseActivity** | Activity log | id, action, detail, actor, caseId |

#### Documents & Evidence

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **EvidenceDocument** | Uploaded files | id, name, description, filePath, contentType, sizeBytes, sha256, verified, verifiedAt, status (ACTIVE/COMPROMISED/VERIFIED), uploadedById, caseId |
| **BlockchainRecord** | Integrity ledger blocks | id, index (unique), timestamp, dataHash, previousHash, hash, action (EVIDENCE_HASH/INTEGRITY_VERIFY/EVIDENCE_MODIFIED), note, evidenceId |
| **EvidenceVerification** | Verification records | id, evidenceId, verifiedBy, action, result (MATCH/MISMATCH), detail |
| **ExtractionCandidate** | AI-extracted entities | id, documentId, type, value, context, status (PENDING/CONFIRMED/EDITED/REJECTED), editedValue |

#### Intelligence

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Entity** | Entity registry | id, type (PERSON/PHONE/VEHICLE/LOCATION/ORGANIZATION/BANK_ACCOUNT/TRANSACTION), name, aliases (JSON), value, metadata (JSON), riskScore, caseId |
| **EntityMatch** | Duplicate detection | id, entityAId, entityBId, confidence, reasons (JSON), status (PENDING/CONFIRMED/REJECTED) |
| **Relationship** | Graph edges | id, type (COMMUNICATION/TRANSACTION/LOCATION/CASE/TRANSPORT/FINANCIAL), label, sourceId, targetId, strength, count, records (JSON), caseId |
| **TimelineEvent** | Timeline entries | id, type (COMMUNICATION/VISIT/LOCATION/FINANCIAL/VEHICLE/GENERAL), summary, detail, eventAt, entityId, caseId |

#### Dataset Ingestion

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Dataset** | Structured dataset upload | id, name, sourceType (CSV/XLSX/JSON/PDF/DOCX/TXT), fileName, storageLocation (`uploads/…` or `supabase://<bucket>/…`), status (UPLOADED/MAPPED/NORMALIZED/MATCHING/READY/ERROR), recordCount, analysisScope (COMBINED/DATASET_ONLY), mapping (JSON), normalizationRules (JSON), error, caseId, createdById |
| **DatasetRecord** | Normalized dataset row | id, datasetId, rowIndex, raw (JSON), normalized (JSON), matchStatus (UNMATCHED/CANDIDATE/MERGED/SKIPPED), matchConfidence, matchReasons (JSON), reviewedAt, matchCandidateId, mergedEntityId |
| **DatasetEntity** | Dataset→entity link | id, role (SOURCE/CREATED/MERGED), datasetId, recordId, entityId (@@unique combo) |

#### AI Outputs

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Pattern** | Detected patterns | id, type, title, summary, severity (LOW/MEDIUM/HIGH), entities (JSON), reasons (JSON), evidence (JSON), relevance, resolved |
| **AIAlert** | AI-generated alerts | id, type (NEW_RELATIONSHIP/CROSS_CASE_MATCH/REPEATED_LOCATION/PATTERN/TAMPER), severity, message, detail, read |

### Entity Relationships

```
User ──┬── creates ──→ InvestigationCase
       ├── uploads ──→ EvidenceDocument
       ├── writes ───→ CaseNote
       ├── has ──────→ LoginAttempt[]
       ├── triggers ─→ SecurityAlert[]
       └── logged in ─→ AuditLog[]

InvestigationCase ──┬── has ──→ CaseNote[]
                    ├── has ──→ CaseActivity[]
                    ├── has ──→ EvidenceDocument[]
                    ├── has ──→ Entity[]
                    ├── has ──→ TimelineEvent[]
                    └── has ──→ Relationship[]

EvidenceDocument ──┬── has ──→ BlockchainRecord[]
                   ├── has ──→ EvidenceVerification[]
                   └── has ──→ ExtractionCandidate[]

Entity ──┬── has ──→ Relationship[] (as source)
         ├── has ──→ Relationship[] (as target)
         ├── has ──→ EntityMatch[] (as matchA)
         ├── has ──→ EntityMatch[] (as matchB)
         ├── has ──→ TimelineEvent[]
         └── linked ←── DatasetEntity[] / DatasetRecord[] (matchCandidate/merged)

Dataset ──┬── has ──→ DatasetRecord[]
          ├── has ──→ DatasetEntity[]
          └── belongs ──→ InvestigationCase (optional)

DatasetRecord ──┬── has ──→ DatasetEntity[]
                ├── matchCandidate ──→ Entity
                └── mergedEntity ──→ Entity
```

---

## 8. Backend Library Functions

### 8.1 `prisma.ts` — Database Singleton

| Export | Type | Description |
|--------|------|-------------|
| `prisma` | `PrismaClient` | Singleton instance. In dev, stored on `globalThis` to survive HMR. Logs warn+error in dev, error-only in prod. |

---

### 8.2 `auth.ts` — Authentication

| Export | Type | Description |
|--------|------|-------------|
| `authOptions` | `NextAuthOptions` | Full NextAuth config: JWT strategy (8hr), Credentials + supabase providers, JWT/session callbacks |
| `getSession()` | `Promise<Session \| null>` | Server-side session retrieval wrapper |

**Internal `authorize()` flow (shared by both providers):**
1. Validate inputs → extract IP + User-Agent → lookup user by email
2. `resolveLocalUserForAuth()` → lockout → existence → status checks
3. Credentials provider → bcrypt compare; supabase provider → trusts Supabase Auth already verified
4. On failure: increment failedLogins, lock after 5 failures (15 min), create SecurityAlert
5. On success: `recordAuthSuccess()` → reset counters, record LoginAttempt + AuditLog, return user object

**JWT callback:** Embeds `user.id` and `user.role` into token on first sign-in.
**Session callback:** Copies `token.id` and `token.role` onto `session.user`.

---

### 8.3 `rbac.ts` — Access Control

| Export | Type | Description |
|--------|------|-------------|
| `Role` | Type | `"ADMIN" \| "INVESTIGATOR" \| "ANALYST" \| "VIEWER"` |
| `ROLE_LEVEL` | Record | `{VIEWER: 1, ANALYST: 2, INVESTIGATOR: 3, ADMIN: 4}` |
| `isRole(role, min)` | Function | Checks if role meets minimum required level |
| `roleLevel(role)` | Function | Returns numeric level (1-4) for a role string |
| `canAccessPath(role, pathname)` | Function | Path-based access: admin-only paths → ADMIN only, write paths → INVESTIGATOR+, others → all |
| `getSessionRole(session)` | Function | Extracts role string from session object |

---

### 8.4 `blockchain.ts` — Integrity Ledger

| Export | Type | Description |
|--------|------|-------------|
| `sha256(input)` | Function | SHA-256 hash of UTF-8 string → hex digest |
| `sha256Buffer(buffer)` | Function | SHA-256 hash of binary Buffer → hex digest |
| `BlockInput` | Interface | `{index, timestamp, dataHash, previousHash, action?, note?}` |
| `hashBlock(b)` | Function | Creates deterministic string `index\|timestamp\|dataHash\|previousHash\|action` and hashes it |
| `genesisTimestamp()` | Function | Returns fixed date `2026-01-01T00:00:00.000Z` |
| `genesisDataHash()` | Function | SHA-256 of fixed genesis string |
| `verifyChain(blocks)` | Function | Sorts by index, recomputes each hash, verifies previousHash links → `{intact, brokenIndex}` |
| `evidenceContent(name, caseId)` | Function | Builds deterministic fictional evidence document payload for hashing |

---

### 8.5 `ai.ts` — AI Abstraction Layer

| Export | Type | Description |
|--------|------|-------------|
| `EntityType` | Type | `"PERSON" \| "PHONE" \| "VEHICLE" \| "LOCATION" \| "ORGANIZATION" \| "FINANCIAL" \| "DATE" \| "EVENT"` |
| `ExtractionResult` | Interface | `{type, value, context?, confidence}` |
| `AiMode` | Type | `"mock" \| "llm"` |
| `aiMode()` | Function | Reads `AI_MODE` env var, defaults to `"mock"` |
| `extractEntities(text, hints?)` | Function | Scans text against fictional datasets; returns deduplicated, confidence-sorted extractions |
| `summarizeInvestigation(input)` | Function | Generates structured summary with overview, keyEntities, relationships, patterns, timeline, areas + caveat |
| `generateLeads(ctx)` | Function | Creates up to 7 investigative leads from relationships, locations, transactions |
| `DetectedPattern` | Interface | `{type, title, summary, severity, relevance, entities, reasons, evidence}` |
| `detectPatterns(ctx)` | Function | Detects REPEATED_LOCATION, REPEATED_COMMUNICATION, SHARED_VEHICLE, TRANSACTION_CHAIN, UNUSUAL_ACTIVITY (max 5) |

**Internal helper `scanText(text, type, candidates)`:**
- Case-insensitive substring search on text
- Extracts ~80-char context window around match
- Assigns random confidence within type-specific range

**Fictional Datasets:**
- PEOPLE: 8 names (Rahul Kumar, Amit Sharma, etc.)
- PHONES: 4 numbers
- VEHICLES: 3 license plates
- LOCATIONS: 5 area names
- ORGANIZATIONS: 4 company names
- EVENTS: 5 event descriptions

---

### 8.6 `graph-data.ts` — Graph Operations

| Export | Type | Description |
|--------|------|-------------|
| `GraphNode` | Interface | `{id, label, type, color, radius?}` |
| `GraphLink` | Interface | `{source, target, type, color, weight, label?}` |
| `buildGraph()` | Function | Fetches all entities + relationships → maps to nodes + links for visualization |
| `buildEgocentricGraph(sourceId, maxHops?)` | Function | BFS from one person (2 hops default), larger radius for the source node |
| `buildDatasetGraph(datasetId, {personId, expand, maxHops})` | Function | Derives dataset persons from `DatasetRecord.normalized` `name` fields; resolves new vs existing (`isNew`); marks cross-links amber `#f59e0b` |
| `RelationshipAnalysis` | Interface | `{sourceName, targetName, communication, sharedLocations, financial, commonCases, directRelationships, strength}` |
| `analyzeRelationship(sourceId, targetId)` | Function | Deep analysis: groups by type, aggregates counts, computes weighted strength score (capped at 99) |
| `PathStep` | Interface | `{from, to, type, label}` |
| `PathResult` | Interface | `{found, hops, steps}` |
| `findPath(sourceId, targetId, maxHops?)` | Function | BFS shortest path (undirected), max 5 hops default, returns reconstructed path |

---

## 9. API Routes — Full Reference

### Authentication

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | Public | NextAuth handler (login, session, CSRF; Credentials + supabase providers) |

### Case Management

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/cases` | POST | INVESTIGATOR+ | Create new case (auto-generates CR-2026-###, enriched fields) |
| `/api/cases` | GET | Any | List cases |
| `/api/cases/[id]` | GET | Any | Get single case + its PERSONS (graph selector data) |
| `/api/cases/[id]/notes` | POST | INVESTIGATOR+ | Add note to case |
| `/api/cases/[id]/analyze` | POST | INVESTIGATOR+ | Run AI analysis (summary + leads + patterns) |

### Dataset Ingestion

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/datasets` | GET | Any | List datasets (includes `analysisScope`) |
| `/api/datasets/ingest` | POST | INVESTIGATOR+ | Ingest structured dataset (file or pasted content), scope-aware |
| `/api/datasets/[id]/analyze` | POST | INVESTIGATOR+ | Analyze dataset: COMBINED (full case context) or DATASET_ONLY |
| `/api/datasets/[id]/graph` | GET | Any | Dataset knowledge graph for a person (new/existing, cross-links) |
| `/api/datasets/[id]/match` | POST | INVESTIGATOR+ | Run entity matching for a dataset |
| `/api/dataset-records` | GET | Any | List dataset records |
| `/api/dataset-records/[id]/review` | POST | INVESTIGATOR+ | Review / merge a dataset record against an entity |

### Document & Evidence

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/upload` | POST | INVESTIGATOR+ | Upload file → SHA-256 → blockchain → AI extraction |
| `/api/evidence/[id]/verify` | POST | INVESTIGATOR+ | Verify file hash vs blockchain record |
| `/api/evidence/[id]/tamper` | POST | INVESTIGATOR+ | Simulate evidence tampering (prototype) |

### AI Extraction Review

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/extraction/[id]/confirm` | POST | INVESTIGATOR+ | Confirm AI extraction → create entity |
| `/api/extraction/[id]/reject` | POST | INVESTIGATOR+ | Reject AI extraction |
| `/api/extraction/[id]/update` | POST | INVESTIGATOR+ | Edit + confirm AI extraction |

### Entity Management

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/matches/[id]/confirm` | POST | INVESTIGATOR+ | Confirm entity match → merge aliases |
| `/api/matches/[id]/reject` | POST | INVESTIGATOR+ | Reject entity match |

### Intelligence Data

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/intel-data` | GET | Any | Scoped data: cases, evidence, entities, patterns, links, blocks, events, locations, comms, transactions, network (nodes/links with color+weight) |
| `/api/intel-data/analyze` | GET | Any | Relationship analysis between two entities |
| `/api/intel-data/path` | GET | Any | Multi-hop BFS path search |
| `/api/intel-data/egocentric` | GET | Any | Person-focused (egocentric) graph, hops 1–3 |
| `/api/intel-data/entity/[id]/links` | GET | Any | All relationships for an entity |

### Search & AI

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/search` | GET | Any | Global search across entities/cases/documents |
| `/api/analysis/detect` | POST | INVESTIGATOR+ | Run explicit pattern/anomaly detection |
| `/api/ai/providers` | GET | Any | List available AI providers + active provider |

### Alerts & Security

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/alerts` | GET/POST | Any/ADMIN | List/create alerts |
| `/api/security/alerts/[id]/resolve` | POST | ADMIN | Resolve a security alert |

### Supabase

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/supabase/health` | GET | Any authenticated | Supabase readiness: configured, postgres, storageDriver, bucket, live connectivity probe |

### Blockchain

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/blockchain/verify-chain` | POST | INVESTIGATOR+ | Verify entire ledger chain integrity |

### Reports

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/reports` | GET | Any | Generate structured investigation report |

---

## 10. Frontend Pages & Features

### 10.1 Login (`/login`)

- Email + password form
- If Supabase is configured → verifies via Supabase Auth, then maps to NextAuth session
- Otherwise → calls NextAuth `signIn("credentials", ...)`
- Redirects to `/dashboard` on success
- Shows demo account credentials reference
- Handles callbackUrl for redirect after login

### 10.2 Dashboard (`/dashboard`)

**KPI Cards:**
- Open Cases / Closed Cases
- Total Entities
- Total Relationships
- Active Alerts
- Total Evidence Documents

**Integrity & Security Row:**
- Blockchain integrity status
- Last verification timestamp
- Security alert count by severity
- Recent login attempts

**Recent Activity:**
- Latest cases with status badges
- Latest alerts with severity indicators
- Latest evidence uploads

### 10.3 Cases (`/cases`)

**List View:**
- All cases with status badges (OPEN/CLOSED/ARCHIVED)
- Classification badges (OPEN/RESTRICTED/SECRET)
- Document count, entity count, note count per case
- "New Case" button (INVESTIGATOR+ only)

**New Case Dialog:**
- Title input
- Description textarea
- Category dropdown (Financial Fraud, Narcotics, Human Trafficking, Cyber, …)
- Initiated-via / case source dropdown
- Incident date
- Jurisdiction
- Status dropdown (OPEN/CLOSED/ARCHIVED)
- Classification dropdown (OPEN/RESTRICTED/SECRET)
- Assigned investigator
- Posts to `POST /api/cases`

**Case Detail (`/cases/[id]`):**
- Case metadata (ID, status, classification, dates, category, source, jurisdiction)
- Entity list with type-colored badges
- Document list with verification status
- Case Notes panel (view + add)
- Activity log timeline

### 10.4 Documents (`/documents`)

**Upload Panel:**
- Drag-and-drop file zone
- File selection button
- Case association dropdown
- Description textarea
- Upload progress indicator

**AI Extraction Review:**
- Lists ExtractionCandidates grouped by document
- Each candidate shows: type badge, value, context snippet, confidence score
- Three action buttons: Confirm, Reject, Edit
- Edit opens inline input for corrected value

**Evidence List:**
- All uploaded documents
- SHA-256 hash display (truncated)
- Verification status badge
- Last verified timestamp

### 10.4b Data Workspace (`/data-workspace`)

**Inline File Upload Panel (`FileUploadPanel`):**
- Drag-and-drop + browse for structured files (PDF / TXT)
- Case selector
- POSTs to `/api/datasets/ingest` (no redirect away from the page)
- Shows SHA-256 + candidate count after upload
- Header action links to /documents ("Documents library")

**Dataset Ingestion Panel (`IngestPanel`):**
- Paste structured content (CSV / pipe rows) or upload
- Analysis scope selector: **Combine with existing data** (COMBINED) vs **Only this dataset** (DATASET_ONLY)
- Validation note: DATASET_ONLY requires a case

**Dataset List (`DatasetList`):**
- Scope badge + status
- **Analyze dataset** button → collapsible leads + patterns result (`AnalysisResultView`)
- Explicit reassurance: potential matches are never auto-merged

### 10.4c Analysis (`/analysis`) — Knowledge Graph

**Network tab:**
- **Global graph**: `NetworkGraph` mapped from `scope=network` nodes/links (color + weight)
- **Person-focus graph** (`PersonGraphCard`): pick case → pick person → generate (hops 1/2/3)
  - Uses `GET /api/cases/[id]` for persons + `GET /api/intel-data/egocentric`
- **Cross-dataset graph** (`CrossDatasetGraphCard`): pick dataset → pick person →
  **Alone / With existing data** toggle (hops 1/2/3)
  - NEW nodes get thicker rings (`selectedIds`), cross-links amber, legend + cross-link count
  - Uses `GET /api/datasets/[id]/graph`

### 10.5 Entities (`/entities`)

**Stat Cards:**
- Total entities by type (PERSON, PHONE, VEHICLE, LOCATION, ORGANIZATION)

**Entity Grid:**
- All entities with type-colored icons
- Name, value, risk score
- Associated case

**Entity Match Review:**
- Pending matches with Entity A ↔ Entity B
- Confidence percentage
- Reason list
- Confirm / Reject buttons

### 10.6 Network (`/network`)

**Interactive Graph:**
- SVG-based network visualization
- Deterministic circular cluster layout
- Nodes colored by entity type
- Edges weighted by relationship strength
- Mouse wheel zoom
- Click+drag pan
- Search bar to filter/highlight nodes
- Type filter dropdown
- Double-click node to expand/collapse connections
- Click node to show detail panel

**Path Search Panel:**
- Source entity selector
- Target entity selector
- "Find Path" button
- Displays shortest path as step-by-step chain
- Shows hop count

**Relationship Analysis Panel:**
- Select two entities
- Shows communication count, shared locations, financial links
- Displays composite strength score
- Lists direct relationship details

### 10.7 Timeline (`/timeline`)

- Chronological event list
- Events from TimelineEvent table
- Type filter (COMMUNICATION, VISIT, LOCATION, FINANCIAL, VEHICLE)
- Entity filter
- Date range filter
- Each event shows: timestamp, type badge, summary, linked entity

### 10.8 Locations (`/locations`)

- Location entities with linked data
- Fictional map visualization
- Entity count per location
- Communication records at each location
- Financial activity at each location
- Vehicle movements per location

### 10.9 Communications (`/communications`)

- CDR-style (Call Detail Record) table
- Source → Target call records
- Call count and frequency
- Timestamp of each communication
- Frequency analysis clusters
- Entity-linked communication patterns

### 10.10 Transactions (`/transactions`)

- Financial record table
- Sender → Receiver flows
- Transaction amounts and timestamps
- Chain visualization of transaction flows
- Entity-linked financial patterns

### 10.11 AI Insights (`/ai-insights`)

**Pattern Detection:**
- Detected patterns with type, severity, relevance score
- Explainability: reasons array, linked entities, evidence references
- Resolved/unresolved status

**Investigation Summary Generator:**
- "Generate Summary" button (calls POST /api/cases/[id]/analyze)
- Produces structured overview
- Key entities list
- Major relationships
- Important patterns
- Timeline highlights
- Investigation areas
- AI caveat disclaimer

**Investigative Leads:**
- Relationship-based leads
- Location-based leads
- Transaction-based leads
- Fallback "broaden source material" lead

### 10.12 Evidence (`/evidence`)

**Evidence Explorer:**
- All exhibits with name, case, file type
- SHA-256 hash display
- Verification status badge

**Verify Action:**
- Recomputes file hash
- Compares against stored hash
- Checks blockchain chain integrity
- Shows MATCH/MISMATCH result card
- Updates evidence status

**Tamper Simulation:**
- Prototype-only feature
- Corrupts stored hash
- Appends EVIDENCE_MODIFIED block to chain
- Creates CRITICAL security alert
- Next verification detects mismatch

### 10.13 Blockchain (`/blockchain`)

**Ledger Viewer:**
- All BlockchainRecord blocks in order
- Each block shows: index, timestamp, dataHash, previousHash, hash, action
- Visual chain linking between blocks
- Block 0 = genesis block

**Chain Verification:**
- "Verify Chain" button
- Recomputes all block hashes
- Verifies previousHash linkage
- Shows intact/broken status with broken block index

### 10.14 Reports (`/reports`)

**Report Generator:**
- Fetches all case data, entities, relationships, events, patterns
- Generates structured report with sections:
  - Case Summary
  - Entity Directory
  - Relationship Map
  - Timeline
  - AI Patterns
  - Blockchain Integrity
  - Audit Trail
- Print/PDF support via `window.print()`

### 10.15 Security (`/security`) — Admin Only

- Open security alerts by severity
- Failed login statistics
- Recent login attempts with IP, user-agent, reason
- Alert resolution status

### 10.16 Audit Logs (`/audit-logs`) — Admin Only

- Recent 30 audit log entries
- Each shows: action, detail, IP, user-agent, status, timestamp
- Filterable by action type

### 10.17 Settings (`/settings`) — Admin Only

- User listing with roles and status
- AI configuration display (mock/llm mode)
- Role permissions reference table
- **Supabase status card**: configured / database (Supabase Postgres vs local) / storage driver / bucket

---

## 11. AI Layer — Entity Extraction & Analysis

### Entity Extraction Process

```
Input: document text string
    ↓
1. Check aiMode() → "mock" (default)
    ↓
2. scanText(text, "PERSON", PEOPLE[] + hints):
   - Case-insensitive substring search
   - Extract ~80-char context window
   - Confidence: 82-93
    ↓
3. scanText(text, "PHONE", PHONES[]):
   - Strip whitespace before matching
   - Confidence: 88-97
    ↓
4. scanText(text, "VEHICLE", VEHICLES[]):
   - Confidence: 88-97
    ↓
5. scanText(text, "LOCATION", LOCATIONS[]):
   - Confidence: 88-97
    ↓
6. scanText(text, "ORGANIZATION", ORGANIZATIONS[]):
   - Confidence: 88-97
    ↓
7. Check for FINANCIAL keywords ("rs ", "amount"):
   - If found → add FINANCIAL entity
   - Confidence: 88-97
    ↓
8. Check for DATE keywords (month names):
   - If found → add DATE entity
   - Confidence: 88-97
    ↓
9. Check for EVENT keywords (EVENTS[]):
   - If found → add EVENT entity
   - Confidence: 88-97
    ↓
10. Deduplicate by type:value key (keep highest confidence)
11. Sort by confidence descending
    ↓
Output: ExtractionResult[]
```

### Pattern Detection Rules

| Pattern | Condition | Severity | Relevance |
|---------|-----------|----------|-----------|
| REPEATED_LOCATION | >= 2 entities share a location | MEDIUM | 78 |
| REPEATED_COMMUNICATION | >= 5 calls between a pair | HIGH | 84 |
| SHARED_VEHICLE | >= 2 people linked to a vehicle | MEDIUM | 72 |
| TRANSACTION_CHAIN | Any transaction chain exists | HIGH | 81 |
| UNUSUAL_ACTIVITY | Always appended | MEDIUM | 66 |

---

## 12. Blockchain Integrity Ledger

### Block Structure

```
Block {
    index: number          # Sequential block number (0 = genesis)
    timestamp: Date        # Block creation time
    dataHash: string       # SHA-256 of the data being notarized
    previousHash: string   # Hash of the previous block
    hash: string           # SHA-256 of: index|timestamp|dataHash|previousHash|action
    action: string         # EVIDENCE_HASH | INTEGRITY_VERIFY | EVIDENCE_MODIFIED
    note: string?          # Optional annotation
}
```

### Genesis Block (Block 0)

```
index: 0
timestamp: 2026-01-01T00:00:00.000Z
dataHash: SHA-256("CrimeIntel Prototype Blockchain Ledger — Genesis")
previousHash: "0"
hash: hashBlock(genesis block)
action: undefined
```

### Chain Verification Algorithm

```
1. Sort blocks by index ascending
2. For each block (starting at index 1):
   a. Recompute expected hash = hashBlock({index, timestamp, dataHash, previousHash, action})
   b. If expected hash ≠ stored hash → return {intact: false, brokenIndex: block.index}
   c. If block.previousHash ≠ previous block's hash → return {intact: false, brokenIndex: block.index}
3. Return {intact: true, brokenIndex: null}
```

### Actions Tracked

| Action | When Created |
|--------|-------------|
| EVIDENCE_HASH | Document upload (notarizes file hash) |
| INTEGRITY_VERIFY | Evidence verification check |
| EVIDENCE_MODIFIED | Tamper simulation (prototype only) |

---

## 13. Evidence Management Workflow

### Upload → Verify → Tamper → Re-Verify Cycle

```
1. UPLOAD:
   - File → SHA-256 hash → save via storage provider → create EvidenceDocument
   - Create BlockchainRecord (EVIDENCE_HASH)
   - Run AI entity extraction → create ExtractionCandidates
   ↓
2. REVIEW:
   - User confirms/rejects/edits each ExtractionCandidate
   - Confirmed candidates become Entity records
   ↓
3. VERIFY:
   - Recompute file hash from storage (local or Supabase)
   - Compare against stored sha256
   - Verify blockchain chain integrity
   - Result: MATCH (→ VERIFIED) or MISMATCH (→ COMPROMISED + SecurityAlert)
   ↓
4. TAMPER (prototype simulation):
   - Corrupt stored hash by appending " [TAMPERED]"
   - Create BlockchainRecord (EVIDENCE_MODIFIED)
   - Create SecurityAlert (CRITICAL)
   ↓
5. RE-VERIFY:
   - Recompute hash → now MISMATCH (hash doesn't match corrupted stored value)
   - Evidence status → COMPROMISED
   - SecurityAlert created
```

---

## 14. Network Graph & Pathfinding

### Graph Construction

```
1. Fetch all Entity records → map to GraphNode:
   {id, label: entity.name, type: entity.type, color: entityColor(type)}
    ↓
2. Fetch all Relationship records → map to GraphLink:
   {source: rel.sourceId, target: rel.targetId, type: rel.type,
    color: relationColor(type), weight: min(4, 1 + round(strength/30)),
    label: rel.label}
```

### Layout Algorithm

- Deterministic circular cluster layout
- Entities grouped by type in clusters
- No randomness — same input produces same layout
- Node radius based on connection count

### BFS Pathfinding

```
1. Build adjacency list from all Relationships (undirected)
2. Initialize queue with sourceId, visited set, parentMap
3. While queue not empty:
   a. Dequeue node
   b. If node === targetId → reconstruct path via parentMap
   c. For each neighbor not yet visited:
      - Add to queue
      - Set parentMap[neighbor] = current
      - Add to visited
4. If queue empties → {found: false}
5. Max depth: 5 hops (configurable)
```

### Relationship Strength Computation

```
strength = (communicationCount × 4)
         + (sharedLocationCount × 3)
         + (financialCount × 5)
         + averageDirectRelationshipStrength
         → capped at 99
```

---

## 15. Seed Data Summary

### Demo Users

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@crimeintel.demo | Admin@1234 |
| INVESTIGATOR | investigator@crimeintel.demo | Inv3stigator! |
| ANALYST | analyst@crimeintel.demo | An@lyst2024 |
| VIEWER | viewer@crimeintel.demo | V1ewer_Only |

### Seeded Data Volume

| Category | Count | Details |
|----------|-------|---------|
| Users | 4 | One per role |
| Cases | 3 | CR-2026-1042 (OPEN, RESTRICTED), CR-2026-1051 (OPEN, SECRET), CR-2026-1033 (CLOSED, RESTRICTED) |
| Entities | 22 | 8 PERSON, 4 PHONE, 3 VEHICLE, 5 LOCATION, 4 ORGANIZATION |
| Entity Matches | 2 | Duplicate detection pairs with confidence scores |
| Relationships | 27 | 8 COMMUNICATION, 9 OWNERSHIP, 11 LOCATION, 4 FINANCIAL, 1 CASE |
| Timeline Events | 14 | 30-day window, 5 types |
| Evidence Documents | 6 | FIR, Communication Record, Transaction Record, Location Record, Vehicle Movement Log, Assessment Report |
| Blockchain Records | 7 | Genesis + 6 evidence blocks (chained) |
| AI Patterns | 5 | REPEATED_COMMUNICATION, REPEATED_LOCATION, TRANSACTION_CHAIN, SHARED_VEHICLE, CROSS_CASE |
| AI Alerts | 4 | NEW_RELATIONSHIP, CROSS_CASE_MATCH, REPEATED_LOCATION, PATTERN |
| Login Attempts | 2 | 1 success, 1 failure |
| Security Alerts | 1 | Prototype initialization |
| Audit Logs | 1 | Seed completion record |

---

## 16. Supabase Integration (Storage + Auth + Database)

Supabase provides the hosted **PostgreSQL database**, **Storage** and **Auth**.
Prisma remains the ORM for all database access; the storage and auth layers wrap
Supabase behind the existing infrastructure abstractions. The app is plug-and-play:
set the keys, push the schema, and it runs entirely on Supabase.

### Infrastructure files (`backend/infrastructure/`)

| File | Purpose |
|------|---------|
| `config/env.ts` | Typed env access; `isSupabaseConfigured()`, `isPostgres()`, driver inference |
| `supabase/client.ts` | `getSupabaseAdmin()` (service role, server-only) + `getSupabaseAnon()` |
| `storage/supabase.ts` | `SupabaseStorageProvider` (save/read/getPublicUrl/delete), auto-creates bucket, `supabase://` locations |
| `storage/index.ts` | `getStorageProvider()` / `storageFor(location)` — local ↔ supabase routing |
| `database/setup-supabase.sql` | Enables RLS on all public tables + creates `crimeintel-evidence` bucket + read policy |
| `database/migrate-to-supabase.md` | Step-by-step migration + rollback guide |

### Database

- `backend/prisma/schema.prisma` datasource `provider = "postgresql"` (reads `env("DATABASE_URL")`).
- Point `DATABASE_URL` at the Supabase Postgres connection string (Prisma format, port 5432 pooler).
- Schema is validated: `npx prisma validate` passes once `DATABASE_URL` is the Supabase connection string.
- To revert to local dev: switch `provider` back to `"sqlite"` and set `DATABASE_URL="file:./dev.db"`.

### Storage

- Evidence and dataset files persist via `storageFor(location)`; locations are stored in the DB.
- Local: `uploads/<caseId>/file.pdf`. Supabase: `supabase://<bucket>/<caseId>/file.pdf`.
- Mixed-backend reads are supported during migration.
- `SUPABASE_STORAGE_PUBLIC="true"` → public URLs; otherwise signed-read via service role.

### Auth

- Browser sign-in uses the **public anon key** only (`frontend/lib/supabase-client.ts`, `NEXT_PUBLIC_*` vars).
- The `supabase` NextAuth provider maps the verified identity to the local DB user → RBAC + lockout + audit preserved.
- Falls back to built-in credentials login when no client keys are set.

### Readiness / health

- `GET /api/supabase/health` → `{configured, postgres, storageDriver, bucket, live?, error?}`.
  When configured + supabase driver, it performs a write/read/delete connectivity probe.
- Settings page shows a live Supabase status card.

### Environment variables

Root `.env` / `frontend/.env`:
```
DATABASE_URL            # postgresql://... (Supabase) — or file:./dev.db for local
SUPABASE_URL
SUPABASE_ANON_KEY       # public
SUPABASE_SERVICE_ROLE_KEY  # server-only, never exposed
SUPABASE_STORAGE_BUCKET # crimeintel-evidence
SUPABASE_STORAGE_PUBLIC # true/false
STORAGE_DRIVER          # local | supabase (auto-inferred from DATABASE_URL)
NEXT_PUBLIC_SUPABASE_URL     # in frontend/.env for browser sign-in
NEXT_PUBLIC_SUPABASE_ANON_KEY # in frontend/.env for browser sign-in
```

### Going live

1. Fill the keys above.
2. `npx prisma db push --schema backend/prisma/schema.prisma` (stop the dev server first).
3. `npx prisma db generate --schema backend/prisma/schema.prisma`.
4. Apply `backend/infrastructure/database/setup-supabase.sql` (RLS + bucket).
5. `npm run dev` — new uploads store in Supabase Storage, logins verify via Supabase Auth, all data lives in Supabase Postgres.

---

## Appendix: Middleware Route Protection

```typescript
// middleware.ts matcher excludes:
// - _next/static (static assets)
// - _next/image (images)
// - favicon.ico
// - api/auth (NextAuth endpoints)

// Logic:
1. Allow excluded paths → next()
2. If not authenticated → redirect to /login
3. If authenticated + visiting /login → redirect to /dashboard
4. Check canAccessPath(role, pathname)
   - If denied → redirect to /dashboard
5. Otherwise → next()
```

---

*Document generated for CrimeIntel prototype. All data is fictional. All AI outputs require human verification.*
