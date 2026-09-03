import json
import io
import csv
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from backend.app.database.models import Dataset, DatasetRecord, DatasetEntity, Entity
from backend.app.database.repositories.dataset_repository import DatasetRepository
from backend.app.data_processing.csv.parser import CSVParser
from backend.app.data_processing.json.parser import JSONParser
from backend.app.data_processing.normalization import (
    normalize_person_name, normalize_phone, normalize_vehicle, normalize_location
)
from backend.app.security.audit import log_action

class DatasetController:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DatasetRepository(db)

    def list_datasets(self, case_id: Optional[str] = None, search: Optional[str] = None, source_type: Optional[str] = None) -> List[Dict[str, Any]]:
        datasets = self.repo.list(case_id=case_id, search=search, source_type=source_type)
        return [
            {
                "id": d.id,
                "name": d.name,
                "sourceType": d.sourceType,
                "fileName": d.fileName,
                "status": d.status,
                "recordCount": d.recordCount,
                "analysisScope": d.analysisScope,
                "caseId": d.caseId,
                "createdAt": d.createdAt.isoformat() if d.createdAt else None,
                "updatedAt": d.updatedAt.isoformat() if d.updatedAt else None,
            }
            for d in datasets
        ]

    def get_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        d = self.repo.get_by_id(dataset_id)
        if not d:
            return None
        return {
            "id": d.id,
            "name": d.name,
            "sourceType": d.sourceType,
            "fileName": d.fileName,
            "status": d.status,
            "recordCount": d.recordCount,
            "analysisScope": d.analysisScope,
            "caseId": d.caseId,
            "createdAt": d.createdAt.isoformat() if d.createdAt else None,
            "updatedAt": d.updatedAt.isoformat() if d.updatedAt else None,
        }

    def get_records(self, dataset_id: str, limit: int = 50, offset: int = 0, search: Optional[str] = None) -> Dict[str, Any]:
        return self.repo.get_records(dataset_id, limit=limit, offset=offset, search=search)

    def delete_dataset(self, dataset_id: str, user_id: Optional[str] = None, role: Optional[str] = None) -> bool:
        ds = self.repo.get_by_id(dataset_id)
        if not ds:
            return False
        ds_name = ds.name
        res = self.repo.delete(dataset_id)
        if res:
            log_action(
                db=self.db,
                action="DATASET_DELETED",
                detail=f"Deleted dataset '{ds_name}' (ID: {dataset_id})",
                resource="Dataset",
                resource_id=dataset_id,
                user_id=user_id,
                role=role or "INVESTIGATOR",
                status="SUCCESS",
                severity="MEDIUM"
            )
            self.db.commit()
        return res

    def get_summary(self) -> Dict[str, Any]:
        return self.repo.get_summary()

    def ingest_dataset(
        self,
        name: str,
        source_type: str,
        file_content: Optional[bytes] = None,
        file_name: Optional[str] = None,
        raw_text: Optional[str] = None,
        raw_rows: Optional[List[Dict[str, Any]]] = None,
        case_id: Optional[str] = None,
        analysis_scope: str = "COMBINED",
        user_id: Optional[str] = None,
        role: Optional[str] = None,
        ip: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parses multi-source dataset (CSV, JSON, CDR, Bank statement, TXT),
        normalizes entity values, and persists to database with audit log.
        """
        parsed_rows: List[Dict[str, Any]] = []

        # 1. Parse rows depending on input
        if raw_rows:
            parsed_rows = raw_rows
        elif file_content:
            text = file_content.decode("utf-8", errors="ignore")
            # Try JSON first
            if (file_name and file_name.endswith(".json")) or text.strip().startswith(("[", "{")):
                try:
                    data = json.loads(text)
                    if isinstance(data, list):
                        parsed_rows = [dict(r) for r in data if isinstance(r, dict)]
                    elif isinstance(data, dict):
                        parsed_rows = [data]
                except Exception:
                    pass

            # If not JSON, parse as CSV/TSV
            if not parsed_rows:
                delimiter = "\t" if (file_name and file_name.endswith(".tsv")) else ","
                try:
                    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
                    parsed_rows = [dict(r) for r in reader]
                except Exception:
                    # Fallback line-by-line
                    lines = [line.strip() for line in text.splitlines() if line.strip()]
                    parsed_rows = [{"lineIndex": i, "content": line} for i, line in enumerate(lines)]
        elif raw_text:
            try:
                data = json.loads(raw_text)
                if isinstance(data, list):
                    parsed_rows = [dict(r) for r in data if isinstance(r, dict)]
                elif isinstance(data, dict):
                    parsed_rows = [data]
            except Exception:
                reader = csv.DictReader(io.StringIO(raw_text))
                parsed_rows = [dict(r) for r in reader]

        if not parsed_rows:
            parsed_rows = [{"index": 0, "message": "Empty or unrecognized format"}]

        # 2. Create Dataset record
        dataset = Dataset(
            name=name,
            sourceType=source_type.upper(),
            fileName=file_name or f"{name.lower().replace(' ', '_')}.csv",
            status="PROCESSED",
            recordCount=len(parsed_rows),
            analysisScope=analysis_scope.upper(),
            caseId=case_id,
            createdById=user_id,
        )
        self.db.add(dataset)
        self.db.flush()

        # 3. Process & normalize rows
        dataset_records = []
        for idx, row in enumerate(parsed_rows):
            normalized_row = {}
            for k, v in row.items():
                if not v:
                    normalized_row[k] = v
                    continue
                k_lower = k.lower()
                v_str = str(v).strip()
                if "phone" in k_lower or "mobile" in k_lower or "contact" in k_lower:
                    normalized_row[k] = normalize_phone(v_str)
                elif "name" in k_lower or "suspect" in k_lower or "caller" in k_lower or "callee" in k_lower:
                    normalized_row[k] = normalize_person_name(v_str)
                elif "vehicle" in k_lower or "plate" in k_lower or "registration" in k_lower:
                    normalized_row[k] = normalize_vehicle(v_str)
                elif "location" in k_lower or "city" in k_lower or "address" in k_lower:
                    normalized_row[k] = normalize_location(v_str)
                else:
                    normalized_row[k] = v_str

            record = DatasetRecord(
                datasetId=dataset.id,
                rowIndex=idx + 1,
                raw=json.dumps(row),
                normalized=json.dumps(normalized_row),
                matchStatus="UNMATCHED",
            )
            dataset_records.append(record)

        self.db.add_all(dataset_records)
        self.db.flush()

        # 4. Record audit log
        log_action(
            db=self.db,
            action="DATASET_INGESTED",
            detail=f"Ingested {len(parsed_rows)} records for dataset '{name}' [{source_type.upper()}]",
            resource="Dataset",
            resource_id=dataset.id,
            case_id=case_id,
            user_id=user_id,
            role=role or "INVESTIGATOR",
            ip=ip,
            status="SUCCESS",
            severity="INFO"
        )
        self.db.commit()
        self.db.refresh(dataset)

        return {
            "id": dataset.id,
            "name": dataset.name,
            "sourceType": dataset.sourceType,
            "fileName": dataset.fileName,
            "status": dataset.status,
            "recordCount": dataset.recordCount,
            "analysisScope": dataset.analysisScope,
            "caseId": dataset.caseId,
            "createdAt": dataset.createdAt.isoformat() if dataset.createdAt else None,
        }

    def ingest_sample(self, sample_type: str, case_id: Optional[str] = None, user_id: Optional[str] = None, role: Optional[str] = None) -> Dict[str, Any]:
        """
        Ingests realistic sample forensic datasets with one click.
        """
        st = sample_type.upper()
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        if st == "CDR":
            name = "Telecom CDR Dump - NCR Corridor"
            source_type = "CDR"
            rows = [
                {"call_id": "CDR-9901", "caller_name": "Rahul Kumar", "caller_phone": "+919876512345", "callee_name": "Ramesh Kumar", "callee_phone": "+919811099882", "duration_sec": 142, "tower_location": "Noida Sector 18", "timestamp": "2026-09-02 23:45:10", "call_type": "VOICE"},
                {"call_id": "CDR-9902", "caller_name": "Ramesh Kumar", "caller_phone": "+919811099882", "callee_name": "Vikram Sethi", "callee_phone": "+919988771122", "duration_sec": 89, "tower_location": "Connaught Place Delhi", "timestamp": "2026-09-03 00:15:22", "call_type": "VOICE"},
                {"call_id": "CDR-9903", "caller_name": "Burner Handset #4", "caller_phone": "+919871100223", "callee_name": "Rahul Kumar", "callee_phone": "+919876512345", "duration_sec": 312, "tower_location": "Gurugram Cyber City", "timestamp": "2026-09-03 01:20:00", "call_type": "VOICE"},
                {"call_id": "CDR-9904", "caller_name": "Vikram Sethi", "caller_phone": "+919988771122", "callee_name": "Apex Logistics Front", "callee_phone": "+911145678901", "duration_sec": 45, "tower_location": "Faridabad Industrial", "timestamp": "2026-09-03 02:10:15", "call_type": "SMS"},
                {"call_id": "CDR-9905", "caller_name": "Rahul Kumar", "caller_phone": "+919876512345", "callee_name": "Overseas Transit Agent", "callee_phone": "+971501234567", "duration_sec": 240, "tower_location": "IGI Airport T3 Delhi", "timestamp": "2026-09-03 03:05:44", "call_type": "VOICE"}
            ]
        elif st == "TRANSACTION":
            name = "Hawala & Banking Flows - PNB & Axis"
            source_type = "TRANSACTION"
            rows = [
                {"txn_id": "TXN-8801", "sender_name": "Rahul Kumar", "sender_bank": "Axis Bank", "sender_acc": "91802001992", "receiver_name": "Apex Shell Holdings", "receiver_bank": "HDFC Bank", "receiver_acc": "50100492819", "amount_inr": 485000, "timestamp": "2026-09-01 14:20:00", "type": "RTGS", "suspicious_flag": True},
                {"txn_id": "TXN-8802", "sender_name": "Apex Shell Holdings", "sender_bank": "HDFC Bank", "sender_acc": "50100492819", "receiver_name": "Vikram Sethi", "receiver_bank": "ICICI Bank", "receiver_acc": "00120199482", "amount_inr": 250000, "timestamp": "2026-09-01 15:10:00", "type": "NEFT", "suspicious_flag": False},
                {"txn_id": "TXN-8803", "sender_name": "Ramesh Kumar", "sender_bank": "SBI", "sender_acc": "30192849182", "receiver_name": "Local Cash Handler", "receiver_bank": "Cash Payout", "receiver_acc": "N/A", "amount_inr": 99000, "timestamp": "2026-09-02 11:00:00", "type": "ATM_WITHDRAWAL", "suspicious_flag": True},
                {"txn_id": "TXN-8804", "sender_name": "Apex Shell Holdings", "sender_bank": "HDFC Bank", "sender_acc": "50100492819", "receiver_name": "Offshore Trade Corp", "receiver_bank": "Emirates NBD", "receiver_acc": "AE99201928", "amount_inr": 1200000, "timestamp": "2026-09-02 17:30:00", "type": "WIRE", "suspicious_flag": True}
            ]
        elif st == "LOCATION":
            name = "ANPR Vehicle & Toll Scans - NH-48"
            source_type = "LOCATION"
            rows = [
                {"scan_id": "ANPR-771", "vehicle_plate": "DL01AB1234", "registered_owner": "Rahul Kumar", "toll_plaza": "Kherki Daula Toll", "latitude": 28.4011, "longitude": 76.9928, "speed_kmh": 84, "timestamp": "2026-09-02 19:30:00"},
                {"scan_id": "ANPR-772", "vehicle_plate": "DL01AB1234", "registered_owner": "Rahul Kumar", "toll_plaza": "Manesar Toll Plaza", "latitude": 28.3512, "longitude": 76.9321, "speed_kmh": 92, "timestamp": "2026-09-02 19:55:00"},
                {"scan_id": "ANPR-773", "vehicle_plate": "HR26CK8899", "registered_owner": "Vikram Sethi", "toll_plaza": "Manesar Toll Plaza", "latitude": 28.3512, "longitude": 76.9321, "speed_kmh": 88, "timestamp": "2026-09-02 19:56:15"},
                {"scan_id": "ANPR-774", "vehicle_plate": "DL01AB1234", "registered_owner": "Rahul Kumar", "toll_plaza": "Bilaspur Checkpoint", "latitude": 28.2910, "longitude": 76.8490, "speed_kmh": 75, "timestamp": "2026-09-02 20:30:00"}
            ]
        else:
            name = "Master Suspect Entity Manifest"
            source_type = "GENERIC_CSV"
            rows = [
                {"person_id": "P-9001", "name": "Rahul Kumar", "alias": "RK Don", "dob": "1988-04-12", "phone": "+919876512345", "vehicle": "DL01AB1234", "address": "Sector 18 Noida", "risk_score": 85},
                {"person_id": "P-9002", "name": "Ramesh Kumar", "alias": "Ramu", "dob": "1988-04-12", "phone": "+919811099882", "vehicle": "DL01AB1234", "address": "Sector 18 Noida", "risk_score": 82},
                {"person_id": "P-9003", "name": "Vikram Sethi", "alias": "Vicky", "dob": "1985-09-20", "phone": "+919988771122", "vehicle": "HR26CK8899", "address": "Civil Lines Delhi", "risk_score": 75},
                {"person_id": "P-9004", "name": "Priya Sharma", "alias": "Accountant", "dob": "1992-01-15", "phone": "+919810011223", "vehicle": "DL04XY9988", "address": "Saket New Delhi", "risk_score": 45}
            ]

        return self.ingest_dataset(
            name=name,
            source_type=source_type,
            raw_rows=rows,
            case_id=case_id,
            analysis_scope="COMBINED",
            user_id=user_id,
            role=role,
            ip="127.0.0.1"
        )
