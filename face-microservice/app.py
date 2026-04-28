"""
Face Recognition Microservice
Independent service running on Raspberry Pi (or any device with GPU/CPU)
Provides REST API for face enrollment, recognition, and embedding retrieval

Architecture:
- Main Backend (Node.js) calls this service
- Handles all InsightFace/ArcFace operations
- Manages face database on local storage
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from functools import wraps
from config import Config
from models import get_model
import traceback
import os
import numpy as np

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=Config.LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =
# Middleware: API Key Authentication
# =

def require_api_key(f):
    """Decorator to check API key"""
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        if not api_key or api_key != Config.API_KEY:
            return jsonify({'success': False, 'error': 'Invalid or missing API key'}), 401
        
        return f(*args, **kwargs)
    return decorated

# =
# =
# Root Route (required for HF Spaces health check)
# =

@app.route('/', methods=['GET'])
def root():
    """Root endpoint - returns 200 OK for health checks"""
    return jsonify({
        'name': 'Face Recognition Microservice',
        'status': 'ok',
        'version': '1.0'
    }), 200

# =
# Health Check
# =

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint - responds immediately without initializing model"""
    return jsonify({
        'status': 'ok',
        'service': 'ready',
        'model': 'loads on first request',
        'timestamp': __import__('datetime').datetime.utcnow().isoformat()
    }), 200

# =
# Face Enrollment Endpoint
# =

