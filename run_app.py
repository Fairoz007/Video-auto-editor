import subprocess
import sys
import os
import time

def run_backend():
    print("Starting Backend (FastAPI)...")
    subprocess.run([sys.executable, "-m", "uvicorn", "app.backend.main:app", "--host", "0.0.0.0", "--port", "8000"])

if __name__ == "__main__":
    try:
        run_backend()
    except KeyboardInterrupt:
        print("\nShutting down...")
