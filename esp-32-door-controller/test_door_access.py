"""
ESP-32 Door Controller - PC Test Script
Simulate door access without ESP-32-CAM hardware

Upload images from your PC → Send to HuggingFace Spaces → Get access decision

Usage:
    python test_door_access.py image.jpg
    python test_door_access.py --camera          (use webcam)
    python test_door_access.py --test            (use test image)
"""

import requests
import json
import base64
import sys
import os
from pathlib import Path
from datetime import datetime

# Configuration (same as ESP-32)
FACE_SERVICE_URL = "https://Soapppp11-enterprise-access-control-face.hf.space"
FACE_SERVICE_API_KEY = ""  # Leave empty if not required
CONFIDENCE_THRESHOLD = 0.6

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.CYAN}{Colors.BOLD}{text.center(60)}{Colors.RESET}")
    print(f"{Colors.CYAN}{Colors.BOLD}{'='*60}{Colors.RESET}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.RESET}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.RESET}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ {text}{Colors.RESET}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.RESET}")

def test_api_connectivity():
    """Test if face recognition API is reachable"""
    print_info("Testing API connectivity...")
    
    try:
        # Try to reach the API health endpoint
        response = requests.get(
            f"{FACE_SERVICE_URL}/health",
            timeout=5,
            verify=False  # Ignore SSL warnings for testing
        )
        
        if response.status_code == 200:
            print_success(f"Connected to face service: {FACE_SERVICE_URL}")
            return True
        else:
            print_warning(f"API returned status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to {FACE_SERVICE_URL}")
        return False
    except Exception as e:
        print_error(f"Connection error: {str(e)}")
        return False

def send_image_to_api(image_path):
    """Send image file to face recognition API"""
    print_info(f"Sending image to face recognition API...")
    print(f"  Image: {image_path}")
    print(f"  File size: {os.path.getsize(image_path)} bytes")
    
    try:
        # Read image file
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        # Prepare headers
        headers = {
            'Content-Type': 'image/jpeg'
        }
        
        # Add API key if configured
        if FACE_SERVICE_API_KEY:
            headers['Authorization'] = f'Bearer {FACE_SERVICE_API_KEY}'
        
        # Send to API
        print_info("Sending request...")
        response = requests.post(
            f"{FACE_SERVICE_URL}/predict",
            data=image_data,
            headers=headers,
            timeout=30,
            verify=False
        )
        
        print(f"  Response status: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"API returned status {response.status_code}")
            print(f"  Response: {response.text}")
            return None
        
        # Parse JSON response
        try:
            result = response.json()
            return result
        except json.JSONDecodeError:
            print_error("Could not parse API response as JSON")
            print(f"  Raw response: {response.text}")
            return None
            
    except FileNotFoundError:
        print_error(f"Image file not found: {image_path}")
        return None
    except requests.exceptions.Timeout:
        print_error("Request timeout (API took too long)")
        return None
    except Exception as e:
        print_error(f"Error sending image: {str(e)}")
        return None

def process_response(response):
    """Process face recognition API response"""
    print_info("Processing response...")
    
    if response is None:
        return False
    
    # Extract fields
    success = response.get('success', False)
    face_detected = response.get('face_detected', False)
    confidence = response.get('confidence', 0.0)
    user_id = response.get('user_id', 'unknown')
    message = response.get('message', 'No message')
    
    print(f"\n{Colors.BOLD}API Response:{Colors.RESET}")
    print(f"  Success: {success}")
    print(f"  Face Detected: {face_detected}")
    print(f"  Confidence: {confidence:.2%}")
    print(f"  User ID: {user_id}")
    print(f"  Message: {message}")
    
    return success, face_detected, confidence, user_id

def make_access_decision(success, face_detected, confidence):
    """Determine if access should be granted"""
    print(f"\n{Colors.BOLD}Access Control Decision:{Colors.RESET}")
    print(f"  Threshold: {CONFIDENCE_THRESHOLD:.2%}")
    
    if not success:
        print_error("API call failed - Access DENIED")
        return False
    
    if not face_detected:
        print_error("No face detected - Access DENIED")
        return False
    
    if confidence >= CONFIDENCE_THRESHOLD:
        print_success(f"Confidence {confidence:.2%} >= threshold {CONFIDENCE_THRESHOLD:.2%}")
        return True
    else:
        print_error(f"Confidence {confidence:.2%} < threshold {CONFIDENCE_THRESHOLD:.2%} - Access DENIED")
        return False

def simulate_door_unlock(access_granted):
    """Simulate door unlock sequence"""
    print(f"\n{Colors.BOLD}Door Control:{Colors.RESET}")
    
    if access_granted:
        print_success("Access GRANTED - Unlocking door")
        print(f"  GPIO 12 output: LOW")
        print(f"  Relay state: ENERGIZED")
        print(f"  Door solenoid: ACTIVE")
        print(f"  Unlock duration: 3000ms")
        
        # Simulate unlock sequence
        for i in range(1, 4):
            print(f"    [{i}/3 seconds]")
        
        print_success("Door unlocked for 3 seconds")
        print(f"  GPIO 12 output: HIGH")
        print(f"  Relay state: DE-ENERGIZED")
        print(f"  Door solenoid: INACTIVE")
        print_success("Door re-locked")
        
        return True
    else:
        print_error("Access DENIED - Door remains LOCKED")
        print(f"  GPIO 12 output: HIGH")
        print(f"  Relay state: DE-ENERGIZED")
        print(f"  Door solenoid: INACTIVE")
        return False

def log_access_attempt(image_path, success, confidence, user_id):
    """Log access attempt to file"""
    log_file = "door_access_log.txt"
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] Image: {os.path.basename(image_path)} | Success: {success} | Confidence: {confidence:.2%} | User: {user_id}\n"
    
    with open(log_file, 'a') as f:
        f.write(log_entry)
    
    print_info(f"Logged to {log_file}")

