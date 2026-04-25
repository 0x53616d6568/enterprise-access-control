"""
Debug NPY Files - Inspect what's actually stored in your embeddings

Usage:
  python debug_npy.py
"""

import os
import numpy as np

FACE_DB_PATH = './face_database'

def inspect_npy_files():
    """Inspect all .npy files"""
    print("\n" + "="*70)
    print("🔍 NPY File Inspector")
    print("="*70 + "\n")
    
    if not os.path.exists(FACE_DB_PATH):
        print(f"❌ Folder {FACE_DB_PATH} not found")
        return
    
    files = sorted([f for f in os.listdir(FACE_DB_PATH) if f.endswith('.npy')])
    
    if not files:
        print(f"❌ No .npy files found in {FACE_DB_PATH}")
        return
    
    print(f"📋 Found {len(files)} .npy file(s)\n")
    
    for file in files:
        file_path = os.path.join(FACE_DB_PATH, file)
        print(f"{'='*70}")
        print(f"📄 File: {file}")
        print(f"{'='*70}")
        
        try:
            # Load the array
            array = np.load(file_path)
            file_size = os.path.getsize(file_path)
            
            # Basic info
            print(f"Shape: {array.shape}")
            print(f"Dtype: {array.dtype}")
            print(f"File size: {file_size} bytes")
            
            # Statistics
            print(f"\nStatistics:")
            print(f"  Min: {np.min(array):.8f}")
            print(f"  Max: {np.max(array):.8f}")
            print(f"  Mean: {np.mean(array):.8f}")
            print(f"  Std: {np.std(array):.8f}")
            print(f"  Norm: {np.linalg.norm(array):.8f}")
            
            # Check if all zeros
            if np.allclose(array, 0):
                print(f"\n⚠️  WARNING: Array is all zeros! ❌")
            elif np.max(np.abs(array)) < 0.001:
                print(f"\n⚠️  WARNING: All values are very small (< 0.001) ⚠️")
            else:
                print(f"\n✅ Array looks valid")
            
            # Show sample values
            print(f"\nSample values:")
            print(f"  First 5: {array[:5]}")
            print(f"  Last 5: {array[-5:]}")
            print(f"  Random 5: {array[np.random.choice(len(array), 5, replace=False)]}")
            
        except Exception as e:
            print(f"❌ Error loading: {e}")
        
        print()

if __name__ == '__main__':
    inspect_npy_files()
