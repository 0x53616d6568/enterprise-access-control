FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
ENV ONNXRUNTIME_EXECUTION_MODE=sequential
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create face database directory in persistent storage
RUN mkdir -p /data/face_database && mkdir -p ./face_database

# Expose port
EXPOSE 5000

# Health check - just check if port is listening
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=2 \
    CMD python -c "import socket; socket.create_connection(('127.0.0.1', 5000), timeout=2)" || exit 1

# Run application
CMD ["python", "app.py"]
