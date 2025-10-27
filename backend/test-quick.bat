@echo off
echo.
echo ========================================
echo LANGEXTRACT QUICK TEST
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please create backend/.env with:
    echo   LANGEXTRACT_API_KEY=your_key_here
    echo.
    echo Get your key from: https://aistudio.google.com/app/apikey
    echo.
    pause
    exit /b 1
)

REM Load .env
for /f "tokens=1,* delims==" %%a in (.env) do (
    if "%%a"=="LANGEXTRACT_API_KEY" set LANGEXTRACT_API_KEY=%%b
    if "%%a"=="GEMINI_MODEL" set GEMINI_MODEL=%%b
)

if "%LANGEXTRACT_API_KEY%"=="" (
    echo ERROR: LANGEXTRACT_API_KEY not set in .env!
    echo.
    pause
    exit /b 1
)

echo API Key: %LANGEXTRACT_API_KEY:~0,10%...
if "%GEMINI_MODEL%"=="" (
    set GEMINI_MODEL=gemini-2.0-flash-exp
)
echo Model: %GEMINI_MODEL%
echo.

echo Running test extraction...
echo.

python test_extraction.py

echo.
echo ========================================
echo TEST COMPLETE
echo ========================================
echo.
pause


