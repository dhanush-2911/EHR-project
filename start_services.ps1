# MediLink One-Click Startup Script
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:Path = "$env:LOCALAPPDATA\Programs\nodejs;$env:Path"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "       Starting MediLink Services        " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Start AI Engine (Port 8002)
Write-Host "`n[1/3] Starting AI Engine (FastAPI on :8002)..." -ForegroundColor Yellow
$aiProcess = Start-Process -FilePath "$scriptDir\backend\venv\Scripts\uvicorn.exe" `
    -ArgumentList "app.main:app --host 127.0.0.1 --port 8002" `
    -WorkingDirectory "$scriptDir\ai-engine" `
    -PassThru

# 2. Start Django Backend (Port 8000)
Write-Host "[2/3] Starting Backend (Django on :8000)..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "$scriptDir\backend\venv\Scripts\python.exe" `
    -ArgumentList "manage.py runserver 127.0.0.1:8000" `
    -WorkingDirectory "$scriptDir\backend" `
    -PassThru

# 3. Start Frontend Dev Server (Port 5173)
Write-Host "[3/3] Starting Frontend (Vite on :5173)..." -ForegroundColor Yellow
$frontendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev -- --host 127.0.0.1 --port 5173" `
    -WorkingDirectory "$scriptDir\frontend" `
    -PassThru

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "All MediLink services have been started!" -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:   http://localhost:8000/api/" -ForegroundColor White
Write-Host "  AI Engine: http://localhost:8002/docs" -ForegroundColor White
Write-Host "`nDemo Accounts:" -ForegroundColor Cyan
Write-Host "  Doctor:  drsmith    / password123" -ForegroundColor White
Write-Host "  Patient: janesmith  / password123" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Green
