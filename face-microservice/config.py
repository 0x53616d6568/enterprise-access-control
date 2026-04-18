import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Face Microservice Configuration"""
    
    # Flask
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    PORT = int(os.getenv('PORT', os.getenv('FACE_SERVICE_PORT', 5000)))
    HOST = os.getenv('FACE_SERVICE_HOST', '0.0.0.0')
    
    # InsightFace Model - HARDCODED FOR RENDER (buffalo_s only)
    ARCFACE_MODEL = 'buffalo_s'  # FIXED: buffalo_s ONLY for Render (env override disabled)
    ARCFACE_DEVICE = -1  # FIXED: CPU only (-1) for Render
    
    # Embedding settings
    EMBEDDING_DIMENSION = 512
    EMBEDDING_DTYPE = 'float32'
    
    # Similarity threshold
    SIMILARITY_THRESHOLD = float(os.getenv('SIMILARITY_THRESHOLD', '0.6'))
    
    # Face database
    FACE_DB_PATH = os.getenv('FACE_DB_PATH', './face_database')
    
    # Security
    API_KEY = os.getenv('FACE_SERVICE_API_KEY', 'sk-face-xyz123')
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
