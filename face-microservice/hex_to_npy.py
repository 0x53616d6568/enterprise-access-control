"""
Convert Hex Embedding Code to .npy File
Converts hex-encoded face embeddings from database to numpy .npy files

Usage:
  Interactive: python hex_to_npy.py
  Command line: python hex_to_npy.py <user_id> <hex_code>
  
Example:
  python hex_to_npy.py 1 "a1b2c3d4e5f6..."
"""

import sys
import os
import numpy as np
from pathlib import Path

FACE_DB_PATH = './face_database'

def hex_to_npy(user_id, hex_code, output_path=None):
    """
    Convert hex string to .npy file
    
    Args:
        user_id: User ID for the embedding
        hex_code: Hex string from database
        output_path: Optional custom output path
    
    Returns:
        Path to saved file or None if failed
    """
    try:
        # Create face_database folder if it doesn't exist
        os.makedirs(FACE_DB_PATH, exist_ok=True)
        
        print(f"\n📦 Converting hex code for user {user_id}...")
        print(f"Hex code length: {len(hex_code)} characters")
        
        # Convert hex string to bytes
        # Remove any spaces or common hex prefixes
        hex_clean = hex_code.strip().replace(' ', '').replace('0x', '')
        
        try:
            embedding_bytes = bytes.fromhex(hex_clean)
        except ValueError as e:
            print(f"❌ Invalid hex code: {e}")
            return None
        
        print(f"✅ Hex decoded to {len(embedding_bytes)} bytes")
        
        # Convert bytes to float32 array (512-dimensional for ArcFace)
        embedding_array = np.frombuffer(embedding_bytes, dtype=np.float32)
        print(f"✅ Converted to numpy array: shape {embedding_array.shape}")
        
        # Debug: Show sample values before normalization
        print(f"\n🔍 Debug Info:")
        print(f"   First 5 values: {embedding_array[:5]}")
        print(f"   Last 5 values: {embedding_array[-5:]}")
        print(f"   Min value: {np.min(embedding_array):.6f}")
        print(f"   Max value: {np.max(embedding_array):.6f}")
        print(f"   Mean value: {np.mean(embedding_array):.6f}")
        
        # Normalize the embedding
        norm = np.linalg.norm(embedding_array)
        print(f"   Norm (before normalization): {norm:.6f}\n")
        
        if norm > 0:
            embedding_array = embedding_array / norm
            print(f"✅ Normalized embedding")
            print(f"   First 5 values after norm: {embedding_array[:5]}")
            print(f"   Norm (after normalization): {np.linalg.norm(embedding_array):.6f}")
        else:
            print(f"⚠️  Warning: Norm is 0, embedding might be invalid!")
        
        # Determine output file path
        if output_path is None:
            output_path = os.path.join(FACE_DB_PATH, f'{user_id}.npy')
        
        # Save as .npy file
        np.save(output_path, embedding_array)
        
        file_size = os.path.getsize(output_path)
        print(f"✅ Saved to: {os.path.abspath(output_path)}")
        print(f"   File size: {file_size} bytes")
        print(f"   Array shape: {embedding_array.shape}")
        print(f"   Data type: {embedding_array.dtype}")
        
        return output_path
        
    except Exception as e:
        print(f"❌ Error converting hex to .npy: {e}")
        return None

def interactive_mode():
    """Interactive mode for converting hex embeddings"""
    print("\n" + "="*60)
    print("🔄 Hex to NPY Converter - Interactive Mode")
    print("="*60 + "\n")
    
    while True:
        print("\nOptions:")
        print("  1. Convert hex code to .npy")
        print("  2. List existing .npy files")
        print("  3. Exit")
        
        choice = input("\nSelect option (1-3): ").strip()
        
        if choice == '1':
            user_id = input("Enter user ID: ").strip()
            if not user_id.isdigit():
                print("❌ User ID must be a number")
                continue
            
            print("\nEnter hex code (paste the hex from database):")
            print("You can include spaces or 0x prefix - they'll be removed")
            hex_code = input("> ").strip()
            
            if not hex_code:
                print("❌ Hex code cannot be empty")
                continue
            
            result = hex_to_npy(int(user_id), hex_code)
            if result:
                print(f"\n✅ Success! File created: {result}")
            else:
                print("❌ Conversion failed")
        
        elif choice == '2':
            list_npy_files()
        
        elif choice == '3':
            print("\n👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid option")

def list_npy_files():
    """List all .npy files in face_database"""
    print(f"\n📋 NPY Files in {FACE_DB_PATH}:")
    print("-" * 50)
    
    if not os.path.exists(FACE_DB_PATH):
        print("⚠️  Folder doesn't exist")
        return
    
    files = sorted([f for f in os.listdir(FACE_DB_PATH) if f.endswith('.npy')])
    
    if not files:
        print("No .npy files found")
    else:
        for file in files:
            file_path = os.path.join(FACE_DB_PATH, file)
            try:
                array = np.load(file_path)
                size = os.path.getsize(file_path)
                print(f"  {file:10} | Shape: {array.shape} | Size: {size:6} bytes")
            except Exception as e:
                print(f"  {file:10} | Error: {e}")

def command_line_mode(args):
    """Command line mode"""
    if len(args) < 3:
        print("Usage: python hex_to_npy.py <user_id> <hex_code>")
        print("Example: python hex_to_npy.py 1 \"a1b2c3d4e5f6...\"")
        return False
    
    user_id = args[1]
    hex_code = args[2]
    
    if not user_id.isdigit():
        print("❌ User ID must be a number")
        return False
    
    result = hex_to_npy(int(user_id), hex_code)
    return result is not None

if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Command line mode
        print("="*60)
        print("🔄 Hex to NPY Converter")
        print("="*60)
        success = command_line_mode(sys.argv)
        sys.exit(0 if success else 1)
    else:
        # Interactive mode
        interactive_mode()