@app.route('/enroll', methods=['POST'])
@require_api_key
def enroll_face():
    """
    Enroll a face and extract embedding
    
    Request:
    {
        "user_id": 1,
        "image_base64": "base64-encoded-image-data"
    }
    
    Response:
    {
        "success": true,
        "data": {
            "user_id": 1,
            "embedding": "base64-encoded-512-dim-vector",
            "message": "Face enrolled successfully"
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'Request body required'}), 400
        
        user_id = data.get('user_id')
        image_base64 = data.get('image_base64')
        
        if not user_id or not image_base64:
            return jsonify({'success': False, 'error': 'user_id and image_base64 required'}), 400
        
        # Get model instance
        model = get_model()
        
        # Extract embedding from image
        embedding = model.extract_embedding(image_base64)
        
        if embedding is None:
            return jsonify({
                'success': False,
                'error': 'No face detected in image'
            }), 400
        
        # Save embedding
        model.save_embedding(user_id, embedding)
        
        # Convert embedding to base64 for response
        import base64
        import numpy as np
        embedding_bytes = embedding.astype(np.float32).tobytes()
        embedding_base64 = base64.b64encode(embedding_bytes).decode('utf-8')
        
        return jsonify({
            'success': True,
            'data': {
                'user_id': user_id,
                'embedding': embedding_base64,
                'message': 'Face enrolled successfully'
            }
        }), 201
    
    except Exception as e:
        logger.error(f"Enrollment error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =
# Face Recognition Endpoint
# =

@app.route('/recognize', methods=['POST'])
@require_api_key
def recognize_face():
    """
    Recognize face in image and find best match
    
    Request:
    {
        "image_base64": "base64-encoded-image-data"
    }
    
    Response:
    {
        "success": true,
        "data": {
            "user_id": 1,
            "similarity": 0.85,
            "is_authorized": true,
            "threshold": 0.6
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'Request body required'}), 400
        
        image_base64 = data.get('image_base64')
        
        if not image_base64:
            return jsonify({'success': False, 'error': 'image_base64 required'}), 400
        
        # Get model instance
        model = get_model()
        
        # Recognize face
        user_id, similarity = model.recognize_face(image_base64)
        
        return jsonify({
            'success': True,
            'data': {
                'user_id': user_id,
                'similarity': similarity,
                'is_authorized': similarity >= Config.SIMILARITY_THRESHOLD if user_id else False,
                'threshold': Config.SIMILARITY_THRESHOLD
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Recognition error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =
# Get Embedding Endpoint (for backend to retrieve stored embeddings)
# =

@app.route('/embedding/<int:user_id>', methods=['GET'])
@require_api_key
def get_embedding(user_id):
    """
    Get stored embedding for user (backend retrieval)
    
    Response:
    {
        "success": true,
        "data": {
            "user_id": 1,
            "embedding": "base64-encoded-512-dim-vector"
        }
    }
    """
    try:
        model = get_model()
        embedding = model.get_embedding(user_id)
        
        if embedding is None:
            return jsonify({
                'success': False,
                'error': 'No embedding found for user'
            }), 404
        
        # Convert to base64
        import base64
        import numpy as np
        embedding_bytes = embedding.astype(np.float32).tobytes()
        embedding_base64 = base64.b64encode(embedding_bytes).decode('utf-8')
        
        return jsonify({
            'success': True,
            'data': {
                'user_id': user_id,
                'embedding': embedding_base64
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Get embedding error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =
# Delete Embedding Endpoint
# =

@app.route('/embedding/<int:user_id>', methods=['DELETE'])
@require_api_key
def delete_embedding(user_id):
    """Delete face embedding for user"""
    try:
        model = get_model()
        deleted = model.delete_embedding(user_id)
        
        if not deleted:
            return jsonify({
                'success': False,
                'error': 'No embedding found to delete'
            }), 404
        
        return jsonify({
            'success': True,
            'data': {'message': 'Embedding deleted'}
        }), 200
    
    except Exception as e:
        logger.error(f"Delete embedding error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =
# Database Management
# =

@app.route('/db/reload', methods=['POST'])
@require_api_key
def reload_database():
    """Reload face database from disk"""
    try:
        model = get_model()
        model.reload_database()
        
        return jsonify({
            'success': True,
            'data': {
                'message': 'Database reloaded',
                'embeddings_loaded': len(model.face_database)
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Reload database error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/db/stats', methods=['GET'])
@require_api_key
def db_stats():
    """Get database statistics"""
    try:
        model = get_model()
        
        return jsonify({
            'success': True,
            'data': {
                'total_embeddings': len(model.face_database),
                'model': Config.ARCFACE_MODEL,
                'threshold': Config.SIMILARITY_THRESHOLD,
                'embedding_dimension': Config.EMBEDDING_DIMENSION
            }
        }), 200
    
    except Exception as e:
        logger.error(f"DB stats error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
# =
# Recognize by Embedding Endpoint
# =

@app.route('/recognize_embedding', methods=['POST'])
@require_api_key
def recognize_embedding():
    """Accept a raw 512-dim ArcFace embedding and compare against database."""
    try:
        data = request.get_json()
        
        if not data or 'embedding' not in data:
            return jsonify({'success': False, 'error': 'Missing embedding field'}), 400
        
        emb_list = data['embedding']
        if len(emb_list) != 512:
            return jsonify({
                'success': False,
                'error': f'Expected 512 dims, got {len(emb_list)}'
            }), 400
        
        # Get model instance
        model = get_model()
        
        # Convert to numpy and normalize
        query_emb = np.array(emb_list, dtype=np.float32)
        norm = np.linalg.norm(query_emb)
        if norm > 0:
            query_emb = query_emb / norm
        
        # Compare against database
        best_match = None
        best_sim = -1.0
        
        for user_id, db_emb in model.face_database.items():
            db_emb = np.array(db_emb, dtype=np.float32)
            db_norm = np.linalg.norm(db_emb)
            if db_norm > 0:
                db_emb = db_emb / db_norm
            
            sim = float(np.dot(query_emb, db_emb))
            
            if sim > best_sim:
                best_sim = sim
                best_match = user_id
        
        is_authorized = best_sim >= Config.SIMILARITY_THRESHOLD and best_match is not None
        
        return jsonify({
            'success': True,
            'data': {
                'user_id': best_match,
                'similarity': round(best_sim, 4),
                'is_authorized': is_authorized,
                'threshold': Config.SIMILARITY_THRESHOLD
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Recognize embedding error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
# =
# Error Handlers
# =

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {str(e)}\n{traceback.format_exc()}")
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

# =
# Startup
# =

if __name__ == '__main__':
    logger.info("Starting Face Recognition Microservice")
    logger.info(f"Config: {Config.ARCFACE_MODEL} on device {Config.ARCFACE_DEVICE}")
    logger.info(f"Database: {Config.FACE_DB_PATH}")
    logger.info("API Key required: Yes")
    logger.info("Microservice ready - listening on 0.0.0.0:5000")
    logger.info("Model will load on first API request (lazy initialization)")

    # Start server - model loads on first request
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)