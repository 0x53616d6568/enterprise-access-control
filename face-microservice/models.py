"""
Face Recognition Model Wrapper
Uses InsightFace ArcFace model - adapted from provided enrollment/recognition code
"""

import numpy as np
import insightface
from insightface.app import FaceAnalysis
import os
import logging
from typing import Tuple, Optional
from config import Config

logger = logging.getLogger(__name__)

class FaceRecognitionModel:
    """Wrapper for InsightFace ArcFace model using provided code structure"""
    
    def __init__(self):
        self.arcface = None
        self.face_database = {}
        self.is_initialized = False
        self._database_loaded = False
        # Lazy initialization - model loads on first request, not startup
    
    def _initialize_model(self):
        """Initialize InsightFace model - using your provided setup"""
        try:
            logger.info(f"Initializing InsightFace model: {Config.ARCFACE_MODEL}")
            
            # -------------------------------
            # Setup InsightFace (from your code)
            # -------------------------------
            self.arcface = FaceAnalysis(name=Config.ARCFACE_MODEL)
            ctx_id = int(Config.ARCFACE_DEVICE)
            self.arcface.prepare(ctx_id=ctx_id)
            
            self.is_initialized = True
            logger.info("[OK] InsightFace model initialized successfully")
        except Exception as e:
            logger.error(f"[ERROR] Failed to initialize InsightFace model: {str(e)}")
            raise
    
    def _load_database(self):
        """Load all face embeddings from database (from your recognize_face.py logic)"""
        try:
            os.makedirs(Config.FACE_DB_PATH, exist_ok=True)
            
            # -------------------------------
            # Load database embeddings (from recognize_face.py)
            # -------------------------------
            for file in os.listdir(Config.FACE_DB_PATH):
                if file.endswith('.npy'):
                    user_id = int(file[:-4])  # Remove .npy extension
                    filepath = os.path.join(Config.FACE_DB_PATH, file)
                    
                    emb = np.load(filepath)
                    emb = emb / np.linalg.norm(emb)  # normalize (from your code)
                    
                    self.face_database[user_id] = emb
                    logger.debug(f"Loaded embedding for user {user_id}")
            
            self._database_loaded = True
            logger.info(f"[OK] Loaded {len(self.face_database)} face embeddings from database")
        except Exception as e:
            logger.error(f"ÔÜá´©Å Error loading face database: {str(e)}")
    
    def _ensure_initialized(self):
        """Ensure model is initialized before use (lazy init)"""
        if not self.is_initialized:
            self._initialize_model()
        if not self._database_loaded:
            self._load_database()
    
    def extract_embedding(self, image_base64: str) -> Optional[np.ndarray]:
        """
        Extract face embedding from base64 image
        (adapted from your enroll_face1.py logic)
        
        Args:
            image_base64: Base64 encoded image
        
        Returns:
            Normalized 512-dim embedding or None if no face detected
        """
        self._ensure_initialized()
        
        try:
            import base64
            from io import BytesIO
            from PIL import Image
            
            logger.info(f"[EXTRACT] Starting embedding extraction")
            logger.debug(f"[EXTRACT] Image base64 length: {len(image_base64)} chars")
            
            # Decode base64 image
            logger.info(f"[EXTRACT] Decoding base64 image...")
            image_data = base64.b64decode(image_base64)
            logger.debug(f"[EXTRACT] Image bytes: {len(image_data)} bytes")
            
            image = Image.open(BytesIO(image_data))
            logger.info(f"[EXTRACT] Image loaded: {image.size} pixels, mode={image.mode}")
            
            # Convert RGBA to RGB if needed
            if image.mode in ('RGBA', 'LA', 'P'):
                logger.debug(f"[EXTRACT] Converting {image.mode} to RGB")
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = rgb_image
            elif image.mode != 'RGB':
                logger.debug(f"[EXTRACT] Converting {image.mode} to RGB")
                image = image.convert('RGB')
            
            frame = np.array(image)
            logger.info(f"[EXTRACT] Frame shape: {frame.shape}, dtype={frame.dtype}")
            
            # Detect faces on full frame (from your code)
            logger.info(f"[EXTRACT] Running face detection...")
            faces = self.arcface.get(frame)
            
            if not faces:
                logger.warning(f"[EXTRACT] No faces detected in image")
                return None
            
            logger.info(f"[EXTRACT] {len(faces)} face(s) detected")
            
            # Get embedding from first face (from your enroll_face1.py)
            embedding = faces[0].embedding
            logger.debug(f"[EXTRACT] Embedding shape: {embedding.shape}, dtype={embedding.dtype}")
            
            embedding = embedding / np.linalg.norm(embedding)  # normalize (your code)
            logger.info(f"[EXTRACT] Embedding normalized")
            
            return embedding.astype(np.float32)
        except Exception as e:
            logger.error(f"[EXTRACT] ❌ Error extracting embedding: {str(e)}")
            logger.error(f"[EXTRACT] Stack: {__import__('traceback').format_exc()}")
            raise
    
    def save_embedding(self, user_id: int, embedding: np.ndarray):
        """
        Save face embedding to database (from your enroll_face1.py)
        
        Args:
            user_id: User ID (used as filename)
            embedding: 512-dim embedding vector
        """
        try:
            os.makedirs(Config.FACE_DB_PATH, exist_ok=True)
            
            # Normalize before saving (from your code)
            normalized = embedding / np.linalg.norm(embedding)
            
            # Save as {user_id}.npy (from your code structure)
            save_path = os.path.join(Config.FACE_DB_PATH, f"{user_id}.npy")
            np.save(save_path, normalized)
            
            # Update in-memory database
            self.face_database[user_id] = normalized
            
            logger.info(f"[OK] Saved embedding for user {user_id}")
        except Exception as e:
            logger.error(f"Error saving embedding: {str(e)}")
            raise
    
    def get_embedding(self, user_id: int) -> Optional[np.ndarray]:
        """Get stored embedding for user"""
        return self.face_database.get(user_id)
    
    def recognize_face(self, image_base64: str) -> Tuple[Optional[int], float]:
        """
        Recognize face in image and return best match
        (from your recognize_face.py logic)
        
        Args:
            image_base64: Base64 encoded image
        
        Returns:
            Tuple of (user_id, similarity_score) or (None, 0.0)
        """
        self._ensure_initialized()
        try:
            embedding = self.extract_embedding(image_base64)
            
            if embedding is None:
                return None, 0.0
            
            if not self.face_database:
                return None, 0.0
            
            # Compare with database (from your recognize_face.py)
            best_score = 0
            best_match = None
            for user_id, db_emb in self.face_database.items():
                score = self._cosine_similarity(embedding, db_emb)
                if score > best_score:
                    best_score = score
                    best_match = user_id
            
            return best_match, float(best_score)
        except Exception as e:
            logger.error(f"Error recognizing face: {str(e)}")
            raise
    
    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        """
        Calculate cosine similarity between two vectors
        (from your recognize_face.py: def cosine_similarity(a, b): return np.dot(a, b))
        """
        return float(np.dot(a, b))
    
    def delete_embedding(self, user_id: int) -> bool:
        """Delete embedding for user"""
        try:
            filepath = os.path.join(Config.FACE_DB_PATH, f"{user_id}.npy")
            
            if os.path.exists(filepath):
                os.remove(filepath)
                if user_id in self.face_database:
                    del self.face_database[user_id]
                logger.info(f"[OK] Deleted embedding for user {user_id}")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Error deleting embedding: {str(e)}")
            raise
    
    def reload_database(self):
        """Reload all embeddings from disk"""
        self.face_database.clear()
        self._database_loaded = False
        self._load_database()
        logger.info("[OK] Database reloaded")


# Global model instance
model = None

def get_model() -> FaceRecognitionModel:
    """Get or create global model instance"""
    global model
    if model is None:
        model = FaceRecognitionModel()
    return model
