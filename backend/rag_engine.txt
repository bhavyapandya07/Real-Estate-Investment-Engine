import os
# pyrefly: ignore [missing-import]
import faiss
import pickle
# pyrefly: ignore [missing-import]
from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(BASE_DIR, "policy_faiss.index")
METADATA_PATH = os.path.join(BASE_DIR, "policy_metadata.pkl")

# Initialize global variables
index = None
metadata = None
model = None

def load_rag_model():
    """Loads the FAISS index, text chunks, and embedding model."""
    global index, metadata, model
    print("Loading RAG Model and FAISS index...")
    
    # Load the free, local embedding model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    if os.path.exists(INDEX_PATH) and os.path.exists(METADATA_PATH):
        index = faiss.read_index(INDEX_PATH)
        with open(METADATA_PATH, "rb") as f:
            metadata = pickle.load(f)
        print(" FAISS Index loaded successfully.")
    else:
        print(" Warning: FAISS index or metadata not found. Run rag_indexer.py first.")

def query_policy(question: str, top_k: int = 3):
    """Embeds the user question and retrieves relevant KDMC policy text."""
    if index is None or metadata is None:
        return "System error: RAG index not loaded."

    # Convert question to vector
    query_vector = model.encode([question])
    
    # Search the FAISS database
    distances, indices = index.search(query_vector, top_k)
    
    results = []
    for i in range(top_k):
        idx = indices[0][i]
        if idx != -1: # -1 means no result found
            results.append(metadata[idx])
            
    return results