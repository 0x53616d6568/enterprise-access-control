#!/bin/bash
# Startup script for Face Recognition Microservice

set -e

echo "🚀 Face Recognition Microservice Startup"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/upgrade dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create environment file if not exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration"
fi

# Create face database directory
mkdir -p face_database

# Start the service
echo "✅ Starting Face Recognition Microservice..."
python app.py
