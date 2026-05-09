#!/usr/bin/env python3
"""
Test Script: Door Access Integration Testing
Scenario 1 & 2 - Test embedding and camera flows

Usage:
    python test_door_access_integration.py --scenario 1 [--door-id 1] [--user-id 1]
    python test_door_access_integration.py --scenario 2 --camera [--door-id 1]
"""

import requests
import json
import base64
import argparse
import time
from pathlib import Path
import numpy as np

# Configuration
BACKEND_API = "https://enterprise-access-control.onrender.com/api"
BACKEND_API_KEY = "your-esp-api-key-here"  # Set this to your Pi API key
HF_SPACE_URL = "https://Soapppp11-enterprise-access-control-face.hf.space"

class DoorAccessTester:
    def __init__(self, backend_url=BACKEND_API, api_key=BACKEND_API_KEY):
        self.backend_url = backend_url
        self.api_key = api_key
        self.session = requests.Session()
        
    def print_header(self, title):
        """Print formatted header"""
        print("\n" + "="*60)
        print(f"  {title}")
        print("="*60)
        
    def print_section(self, title):
        """Print section header"""
        print(f"\n{'─'*60}")
        print(f"  {title}")
        print(f"{'─'*60}")
        
    # ========================================
    # SCENARIO 1: Test Embedding (No Camera)
    # ========================================
    
    def generate_test_embedding(self):
        """
        Generate a test embedding (512-dim float vector)
        In production, this would be loaded from enrolled user
        """
        print("  🧪 Generating test embedding...")
        
        # Create a simple normalized random embedding
        embedding = np.random.randn(512).astype(np.float32)
        
        # Normalize
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        # Convert to bytes and base64
        embedding_bytes = embedding.tobytes()
        embedding_base64 = base64.b64encode(embedding_bytes).decode('utf-8')
        
        print(f"  ✅ Generated embedding: {len(embedding_base64)} bytes (base64)")
        return embedding_base64
    
    def test_scenario_1(self, door_id=1, user_id=1):
        """
        Scenario 1: esp_test_embedding
        
        Flow:
        1. Generate test embedding
        2. Send to backend door-access-request endpoint
        3. Backend verifies against enrolled faces
        4. Backend sends MQTT unlock if authorized
        """
        self.print_header("🧪 SCENARIO 1: esp_test_embedding (No Camera)")
        
        try:
            # Step 1: Generate test embedding
            self.print_section("Step 1: Generate Test Embedding")
            test_embedding = self.generate_test_embedding()
            
            # Step 2: Send to backend
            self.print_section("Step 2: Send to Backend")
            
            payload = {
                "door_id": door_id,
                "user_id": user_id or 0,
                "face_data": {
                    "type": "embedding_test",
                    "embedding": test_embedding
                }
            }
            
            print(f"  📤 Sending POST request to: {self.backend_url}/pi/door-access-request")
            print(f"     Door ID: {door_id}")
            print(f"     User ID: {user_id or 'Unknown'}")
            print(f"     Payload size: {len(json.dumps(payload)) / 1024:.2f} KB")
            
            response = self.session.post(
                f"{self.backend_url}/pi/door-access-request",
                json=payload,
                headers={
                    "X-API-Key": self.api_key,
                    "Content-Type": "application/json"
                },
                timeout=30
            )
            
            print(f"  📥 Response Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                data = result.get('data', {})
                
                self.print_section("Step 3: Result")
                
                if data.get('granted'):
                    print("  ✅ ACCESS GRANTED!")
                    print(f"     User ID: {data.get('user_id')}")
                    print(f"     Similarity: {data.get('similarity'):.3f}")
                    print(f"     Door: {data.get('door_name')}")
                    print(f"     MQTT: {'Sent ✓' if data.get('mqtt_sent') else 'Failed'}")
                    return True
                else:
                    print("  ❌ ACCESS DENIED")
                    print(f"     Reason: {data.get('reason')}")
                    print(f"     Similarity: {data.get('similarity', 0):.3f}")
                    return False
            else:
                print(f"  ❌ Error: {response.status_code}")
                print(f"     {response.text}")
                return False
                
        except Exception as e:
            print(f"  ❌ Exception: {str(e)}")
            return False
    
    # ========================================
    # SCENARIO 2: Camera Image to HF Space
    # ========================================
    
    def load_image_as_base64(self, image_path):
        """Load image file and convert to base64"""
        print(f"  📸 Loading image: {image_path}")
        
        if not Path(image_path).exists():
            print(f"  ❌ Image file not found: {image_path}")
            return None
        
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        print(f"  ✅ Image loaded: {len(image_base64)} bytes (base64)")
        return image_base64
    
    def call_hf_space_recognize(self, image_base64):
        """Call HF Space /recognize endpoint"""
        print(f"  🔗 Calling HF Space recognize endpoint...")
        print(f"     URL: {HF_SPACE_URL}/recognize")
        
        try:
            response = requests.post(
                f"{HF_SPACE_URL}/recognize",
                json={"image_base64": image_base64},
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"  ✅ HF Space response received")
                print(f"     Success: {result.get('success')}")
                
                if result.get('success'):
                    data = result.get('data', {})
                    print(f"     User ID: {data.get('user_id')}")
                    print(f"     Similarity: {data.get('similarity', 0):.3f}")
                    print(f"     Authorized: {data.get('is_authorized')}")
                    return result
                else:
                    print(f"     Error: {result.get('error')}")
                    return None
            else:
                print(f"  ❌ HF Space error: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"  ❌ Exception: {str(e)}")
            return None
    
    def test_scenario_2(self, image_path, door_id=1):
        """
        Scenario 2: esp_camera_toHF
        
        Flow:
        1. Load camera image (or test image)
        2. Send to HF Space for recognition
        3. Get embedding from HF Space
        4. Send to backend for verification
        5. Backend sends MQTT unlock if authorized
        """
        self.print_header("📷 SCENARIO 2: esp_camera_toHF (With Camera)")
        
        try:
            # Step 1: Load image
            self.print_section("Step 1: Load Image")
            image_base64 = self.load_image_as_base64(image_path)
            
            if not image_base64:
                return False
            
            # Step 2: Send to HF Space
            self.print_section("Step 2: Send to HF Space for Recognition")
            hf_response = self.call_hf_space_recognize(image_base64)
            
            if not hf_response or not hf_response.get('success'):
                return False
            
            # Extract recognized user ID
            recognized_user_id = hf_response.get('data', {}).get('user_id')
            similarity = hf_response.get('data', {}).get('similarity', 0)
            
            print(f"  📊 Recognition Result:")
            print(f"     User ID: {recognized_user_id}")
            print(f"     Similarity: {similarity:.3f}")
            
            # Step 3: Send to backend
            self.print_section("Step 3: Send to Backend for Verification")
            
            payload = {
                "door_id": door_id,
                "user_id": recognized_user_id,
                "face_data": {
                    "type": "camera_image",
                    "image_base64": image_base64
                }
            }
            
            print(f"  📤 Sending POST request to: {self.backend_url}/pi/door-access-request")
            print(f"     Door ID: {door_id}")
            print(f"     User ID: {recognized_user_id}")
            
            response = self.session.post(
                f"{self.backend_url}/pi/door-access-request",
                json=payload,
                headers={
                    "X-API-Key": self.api_key,
                    "Content-Type": "application/json"
                },
                timeout=30
            )
            
            print(f"  📥 Response Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                data = result.get('data', {})
                
                self.print_section("Step 4: Final Result")
                
                if data.get('granted'):
                    print("  ✅ ACCESS GRANTED!")
                    print(f"     Door: {data.get('door_name')}")
                    print(f"     User ID: {data.get('user_id')}")
                    print(f"     MQTT: {'Sent ✓' if data.get('mqtt_sent') else 'Failed'}")
                    return True
                else:
                    print("  ❌ ACCESS DENIED")
                    print(f"     Reason: {data.get('reason')}")
                    return False
            else:
                print(f"  ❌ Error: {response.status_code}")
                print(f"     {response.text}")
                return False
                
        except Exception as e:
            print(f"  ❌ Exception: {str(e)}")
            return False

def main():
    parser = argparse.ArgumentParser(
        description="Test Door Access Integration (Scenario 1 & 2)"
    )
    parser.add_argument(
        '--scenario',
        type=int,
        choices=[1, 2],
        required=True,
        help="Test scenario to run: 1 = embedding, 2 = camera"
    )
    parser.add_argument(
        '--door-id',
        type=int,
        default=1,
        help="Door ID (default: 1)"
    )
    parser.add_argument(
        '--user-id',
        type=int,
        help="User ID for Scenario 1 (optional, will search if not provided)"
    )
    parser.add_argument(
        '--image',
        type=str,
        help="Path to test image for Scenario 2"
    )
    parser.add_argument(
        '--backend',
        type=str,
        default=BACKEND_API,
        help=f"Backend API URL (default: {BACKEND_API})"
    )
    parser.add_argument(
        '--api-key',
        type=str,
        default=BACKEND_API_KEY,
        help="Backend API key"
    )
    
    args = parser.parse_args()
    
    tester = DoorAccessTester(args.backend, args.api_key)
    
    if args.scenario == 1:
        success = tester.test_scenario_1(
            door_id=args.door_id,
            user_id=args.user_id
        )
    else:  # Scenario 2
        if not args.image:
            parser.error("Scenario 2 requires --image parameter")
        
        success = tester.test_scenario_2(
            image_path=args.image,
            door_id=args.door_id
        )
    
    # Print final summary
    print("\n" + "="*60)
    print(f"  Test Result: {'✅ PASSED' if success else '❌ FAILED'}")
    print("="*60 + "\n")
    
    return 0 if success else 1

if __name__ == '__main__':
    exit(main())
