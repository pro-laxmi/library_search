# IITGN Semantic Scholarly Search

## Problem Statement
Traditional academic search engines often rely on exact keyword matching, which can miss highly relevant papers if the exact terminology isn't used by the user. The goal of this project was to build an advanced, **AI-powered Semantic Search Engine** for the IITGN library. 

Instead of just matching words, this system understands the *context and meaning* of a search query using Natural Language Processing (NLP) and Vector Embeddings. It provides students and professors with a fast, accurate, and user-friendly interface to discover, filter, and retrieve scholarly articles from the library's database.

---

## Architecture & Tech Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (Fast, lightweight, no heavy frameworks).
* **Backend API:** Python, Flask, Flask-CORS.
* **AI & Embeddings:** `SentenceTransformers` (`BAAI/bge-small-en-v1.5`) translates text queries into high-dimensional vectors.
* **Database & Search:** Apache Solr performs lightning-fast K-Nearest Neighbors (KNN) vector retrieval.

---

## Project Structure & File Usage

### Frontend (Root Directory)
* `index.html`: The main user interface. It contains the layout, the search bar, the retrieval strategy toggles, and the structural containers for the results and filters.
* `style.css`: Custom CSS to ensure a clean, professional academic appearance.
* `search.js`: The core frontend logic. It connects to the Flask backend, captures queries, applies client-side filters, and dynamically renders the UI.
* `run.sh`: An automated shell script to start both the frontend and backend servers simultaneously and display network connection instructions.

### Backend (`/backend`)
* `app.py`: The main Flask application entry point. It defines the `/search` API route, receives the search query and parameters (`k` and `min_score`), coordinates the services, and returns a structured JSON response to the frontend.
* `services/embedder.py`: Handles loading the SentenceTransformer model and converting the user's text query into a mathematical vector.
* `services/retriever.py`: Takes the generated vector and executes a complex KNN search query against the local Solr database to find the closest matching documents.
* `services/dedup.py`: Cleans the data by identifying and removing duplicate paper entries before sending them to the user.
* `services/cache.py`: Provides caching mechanisms to temporarily store frequent queries, reducing latency and saving computing power.
* `services/filters.py`: Contains any additional backend filtering logic applied to the dataset.

### Root Files
* `requirements.txt`: Lists all Python dependencies needed to run the backend (e.g., `Flask`, `flask-cors`, `sentence-transformers`, `requests`, `python-dotenv`).
* `.env`: The environment configuration file that stores sensitive credentials (like the `SOLR_URL`). It is explicitly not tracked in git for security.
* `.gitignore`: Ensures that sensitive files like `.env` and the virtual environment folder are never committed to version control.
* `.library/`: The isolated Python virtual environment containing the installed dependencies.

---

## Environment Configuration

Before running the application, you must configure your environment variables to ensure the backend can connect to the Solr database securely without hardcoding credentials in the codebase.

1. Create a file named `.env` in the root of the project (`library_search/`).
2. Add your Solr instance URL. For example:
   ```env
   SOLR_URL="http://127.0.0.1:8983"
   ```
   *(Ensure you replace the IP address with the actual IP address or hostname where your Apache Solr server is running).*

---

## How to Run (Automated Setup)

To make this accessible to anyone on the local network (e.g., IITGN Campus Wi-Fi), we have provided a fully automated "one-click" script (`run.sh`).

This script will automatically:
1. Verify Python is installed.
2. Create the Python virtual environment (`.library`) if it doesn't exist.
3. Install all dependencies from `requirements.txt`.
4. Load the `.env` file to establish a secure database connection.
5. Launch the Flask backend and the HTTP frontend servers simultaneously.

### 1. Start the Servers
Open a terminal in the root `library_search` directory and make the script executable (only needed once):
```bash
chmod +x run.sh
```

Then, run the script:
```bash
./run.sh
```

### 2. Access the Search Engine
The frontend Javascript uses `window.location.hostname` to automatically detect your computer's IP address and connect to the backend securely, meaning **Zero Manual Configuration is required**.

The script will output a URL (like `http://192.168.1.50:8000`). Anyone connected to the campus Wi-Fi can open that URL in their browser to instantly access the search engine. Press `Ctrl+C` in the terminal when you are ready to shut down both servers.

---

## Repository Inventory & Data Pipeline

This repository contains several background scripts that were used to build, evaluate, and migrate the database. Here is a breakdown of what every file does and what you actually need to keep.

### 1. The Core Data Pipeline (Keep for updates)
These scripts are used to process raw data and insert it into the database. You only need these when adding new papers to the library.
* **`scripts/train_semantic_clean.py`**: This script does **not** actually "train" a model from scratch. It loads a pre-trained **SentenceTransformer model (`BAAI/bge-small-en-v1.5`)** into the GPU. It combines the Title, Abstract, Authors, and Journal of every paper into a single text block, encodes it into a 384-dimensional vector, and stores it in a temporary **Qdrant** database using INT8 quantization to save memory.
* **`scripts/upload_to_solr_IITGN_only.py`**: This is the gatekeeper. It takes the vectors from Qdrant, filters them strictly using the `iitgn_valid_ids.csv` (so only IITGN-subscribed papers are kept), quantizes the vectors into bytes, and pushes the final metadata and vectors into the production **Apache Solr** database.
* **`scripts/filter_export_by_subscription.py`**: Cleans and filters the raw parquet data exports to ensure we only process relevant subscription data.

### 2. Production Web App (Keep permanently)
These are the files required to actually run the search engine for end-users on a daily basis.
* **`run.sh`**: Automated bootloader for the servers.
* **`index.html` / `search.js` / `style.css`**: The frontend UI.
* **`backend/app.py`**: The Flask API that connects the UI to Solr.
* **`backend/services/`**: The modular Python logic for deduplication, retrieval, and live user-query embedding.

### 3. Evaluation & Testing (Just for checking - Can be archived/deleted)
These files were used purely for testing the accuracy of the AI against traditional keyword search. They are not used in production.
* **`scripts/build_lexical_index.py` & `lexical_index.db`**: Builds a traditional keyword-based (BM25) search database used purely as a baseline to compare against the AI.
* **`scripts/evaluation_semantics.py` & `evaluate_qdrant.py`**: Scripts that run hundreds of automated queries to test if the semantic vector search retrieves better results than the traditional lexical search.
* **`app_trial.py`**: An old experimental version of the Flask backend.
* **`notebooks/lol.ipynb` & `test.ipynb`**: Scratchpads used for exploratory data analysis and rapid prototyping.
* **`logs/` & `*.log`**: Debugging outputs from the evaluation runs.
