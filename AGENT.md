# AI Context & Project Guide (AGENT.md)

This document serves as a reference manual for AI agents interacting with the **UrbaNext Land Investment Engine**. It describes the architecture, file structure, and specific responsibilities of each module to help guide automated code edits, debugging, and feature additions.

---

## 🎯 Architecture Overview
UrbaNext is a decoupled application using a **React frontend** and a **FastAPI Python backend**. The backend performs heavy spatial calculations, scores land investment via distance-decay functions, and runs an offline RAG engine. The frontend visualizes the results on an interactive map.

---

## 📂 Detailed Folder Structure & Responsibilities

### `/backend` (FastAPI + AI Engine)
Handles all AI logic, routing math, and serving of static spatial data.

- `main.py`: 
  - **Role:** API Gateway. 
  - **Important:** Contains CORS config and endpoint definitions (`/api/calculate-score`, `/api/query-policy`). Mounts the `data/` folder via `StaticFiles` so the frontend can pull `.geojson` files directly. Triggers data loading on app startup.
- `spatial_engine.py`:
  - **Role:** Core mathematical and spatial logic.
  - **Important:** Reads `EPSG:4326` standard `.geojson` files using GeoPandas. Calculates minimum distances to 13 infrastructure categories using Shapely `Point`. Applies the **Exponential Decay Algorithm** (`W * exp(-k * distance)`) to calculate the dynamic 0-100 investment score. Returns distances and nearest points for OSRM routing.
- `rag_engine.py`:
  - **Role:** Retrieval-Augmented Generation for municipal policies.
  - **Important:** Uses `sentence-transformers` (`all-MiniLM-L6-v2`) and `faiss` for vector search. Loads the `policy_faiss.index` and `policy_metadata.pkl`.
- `rag_indexer.py` (assumed based on project structure):
  - **Role:** The ingestion pipeline to embed new PDFs and construct the FAISS index.
- `data/` (Backend data directory):
  - **Role:** Contains all 13 spatial vector `.geojson` files (e.g., `hospital.geojson`, `highway.geojson`). Accessed by `spatial_engine.py` and served statically by `main.py`.
- `requirements.txt`:
  - **Role:** Python dependencies (FastAPI, uvicorn, geopandas, shapely, sentence-transformers, faiss-cpu).

### `/frontend` (React + Vite + Leaflet)
Handles user interaction, map rendering, and REST API communication.

- `src/App.tsx`:
  - **Role:** Main React component handling Map state. Listens for user clicks, sends `lat/lng` to the backend, visualizes the score, draws GeoJSON layers, and interacts with OSRM to draw true road routing.
- `src/index.css` & `tailwind.config.js` / `@tailwindcss/vite`:
  - **Role:** Styling. Uses TailwindCSS and Glassmorphic aesthetics.
- `package.json`:
  - **Role:** Node dependencies including `leaflet`, `react-leaflet`, `recharts`, `lucide-react`, and `tailwindcss`.

---

## 🧠 AI Agent Guidelines

1. **Routing and Distances:** 
   - DO NOT use simple Haversine formulas in the React frontend. True routing distances must utilize OSRM or the spatial engine.
   - The backend `spatial_engine.py` provides the *straight-line fallback* distance and nearest coordinate, while the frontend fetches actual routing if OSRM is implemented in `App.tsx`.
2. **Modifying the Score Math:** 
   - If the user asks to adjust the scoring weights or decay speed, modify the `weights_config` dictionary in `backend/spatial_engine.py`.
   - Remember the water penalty is separate and subtracts score based on flood risk (within 150 meters).
3. **Adding New Data Layers:**
   - Place the new `.geojson` inside `backend/data/`.
   - Add the filename to the `FILES_TO_LOAD` list in `backend/spatial_engine.py`.
   - Add a new scoring entry in `weights_config` inside `spatial_engine.py`.
4. **React Map Rendering:**
   - GeoJSON data is statically served from the backend (`http://localhost:8000/data/{layer}.geojson`). The React frontend fetches this and passes it into Leaflet layers.
5. **RAG Updates:**
   - Modifying embedding dimensions requires completely rebuilding the `policy_faiss.index`. Ensure `rag_engine.py` and `rag_indexer.py` share the exact same sentence-transformer model.

---
*Created automatically to provide contextual memory for AI agents assisting with this project.*
