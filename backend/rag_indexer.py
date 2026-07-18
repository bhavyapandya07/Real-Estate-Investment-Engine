# pyrefly: ignore [missing-import]
import os
# pyrefly: ignore [missing-import]
from pypdf import PdfReader
# pyrefly: ignore [missing-import]
from sentence_transformers import SentenceTransformer
# pyrefly: ignore [missing-import]
import faiss
# pyrefly: ignore [missing-import]
import numpy as np
import pickle

def build_policy_index():
    model = SentenceTransformer('all-MiniLM-L6-v2')
    documents_dir = "./documents/"
    chunks = []
    
    # Read text from PDFs
    for file in os.listdir(documents_dir):
        if file.endswith(".pdf"):
            reader = PdfReader(os.path.join(documents_dir, file))
            full_text = ""
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
            
            # Slide window chunking (500 characters, 100 overlap)
            size = 500
            overlap = 100
            for i in range(0, len(full_text), size - overlap):
                chunk = full_text[i:i + size].strip()
                if len(chunk) > 50:
                    chunks.append({"source": file, "text": chunk})

    # Generate Embeddings
    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=True)
    
    # Initialize FAISS Index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(embeddings).astype('float32'))
    
    # Save artifacts locally
    faiss.write_index(index, "policy_faiss.index")
    with open("policy_metadata.pkl", "wb") as f:
        pickle.dump(chunks, f)
    print("Local RAG vector database indexed successfully.")

if __name__ == "__main__":
    build_policy_index()