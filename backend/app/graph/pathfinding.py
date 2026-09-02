from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.database.models import Entity, Relationship

def find_shortest_paths(db: Session, source_id: str, target_id: str, max_depth: int = 4) -> List[List[Dict[str, Any]]]:
    if source_id == target_id:
        return []

    rels = db.query(Relationship).all()
    entities = {e.id: e for e in db.query(Entity).all()}

    adj: Dict[str, List[Dict[str, Any]]] = {}
    for r in rels:
        adj.setdefault(r.sourceId, []).append({"target": r.targetId, "rel": r})
        adj.setdefault(r.targetId, []).append({"target": r.sourceId, "rel": r})

    paths = []
    queue = [([source_id], [])]

    while queue:
        node_path, edge_path = queue.pop(0)
        current = node_path[-1]

        if len(node_path) - 1 >= max_depth:
            continue

        for edge in adj.get(current, []):
            nxt = edge["target"]
            if nxt in node_path:
                continue

            new_nodes = node_path + [nxt]
            new_edges = edge_path + [edge["rel"]]

            if nxt == target_id:
                step_list = []
                for i in range(len(new_nodes)):
                    nid = new_nodes[i]
                    e_obj = entities.get(nid)
                    step_list.append({
                        "entityId": nid,
                        "name": e_obj.name if e_obj else nid,
                        "type": e_obj.type if e_obj else "UNKNOWN",
                        "relation": new_edges[i-1].type if i > 0 else None,
                        "label": new_edges[i-1].label if i > 0 else None,
                    })
                paths.append(step_list)
            else:
                queue.append((new_nodes, new_edges))

    return paths
