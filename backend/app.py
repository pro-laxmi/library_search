from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import time

from services.embedder import embed_queary
from services.retriever import retrieve_response
from services.dedup import deduplicate
from services.cache import get, put
from services.filters import apply_filters

app = Flask(__name__)
CORS(app)

import os
from dotenv import load_dotenv

load_dotenv()

EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
SOLR_BASE_URL = f"{os.getenv('SOLR_URL')}/solr/iitgn_article_search"

print("Booting up embedding model...")
model = SentenceTransformer(EMBEDDING_MODEL)
print("Model loaded successfully.")


@app.route('/search', methods=['GET'])
def search_articles():
    user_query = request.args.get("q")
    k = int(request.args.get("k", 100))

    min_score = request.args.get("min_score", type=float)

    if not user_query:
        return jsonify({
            "status": "error",
            "message": "No query provided"
        }), 400

    total_start = time.time()

    t0 = time.time()
    query_vector = embed_queary(
        model,
        user_query
    )
    t1 = time.time()

    docs = retrieve_response(
        query_vector,
        k,
        SOLR_BASE_URL
    )
    t2 = time.time()

    docs = deduplicate(docs)
    
    if min_score is not None:
        docs = [doc for doc in docs if doc.get('score', 0) >= min_score]
        
    t3 = time.time()

    return jsonify({
        "status": "success",
        "query": user_query,
        "retrieved": len(docs),
        "timings": {
            "embedding_ms":
                round((t1 - t0) * 1000, 2),
            "retrieval_ms":
                round((t2 - t1) * 1000, 2),
            "dedup_ms":
                round((t3 - t2) * 1000, 2),
            "total_ms":
                round((t3 - total_start) * 1000, 2)
        },
        "data": docs
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )