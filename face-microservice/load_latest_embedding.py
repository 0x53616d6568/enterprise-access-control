"""
Load latest embedding from database to face_database folder
"""
import mysql.connector
import numpy as np
import os
from pathlib import Path

# Database config
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'root123',
    'database': 'enterprise_access_control'
}

# Face database folder
face_db_path = Path('./face_database')
face_db_path.mkdir(exist_ok=True)

try:
    # Connect to database
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    
    # Get the latest embedding
    cursor.execute("""
        SELECT id, user_id, embedding 
        FROM face_embeddings 
        ORDER BY enrolled_at DESC 
        LIMIT 1
    """)
    
    result = cursor.fetchone()
    if result:
        embedding_id, user_id, embedding_blob = result
        
        # Convert blob to numpy array
        embedding_array = np.frombuffer(embedding_blob, dtype=np.float32)
        
        # Save as user_id.npy
        output_file = face_db_path / f'{user_id}.npy'
        np.save(output_file, embedding_array)
        
        print(f'✅ Loaded embedding {embedding_id} for user {user_id}')
        print(f'   Saved to: {output_file}')
        print(f'   Shape: {embedding_array.shape}')
    else:
        print('❌ No embeddings found in database')
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f'❌ Error: {e}')
