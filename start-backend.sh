#!/bin/bash

echo "Starting LangExtract Backend..."
echo ""

cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo ""
echo "Installing/Updating dependencies..."
pip install -r requirements.txt --quiet

echo ""
echo "Starting FastAPI server on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

python main.py


