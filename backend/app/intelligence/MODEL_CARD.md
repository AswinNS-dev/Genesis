# Model Cards for CrimeIntel Intelligence

## 1. Location Analysis Engine (Anomaly & Hotspots)
- **Purpose**: Detect anomalous geographic movement or identify high-activity co-location hubs.
- **Intended Use**: For intelligence analysts seeking investigation leads based on anomalous behaviors (night activity, irregular travel).
- **Prohibited Use**: NOT to be used to establish intent, guilt, or geographical alibi strictly.
- **Training Data**: `call_records.csv`, `vehicle_records.csv`, `fir_cases.csv`
- **Algorithm**: `IsolationForest` (Anomalies), `DBSCAN` (Hotspots)
- **Hyperparameters**: `contamination=0.05` (IsolationForest), `eps=0.5, min_samples=3` (DBSCAN)
- **Evaluation**: Unsupervised anomaly detection evaluated via synthetic anomaly injection (>95% detection).
- **Limitations**: Does not use GPS coordinates; relies entirely on abstract location associations and times.
- **Human Review**: Mandatory. Anomalous presence does not equal criminality.

## 2. AI Investigation Summarizer
- **Purpose**: Transform tabular intelligence (cases, locations, people) into natural language briefings.
- **Intended Use**: Generating quick-read summaries for case dashboards.
- **Prohibited Use**: NOT to be used as authoritative legal documentation or final reports.
- **Training Data**: Synthetically generated weakly supervised corpus derived from `fir_cases.csv` and `master_intelligence.csv`.
- **Algorithm**: `google/flan-t5-small` (Seq2Seq Transformer)
- **Limitations**: May hallucinate details not strictly in the context if case numbers overlap strongly in training.
- **Human Review**: Mandatory. Facts must be cross-verified using the `Explainability` trace.

## 3. Investigation Lead Generator
- **Purpose**: To rank and prioritize connections between entities that may warrant investigator attention.
- **Intended Use**: Lead triage and network expansion.
- **Prohibited Use**: Must NEVER be used as a "Guilt Probability" or direct cause for arrest.
- **Training Data**: Cross-domain features from transactions, calls, and cases. Labels generated via weak supervision (multi-source corroboration).
- **Algorithm**: `XGBoostClassifier`
- **Evaluation**: High Precision/Recall on synthetically constructed strong-connection leads.
- **Limitations**: Subject to strong selection bias (only observes recorded intelligence).

## 4. Explainability Module
- **Purpose**: To provide human-readable justification for AI outputs (Leads, Anomalies).
- **Algorithm**: `SHAP` (TreeExplainer) + Rule-based Feature Formatting.
- **Intended Use**: Always presented alongside ML predictions.