def test_with_webcam():
    """Capture image from webcam and test"""
    try:
        import cv2
    except ImportError:
        print_error("OpenCV not installed. Install with: pip install opencv-python")
        return False
    
    print_info("Initializing webcam...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print_error("Could not open webcam")
        return False
    
    print_success("Webcam opened")
    print_info("Press SPACE to capture, ESC to cancel")
    
    while True:
        ret, frame = cap.read()
        
        if not ret:
            print_error("Failed to read frame")
            break
        
        cv2.imshow('Press SPACE to capture, ESC to cancel', frame)
        key = cv2.waitKey(1)
        
        if key == 32:  # SPACE
            # Save captured frame
            image_path = "webcam_capture.jpg"
            cv2.imwrite(image_path, frame)
            cap.release()
            cv2.destroyAllWindows()
            print_success(f"Image captured: {image_path}")
            return image_path
        elif key == 27:  # ESC
            cap.release()
            cv2.destroyAllWindows()
            return None
    
    cap.release()
    cv2.destroyAllWindows()
    return None

def test_with_sample_image():
    """Create a simple test image"""
    try:
        from PIL import Image
    except ImportError:
        print_error("Pillow not installed. Install with: pip install Pillow")
        return None
    
    print_info("Generating test image...")
    
    # Create simple test image
    img = Image.new('RGB', (640, 480), color=(73, 109, 137))
    image_path = "test_image.jpg"
    img.save(image_path, 'JPEG')
    
    print_success(f"Test image created: {image_path}")
    return image_path

def main():
    print_header("ESP-32 Door Access Controller - PC Test")
    
    image_path = None
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        
        if arg == "--camera":
            print_info("Webcam mode selected")
            image_path = test_with_webcam()
            if not image_path:
                print_error("Webcam capture cancelled")
                return
        
        elif arg == "--test":
            print_info("Test image mode selected")
            image_path = test_with_sample_image()
        
        else:
            # Assume it's a file path
            image_path = arg
            if not os.path.exists(image_path):
                print_error(f"File not found: {image_path}")
                print_info("Usage:")
                print_info("  python test_door_access.py image.jpg")
                print_info("  python test_door_access.py --camera")
                print_info("  python test_door_access.py --test")
                return
    else:
        print_info("No image provided. Usage:")
        print_info("  python test_door_access.py image.jpg")
        print_info("  python test_door_access.py --camera")
        print_info("  python test_door_access.py --test")
        return
    
    # Test API connectivity
    print_header("Step 1: API Connectivity Check")
    if not test_api_connectivity():
        print_error("Cannot reach face recognition API")
        print_info(f"Make sure {FACE_SERVICE_URL} is running")
        return
    
    # Send image to API
    print_header("Step 2: Send Image to Face Recognition")
    response = send_image_to_api(image_path)
    
    if response is None:
        return
    
    # Process response
    print_header("Step 3: Process Response")
    result = process_response(response)
    
    if result is None:
        return
    
    success, face_detected, confidence, user_id = result
    
    # Make access decision
    print_header("Step 4: Access Control Decision")
    access_granted = make_access_decision(success, face_detected, confidence)
    
    # Simulate door control
    print_header("Step 5: Door Control Simulation")
    simulate_door_unlock(access_granted)
    
    # Log attempt
    print_header("Step 6: Audit Logging")
    log_access_attempt(image_path, access_granted, confidence, user_id)
    
    # Summary
    print_header("Test Complete")
    print(f"{Colors.BOLD}Summary:{Colors.RESET}")
    print(f"  Image: {os.path.basename(image_path)}")
    print(f"  Face Detected: {face_detected}")
    print(f"  Confidence: {confidence:.2%}")
    print(f"  Access Decision: {'GRANTED ✓' if access_granted else 'DENIED ✗'}")
    
    # Cleanup
    if image_path and image_path.startswith("webcam_") or image_path.startswith("test_"):
        try:
            os.remove(image_path)
            print_info(f"Cleaned up temporary file: {image_path}")
        except:
            pass

if __name__ == "__main__":
    main()
