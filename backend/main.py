import sys
import os

# Ensure both project root and backend dir are in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.abspath(os.path.join(_current_dir, ".."))

for _p in [_project_root, _current_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

import uvicorn
from backend.app.main import app

def main():
    print("==================================================")
    print("CrimeIntel Python FastAPI Backend")
    print("Server running at: http://localhost:8000")
    print("Interactive API Docs: http://localhost:8000/docs")
    print("==================================================")
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
