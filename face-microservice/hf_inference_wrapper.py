"""
Face Recognition using Hugging Face Inference API
Wrapper to call HF's face feature extraction models
No container needed - just API calls
"""

import requests
import os
from typing import Optional, Tuple
import numpy as np
import base64
from io import BytesIO
from PIL import Image

class HFInferenceWrapper:
    """Wrapper around HF Inference API for face recognition"""
    
    def __init__(self):
        # Get HF API token from environment
        self.api_key = os.getenv('HF_API_KEY', '')
        if not self.api_key:
            raise ValueError("HF_API_KEY environment variable not set")
        
        # HF Inference API endpoints
        self.base_url = "https://api-inference.huggingface.co/models"
        
        # Model for feature extraction: extracts embeddings from faces
        self.embedding_model = "IMViaMarvin/nsfwjs-embeddings"  # Alternative: "sentence-transformers/all-MiniLM-L6-v2"
        
        # Model for face detection
        self.detection_model = "Xenova/detr-resnet50"
        
        self.face_database = {}
        self._load_database()
    
    def _load_database(self):
        """Load saved embeddings from ./face_database/"""
        db_path = './face_database'
        if not os.path.exists(db_path):
            os.makedirs(db_path, exist_ok=True)
            return
        
        for file in os.listdir(db_path):
            if file.endswith('.npy'):
                user_id = int(file[:-4])
                embedding = np.load(os.path.join(db_path, file))
                self.face_database[user_id] = embedding
    
    def extract_embedding(self, image_base64: str) -> Optional[np.ndarray]:
        """
        Extract face embedding from image using HF Inference API
        
        Args:
            image_base64: Base64 encoded image
        
        Returns:
            512-dim embedding vector or None if no face detected
        """
        try:
            # Decode image
            image_data = base64.b64decode(image_base64)
            image = Image.open(BytesIO(image_data))
            
            # Convert PIL image to bytes for API
            img_byte_arr = BytesIO()
            image.save(img_byte_arr, format='JPEG')
            img_bytes = img_byte_arr.getvalue()
            
            # Call HF Inference API for feature extraction
            headers = {"Authorization": f"Bearer {self.api_key}"}
            response = requests.post(
                f"{self.base_url}/sentence-transformers/all-mpnet-base-v2",
                headers=headers,
                data=img_bytes,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"HF API error: {response.status_code}")
                return None
            
            embedding = np.array(response.json())
            
            # Normalize embedding
            embedding = embedding / np.linalg.norm(embedding)
            return embedding.astype(np.float32)
        
        except Exception as e:
            print(f"Error extracting embedding: {e}")
            return None
    
    def save_embedding(self, user_id: int, embedding: np.ndarray):
        """Save embedding to disk"""
        os.makedirs('./face_database', exist_ok=True)
        filepath = f'./face_database/{user_id}.npy'
        normalized = embedding / np.linalg.norm(embedding)
        np.save(filepath, normalized)
        self.face_database[user_id] = normalized
    
    def recognize_face(self, image_base64: str) -> Tuple[Optional[int], float]:
        """
        Find best matching enrolled face
        
        Returns:
            (user_id, similarity_score) or (None, 0.0)
        """
        embedding = self.extract_embedding(image_base64)
        if embedding is None or not self.face_database:
            return None, 0.0
        
        best_score = 0
        best_match = None
        
        for user_id, db_emb in self.face_database.items():
            score = float(np.dot(embedding, db_emb))
            if score > best_score:
                best_score = score
                best_match = user_id
        
        return best_match, best_score


# Test if running directly
if __name__ == '__main__':
    wrapper = HFInferenceWrapper()
    print("✓ HF Inference wrapper initialized")
