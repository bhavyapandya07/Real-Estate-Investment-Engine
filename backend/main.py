import os
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
import uvicorn

# Import your custom engines
from spatial_engine import load_spatial_data, calculate_investment_score
from rag_engine import load_rag_model, query_policy

app = FastAPI(title="Land Investment Engine API")

# Allow React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows any frontend port (5173, 3000, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CRITICAL FIX: EXPOSE THE DATA FOLDER ---
# This gets the absolute path to your backend folder, then points to the 'data' folder inside it.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

# This "mounts" the folder, meaning any request to /data/file.geojson will successfully download it!
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")


# Startup event: Load data into RAM before accepting requests
@app.on_event("startup")
async def startup_event():
    load_spatial_data()
    load_rag_model()

# Define the data structures for incoming requests
class CoordinateRequest(BaseModel):
    lat: float
    lng: float

class PolicyRequest(BaseModel):
    question: str

# --- API ENDPOINTS ---

@app.post("/api/calculate-score")
async def get_score(payload: CoordinateRequest):
    """Receives lat/lng from React map click, returns spatial score."""
    result = calculate_investment_score(payload.lat, payload.lng)
    return {"status": "success", "data": result}

@app.post("/api/query-policy")
async def get_policy_answer(payload: PolicyRequest):
    """Receives user question, returns context from KDMC masterplan."""
    context = query_policy(payload.question)
    return {
        "status": "success", 
        "retrieved_clauses": context
    }

if __name__ == "__main__":
    # Run the server on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)