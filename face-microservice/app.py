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
import gc
from functools import wraps
from config import Config
from models import get_model
import traceback

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=Config.LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────
# Middleware: API Key Authentication
# ────────────────────────────────────────────────────────────

def require_api_key(f):
    """Decorator to check API key"""
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        if not api_key or api_key != Config.API_KEY:
            return jsonify({'success': False, 'error': 'Invalid or missing API key'}), 401
        
        return f(*args, **kwargs)
    return decorated

# ────────────────────────────────────────────────────────────
# Health Check
# ────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    model = get_model()
    return jsonify({
        'status': 'ok',
        'model_initialized': model.is_initialized,
        'embeddings_loaded': len(model.face_database),
        'timestamp': __import__('datetime').datetime.utcnow().isoformat()
    }), 200

# ────────────────────────────────────────────────────────────
# Face Enrollment Endpoint
# ────────────────────────────────────────────────────────────

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
        try:
            embedding = model.extract_embedding(image_base64)
        except ValueError as ve:
            # Handle validation errors (e.g., image too large)
            return jsonify({
                'success': False,
                'error': str(ve)
            }), 413  # 413 = Payload Too Large
        
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
        
        # Clean up memory
        del embedding
        del embedding_bytes
        gc.collect()
        
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

# ────────────────────────────────────────────────────────────
# Face Recognition Endpoint
# ────────────────────────────────────────────────────────────

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
        try:
            user_id, similarity = model.recognize_face(image_base64)
        except ValueError as ve:
            # Handle validation errors (e.g., image too large)
            return jsonify({
                'success': False,
                'error': str(ve)
            }), 413  # 413 = Payload Too Large
        
        # Clean up memory
        gc.collect()
        
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

# ────────────────────────────────────────────────────────────
# Get Embedding Endpoint (for backend to retrieve stored embeddings)
# ────────────────────────────────────────────────────────────

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

# ────────────────────────────────────────────────────────────
# Delete Embedding Endpoint
# ────────────────────────────────────────────────────────────

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

# ────────────────────────────────────────────────────────────
# Database Management
# ────────────────────────────────────────────────────────────

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

# ────────────────────────────────────────────────────────────
# Error Handlers
# ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {str(e)}\n{traceback.format_exc()}")
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

# ────────────────────────────────────────────────────────────
# Startup
# ────────────────────────────────────────────────────────────

if __name__ == '__main__':
    logger.info(f"🚀 Starting Face Recognition Microservice")
    logger.info(f"🔧 Config: {Config.ARCFACE_MODEL} on device {Config.ARCFACE_DEVICE}")
    logger.info(f"📁 Database: {Config.FACE_DB_PATH}")
    logger.info(f"🔐 API Key required: Yes")
    
    # Initialize model on startup
    try:
        get_model()
        logger.info("✅ Microservice ready")
    except Exception as e:
        logger.error(f"❌ Failed to initialize: {str(e)}")
        exit(1)
    
    # Start server
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
