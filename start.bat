@echo off
title MediLink EHR System
cd /d "%~dp0"
set PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%

echo =========================================
echo       Starting MediLink EHR Services
echo =========================================

echo [1/3] Starting AI Engine on port 8002...
start "MediLink - AI Engine" /min cmd /k "cd /d ""%~dp0ai-engine"" && ""%~dp0backend\venv\Scripts\uvicorn.exe"" app.main:app --host 127.0.0.1 --port 8002"

echo [2/3] Starting Backend on port 8000...
start "MediLink - Backend" /min cmd /k "cd /d ""%~dp0backend"" && ""%~dp0backend\venv\Scripts\python.exe"" manage.py runserver 127.0.0.1:8000"

echo [3/3] Starting Frontend on port 5173...
start "MediLink - Frontend" /min cmd /k "cd /d ""%~dp0frontend"" && set PATH=%LOCALAPPDATA%\Programs\nodejs;%%PATH%% && npm run dev -- --host 127.0.0.1 --port 5173"

echo =========================================
echo Services started!
echo Frontend:  http://localhost:5173
echo Backend:   http://localhost:8000/api/
echo AI Engine: http://localhost:8002/docs
echo =========================================
