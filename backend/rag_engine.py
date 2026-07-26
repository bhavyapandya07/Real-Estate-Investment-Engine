# --- CLOUD LITE VERSION ---
# PyTorch and FAISS imports have been removed to prevent 512MB RAM limit crashes on Render.
# To run the real AI RAG locally, restore the original sentence_transformers imports.

def load_rag_model():
    """Bypasses heavy AI model loading to save RAM on the free tier."""
    print("INFO: RAG AI model loading bypassed to prevent Out-Of-Memory crash on free tier.")

def query_policy(question: str, top_k: int = 3):
    """Returns a placeholder response for cloud users."""
    return [
        "⚠️ RAG Engine Offline: The free cloud server (512MB RAM) cannot hold the PyTorch AI model.",
        "Please run this backend locally on your machine to use the AI Policy features!"
    ]