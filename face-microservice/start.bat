@echo off
REM Startup script for Face Recognition Microservice (Windows)

echo 🚀 Face Recognition Microservice Startup

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Create environment file if not exists
if not exist ".env" (
    echo ⚙️  Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please edit .env with your configuration
)

REM Create face database directory
if not exist "face_database" mkdir face_database

REM Start the service
echo ✅ Starting Face Recognition Microservice...
python app.py
