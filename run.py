import uvicorn

if __name__ == "__main__":
    print("Starting CrimeIntel Investigation Platform (Python FastAPI)...")
    print("API available at: http://localhost:8000")
    print("Interactive API Docs available at: http://localhost:8000/docs")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
