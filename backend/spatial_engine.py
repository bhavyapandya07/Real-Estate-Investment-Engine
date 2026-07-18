import os
import math
import geopandas as gpd
from shapely.geometry import Point
import warnings

# Suppress GeoPandas warnings for cleaner terminal output
warnings.filterwarnings("ignore")

# Define the absolute path to your data folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

# Global dictionary to hold your GeoJSON data in memory
GEO_LAYERS = {}

# The list of files exactly as they appear in your folder
FILES_TO_LOAD = [
    "building", "clinic", "college", "firestation", "highway", 
    "hospital", "mall", "office", "park", "policstation", 
    "restaurant", "school", "water"
]

def load_spatial_data():
    """Loads all GeoJSON files into memory when the server starts."""
    print("Loading spatial data into memory. This may take a moment...")
    for file_name in FILES_TO_LOAD:
        file_path = os.path.join(DATA_DIR, f"{file_name}.geojson")
        if os.path.exists(file_path):
            # Load and ensure standard GPS coordinate system (EPSG:4326)
            gdf = gpd.read_file(file_path)
            if gdf.crs != "EPSG:4326":
                gdf = gdf.to_crs("EPSG:4326")
            GEO_LAYERS[file_name] = gdf
            print(f" Loaded: {file_name}")
        else:
            print(f" Warning: {file_path} not found.")

def calculate_investment_score(lat: float, lng: float):
    """Calculates distances from the clicked point to all loaded infrastructure."""
    if not GEO_LAYERS:
        raise Exception("Spatial data not loaded. Call load_spatial_data() first.")

    # Create a Shapely point for the clicked coordinate
    target_point = Point(lng, lat) 
    
    distances = {}
    nearest_points = {} # NEW: Store the exact coordinates of the nearest features
    
    # Calculate minimum distance to each category and locate the nearest point
    for category, gdf in GEO_LAYERS.items():
        # Find the index of the closest geometry
        nearest_idx = gdf.distance(target_point).idxmin()
        nearest_geom = gdf.loc[nearest_idx].geometry
        
        # Calculate straight-line distance fallback
        min_dist = gdf.distance(target_point).min()
        distances[category] = round(min_dist * 111000, 2)
        
        # Get the centroid coordinates of the nearest geometry
        centroid = nearest_geom.centroid
        nearest_points[category] = [centroid.y, centroid.x] # [lat, lng]

    # --- REAL SCORING ALGORITHM (Exponential Decay) ---
    weights_config = {
        "highway": {"w": 25, "k": 0.0005},
        "hospital": {"w": 20, "k": 0.001},
        "school": {"w": 15, "k": 0.0015},
        "college": {"w": 10, "k": 0.001},
        "mall": {"w": 10, "k": 0.001},
        "park": {"w": 10, "k": 0.002},
        "clinic": {"w": 10, "k": 0.002},
    }

    total_score = 0.0

    for category, config in weights_config.items():
        dist = distances.get(category, 99999)
        total_score += config["w"] * math.exp(-config["k"] * dist)

    water_dist = distances.get("water", 99999)
    if water_dist < 150:
        penalty = 20 * math.exp(-0.02 * water_dist)
        total_score -= penalty

    final_score = max(0.0, min(100.0, total_score))

    return {
        "final_score": round(final_score, 2),
        "distances_in_meters": distances,
        "nearest_points": nearest_points # Pass coordinates to React for Dijkstra routing
    }