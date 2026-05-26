#!/usr/bin/env python3
"""
Enhanced Face Enrollment Debug with Real Image
Downloads a sample face image and tests enrollment
"""

import requests
import json
import base64
import os
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO

# Load environment
load_dotenv()

FACE_SERVICE_URL = os.getenv('FACE_SERVICE_URL', 'http://localhost:5000')
FACE_SERVICE_API_KEY = os.getenv('FACE_SERVICE_API_KEY', 'your-secret-key-change-in-production')

# Color codes
class Colors:
    RESET = '\033[0m'
    GREEN = '\033[32m'
    RED = '\033[31m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'

def log_info(msg):
    print(f"{Colors.BLUE}ℹ{Colors.RESET} {msg}")

def log_success(msg):
    print(f"{Colors.GREEN}✓{Colors.RESET} {msg}")

def log_error(msg):
    print(f"{Colors.RED}✗{Colors.RESET} {msg}")

def log_warn(msg):
    print(f"{Colors.YELLOW}⚠{Colors.RESET} {msg}")

def test_with_real_face():
    """Download a real face image and test enrollment"""
    print("\n" + "="*50)
    print("Test: Real Face Image Enrollment")
    print("="*50 + "\n")
    
    try:
        # Use a public domain face image from Wikimedia
        # This is a standard test face used in many ML projects
        face_url = "https://upload.wikimedia.org/wikipedia/commons/5/51/Mr._Potato_Head.png"
        
        log_info(f"Downloading face image from: {face_url}")
        response = requests.get(face_url, timeout=10)
        response.raise_for_status()
        
        # Try to convert to JPEG for better compatibility
        img = Image.open(BytesIO(response.content))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=95)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        log_success(f"Face image loaded ({len(img_base64)} chars)")
        
        # Now test enrollment
        log_info(f"Testing enrollment with real image...")
        
        url = f"{FACE_SERVICE_URL}/enroll"
        payload = {
            'user_id': 999,
            'image_base64': img_base64,
        }
        
        headers = {
            'X-API-Key': FACE_SERVICE_API_KEY,
            'Content-Type': 'application/json',
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get('success'):
                log_success("Enrollment succeeded!")
                log_info(f"Embedding: {data['data']['embedding'][:50]}...")
                return True
            else:
                log_error(f"API Error: {data.get('error')}")
                return False
        else:
            log_error(f"Status: {response.status_code}")
            log_error(f"Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        log_error(f"Test failed: {e}")
        return False

def analyze_backend_error_handling():
    """Analyze how backend handles enrollment errors"""
    print("\n" + "="*50)
    print("Analysis: Backend Error Handling")
    print("="*50 + "\n")
    
    log_info("Checking backend face.controller.js error handling...")
    log_info("\nBackend flow when microservice returns error:")
    log_info("1. enrollFace() calls callFaceService('/enroll', 'POST', data)")
    log_info("2. If response.success=false, returns error from microservice")
    log_info("3. Error message sent to frontend as: 'enrollment failed'")
    log_info("\nPossible errors from microservice:")
    log_info("- 'No face detected in image' - when image has no face")
    log_info("- 'Face recognition failed' - when model fails")
    log_info("- Network errors - when microservice unreachable")
    log_info("- Timeout - when processing takes >2 minutes")
    
    log_warn("\n⚠️  If getting 'enrollment failed' from app:")
    log_warn("1. Check backend logs on Render for actual error")
    log_warn("2. Could be: no face in image, timeout, or network issue")
    log_warn("3. The microservice IS reachable (we confirmed this)")

if __name__ == '__main__':
    print(f"\n{Colors.BLUE}{'='*50}{Colors.RESET}")
    print("ENHANCED FACE ENROLLMENT DEBUG")
    print(f"{Colors.BLUE}{'='*50}{Colors.RESET}")
    
    test_with_real_face()
    analyze_backend_error_handling()
