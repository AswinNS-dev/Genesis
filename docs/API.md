# CrimeIntel API Reference

Base URL: `http://localhost:8000/api`

## Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate investigator/analyst. Returns JWT access token.
- `GET /api/auth/me`: Current session user profile.

## Cases (`/api/cases`)
- `GET /api/cases`: Filter and retrieve registered cases.
- `POST /api/cases`: Create case docket (Requires INVESTIGATOR role).
- `POST /api/cases/{id}/notes`: Append investigator notes.

## Entities (`/api/entities`)
- `GET /api/entities`: Search entities across Persons, Phones, Vehicles, Locations.
- `POST /api/entities`: Register or merge entity records.

## Intelligence & Analysis (`/api/analysis`)
- `POST /api/analysis/case/{id}`: AI case summarization & lead generation.
- `GET /api/analysis/graph`: Network graph nodes and edges.
- `GET /api/analysis/path?source={id}&target={id}`: Multi-hop pathfinding.

## Evidence & Blockchain (`/api/evidence`, `/api/blockchain`)
- `GET /api/evidence`: Evidence files and hash validation status.
- `POST /api/evidence/upload`: Upload file and automatically notarize to blockchain ledger.
- `POST /api/evidence/{id}/verify`: Verify SHA-256 integrity against blockchain record.
- `POST /api/blockchain/verify-chain`: Verify entire chain integrity from Genesis block.

## Search (`/api/search`)
- `GET /api/search?q={query}`: Cross-module unified entity and case search.
