from typing import List, Set, Dict
from sqlalchemy.orm import Session
from backend.app.database.models import Relationship

def detect_connected_communities(db: Session) -> List[Set[str]]:
    rels = db.query(Relationship).all()
    adj: Dict[str, Set[str]] = {}
    nodes = set()
    for r in rels:
        nodes.add(r.sourceId)
        nodes.add(r.targetId)
        adj.setdefault(r.sourceId, set()).add(r.targetId)
        adj.setdefault(r.targetId, set()).add(r.sourceId)

    visited = set()
    communities = []
    for node in nodes:
        if node not in visited:
            community = set()
            queue = [node]
            while queue:
                cur = queue.pop(0)
                if cur not in community:
                    community.add(cur)
                    visited.add(cur)
                    queue.extend(adj.get(cur, set()) - community)
            communities.append(community)
    return communities
