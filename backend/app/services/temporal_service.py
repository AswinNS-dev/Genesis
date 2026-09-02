import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.database.models import InvestigationCase, TimelineEvent, Entity

class TemporalService:
    def __init__(self, db: Session):
        self.db = db

    def detect_temporal_anomalies(
        self,
        case_id: str,
        crime_timestamp: Optional[datetime] = None,
        before_window_minutes: int = 120,
        after_window_minutes: int = 120,
        baseline_days: int = 30
    ) -> Dict[str, Any]:
        before_window_minutes = max(5, min(10080, before_window_minutes))
        after_window_minutes = max(5, min(10080, after_window_minutes))
        baseline_days = max(1, min(365, baseline_days))

        # 1. Fetch Case
        case = self.db.query(InvestigationCase).filter(
            (InvestigationCase.id == case_id) | (InvestigationCase.caseId == case_id)
        ).first()

        if not case:
            raise ValueError(f"Investigation case '{case_id}' was not found.")

        # Determine reference timestamp
        if crime_timestamp:
            crime_date = crime_timestamp
        elif case.incidentDate:
            crime_date = case.incidentDate
        else:
            crime_date = case.createdAt

        before_start = crime_date - timedelta(minutes=before_window_minutes)
        after_end = crime_date + timedelta(minutes=after_window_minutes)
        baseline_start = crime_date - timedelta(days=baseline_days)

        # 2. Fetch all TimelineEvents in [baseline_start, after_end]
        all_events = self.db.query(TimelineEvent).filter(
            TimelineEvent.eventAt >= baseline_start,
            TimelineEvent.eventAt <= after_end
        ).order_by(TimelineEvent.eventAt.asc()).all()

        window_events = []
        unassigned_activities = []
        historical_events_by_entity: Dict[str, List[datetime]] = {}
        entity_map: Dict[str, Entity] = {}

        # Pre-populate with case entities
        for ent in case.entities:
            entity_map[ent.id] = ent

        for ev in all_events:
            is_inside_window = before_start <= ev.eventAt <= after_end
            minutes_from_crime = int((ev.eventAt - crime_date).total_seconds() / 60.0)

            timing = "AT_CRIME"
            if minutes_from_crime < 0:
                timing = "BEFORE"
            elif minutes_from_crime > 0:
                timing = "AFTER"

            act_dict = {
                "id": ev.id,
                "type": ev.type,
                "summary": ev.summary,
                "detail": ev.detail,
                "eventAt": ev.eventAt.isoformat(),
                "entityId": ev.entityId,
                "entityName": ev.entity.name if ev.entity else None,
                "entityType": ev.entity.type if ev.entity else None,
                "timing": timing,
                "minutesFromCrime": minutes_from_crime
            }

            if is_inside_window:
                window_events.append(act_dict)
                if not ev.entityId:
                    unassigned_activities.append(act_dict)

            if ev.entityId and ev.entity:
                if ev.entityId not in entity_map:
                    entity_map[ev.entityId] = ev.entity

                if baseline_start <= ev.eventAt < before_start:
                    if ev.entityId not in historical_events_by_entity:
                        historical_events_by_entity[ev.entityId] = []
                    historical_events_by_entity[ev.entityId].append(ev.eventAt)

        # 3. Calculate Separate Before & After Baselines and Scores
        entity_anomalies = []
        hist_total_minutes = max(1, int((before_start - baseline_start).total_seconds() / 60.0))
        num_before_bins = max(1, hist_total_minutes // before_window_minutes)
        num_after_bins = max(1, hist_total_minutes // after_window_minutes)

        for entity_id, entity_obj in entity_map.items():
            before_events = [e for e in window_events if e["entityId"] == entity_id and e["minutesFromCrime"] < 0]
            after_events = [e for e in window_events if e["entityId"] == entity_id and e["minutesFromCrime"] >= 0]
            all_entity_events = [e for e in window_events if e["entityId"] == entity_id]

            obs_before = len(before_events)
            obs_after = len(after_events)
            total_window = len(all_entity_events)

            hist_timestamps = historical_events_by_entity.get(entity_id, [])
            total_hist = len(hist_timestamps)

            # Separate Before baseline
            before_mean, before_std, _ = self._calculate_binned_baseline(
                hist_timestamps, baseline_start, before_start, before_window_minutes, num_before_bins
            )

            # Separate After baseline
            after_mean, after_std, _ = self._calculate_binned_baseline(
                hist_timestamps, baseline_start, before_start, after_window_minutes, num_after_bins
            )

            # Compute Z-Scores
            before_score = self._compute_score(obs_before, before_mean, before_std, total_hist)
            after_score = self._compute_score(obs_after, after_mean, after_std, total_hist)
            overall_score = round(max(before_score, after_score), 2)

            baseline_status = "STATISTICALLY_SUPPORTED"
            confidence = "HIGH"

            if total_hist == 0:
                baseline_status = "NO_HISTORICAL_ACTIVITY"
                confidence = "LOW"
            elif num_before_bins < 5 or num_after_bins < 5:
                baseline_status = "INSUFFICIENT_DATA"
                confidence = "LOW"
            elif before_std == 0.0 and after_std == 0.0:
                baseline_status = "LOW_VARIANCE"
                confidence = "MEDIUM"

            anomaly_level = "LOW"
            if overall_score >= 3.5:
                anomaly_level = "CRITICAL"
            elif overall_score >= 2.5:
                anomaly_level = "HIGH"
            elif overall_score >= 1.5:
                anomaly_level = "MEDIUM"

            reason = self._generate_reason(
                entity_obj.name, obs_before, obs_after, before_window_minutes, after_window_minutes,
                before_mean, after_mean, overall_score, anomaly_level, baseline_status
            )

            if total_window > 0 or total_hist > 0:
                entity_anomalies.append({
                    "entityId": entity_id,
                    "entityName": entity_obj.name,
                    "entityType": entity_obj.type,
                    "riskScore": entity_obj.riskScore or 0,
                    "beforeActivityCount": obs_before,
                    "afterActivityCount": obs_after,
                    "totalWindowActivity": total_window,
                    "beforeBaselineMean": round(before_mean, 2),
                    "beforeBaselineStd": round(before_std, 2),
                    "beforeAnomalyScore": round(before_score, 2),
                    "afterBaselineMean": round(after_mean, 2),
                    "afterBaselineStd": round(after_std, 2),
                    "afterAnomalyScore": round(after_score, 2),
                    "overallTemporalScore": overall_score,
                    "anomalyLevel": anomaly_level,
                    "baselineStatus": baseline_status,
                    "confidence": confidence,
                    "reason": reason,
                    "evidenceActivities": all_entity_events
                })

        entity_anomalies.sort(key=lambda a: (a["overallTemporalScore"], a["totalWindowActivity"]), reverse=True)

        before_count = sum(1 for e in window_events if e["minutesFromCrime"] < 0)
        after_count = sum(1 for e in window_events if e["minutesFromCrime"] >= 0)
        anomalous_count = sum(1 for a in entity_anomalies if a["anomalyLevel"] in ("HIGH", "CRITICAL"))

        return {
            "crime": {
                "id": case.id,
                "caseId": case.caseId,
                "title": case.title,
                "description": case.description,
                "status": case.status,
                "category": case.category,
                "jurisdiction": case.jurisdiction,
                "incidentDate": case.incidentDate.isoformat() if case.incidentDate else None,
                "referenceTimestamp": crime_date.isoformat()
            },
            "window": {
                "beforeMinutes": before_window_minutes,
                "afterMinutes": after_window_minutes,
                "baselineDays": baseline_days,
                "beforeStart": before_start.isoformat(),
                "afterEnd": after_end.isoformat()
            },
            "statistics": {
                "totalWindowActivities": len(window_events),
                "beforeActivitiesCount": before_count,
                "afterActivitiesCount": after_count,
                "unlinkedActivitiesCount": len(unassigned_activities),
                "evaluatedEntitiesCount": len(entity_anomalies),
                "anomalousEntitiesCount": anomalous_count
            },
            "anomalies": entity_anomalies,
            "timeline": window_events,
            "unassignedActivities": unassigned_activities,
            "summary": {
                "overview": f"Temporal anomaly analysis around reference event for Case {case.caseId} ('{case.title}') across a [-{before_window_minutes}m, +{after_window_minutes}m] window.",
                "highRiskSignals": [
                    f"Elevated activity for '{h['entityName']}' (Score: {h['overallTemporalScore']})"
                    for h in entity_anomalies if h["anomalyLevel"] in ("HIGH", "CRITICAL")
                ][:4] or ["No critical temporal spikes detected in the selected window."],
                "investigativeNextSteps": [
                    "Review communication and location timestamps against independent surveillance records.",
                    "Check co-occurrence of high-anomaly entities in the immediate window.",
                    "Corroborate post-event communication drops or surges."
                ],
                "disclaimer": "Ethical Reminder: Temporal anomaly detection highlights statistical outliers in event density. Results are investigative leads for human analysts and do NOT constitute proof of involvement or guilt."
            }
        }

    def _calculate_binned_baseline(
        self, timestamps: List[datetime], start_dt: datetime, end_dt: datetime, bin_minutes: int, num_bins: int
    ):
        if num_bins <= 0 or not timestamps:
            return 0.0, 0.0, "NO_HISTORICAL_ACTIVITY"

        bin_delta = timedelta(minutes=bin_minutes)
        counts = [0] * num_bins

        for ts in timestamps:
            if start_dt <= ts < end_dt:
                offset_seconds = (ts - start_dt).total_seconds()
                bin_idx = min(num_bins - 1, int(offset_seconds / (bin_minutes * 60.0)))
                if 0 <= bin_idx < num_bins:
                    counts[bin_idx] += 1

        mean = sum(counts) / float(num_bins)
        variance = sum((c - mean) ** 2 for c in counts) / float(num_bins)
        std = math.sqrt(variance)

        status = "STATISTICALLY_SUPPORTED" if std > 0 else "LOW_VARIANCE"
        return mean, std, status

    def _compute_score(self, observed: int, mean: float, std: float, total_hist: int) -> float:
        if observed == 0 and mean == 0.0:
            return 0.0
        if std > 0.0:
            z = (observed - mean) / std
            return max(0.0, round(z, 2))
        if total_hist > 0:
            if observed > mean:
                return min(5.0, round(1.0 + (observed - mean) * 0.5, 2))
            return 0.0
        if observed > 0:
            return min(3.0, round(0.5 + observed * 0.4, 2))
        return 0.0

    def _generate_reason(
        self, name: str, obs_b: int, obs_a: int, min_b: int, min_a: int,
        mean_b: float, mean_a: float, score: float, level: str, status: str
    ) -> str:
        parts = []
        if level in ("CRITICAL", "HIGH"):
            parts.append(f"Entity '{name}' recorded a marked temporal activity anomaly (Score: {score:.2f}).")
        elif level == "MEDIUM":
            parts.append(f"Entity '{name}' exhibited moderate activity elevation (Score: {score:.2f}).")
        else:
            parts.append(f"Entity '{name}' activity is consistent with normal baseline levels (Score: {score:.2f}).")

        if obs_b > 0:
            parts.append(f"{obs_b} events recorded in the {min_b}m before the crime (historical avg: {mean_b:.1f}/window).")
        if obs_a > 0:
            parts.append(f"{obs_a} events recorded in the {min_a}m after the crime (historical avg: {mean_a:.1f}/window).")

        if status == "NO_HISTORICAL_ACTIVITY":
            parts.append("[Note: Limited historical baseline data available; score reflects direct window density.]")
        elif status == "LOW_VARIANCE":
            parts.append("[Note: Baseline shows near-uniform historical distribution; increase is statistically notable.]")

        parts.append("Investigative signal only — does not imply culpability; investigator review required.")
        return " ".join(parts)
