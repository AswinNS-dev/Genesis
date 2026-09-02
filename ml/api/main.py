import sys
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ner.inference import extract_entities
from entity_resolution.resolver import resolve_entities

app = FastAPI(
    title="CrimeIntel ML API",
    description="NER and Entity Resolution for CrimeIntel Investigation Platform",
    version="1.0.0"
)

# Request Models
class NERRequest(BaseModel):
    text: str

class EntityExtraction(BaseModel):
    text: str
    label: str
    start: int
    end: int
    confidence: float

class NERResponse(BaseModel):
    text: str
    entities: List[EntityExtraction]

class EntityData(BaseModel):
    id: Optional[str] = None
    type: Optional[str] = None
    name: Optional[str] = None
    aliases: Optional[List[str]] = []
    phone: Optional[str] = None
    vehicle: Optional[str] = None
    location: Optional[str] = None

class ERRequest(BaseModel):
    extracted_entities: List[EntityData]
    registry_candidates: List[EntityData]

class ERResponseItem(BaseModel):
    input_entity: str
    matched_entity_id: Optional[str] = None
    canonical_name: Optional[str] = None
    decision: str
    confidence: float
    signals: Dict[str, float]

class ERResponse(BaseModel):
    results: List[ERResponseItem]

@app.post("/ner/extract", response_model=NERResponse)
async def api_extract_entities(req: NERRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    try:
        result = extract_entities(req.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/entity-resolution/resolve", response_model=ERResponse)
async def api_resolve_entities(req: ERRequest):
    try:
        # Convert pydantic models to dicts
        extracted = [e.dict() for e in req.extracted_entities]
        registry = [c.dict() for c in req.registry_candidates]
        
        results = resolve_entities(extracted, registry)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "crimeintel-ml"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
