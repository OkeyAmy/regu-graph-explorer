@echo off
echo Starting Regu-Graph Explorer with LangExtract Backend...
echo.

REM Start backend in new window
start "LangExtract Backend" cmd /k "start-backend.bat"

REM Wait for backend to start
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

REM Start frontend
echo Starting frontend...
pnpm dev


