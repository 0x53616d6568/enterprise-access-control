"""
Export Face Embeddings Directly from Database
Bypasses hex conversion - exports binary embeddings directly

Usage:
  python export_embeddings_direct.py
"""

import os
import sys
import numpy as np
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database Configuration
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'access_control')

FACE_DB_PATH = './face_database'

def create_connection():
    """Create a database connection (with SSL for cloud databases)"""
    try:
        import mysql.connector
        
        # Check if it's a cloud database (needs SSL)
        is_cloud = not (DB_HOST == 'localhost' or DB_HOST == '127.0.0.1')
        
        config = {
            'host': DB_HOST,
            'port': DB_PORT,
            'user': DB_USER,
            'password': DB_PASSWORD,
            'database': DB_NAME,
        }
        
        # Add SSL for cloud databases (Aiven, etc.)
        if is_cloud:
            print("🔒 Using SSL for cloud database connection\n")
            config['ssl_disabled'] = False
            config['autocommit'] = True
        
        connection = mysql.connector.connect(**config)
        
        if connection.is_connected():
            print(f"✅ Connected to database: {DB_NAME}")
            return connection
    except ImportError:
        print("❌ mysql-connector-python not installed")
        print("   Run: pip install mysql-connector-python")
        return None
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return None

def export_embeddings_direct():
    """Export embeddings directly from database (binary data, not hex)"""
    
    # Ensure face_database folder exists
    os.makedirs(FACE_DB_PATH, exist_ok=True)
    print(f"📁 Using face database path: {os.path.abspath(FACE_DB_PATH)}")
    
    # Connect to database
    connection = create_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Query all embeddings (get the raw binary data)
        query = """
            SELECT user_id, embedding, enrolled_at, model_version 
            FROM face_embeddings 
            ORDER BY user_id
        """
        
        cursor.execute(query)
        embeddings = cursor.fetchall()
        
        if not embeddings:
            print("⚠️  No embeddings found in database")
            return False
        
        print(f"\n📊 Found {len(embeddings)} embedding(s) in database\n")
        
        # Group embeddings by user_id
        embeddings_by_user = {}
        for row in embeddings:
            user_id = row['user_id']
            if user_id not in embeddings_by_user:
                embeddings_by_user[user_id] = []
            embeddings_by_user[user_id].append(row)
        
        # Export each user's embeddings
        exported_count = 0
        for user_id, user_embeddings in embeddings_by_user.items():
            print(f"📦 User {user_id}: {len(user_embeddings)} embedding(s)")
            
            # Collect all embeddings for this user
            embedding_list = []
            
            for row in user_embeddings:
                embedding_blob = row['embedding']
                enrolled_at = row['enrolled_at']
                model_version = row['model_version']
                
                try:
                    # Convert binary data to numpy array
                    embedding_array = np.frombuffer(embedding_blob, dtype=np.float32)
                    
                    print(f"   - Enrollment {len(embedding_list)+1}:")
                    print(f"     Blob size: {len(embedding_blob)} bytes")
                    print(f"     Array shape: {embedding_array.shape}")
                    print(f"     Norm: {np.linalg.norm(embedding_array):.6f}")
                    
                    # Check if valid
                    if np.allclose(embedding_array, 0):
                        print(f"     ⚠️  WARNING: All zeros!")
                        continue
                    
                    # Normalize the embedding
                    norm = np.linalg.norm(embedding_array)
                    if norm > 0:
                        embedding_array = embedding_array / norm
                    
                    embedding_list.append(embedding_array)
                    print(f"     ✅ Norm after: {np.linalg.norm(embedding_array):.6f}")
                    print(f"     📅 Enrolled: {enrolled_at} | Model: {model_version}")
                    
                except Exception as e:
                    print(f"     ❌ Error: {e}")
            
            # Save all embeddings for this user as a 2D array
            if embedding_list:
                embeddings_array = np.vstack(embedding_list)  # Shape: (N, 512)
                file_path = os.path.join(FACE_DB_PATH, f'{user_id}.npy')
                np.save(file_path, embeddings_array)
                
                file_size = os.path.getsize(file_path)
                print(f"   💾 Saved to: {file_path}")
                print(f"      Shape: {embeddings_array.shape} | Size: {file_size} bytes\n")
                
                exported_count += 1
        
        print(f"\n{'='*60}")
        print(f"✅ Export Complete: {exported_count}/{len(embeddings)} embeddings exported")
        print(f"{'='*60}")
        print(f"\n🎯 You can now run: python test_camera.py")
        print(f"   Embeddings are ready for face recognition testing\n")
        
        return True
        
    except Exception as e:
        print(f"❌ Database query error: {e}")
        return False
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print("🔌 Database connection closed")

if __name__ == '__main__':
    print("\n" + "="*60)
    print("📥 Direct Database Export Tool")
    print("="*60 + "\n")
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("⚠️  .env file not found!")
        print("   Make sure you have configured:")
        print("   - DB_HOST")
        print("   - DB_PORT")
        print("   - DB_USER")
        print("   - DB_PASSWORD")
        print("   - DB_NAME\n")
    
    print(f"Database Connection Details:")
    print(f"  Host: {DB_HOST}:{DB_PORT}")
    print(f"  Database: {DB_NAME}")
    print(f"  User: {DB_USER}\n")
    
    # Export embeddings
    success = export_embeddings_direct()
    
    sys.exit(0 if success else 1)
