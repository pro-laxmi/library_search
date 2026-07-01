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
* `requirements.txt`: Lists all Python dependencies needed to run the backend (e.g., `Flask`, `flask-cors`, `sentence-transformers`, `requests`).
* `.library/`: The isolated Python virtual environment containing the installed dependencies.

---

## How to Run & Manual Configurations

To make this accessible to anyone on the local network (e.g., IITGN Campus Wi-Fi), we have provided an automated script (`run.sh`) that starts both the backend API and the frontend web server simultaneously.

### 1. Manual Configuration (Required)
Before running the system or deploying to GitHub Pages, you must update the frontend to point to your backend.
1. Find your computer's local IP address (e.g., by running `ip a` or checking the output of `run.sh`).
2. Open `search.js` in the root folder.
3. Update the very first line to use your IP address instead of `127.0.0.1`.
   ```javascript
   let fetchUrl = "http://YOUR_LOCAL_IP:5000/search";
   ```

### 2. Start the Servers
Open a terminal in the root `library_search` directory and make the script executable:
```bash
chmod +x run.sh
```

Then, run the script:
```bash
./run.sh
```

### 3. Access the Search Engine
The script will output a URL (like `http://10.7.58.52:8000`). Anyone connected to the campus Wi-Fi can open that URL in their browser to access the search engine. Press `Ctrl+C` in the terminal when you are ready to shut down both servers.
