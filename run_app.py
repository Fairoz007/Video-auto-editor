import subprocess
import sys
import os
import time

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))


def run_backend():
    # Uvicorn resolves `app.backend.main` via sys.path, which includes the process CWD.
    # Running from another folder (IDE, shortcut, or `cd app`) breaks imports unless we anchor here.
    print("Starting Backend (FastAPI)...")
    subprocess.run(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.backend.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
        ],
        cwd=PROJECT_ROOT,
    )

if __name__ == "__main__":
    try:
        run_backend()
    except KeyboardInterrupt:
        print("\nShutting down...")
