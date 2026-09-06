<img width="800" height="378" alt="1787983615293" src="https://github.com/user-attachments/assets/a561310a-7adc-4899-8469-365ee0112a54" />
Vercel takes 2mins to load data so have patient while looking at the project maybe read the readme.md till then!

# 🗺️ Real Estate Investment Engine — Geospatial AI for Property Investment Analysis

## Overview
UrbaNext is an interactive, AI-driven map application designed to evaluate the investment viability of urban land plots. Currently focused on the Kalyan-Dombivli urban corridor, the system replaces subjective real estate pricing models with deterministic mathematical spatial decay algorithms.

Users can click anywhere on the map to instantly calculate the exact road-network distance to 13 different types of crucial infrastructure (hospitals, highways, schools, etc.). The system calculates a dynamic "Investment Score" (0-100) and draws the exact driving routes on the map using real road networks.

## Key Features
- **True Roadway Routing**: Integrates with the Open Source Routing Machine (OSRM) to calculate true shortest-path road network distances via Dijkstra's Algorithm, bypassing misleading straight-line (Haversine) calculations.
- **Exponential Spatial Scoring**: Calculates infrastructure value using a non-linear exponential distance decay function.
- **Procedural Insights (XAI)**: Generates human-readable "Pros" and "Cons" based on a deterministic logic tree to explain the generated score.
- **Zero-Cost Architecture**: Built entirely on open-source technologies and free-tier APIs (OSM, OSRM).
- **Future-Ready (RAG)**: Backend is structured to support a local FAISS + HuggingFace Retrieval-Augmented Generation pipeline to query municipal zoning policies offline.

## The Scoring Math (Exponential Decay)
A simple linear score deduction is highly inaccurate for urban planning. To replicate real-world utility, the backend uses an **Exponential Decay Function**:

$$Score = \sum (W \times e^{-k \times distance})$$

- **$W$ (Weight)**: The maximum possible score for that category (e.g., Highway = 25, Park = 10).
- **$k$ (Decay Constant)**: How fast the value drops. A high $k$ means the amenity must be very close to be useful.
- **$distance$**: The spatial distance calculated by the engine (in meters).

**Note:** A steep exponential penalty is applied if a plot is within 150 meters of a water vector to account for flood risk.

## Technology Stack
**Frontend (Client):**
- React.js (TypeScript, Vite)
- Leaflet.js (Mapping Engine)
- TailwindCSS (Glassmorphic UI)
- Recharts (Data Visualization)
- GEOJson Data scrping from https://overpass-turbo.eu/

**Backend (Spatial Analytics API):**
- FastAPI (Uvicorn ASGI)
- GeoPandas & Shapely (Spatial indexing and geometry)
- OSRM API (Dijkstra's routing)
- FAISS & Sentence-Transformers (RAG Policy Querying)

## 📂 Detailed Project Structure and File Explanations

The project is structured into a highly decoupled architecture with separate frontend and backend directories.

### `/backend` (FastAPI Engine)
The core AI and mathematics engine of UrbaNext. It processes spatial logic and natural language queries.
- **`main.py`**: The API Gateway and route controller. It sets up FastAPI, handles CORS, mounts the static data folder, and defines the REST endpoints (`/api/calculate-score` and `/api/query-policy`).
- **`spatial_engine.py`**: Contains the core logic for calculating the Investment Score. It loads GeoJSON layers into memory, finds the nearest infrastructure to a clicked point using `shapely` and `geopandas`, and applies the exponential decay algorithm.
- **`rag_engine.py`**: Handles the RAG (Retrieval-Augmented Generation) pipeline. It loads a local `all-MiniLM-L6-v2` embedding model and a FAISS index to answer queries about zoning policies based on loaded metadata.
- **`rag_indexer.py`**: A utility script responsible for parsing municipal PDFs and building the FAISS index and metadata.
- **`policy_faiss.index` & `policy_metadata.pkl`**: The pre-built local vector database and corresponding text chunks for querying municipal policy documents.
- **`requirements.txt`**: Python dependencies required to run the backend (FastAPI, uvicorn, geopandas, faiss-cpu, sentence-transformers, etc.).
- **`/data`**: Contains all the `.geojson` vector files (13 categories like hospitals, schools, highways) representing spatial infrastructure. These are loaded into memory and statically served.
- **`/documents`**: Contains unstructured PDF files like the local municipal masterplans (`kdmc_masterplan.pdf`) used for the policy RAG pipeline.

### `/frontend` (React UI)
The visual interface for the user, rendering maps, UI, and data visualizations.
- **`src/App.tsx`**: The main interface logic. It integrates Leaflet for the interactive map, listens for user clicks, communicates with the backend API, and integrates OSRM to render real roadway driving routes.
- **`src/index.css` & `src/App.css`**: TailwindCSS and custom styling logic for the application's glassmorphic UI and animations.
- **`src/main.tsx`**: The entry point for the React application.
- **`package.json` & `package-lock.json`**: Node.js dependencies and script definitions.
- **`vite.config.ts`**: The Vite configuration for the development server and build pipeline.
- **`tsconfig.*.json`**: TypeScript configurations for rigorous type checking across the frontend.
- **`/public` & `/src/assets`**: Static assets like icons and images used in the frontend.

## Getting Started (Local Setup)

To run the full stack on a local machine, you will need to start both the backend and frontend servers simultaneously in two separate terminals.

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### Terminal 1: The AI/Math Backend
```bash
# Navigate to the backend directory
cd backend

# Activate your virtual environment (Windows)
.\venv\Scripts\activate
# For Mac/Linux: source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```
Wait for the console to display: `INFO: Application startup complete.`

### Terminal 2: The React Frontend
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies (first time only)
npm install

# Start the Vite development server
npm run dev
```
Access the application in your browser at `http://localhost:5173/`

## 🔌 API Documentation
The system is highly decoupled, communicating via REST APIs served from `localhost:8000`.

- **`POST /api/calculate-score`**: Accepts `{"lat": float, "lng": float}`. Returns the 0-100 investment score, distances in meters, and nearest infrastructure coordinates.
- **`POST /api/query-policy`**: Accepts `{"question": "..."}`. Returns relevant retrieved clauses from the municipal policy index.
- **`GET /data/{layer}.geojson`**: Serves static GeoJSON vector layers directly to the React frontend for Leaflet rendering.

## 🔮 Future Scope (Phase 2)
The next phase introduces a fully offline RAG pipeline for municipal policy intelligence:
- **Ingestion**: Parse local municipal PDFs (e.g., `kdmc_masterplan.pdf`).
- **Vectorization**: Embed text chunks using local HuggingFace `sentence-transformers`.
- **Storage**: Index vectors locally using FAISS.
- **Interface**: Enable users to ask zoning questions (e.g., "Can I build commercial property here?") cross-referenced against their exact clicked location.

> Developed as an AI-Augmented Spatial Analytics Research Project.
