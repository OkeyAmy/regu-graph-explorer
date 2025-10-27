@echo off
echo Starting LangExtract Backend...
echo.

cd backend

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Installing/Updating dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop
echo.

python main.py


