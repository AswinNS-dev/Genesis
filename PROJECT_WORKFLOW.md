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
| Database | SQLite via Prisma ORM |
| Authentication | NextAuth.js (Credentials provider, JWT sessions, 8hr expiry) |
| Security | bcryptjs, account lockout (5 attempts / 15 min), brute-force alerts |
| Integrity | Custom SHA-256 chained ledger (blockchain.ts) |
| AI | Deterministic mock extraction layer (rule-based, no LLM) |

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
│   │   └── graph-data.ts          # Graph builder, relationship analysis, BFS pathfinding
│   └── prisma/
│       ├── schema.prisma          # 17 data models
│       ├── seed.ts                # Demo dataset generator (486 lines)
│       └── dev.db                 # SQLite database file
├── frontend/
│   ├── middleware.ts              # Auth + RBAC route protection
│   ├── next.config.mjs            # Next.js config
│   ├── tailwind.config.ts         # Theme colors, fonts, animations
│   ├── postcss.config.mjs         # PostCSS + Tailwind
│   ├── globals.css                # Global styles, CSS variables
│   ├── lib/
│   │   ├── utils.ts               # cn() class-name utility
│   │   └── store/sidebar.ts       # Zustand sidebar state
│   ├── config/navigation.ts       # Sidebar nav structure
│   ├── types/next-auth.d.ts       # NextAuth type augmentation
│   ├── components/
│   │   ├── ui/                    # Button, Card, Badge, Alert, Dialog, State, StatCard
│   │   ├── layout/                # Sidebar, Topbar, UserMenu
│   │   ├── dashboard/             # PageHeader, ModuleStub
│   │   ├── entities/              # Entity type helpers (colors, labels, icons)
│   │   └── network/               # Interactive SVG NetworkGraph
│   └── app/
│       ├── layout.tsx             # Root layout (fonts, metadata)
│       ├── page.tsx               # Redirects to /dashboard
│       ├── globals.css
│       ├── (auth)/login/          # Login page + LoginForm client component
│       ├── (dashboard)/           # All authenticated pages
│       │   ├── layout.tsx         # Dashboard layout (sidebar + topbar)
│       │   ├── dashboard/         # KPI overview
│       │   ├── cases/             # Case list, detail, notes, new-case dialog
│       │   ├── documents/         # Upload, AI extraction review
│       │   ├── entities/          # Entity registry, match actions
│       │   ├── network/           # Interactive graph, pathfinding, analysis
│       │   ├── timeline/          # Chronological event view
│       │   ├── locations/         # Location intelligence
│       │   ├── communications/    # CDR-style call records
│       │   ├── transactions/      # Financial flow analysis
│       │   ├── ai-insights/       # Patterns, summary, leads
│       │   ├── evidence/          # Hash verification, tamper simulation
│       │   ├── blockchain/        # Integrity ledger viewer
│       │   ├── reports/           # Report generation + print
│       │   ├── security/          # Alerts, failed logins (admin)
│       │   ├── audit-logs/        # Action audit trail (admin)
│       │   └── settings/          # User/role config (admin)
│       └── api/
│           ├── auth/[...nextauth]/ # NextAuth handler
│           ├── upload/             # Document upload → hash → ledger → extraction
│           ├── cases/              # Create cases
│           ├── cases/[id]/notes/   # Add case notes
│           ├── cases/[id]/analyze/ # AI analysis for a case
│           ├── intel-data/         # Scoped data (documents, network, timeline, etc.)
│           ├── intel-data/analyze/ # Relationship analysis
│           ├── intel-data/path/    # Multi-hop pathfinding
│           ├── intel-data/entity/[id]/links/ # Entity connections
│           ├── evidence/[id]/verify/  # Hash integrity check
│           ├── evidence/[id]/tamper/  # Tamper simulation
│           ├── blockchain/verify-chain/ # Full chain verification
│           ├── matches/[id]/[action]/  # Entity match confirm/reject
│           ├── extraction/[id]/confirm/ # Confirm AI extraction
│           ├── extraction/[id]/reject/  # Reject AI extraction
│           ├── extraction/[id]/update/  # Edit AI extraction
│           └── reports/             # Generate investigation report
```

---

## 4. Complete Data Flow Workflow

### 4.1 User Login Flow

```
User visits /login
    ↓
LoginForm (client component) calls signIn("credentials", {email, password})
    ↓
NextAuth authorize() in auth.ts:
    1. Validates credentials present
    2. Extracts IP (x-forwarded-for) + user-agent from request
    3. Looks up user by email (lowercased) via prisma.user.findUnique()
    4. Checks account lockout (lockedUntil > now) → records ACCOUNT_LOCKED attempt
    5. Checks user not found → records NO_USER attempt
    6. Checks status !== "ACTIVE" → records ACCOUNT_DISABLED attempt
    7. bcrypt.compare(password, user.passwordHash)
       - Invalid → increments failedLogins; if >=5 → locks 15 min + BRUTE_FORCE SecurityAlert
       - Records login attempt with reason → returns null
    8. On success → resets failedLogins, clears lock, sets lastLoginAt
       - Records successful LoginAttempt + AuditLog
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
    5. Saves file to public/uploads/{sanitized_name}
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
    2. Reads actual file from disk (fs.readFileSync)
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

---

## 5. Authentication & Session Management

### Configuration (`auth.ts`)

| Setting | Value |
|---------|-------|
| Strategy | JWT |
| Max Age | 8 hours (28800 seconds) |
| Sign-in Page | /login |
| Provider | Credentials (email + password) |

### Login Logic

```
1. Validate credentials present
2. Extract IP from x-forwarded-for header
3. Extract User-Agent from headers
4. Lookup user: prisma.user.findUnique({where: {email: email.toLowerCase()}})
5. Check lockout: user.lockedUntil > new Date() → record ACCOUNT_LOCKED → return null
6. Check existence: user not found → record NO_USER → return null
7. Check status: user.status !== "ACTIVE" → record ACCOUNT_DISABLED → return null
8. Password check: bcrypt.compare(password, user.passwordHash)
   - Fail → increment failedLogins
     - If failedLogins >= 5 → lock account 15 min + create SecurityAlert (BRUTE_FORCE)
   - Record login attempt → return null
9. Success → reset failedLogins, clear lockedUntil, set lastLoginAt
   - Create LoginAttempt (success: true, reason: "SUCCESS")
   - Create AuditLog (action: "LOGIN")
   - Return {id, email, name, role}
```

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

### 17 Prisma Models

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
| **InvestigationCase** | Core case entity | id, caseId (unique, e.g. CR-2026-1042), title, description, status (OPEN/CLOSED/ARCHIVED), classification (OPEN/RESTRICTED/SECRET), assignedInvestigator, createdById |
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
         └── has ──→ TimelineEvent[]
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
| `authOptions` | `NextAuthOptions` | Full NextAuth config: JWT strategy (8hr), Credentials provider, JWT/session callbacks |
| `getSession()` | `Promise<Session \| null>` | Server-side session retrieval wrapper |

**Internal `authorize()` flow:**
1. Validate inputs → extract IP + User-Agent → lookup user by email
2. Check lockout → check existence → check status → bcrypt compare
3. On failure: increment failedLogins, lock after 5 failures (15 min), create SecurityAlert
4. On success: reset counters, record LoginAttempt + AuditLog, return user object

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
| `/api/auth/[...nextauth]` | GET/POST | Public | NextAuth handler (login, session, CSRF) |

### Case Management

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/cases` | POST | INVESTIGATOR+ | Create new case (auto-generates CR-2026-###) |
| `/api/cases/[id]/notes` | POST | INVESTIGATOR+ | Add note to case |
| `/api/cases/[id]/analyze` | POST | INVESTIGATOR+ | Run AI analysis (summary + leads + patterns) |

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
| `/api/intel-data` | GET | Any | Scoped data: cases, evidence, entities, patterns, links, blocks, events, locations, comms, transactions |
| `/api/intel-data/analyze` | GET | Any | Relationship analysis between two entities |
| `/api/intel-data/path` | GET | Any | Multi-hop BFS path search |
| `/api/intel-data/entity/[id]/links` | GET | Any | All relationships for an entity |

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
- Calls NextAuth `signIn("credentials", ...)`
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
- Classification dropdown
- Assigned investigator
- Posts to `POST /api/cases`

**Case Detail (`/cases/[id]`):**
- Case metadata (ID, status, classification, dates)
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
   - File → SHA-256 hash → save to disk → create EvidenceDocument
   - Create BlockchainRecord (EVIDENCE_HASH)
   - Run AI entity extraction → create ExtractionCandidates
   ↓
2. REVIEW:
   - User confirms/rejects/edits each ExtractionCandidate
   - Confirmed candidates become Entity records
   ↓
3. VERIFY:
   - Recompute file hash from disk
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
