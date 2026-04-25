"""
Comprehensive Debug Tool - Test face recognition pipeline

Loads .npy file and tests similarity calculation
"""

import os
import numpy as np

FACE_DB_PATH = './face_database'

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors"""
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    
    a_norm = a / (np.linalg.norm(a) + 1e-8)
    b_norm = b / (np.linalg.norm(b) + 1e-8)
    
    return np.dot(a_norm, b_norm)

def load_database():
    """Load all face embeddings from database"""
    database = {}
    if os.path.exists(FACE_DB_PATH) and os.listdir(FACE_DB_PATH):
        for file in os.listdir(FACE_DB_PATH):
            if file.endswith('.npy'):
                user_id = int(file[:-4])
                embeddings = np.load(os.path.join(FACE_DB_PATH, file))
                print(f"  Loaded {file}")
                print(f"    Shape before reshape: {embeddings.shape}")
                print(f"    Dtype: {embeddings.dtype}")
                
                # Ensure 2D array
                if embeddings.ndim == 1:
                    embeddings = embeddings.reshape(1, -1)
                    print(f"    Reshaped to: {embeddings.shape}")
                
                # Normalize
                norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
                print(f"    Norms before normalization: {norms.flatten()}")
                
                embeddings = embeddings / norms
                
                print(f"    Norms after normalization: {np.linalg.norm(embeddings, axis=1)}")
                print(f"    First 5 values: {embeddings[0, :5]}")
                print(f"    Min: {np.min(embeddings):.6f}, Max: {np.max(embeddings):.6f}")
                
                database[user_id] = embeddings
    
    return database

def test_similarity():
    """Test the full similarity calculation"""
    print("\n" + "="*70)
    print("🔍 Face Recognition Pipeline Debug")
    print("="*70 + "\n")
    
    # Load database
    print("📁 Loading database...")
    database = load_database()
    
    if not database:
        print("\n❌ No embeddings found in database!")
        return
    
    print(f"\n✅ Loaded {len(database)} users\n")
    
    # Test with a fake embedding (for debugging)
    print("-"*70)
    print("Test 1: Testing with a fake random embedding")
    print("-"*70)
    
    fake_embedding = np.random.randn(512).astype(np.float32)
    fake_embedding = fake_embedding / np.linalg.norm(fake_embedding)
    
    print(f"Fake embedding shape: {fake_embedding.shape}")
    print(f"Fake embedding norm: {np.linalg.norm(fake_embedding):.6f}")
    print(f"Fake embedding first 5 values: {fake_embedding[:5]}")
    
    for user_id, db_embeddings in database.items():
        print(f"\nUser {user_id}:")
        print(f"  DB embeddings shape: {db_embeddings.shape}")
        
        for idx, db_emb in enumerate(db_embeddings):
            print(f"  Embedding #{idx}:")
            print(f"    Shape: {db_emb.shape}")
            print(f"    Norm: {np.linalg.norm(db_emb):.6f}")
            print(f"    First 5 values: {db_emb[:5]}")
            
            score = cosine_similarity(fake_embedding, db_emb)
            print(f"    Similarity score: {score:.6f}")
            
            # Debug the calculation step by step
            print(f"\n    Debug similarity calculation:")
            print(f"    Fake norm: {np.linalg.norm(fake_embedding):.8f}")
            print(f"    DB norm: {np.linalg.norm(db_emb):.8f}")
            print(f"    Dot product (before norm): {np.dot(fake_embedding, db_emb):.8f}")
    
    # Test with identical embedding
    print("\n" + "-"*70)
    print("Test 2: Testing with IDENTICAL embedding to database")
    print("-"*70)
    
    for user_id, db_embeddings in database.items():
        first_emb = db_embeddings[0]
        
        print(f"\nUser {user_id}:")
        score = cosine_similarity(first_emb, first_emb)
        print(f"  Similarity with itself: {score:.6f}")
        print(f"  (Should be ~1.0)")
        
        if score < 0.95:
            print(f"  ⚠️  WARNING: Similarity with itself is not 1.0!")

if __name__ == '__main__':
    test_similarity()
