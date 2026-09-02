# CrimeIntel Datasets

CrimeIntel supports multi-format ingest (CSV, JSON, CDR logs, PDF dossiers, DOCX transcripts).

## Synthetic Dataset
- Path: `data/raw/synthetic_entities_100k.csv`
- Schema: `entity_id, name, type, phone, vehicle_plate, location, organization, risk_score`

## Sample CDR Data
- Path: `data/samples/sample_cdr_log.json`
- Ingested by `backend/app/intelligence/anomaly_detection/` to flag off-hours and high-frequency communication patterns.
