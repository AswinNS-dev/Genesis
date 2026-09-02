from typing import List, Dict, Any
from backend.app.blockchain.hashing import compute_block_hash

def verify_blockchain_chain(blocks: List[Any]) -> Dict[str, Any]:
    if not blocks:
        return {"intact": True, "broken_index": None}

    sorted_blocks = sorted(blocks, key=lambda b: getattr(b, "index", b.get("index") if isinstance(b, dict) else 0))

    for i, b in enumerate(sorted_blocks):
        b_dict = b if isinstance(b, dict) else {
            "id": getattr(b, "id", ""),
            "index": getattr(b, "index", 0),
            "timestamp": getattr(b, "timestamp", None),
            "dataHash": getattr(b, "dataHash", ""),
            "previousHash": getattr(b, "previousHash", ""),
            "hash": getattr(b, "hash", ""),
            "action": getattr(b, "action", ""),
        }

        recomputed = compute_block_hash(
            index=b_dict["index"],
            timestamp=b_dict["timestamp"],
            data_hash=b_dict["dataHash"],
            previous_hash=b_dict["previousHash"],
            action=b_dict.get("action", ""),
        )

        if recomputed != b_dict["hash"]:
            return {"intact": False, "broken_index": b_dict["index"]}

        if i > 0:
            prev_b = sorted_blocks[i - 1]
            prev_hash = getattr(prev_b, "hash", prev_b.get("hash") if isinstance(prev_b, dict) else "")
            if prev_hash != b_dict["previousHash"]:
                return {"intact": False, "broken_index": b_dict["index"]}

    return {"intact": True, "broken_index": None}
