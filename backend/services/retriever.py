import requests

FIELDS = [
    "id",
    "title",
    "abstract",
    "author",
    "author2",
    "journal",
    "publisher",
    "doi",
    "year",
    "language",
    "published_date",
    "score",
    "is_referenced_by_count",
    "online_link",
    "volume",
    "issue"
]

def retrieve_response(query_vector, k, SOLR_BASE_URL):
    solr_query_string = f"{{!knn f=vector_byte topK={k}}}{query_vector.tolist()}"

    payload = {
        "q": solr_query_string,
        "fl": ",".join(FIELDS),
        "wt": "json",
        "rows": k
    }

    # if filters:
    #     payload["fq"] = filters

    try:
        response = requests.post(
            f"{SOLR_BASE_URL}/select",
            data=payload,
            timeout=30000
        )
        response.raise_for_status()

        docs = response.json()["response"]["docs"]
        return docs

    except requests.exceptions.RequestException as e:
        print("Solr error:", e)
        return []