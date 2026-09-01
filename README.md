# CrimeIntel — AI-Assisted Investigation Platform (Prototype)

A full-stack Next.js 14 (App Router) prototype for an AI-assisted criminal investigation
workbench. Built with **fictional demo data** only. All AI outputs are framed as
investigative leads requiring human verification — never guilt determinations.

## Stack

- Next.js 14 (TypeScript, App Router)
- Tailwind CSS (dark saffron-accent theme)
- Prisma ORM + SQLite (`prisma/dev.db`)
- NextAuth.js (Credentials provider, JWT sessions)
- Custom SHA-256 chained ledger (`lib/blockchain.ts`)
- Deterministic "mock" AI layer (`lib/ai.ts`, no external LLM required)

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up the database (SQLite file + seed demo data):

```bash
npx prisma migrate dev --name init   # or: npx prisma db push
npx prisma db seed                   # or: node prisma/seed.ts
```

3. Configure environment (`.env`):

```
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="crimeintel-dev-secret-change-me"
AI_MODE="mock"
UPLOAD_DIR="./public/uploads"
```

4. Run the app:

```bash
npm run dev
```

Open http://localhost:3000 and sign in.

## Demo Accounts

| Role        | Email                      | Password        |
|-------------|----------------------------|-----------------|
| Admin       | `admin@crimeintel.demo`    | `Admin@1234`    |
| Investigator| `investigator@crimeintel.demo` | `Inv3stigator!` |
| Analyst     | `analyst@crimeintel.demo`  | `An@lyst2024`   |
| Viewer      | `viewer@crimeintel.demo`   | `V1ewer_Only`   |

## Feature Map

- **Dashboard** — KPIs (open/closed cases, entities, relationships, alerts, recent activity).
- **Cases** — list, detail (notes, activity, AI-powered analysis), new-case dialog.
- **Documents** — upload (hash recorded to ledger), AI entity extraction review (confirm/reject/edit).
- **Entities** — person/organization/location/vehicle/account directory + match actions.
- **Network** — interactive entity graph (zoom/pan/search/filter/expand/highlight),
  relationship analysis, multi-hop pathfinding.
- **Timeline** — case/entity events on a chronological view.
- **Locations** — location-centric intelligence.
- **Communications** — call/CDR-style records with frequency analysis.
- **Transactions** — financial records with flow detection.
- **AI Insights** — alerts and suggested leads (mock AI, human-verification framing).
- **Evidence** — integrity verification vs. stored SHA-256; tamper simulation.
- **Blockchain** — integrity ledger viewer + overall chain verification.
- **Reports** — generate case intelligence reports.
- **Settings / Audit Logs / Security** — admin-only (RBAC enforced).

## Role-Based Access (RBAC)

Enforced in `lib/rbac.ts`, `lib/auth.ts`, and per-page/API guards:

- **ADMIN** — everything incl. `/settings`, `/audit-logs`, `/security`.
- **INVESTIGATOR+** — `/cases`, `/documents`, `/evidence`, `/blockchain`, entity actions.
- **ANALYST / VIEWER** — read-only surfaces; API writes return `403`.

## Data Model

Prisma schema (`prisma/schema.prisma`) covers:

- Auth/security: `User`, `LoginAttempt`, `AuditLog`, `SecurityAlert`, `ApiKey`.
- Investigation: `InvestigationCase`, `CaseNote`, `CaseActivity`.
- Documents/evidence: `EvidenceDocument`, `BlockchainRecord`, `EvidenceVerification`, `ExtractionCandidate`.
- Intelligence: `Entity`, `EntityMatch`, `Relationship`, `TimelineEvent`, `Pattern`, `AIAlert`.

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/cases` | GET/POST | list / create cases |
| `/api/cases/[id]/notes` | GET/POST | case notes |
| `/api/cases/[id]/analyze` | POST | AI summary, leads, patterns |
| `/api/upload` | POST | upload doc → hash → ledger → extraction |
| `/api/extraction/[id]/confirm\|reject\|update` | POST | review extraction candidates |
| `/api/evidence/[id]/verify\|tamper` | POST | integrity verify / simulate tamper |
| `/api/blockchain/verify-chain` | POST | verify entire ledger chain |
| `/api/matches/[id]/[action]` | POST | entity match actions |
| `/api/intel-data` | GET | scoped data: documents, network, timeline, locations, communications, transactions, patterns, blockchain |
| `/api/intel-data/analyze` | GET | relationship analysis between two entities |
| `/api/intel-data/path` | GET | multi-hop path search |
| `/api/intel-data/entity/[id]/links` | GET | entity connections |
| `/api/reports` | GET | report generation |

## Notes

- The prototype uses **only fictional data**; no real persons/cases.
- `AI_MODE="mock"` keeps the AI layer deterministic and offline.
- `npx next build` runs ESLint + type-checking; keep it green before shipping.
