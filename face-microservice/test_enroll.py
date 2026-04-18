"""
Quick test script to generate a valid base64 image and test the /enroll endpoint
"""

import requests
import base64
from PIL import Image
import io
import numpy as np

# Generate a simple test image (100x100 with a face-like pattern)
def create_test_image():
    """Create a simple 100x100 test image"""
    # Create a simple image with PIL
    img = Image.new('RGB', (100, 100), color='white')
    
    # Convert to base64
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    return img_base64

def test_enroll():
    """Test the /enroll endpoint"""
    
    # API configuration
    API_URL = "https://enterprise-access-control-face.onrender.com/enroll"
    API_KEY = "sk-face-xyz123"
    
    # Generate test image
    print("📸 Generating test image...")
    image_base64 = create_test_image()
    print(f"   Base64 length: {len(image_base64)} characters (~{len(image_base64) / 1024:.1f} KB)")
    
    # Prepare request
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    
    payload = {
        "user_id": 1,
        "image_base64": image_base64
    }
    
    # Send request
    print(f"\n🚀 Sending POST request to {API_URL}")
    try:
        response = requests.post(API_URL, json=payload, headers=headers, timeout=60)
        
        print(f"\n✅ Response Status: {response.status_code}")
        print(f"📄 Response Body:")
        print(response.text)
        
        if response.status_code == 201:
            print("\n🎉 SUCCESS! Face enrolled!")
        elif response.status_code == 401:
            print("\n❌ API Key invalid!")
        elif response.status_code == 400:
            print("\n❌ No face detected in image (test image has no real face)")
        elif response.status_code == 413:
            print("\n❌ Image too large!")
        elif response.status_code >= 500:
            print("\n❌ Server error - service may have crashed")
            
    except requests.exceptions.Timeout:
        print("\n⏱️ TIMEOUT - Service took too long to respond (likely OOM crash)")
    except requests.exceptions.ConnectionError:
        print("\n🔌 CONNECTION ERROR - Service is not running or URL is wrong")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

if __name__ == "__main__":
    test_enroll()
