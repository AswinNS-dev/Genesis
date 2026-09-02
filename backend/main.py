import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Ensure both project root and backend dir are in sys.path
_current_dir = Path(__file__).resolve().parent
_project_root = _current_dir.parent

for _p in [str(_project_root), str(_current_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Load .env from both backend and root
for env_file in [_current_dir / ".env", _project_root / ".env"]:
    if env_file.exists():
        load_dotenv(env_file, override=True)

import uvicorn

def main():
    print("==================================================")
    print("CrimeIntel Python FastAPI Backend (Live Reload)")
    print("Server running at: http://localhost:8000")
    print("Interactive API Docs: http://localhost:8000/docs")
    print("==================================================")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
