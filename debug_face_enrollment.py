#!/usr/bin/env python3
"""
Face Enrollment Python Debug Script
Tests HF Space connectivity and face microservice endpoints
"""

import requests
import json
import base64
import sys
import os
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO
import numpy as np

# Load environment
load_dotenv()

# Configuration
FACE_SERVICE_URL = os.getenv('FACE_SERVICE_URL', 'http://localhost:5000')
FACE_SERVICE_API_KEY = os.getenv('FACE_SERVICE_API_KEY', 'your-secret-key-change-in-production')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:3000')

# Color codes
class Colors:
    RESET = '\033[0m'
    BRIGHT = '\033[1m'
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    CYAN = '\033[36m'

def log_info(msg):
    print(f"{Colors.BLUE}ℹ{Colors.RESET} {msg}")

def log_success(msg):
    print(f"{Colors.GREEN}✓{Colors.RESET} {msg}")

def log_error(msg):
    print(f"{Colors.RED}✗{Colors.RESET} {msg}")

def log_warn(msg):
    print(f"{Colors.YELLOW}⚠{Colors.RESET} {msg}")

def log_section(msg):
    print(f"\n{Colors.CYAN}{'='*50}{Colors.RESET}")
    print(f"{Colors.BRIGHT}{msg}{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*50}{Colors.RESET}\n")

def create_sample_image():
    """Create a 100x100 pixel test image"""
    log_section("Creating Sample Test Image")
    
    try:
        # Create a simple 100x100 RGB image (red)
        img = Image.new('RGB', (100, 100), color='red')
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        log_success(f"Sample image created ({len(img_base64)} chars)")
        return img_base64
    except Exception as e:
        log_error(f"Failed to create sample image: {e}")
        return None

def test_microservice_health():
    """Test 1: Check microservice health"""
    log_section("Test 1: Microservice Health Check")
    
    try:
        url = f"{FACE_SERVICE_URL}/health"
        log_info(f"Checking: {url}")
        
        response = requests.get(url, timeout=5)
        log_success(f"Health check passed (Status: {response.status_code})")
        log_info(f"Response: {json.dumps(response.json(), indent=2)}")
        return True
    except requests.exceptions.ConnectionError as e:
        log_error(f"Connection error: {e}")
        return False
    except Exception as e:
        log_error(f"Health check failed: {e}")
        return False

def test_microservice_enroll(base64_image):
    """Test 2: Test microservice enroll endpoint"""
    log_section("Test 2: Microservice Enroll Endpoint")
    
    try:
        url = f"{FACE_SERVICE_URL}/enroll"
        log_info(f"Calling: POST {url}")
        
        payload = {
            'user_id': 999,
            'image_base64': base64_image,
        }
        
        headers = {
            'X-API-Key': FACE_SERVICE_API_KEY,
            'Content-Type': 'application/json',
        }
        
        log_info(f"Payload size: {len(json.dumps(payload))} bytes")
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 201 or response.status_code == 200:
            log_success(f"Enroll succeeded (Status: {response.status_code})")
            data = response.json()
            if data.get('success'):
                log_info(f"Response: {json.dumps(data, indent=2)}")
                if 'data' in data and 'embedding' in data['data']:
                    log_info(f"Embedding received ({len(data['data']['embedding'])} chars)")
                return True
            else:
                log_error(f"Response success=false: {data.get('error')}")
                return False
        else:
            log_error(f"Status: {response.status_code}")
            try:
                log_error(f"Response: {json.dumps(response.json(), indent=2)}")
            except:
                log_error(f"Response: {response.text}")
            return False
    except requests.exceptions.ConnectionError as e:
        log_error(f"Connection error: {e}")
        return False
    except Exception as e:
        log_error(f"Enroll test failed: {e}")
        return False

def test_microservice_recognize(base64_image):
    """Test 3: Test microservice recognize endpoint"""
    log_section("Test 3: Microservice Recognize Endpoint")
    
    try:
        url = f"{FACE_SERVICE_URL}/recognize"
        log_info(f"Calling: POST {url}")
        
        payload = {
            'image_base64': base64_image,
        }
        
        headers = {
            'X-API-Key': FACE_SERVICE_API_KEY,
            'Content-Type': 'application/json',
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            log_success(f"Recognize succeeded (Status: {response.status_code})")
            data = response.json()
            if data.get('success'):
                log_info(f"Response: {json.dumps(data, indent=2)}")
                return True
            else:
                log_error(f"Response success=false: {data.get('error')}")
                return False
        else:
            log_error(f"Status: {response.status_code}")
            try:
                log_error(f"Response: {json.dumps(response.json(), indent=2)}")
            except:
                log_error(f"Response: {response.text}")
            return False
    except Exception as e:
        log_error(f"Recognize test failed: {e}")
        return False

def test_network_connectivity():
    """Test 4: Network connectivity checks"""
    log_section("Test 4: Network Connectivity")
    
    # Test general internet
    try:
        log_info("Testing general internet...")
        requests.get('https://www.google.com', timeout=5)
        log_success("✓ Internet connectivity OK")
    except:
        log_warn("Cannot reach google.com")
    
    # Test HF Space
    try:
        log_info(f"Testing HF Space ({FACE_SERVICE_URL})...")
        response = requests.head(FACE_SERVICE_URL, timeout=5)
        log_success(f"✓ HF Space is reachable ({response.status_code})")
    except requests.exceptions.ConnectionError:
        log_error("✗ HF Space connection refused")
    except Exception as e:
        log_warn(f"Connectivity test inconclusive: {e}")

def check_api_key():
    """Test 5: Check API key validity"""
    log_section("Test 5: API Key Validation")
    
    log_info(f"Configured API Key: {FACE_SERVICE_API_KEY[:10]}...")
    
    if FACE_SERVICE_API_KEY == 'your-secret-key-change-in-production':
        log_error("API Key is still default! Change FACE_SERVICE_API_KEY")
        return False
    
    if FACE_SERVICE_API_KEY == 'sk-face-xyz123':
        log_warn("API Key looks like placeholder (sk-face-xyz123)")
        log_info("This might be correct for test HF Space, but verify with HF Space settings")
    
    log_success("API Key is configured")
    return True

def main():
    log_section("FACE ENROLLMENT DEBUG - Python Tests")
    
    log_info(f"Face Service URL: {FACE_SERVICE_URL}")
    log_info(f"Face Service API Key: {FACE_SERVICE_API_KEY[:20]}...")
    log_info(f"Backend URL: {BACKEND_URL}")
    
    # Run tests
    test_network_connectivity()
    check_api_key()
    
    health_ok = test_microservice_health()
    
    if not health_ok:
        log_warn("\nMicroservice health check failed.")
        log_info("Troubleshooting steps:")
        log_info("1. Is FACE_SERVICE_URL correct?")
        log_info("2. Is the HF Space deployed and running?")
        log_info("3. Try visiting the URL in browser")
        return
    
    # Create sample image and test endpoints
    sample_image = create_sample_image()
    if sample_image:
        test_microservice_enroll(sample_image)
        test_microservice_recognize(sample_image)
    
    log_section("DEBUG COMPLETE")
    log_info("Check results above to identify the issue")

if __name__ == '__main__':
    main()
