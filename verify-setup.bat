@echo off
echo ========================================
echo Regu-Graph Explorer Setup Verification
echo ========================================
echo.

echo [1/5] Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found! Please install Node.js 18+
    goto :end
) else (
    echo ✅ Node.js found
    node --version
)
echo.

echo [2/5] Checking Python...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python not found! Please install Python 3.10+
    goto :end
) else (
    echo ✅ Python found
    python --version
)
echo.

echo [3/5] Checking pnpm...
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  pnpm not found. Install with: npm install -g pnpm
    echo    (You can also use npm instead)
) else (
    echo ✅ pnpm found
    pnpm --version
)
echo.

echo [4/5] Checking frontend environment...
if exist .env.local (
    echo ✅ .env.local exists
) else (
    echo ⚠️  .env.local not found
    echo    Create it with: cp .env.example .env.local
)

if exist node_modules (
    echo ✅ Frontend dependencies installed
) else (
    echo ⚠️  Frontend dependencies not installed
    echo    Run: pnpm install
)
echo.

echo [5/5] Checking backend environment...
if exist backend\.env (
    echo ✅ backend\.env exists
) else (
    echo ⚠️  backend\.env not found
    echo    Create it with: cp backend\.env.example backend\.env
)

if exist backend\venv (
    echo ✅ Backend virtual environment exists
) else (
    echo ⚠️  Backend virtual environment not found
    echo    It will be created when you run start-backend.bat
)
echo.

echo ========================================
echo Summary
echo ========================================
echo.
echo Next steps:
echo 1. Set up your Gemini API keys in .env.local and backend\.env
echo 2. Run: start-all.bat (Windows) or ./start-backend.sh + pnpm dev
echo 3. Open http://localhost:5173 in your browser
echo.
echo For help, see:
echo - QUICKSTART.md (5-minute setup guide)
echo - docs/LANGEXTRACT_INTEGRATION.md (full documentation)
echo.

:end
pause


