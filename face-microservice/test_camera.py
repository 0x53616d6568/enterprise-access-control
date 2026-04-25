"""
Face Recognition Test Script - Test camera enrollment & recognition locally
Uses your PC camera to test the same model as the microservice

Usage:
  - Run: python test_camera.py
  - Choose mode: [1] Enroll, [2] Recognize, [3] Enroll + Recognize
"""

import cv2
import numpy as np
import os
import sys
from insightface.app import FaceAnalysis

# ────────────────────────────────────────────────────────────
# Configuration
# ────────────────────────────────────────────────────────────

FACE_DB_PATH = './face_database'
THRESHOLD = 0.6
ARCFACE_MODEL = 'buffalo_s'  # Must match microservice model (buffalo_s for HF Spaces)
ARCFACE_DEVICE = -1  # -1 for CPU, 0 for GPU

# Debug mode - shows all similarity scores
DEBUG_MODE = True

# ────────────────────────────────────────────────────────────
# Initialize Model
# ────────────────────────────────────────────────────────────

print(f"🚀 Initializing InsightFace model ({ARCFACE_MODEL})...")
arcface = FaceAnalysis(name=ARCFACE_MODEL)
arcface.prepare(ctx_id=ARCFACE_DEVICE)
print("✅ Model initialized")

# Create database folder
os.makedirs(FACE_DB_PATH, exist_ok=True)

# ────────────────────────────────────────────────────────────
# Database Helper Functions
# ────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────
# Helper Functions
# ────────────────────────────────────────────────────────────

def load_database():
    """Load all face embeddings from .npy files
    Each user can have multiple embeddings (as a 2D array)
    Returns: {user_id: embeddings_array} where embeddings_array is (N, 512)
    """
    database = {}
    if os.path.exists(FACE_DB_PATH) and os.listdir(FACE_DB_PATH):
        npy_files = [f for f in os.listdir(FACE_DB_PATH) if f.endswith('.npy')]
        print(f"\n📂 Found {len(npy_files)} .npy file(s) in {FACE_DB_PATH}")
        
        for file in npy_files:
            user_id = int(file[:-4])
            file_path = os.path.join(FACE_DB_PATH, file)
            embeddings = np.load(file_path)  # Load the embedding
            
            print(f"\n📦 User {user_id}:")
            print(f"   File: {file}")
            print(f"   Loaded shape: {embeddings.shape}")
            print(f"   Loaded dtype: {embeddings.dtype}")
            
            # Ensure 2D array (handle single embedding files)
            if embeddings.ndim == 1:
                embeddings = embeddings.reshape(1, -1)
                print(f"   Reshaped to: {embeddings.shape}")
            
            # Check values
            print(f"   Min/Max: {np.min(embeddings):.6f} / {np.max(embeddings):.6f}")
            print(f"   Norm before normalization: {np.linalg.norm(embeddings[0]):.6f}")
            
            # Normalize all embeddings (row-wise normalization)
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            embeddings = embeddings / norms
            
            print(f"   Norm after normalization: {np.linalg.norm(embeddings[0]):.6f}")
            print(f"   First 5 values: {embeddings[0][:5]}")
            
            database[user_id] = embeddings
        
        total = sum(emb.shape[0] for emb in database.values())
        print(f"\n✅ Loaded {len(database)} users with {total} total embeddings")
    else:
        print(f"ℹ️  No .npy files found in {FACE_DB_PATH}")
    
    return database

def cosine_similarity(a, b):
    """Calculate cosine similarity"""
    return np.dot(a, b)

def get_largest_face(faces):
    """
    Get the face with the largest bounding box area
    Returns: face object or None if no faces
    """
    if not faces:
        return None
    
    largest_face = None
    largest_area = 0
    
    for face in faces:
        x1, y1, x2, y2 = map(int, face.bbox)
        area = (x2 - x1) * (y2 - y1)
        if area > largest_area:
            largest_area = area
            largest_face = face
    
    return largest_face

def check_embedding_exists_in_db(embedding, database, threshold=0.6):
    """
    Check if an embedding already exists in database by comparing with all stored embeddings
    Each user can have multiple embeddings
    Returns: (user_id, similarity_score) or (None, 0.0) if not found
    """
    if not database:
        return None, 0.0
    
    embedding_normalized = embedding / np.linalg.norm(embedding)
    best_score = 0
    best_match = None
    
    for user_id, embeddings in database.items():
        # embeddings is (N, 512) - check against all embeddings for this user
        for db_emb in embeddings:
            score = cosine_similarity(embedding_normalized, db_emb)
            if score > best_score:
                best_score = score
                best_match = user_id
    
    # If best match is above threshold, it's a duplicate
    if best_score >= threshold:
        return best_match, best_score
    
    return None, best_score

