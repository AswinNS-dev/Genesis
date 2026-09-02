def get_evidence_provenance(feature_name, person_id, data_dir="data/raw"):
    """
    Given a feature that triggered an anomaly/lead, find the raw source record IDs.
    In a real production system with a database, this queries the DB by entity ID.
    Since we are using CSVs here, we return representative mock provenance or subset of rows.
    """
    
    # Example logic to map feature back to evidence source
    if "call" in feature_name or "communication" in feature_name:
        return {
            "source": "call_records.csv",
            "reason": "Entity found in caller_person_id or receiver_person_id"
        }
    elif "amount" in feature_name or "transaction" in feature_name:
        return {
            "source": "financial_transactions.csv",
            "reason": "Entity found in sender_person_id or receiver_person_id"
        }
    elif "visit" in feature_name or "location" in feature_name:
        return {
            "source": "vehicle_records.csv / fir_cases.csv",
            "reason": "Entity observed at location matching criteria"
        }
    else:
        return {
            "source": "master_intelligence.csv",
            "reason": "Cross-referenced intelligence table"
        }
