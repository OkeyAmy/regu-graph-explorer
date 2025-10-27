#!/bin/bash

echo ""
echo "========================================"
echo "LANGEXTRACT QUICK TEST"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo ""
    echo "Please create backend/.env with:"
    echo "  LANGEXTRACT_API_KEY=your_key_here"
    echo ""
    echo "Get your key from: https://aistudio.google.com/app/apikey"
    echo ""
    exit 1
fi

# Load .env
export $(grep -v '^#' .env | xargs)

if [ -z "$LANGEXTRACT_API_KEY" ]; then
    echo "ERROR: LANGEXTRACT_API_KEY not set in .env!"
    echo ""
    exit 1
fi

echo "API Key: ${LANGEXTRACT_API_KEY:0:10}..."
echo "Model: ${GEMINI_MODEL:-gemini-2.0-flash-exp}"
echo ""

echo "Running test extraction..."
echo ""

python3 test_extraction.py

echo ""
echo "========================================"
echo "TEST COMPLETE"
echo "========================================"
echo ""