def save_face(user_id, embedding):
    """Save face embedding - appends to existing embeddings for the user"""
    embedding_normalized = embedding / np.linalg.norm(embedding)
    save_path = os.path.join(FACE_DB_PATH, f"{user_id}.npy")
    
    # Check if file exists
    if os.path.exists(save_path):
        # Load existing embeddings and append new one
        existing = np.load(save_path)
        # Handle old single-embedding format
        if existing.ndim == 1:
            existing = existing.reshape(1, -1)
        embeddings = np.vstack([existing, embedding_normalized.reshape(1, -1)])
        print(f"✅ Added face #{embeddings.shape[0]} for user {user_id}")
    else:
        # Create new file with first embedding
        embeddings = embedding_normalized.reshape(1, -1)
        print(f"✅ Created new enrollment for user {user_id}")
    
    np.save(save_path, embeddings)

# ────────────────────────────────────────────────────────────
# Mode 1: Enrollment
# ────────────────────────────────────────────────────────────

def enroll_mode():
    """Enroll a new face"""
    print("\n" + "="*60)
    print("📝 ENROLLMENT MODE")
    print("="*60)
    
    while True:
        try:
            user_id_input = input("\nEnter user ID (must be a number, or press 'q' to quit): ").strip()
            
            if user_id_input.lower() == 'q':
                print("Cancelled.")
                return
            
            if not user_id_input or not user_id_input.isdigit():
                print("❌ Invalid! Please enter a number.")
                continue
            
            user_id = int(user_id_input)
            break
        except KeyboardInterrupt:
            print("\nCancelled.")
            return
        except Exception as e:
            print(f"❌ Error reading input: {e}")
            continue
    
    # Check if already exists
    embedding_path = os.path.join(FACE_DB_PATH, f"{user_id}.npy")
    if os.path.exists(embedding_path):
        print(f"⚠️  User {user_id} is already enrolled")
        choice = input("Do you want to re-enroll? (y/n): ").strip().lower()
        if choice != 'y':
            print("Cancelled - No changes made.")
            return
        print("Proceeding with re-enrollment...")
    
    try:
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("❌ Cannot open camera")
            return
    except Exception as e:
        print(f"❌ Camera error: {e}")
        return
    
    print(f"\n📸 Camera opened. Instructions:")
    print("  - Position your face in the frame")
    print("  - Press 's' to save/enroll")
    print("  - Press 'q' to quit")
    print()
    
    saved = False
    database = load_database()
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("❌ Failed to read frame")
                break
            
            # Detect faces
            faces = arcface.get(frame)
            
            # Get the largest face
            largest_face = get_largest_face(faces)
            
            # Draw ALL faces
            for face in faces:
                x1, y1, x2, y2 = map(int, face.bbox)
                
                # Highlight largest face in green, others in gray
                if face is largest_face:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                    cv2.putText(frame, "MAIN FACE - Press 's' to save", (x1, y1-10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                else:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (100, 100, 100), 1)
                    cv2.putText(frame, "Secondary", (x1, y1-5),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 100, 100), 1)
            
            # Display info
            cv2.putText(frame, f"Faces detected: {len(faces)} | Press 'q' to cancel", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            
            # Display
            cv2.imshow(f"Enrollment - User {user_id}", frame)
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                break
            elif key == ord('s') and largest_face is not None:
                embedding = largest_face.embedding
                
                # Check if this face already exists in database by comparing embeddings
                existing_user_id, similarity = check_embedding_exists_in_db(embedding, database, THRESHOLD)
                
                if existing_user_id is not None:
                    print(f"\n⚠️  This face is ALREADY ENROLLED as User {existing_user_id}")
                    print(f"    Similarity: {similarity:.3f}")
                    proceed = input(f"Do you still want to enroll as User {user_id}? (y/n): ").strip().lower()
                    if proceed != 'y':
                        print("Cancelled - No changes made.")
                        break
                
                save_face(user_id, embedding)
                saved = True
                break
    except Exception as e:
        print(f"❌ Error during enrollment: {e}")
    finally:
        cap.release()
        cv2.destroyAllWindows()
    
    if not saved:
        print("❌ No face saved")

# ────────────────────────────────────────────────────────────
# Mode 2: Recognition
# ────────────────────────────────────────────────────────────

def recognize_mode():
    """Recognize faces in real-time"""
    print("\n" + "="*60)
    print("🔍 RECOGNITION MODE")
    print("="*60)
    
    database = load_database()
    if not database:
        print("❌ No faces in database. Enroll faces first.")
        return
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open camera")
        return
    
    print("\n📸 Camera opened. Instructions:")
    print("  - Show your face to the camera")
    print("  - Largest face will be used for matching")
    print("  - All faces are displayed, primary marked with thick border")
    print("  - Press 'q' to quit")
    print()
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Failed to read frame")
            break
        
        # Detect faces
        faces = arcface.get(frame)
        
        # Get the largest face
        largest_face = get_largest_face(faces)
        
        # Process each face (display all)
        for face in faces:
            x1, y1, x2, y2 = map(int, face.bbox)
            embedding = face.embedding
            embedding_norm = np.linalg.norm(embedding)
            embedding = embedding / embedding_norm
            
            # Find best match across all embeddings for all users
            best_score = 0
            best_match = None
            
            if DEBUG_MODE:
                print(f"\n🔍 DEBUG - Analyzing face:")
                print(f"   Camera embedding shape: {embedding.shape}")
                print(f"   Camera embedding norm (before norm): {embedding_norm:.6f}")
                print(f"   Camera embedding norm (after norm): {np.linalg.norm(embedding):.6f}")
                print(f"   Camera embedding first 5: {embedding[:5]}")
                print(f"   Database has {len(database)} users")
            
            for user_id_db, db_embeddings in database.items():
                # db_embeddings is (N, 512) - check against all embeddings for this user
                for idx, db_emb in enumerate(db_embeddings):
                    # Verify the db embedding is normalized
                    db_norm = np.linalg.norm(db_emb)
                    if db_norm < 0.99 or db_norm > 1.01:
                        print(f"   ⚠️  User {user_id_db} embedding #{idx} has norm {db_norm:.6f} (expected ~1.0)")
                    
                    score = cosine_similarity(embedding, db_emb)
                    
                    if DEBUG_MODE:
                        print(f"   User {user_id_db} embedding #{idx}: score = {score:.6f} (norm={db_norm:.6f})")
                    
                    if score > best_score:
                        best_score = score
                        best_match = user_id_db
            
            if DEBUG_MODE:
                print(f"   ➡️  Best match: User {best_match} with score {best_score:.6f}")
                print(f"   Threshold: {THRESHOLD}")
                print()
            
            # Determine if authorized
            if best_score >= THRESHOLD:
                label = f"✅ User {best_match} ({best_score:.3f})"
                color = (0, 255, 0)  # Green
            else:
                label = f"❌ Unknown ({best_score:.3f})"
                color = (0, 0, 255)  # Red
            
            # Highlight largest face with thicker box
            if face is largest_face:
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
                cv2.putText(frame, f"{label} [PRIMARY]", (x1, y1-25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
            else:
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)
                cv2.putText(frame, label, (x1, y1-10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 1)
        
        # Display info
        cv2.putText(frame, f"Detected: {len(faces)} faces | Enrolled: {len(database)} users | Threshold: {THRESHOLD}",
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        if largest_face is not None:
            x1, y1, x2, y2 = map(int, largest_face.bbox)
            area = (x2 - x1) * (y2 - y1)
            cv2.putText(frame, f"Primary face area: {area}px", (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)
        
        cv2.imshow("Recognition", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

# ────────────────────────────────────────────────────────────
# Mode 3: Combined Enroll + Recognize
# ────────────────────────────────────────────────────────────

def combined_mode():
    """Enroll and recognize in one session"""
    print("\n" + "="*60)
    print("📝 + 🔍 COMBINED MODE (Enroll + Recognize)")
    print("="*60)
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open camera")
        return
    
    database = load_database()
    enrollment_user = None
    enrollment_ready = False
    
    print("\n📸 Camera opened. Instructions:")
    print("  - Press 'e' to start enrollment (enter user ID when prompted)")
    print("  - Press 's' to save the enrollment")
    print("  - Normal mode: Shows recognition results")
    print("  - Press 'q' to quit")
    print()
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        faces = arcface.get(frame)
        
        # Get the largest face
        largest_face = get_largest_face(faces)
        
        status_text = "Recognition Mode"
        if enrollment_user is not None:
            status_text = f"Enrollment Mode - User {enrollment_user}"
        
        # Display all faces
        for face in faces:
            x1, y1, x2, y2 = map(int, face.bbox)
            embedding = face.embedding
            embedding = embedding / np.linalg.norm(embedding)
            
            # Highlight largest face
            is_largest = (face is largest_face)
            
            if enrollment_user is not None:
                # Enrollment mode
                if is_largest:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 165, 0), 3)
                    cv2.putText(frame, "MAIN - Press 's' to save", (x1, y1-10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 165, 0), 2)
                    enrollment_ready = True
                else:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (100, 100, 100), 1)
                    cv2.putText(frame, "Secondary", (x1, y1-5),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 100, 100), 1)
            else:
                # Recognition mode - check all embeddings for each user
                best_score = 0
                best_match = None
                for user_id, db_embeddings in database.items():
                    # db_embeddings is (N, 512) - check against all embeddings for this user
                    for db_emb in db_embeddings:
                        score = cosine_similarity(embedding, db_emb)
                        if score > best_score:
                            best_score = score
                            best_match = user_id
                
                if best_score >= THRESHOLD:
                    label = f"✅ User {best_match} ({best_score:.3f})"
                    color = (0, 255, 0)
                else:
                    label = f"❌ Unknown ({best_score:.3f})"
                    color = (0, 0, 255)
                
                # Highlight largest face with thicker box
                if is_largest:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
                    cv2.putText(frame, f"{label} [PRIMARY]", (x1, y1-25),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
                else:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)
                    cv2.putText(frame, label, (x1, y1-10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 1)
        
        cv2.putText(frame, status_text, (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        cv2.putText(frame, f"Detected: {len(faces)} | Enrolled: {len(database)} | Using largest face",
                   (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        cv2.imshow("Enroll + Recognize", frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('q'):
            break
        elif key == ord('e'):
            if enrollment_user is None:
                try:
                    user_id = input("\nEnter user ID to enroll (number): ").strip()
                    if user_id.isdigit():
                        enrollment_user = int(user_id)
                        enrollment_ready = False
                        print(f"✅ Enrollment mode started for user {enrollment_user}")
                    else:
                        print("❌ Invalid user ID. Please enter a number.")
                except KeyboardInterrupt:
                    print("\nCancelled.")
                except Exception as e:
                    print(f"❌ Error: {e}")
        elif key == ord('s') and enrollment_user is not None and len(faces) > 0:
            # Use largest face only
            largest_face = get_largest_face(faces)
            if largest_face is not None:
                embedding = largest_face.embedding
                
                # Check if this face already exists in database by comparing embeddings
                existing_user_id, similarity = check_embedding_exists_in_db(embedding, database, THRESHOLD)
                
                if existing_user_id is not None:
                    print(f"\n⚠️  This face is ALREADY ENROLLED as User {existing_user_id}")
                    print(f"    Similarity: {similarity:.3f}")
                    proceed = input(f"Do you still want to enroll as User {enrollment_user}? (y/n): ").strip().lower()
                    if proceed != 'y':
                        print("Cancelled - No changes made.")
                        enrollment_user = None
                        enrollment_ready = False
                        continue
                
                save_face(enrollment_user, embedding)
                # Reload the embeddings for this user from file
                embeddings_path = os.path.join(FACE_DB_PATH, f"{enrollment_user}.npy")
                database[enrollment_user] = np.load(embeddings_path)
                print(f"✅ Face for User {enrollment_user} enrolled successfully")
            
            enrollment_user = None
            enrollment_ready = False
            print("✅ Switched back to recognition mode")
    
    cap.release()
    cv2.destroyAllWindows()

# ────────────────────────────────────────────────────────────
# Main Menu
# ────────────────────────────────────────────────────────────

def main():
    while True:
        try:
            print("\n" + "="*60)
            print("🎬 FACE RECOGNITION TEST - Camera Testing")
            print("="*60)
            
            # Show database status
            db_count = len(os.listdir(FACE_DB_PATH)) if os.path.exists(FACE_DB_PATH) else 0
            db_count = len([f for f in os.listdir(FACE_DB_PATH) if f.endswith('.npy')]) if os.path.exists(FACE_DB_PATH) else 0
            print(f"📊 Currently enrolled: {db_count} users\n")
            
            print("1. 📝 Enrollment - Enroll a new face")
            print("2. 🔍 Recognition - Recognize faces in real-time")
            print("3. 📝+🔍 Combined - Enroll while recognizing")
            print("4. 📊 Show database")
            print("5. 🗑️  Delete face from database")
            print("6. ❌ Exit")
            print("="*60)
            
            choice = input("Choose mode (1-6): ").strip()
            
            if choice == '1':
                enroll_mode()
            elif choice == '2':
                recognize_mode()
            elif choice == '3':
                combined_mode()
            elif choice == '4':
                database = load_database()
                if database:
                    print("\n📊 Database:")
                    for user_id in sorted(database.keys()):
                        print(f"  - User {user_id}")
                else:
                    print("Database is empty")
            elif choice == '5':
                try:
                    user_id = input("Enter user ID to delete: ").strip()
                    if user_id.isdigit():
                        filepath = os.path.join(FACE_DB_PATH, f"{user_id}.npy")
                        if os.path.exists(filepath):
                            os.remove(filepath)
                            print(f"✅ Deleted user {user_id}")
                        else:
                            print(f"❌ User {user_id} not found")
                    else:
                        print("❌ Invalid user ID")
                except KeyboardInterrupt:
                    print("\nCancelled.")
                except Exception as e:
                    print(f"❌ Error: {e}")
            elif choice == '6':
                print("👋 Goodbye!")
                break
            else:
                print("❌ Invalid choice. Please enter 1-6.")
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Menu error: {e}")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
