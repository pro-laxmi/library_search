from sentence_transformers import SentenceTransformer
import numpy as np

def embed_queary(model, user_query):
    query_float_vector = model.encode(
        user_query, 
        convert_to_numpy=True, 
        normalize_embeddings=True
    )

    query_vector = np.clip(np.round(query_float_vector*127), -128, 127).astype(np.int8)
    
    return query_vector