# MediLink

AI-Driven Intelligent Interoperable EHR System for Cross-Hospital Patient History Sharing

## Overview
MediLink is a modern healthcare application that enables patient medical record creation, centralized encrypted EHR, and cross-hospital history sharing with patient consent. It also features an AI engine for clinical decision support.

## Architecture
- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Django, Django REST Framework, MySQL, Celery, Redis
- **AI Engine**: FastAPI, Scikit-learn, Tesseract OCR
- **Interoperability**: HL7 FHIR R4

## Repository Structure
- `/frontend`: React frontend
- `/backend`: Django REST API
- `/ai-engine`: FastAPI Python AI services
- `/infrastructure`: Docker Compose configuration

## Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js (for local frontend dev)
- Python 3.10+ (for local backend dev)

### Docker Environment
```bash
cp .env.example .env
docker-compose up --build
```

### Local Development (Frontend)
```bash
cd frontend
npm install
npm run dev
```

### Local Development (Backend)
```bash
cd backend
python -m venv venv
# activate venv
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Local Development (AI Engine)
```bash
cd ai-engine
python -m venv venv
# activate venv
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Security & Privacy
- **AI Limitations**: AI output is for decision support only. It does not provide definitive medical diagnoses.
- **Data Exposure**: Do not expose real personal medical data during development.

## Demo Credentials
(To be added)
