"""
Test recognition using the latest embedding from database
"""
import numpy as np
import mysql.connector
from insightface.app import FaceAnalysis
import os

# Initialize InsightFace model
print("🚀 Initializing InsightFace model (buffalo_l)...")
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))
print("✅ Model initialized\n")

# Connect to database
conn = mysql.connector.connect(
    host="127.0.0.1",
    user="root",
    password="root123",
    database="enterprise_access_control"
)
cursor = conn.cursor()

# Load the latest embedding from database
print("📂 Loading latest embedding from database...")
cursor.execute("""
    SELECT id, user_id, embedding, enrolled_at 
    FROM face_embeddings 
    ORDER BY enrolled_at DESC LIMIT 1
""")
result = cursor.fetchone()

if result:
    embedding_id, user_id, embedding_blob, enrolled_at = result
    latest_embedding = np.frombuffer(embedding_blob, dtype=np.float32)
    print(f"✅ Loaded embedding {embedding_id} for user {user_id}")
    print(f"   Enrolled: {enrolled_at}")
    print(f"   Shape: {latest_embedding.shape}\n")
else:
    print("❌ No embeddings found in database")
    exit(1)

# Load all embeddings and compare
print("=" * 60)
print("🔍 RECOGNITION TEST - Comparing Latest Embedding")
print("=" * 60)
print(f"\nTest embedding: User {user_id} (ID {embedding_id})\n")

cursor.execute("""
    SELECT id, user_id, embedding, enrolled_at 
    FROM face_embeddings 
    ORDER BY user_id, enrolled_at DESC
""")

results = cursor.fetchall()
THRESHOLD = 0.6  # Similarity threshold

print(f"{'ID':<4} {'User':<6} {'Similarity':<12} {'Match':<8} {'Enrolled':<20}")
print("-" * 60)

matches = []
for row_id, row_user_id, emb_blob, enr_date in results:
    db_embedding = np.frombuffer(emb_blob, dtype=np.float32)
    
    # Calculate cosine similarity
    dot_product = np.dot(latest_embedding, db_embedding)
    norm_latest = np.linalg.norm(latest_embedding)
    norm_db = np.linalg.norm(db_embedding)
    similarity = dot_product / (norm_latest * norm_db)
    
    is_match = "✅ YES" if similarity >= THRESHOLD else "❌ NO"
    
    if similarity >= THRESHOLD and row_id != embedding_id:
        matches.append((row_id, row_user_id, similarity))
    
    print(f"{row_id:<4} {row_user_id:<6} {similarity:<12.4f} {is_match:<8} {str(enr_date):<20}")

print("=" * 60)
print(f"\nThreshold: {THRESHOLD}")
print(f"Results: {len(matches)} matches found (excluding self)")

if matches:
    print("\n✅ MATCHES:")
    for mid, muser, msim in matches:
        print(f"   - Embedding {mid} (User {muser}): {msim:.4f}")
else:
    print("\n❌ No matches found - embedding is unique")

# Also test with the saved 8.npy file if it exists
print("\n" + "=" * 60)
print("📊 SAVED FILE TEST")
print("=" * 60)

npy_file = "face_database/8.npy"
if os.path.exists(npy_file):
    saved_embedding = np.load(npy_file)
    print(f"✅ Loaded {npy_file}")
    print(f"   Shape: {saved_embedding.shape}")
    
    # Compare latest with saved
    dot_product = np.dot(latest_embedding, saved_embedding)
    norm_latest = np.linalg.norm(latest_embedding)
    norm_saved = np.linalg.norm(saved_embedding)
    similarity = dot_product / (norm_latest * norm_saved)
    
    print(f"   Similarity with latest DB embedding: {similarity:.4f}")
    if similarity >= THRESHOLD:
        print(f"   ✅ MATCH (similarity >= {THRESHOLD})")
    else:
        print(f"   ❌ NO MATCH (similarity < {THRESHOLD})")
else:
    print(f"❌ File not found: {npy_file}")

cursor.close()
conn.close()
print("\n✅ Test complete!")
