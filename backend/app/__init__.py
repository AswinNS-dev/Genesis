import sys
import os

# Automatically add project root and backend dir to sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.abspath(os.path.join(_current_dir, "..", ".."))
_backend_dir = os.path.abspath(os.path.join(_current_dir, ".."))

for _p in [_project_root, _backend_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from backend.app.main import app, create_application
    __all__ = ["app", "create_application"]
except ImportError:
    app = None
    create_application = None
    __all__ = []

__version__ = "1.0.0"
