#!/bin/bash

echo "============================================================"
echo "    IITGN Semantic Scholarly Search - Automated Setup       "
echo "============================================================"
echo ""

# 1. Check for Python3
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 could not be found. Please install Python 3."
    exit 1
fi

# 2. Check and Setup Virtual Environment
VENV_DIR=".library"
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Virtual environment not found. Creating one at './$VENV_DIR'..."
    python3 -m venv $VENV_DIR
    echo "✅ Virtual environment created."
fi

# Activate Virtual Environment
echo "🔄 Activating virtual environment..."
source $VENV_DIR/bin/activate

# 3. Install Requirements
if [ -f "requirements.txt" ]; then
    echo "📥 Checking and installing dependencies..."
    pip install -r requirements.txt --quiet
    echo "✅ Dependencies installed."
else
    echo "⚠️ Warning: requirements.txt not found! Skipping dependency installation."
fi

# 4. Extract and display the Local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "============================================================"
echo "Network Interface Ready"
echo "Local IP detected as: $LOCAL_IP"
echo "============================================================"
echo ""

# 5. Start the Backend Server (Flask) in the background
echo "🚀 Starting Backend API Server..."
cd backend || { echo "❌ Error: Backend folder not found!"; exit 1; }
python3 -m flask --app app run --host=0.0.0.0 --debug &
BACKEND_PID=$!
cd ..

# 6. Start the Frontend Server in the background
echo "🚀 Starting Frontend UI Server on port 8000..."
python3 -m http.server 8000 &
FRONTEND_PID=$!

echo ""
echo "✅ Everything is running smoothly!"
echo "👉 You can access the interface here: http://$LOCAL_IP:8000"
echo "Press [Ctrl+C] to gracefully shut down both servers."

# Wait indefinitely, and catch Ctrl+C to kill the background tasks
trap "echo -e '\n🛑 Shutting down servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
