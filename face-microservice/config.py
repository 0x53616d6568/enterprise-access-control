import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Face Microservice Configuration"""
    
    # Flask
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    PORT = int(os.getenv('PORT', os.getenv('FACE_SERVICE_PORT', 5000)))
    HOST = os.getenv('FACE_SERVICE_HOST', '0.0.0.0')
    
    # InsightFace Model
    ARCFACE_MODEL = os.getenv('ARCFACE_MODEL', 'buffalo_l')  # Options: 'buffalo_l', 'buffalo_m', 'buffalo_s'
    ARCFACE_DEVICE = os.getenv('ARCFACE_DEVICE', '0')  # 0 for GPU, -1 for CPU
    
    # Embedding settings
    EMBEDDING_DIMENSION = 512
    EMBEDDING_DTYPE = 'float32'
    
    # Similarity threshold
    SIMILARITY_THRESHOLD = float(os.getenv('SIMILARITY_THRESHOLD', '0.6'))
    
    # Face database
    FACE_DB_PATH = os.getenv('FACE_DB_PATH', './face_database')
    
    # Security
    API_KEY = os.getenv('FACE_SERVICE_API_KEY', 'your-secret-key-change-in-production')
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
