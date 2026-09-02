from typing import List, Dict, Any

class LeadGenerator:
    def generate_leads(self, relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        leads = []
        for r in relationships[:3]:
            leads.append({
                "title": f"Review connection between {r.get('source')} and {r.get('target')}",
                "detail": f"Corroborate communication and co-location frequency. Strength: {r.get('strength', 0)}.",
                "priority": "HIGH" if r.get("strength", 0) > 70 else "MEDIUM",
            })
        return leads
