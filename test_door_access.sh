#!/bin/bash
###############################################################################
#                                                                             #
#  Door Access Integration - Quick Test Script (curl)                        #
#                                                                             #
#  Test both scenarios without Python dependencies                           #
#  Usage:                                                                     #
#    ./test_door_access.sh --scenario 1 [--door-id 1] [--user-id 1]         #
#    ./test_door_access.sh --scenario 2 --image path/to/image.jpg           #
#                                                                             #
###############################################################################

# Configuration
BACKEND_API="${BACKEND_API:-https://enterprise-access-control.onrender.com/api}"
BACKEND_API_KEY="${BACKEND_API_KEY:-your-esp-api-key-here}"
HF_SPACE_URL="${HF_SPACE_URL:-https://Soapppp11-enterprise-access-control-face.hf.space}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helpers
print_header() {
    echo -e "\n${BLUE}══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}\n"
}

print_section() {
    echo -e "\n${YELLOW}──────────────────────────────────────────────────────────${NC}"
    echo -e "${YELLOW}  $1${NC}"
    echo -e "${YELLOW}──────────────────────────────────────────────────────────${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Generate random base64 test embedding
generate_test_embedding() {
    print_info "Generating test embedding..."
    
    # Create a 512-float embedding (2048 bytes) and encode to base64
    # For testing, we'll create a simple base64-encoded binary string
    
    # Use /dev/urandom to create random bytes
    python3 -c "
import base64
import numpy as np

# Generate random embedding
embedding = np.random.randn(512).astype(np.float32)

# Normalize
norm = np.linalg.norm(embedding)
if norm > 0:
    embedding = embedding / norm

# Convert to bytes and base64
embedding_bytes = embedding.tobytes()
embedding_b64 = base64.b64encode(embedding_bytes).decode('utf-8')
print(embedding_b64)
"
}

# Image to base64
image_to_base64() {
    python3 -c "
import base64
import sys

image_path = '$1'
with open(image_path, 'rb') as f:
    image_bytes = f.read()

image_b64 = base64.b64encode(image_bytes).decode('utf-8')
print(image_b64)
"
}

# ============================================
# SCENARIO 1: Test Embedding
# ============================================

test_scenario_1() {
    local door_id=${1:-1}
    local user_id=${2:-0}
    
    print_header "🧪 SCENARIO 1: esp_test_embedding (No Camera)"
    
    # Generate test embedding
    print_section "Step 1: Generate Test Embedding"
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 not found. Please install Python3."
        return 1
    fi
    
    test_embedding=$(generate_test_embedding)
    
    if [ -z "$test_embedding" ]; then
        print_error "Failed to generate test embedding"
        return 1
    fi
    
    embedding_size=$((${#test_embedding} / 1024))
    print_success "Generated embedding: $embedding_size KB (base64)"
    
    # Send to backend
    print_section "Step 2: Send to Backend"
    
    payload=$(cat <<EOF
{
  "door_id": $door_id,
  "user_id": $user_id,
  "face_data": {
    "type": "embedding_test",
    "embedding": "$test_embedding"
  }
}
EOF
)
    
    print_info "POST $BACKEND_API/pi/door-access-request"
    print_info "Door ID: $door_id"
    print_info "User ID: $user_id"
    
    response=$(curl -s -X POST "$BACKEND_API/pi/door-access-request" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $BACKEND_API_KEY" \
        -d "$payload")
    
    # Check response
    granted=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('granted', False))" 2>/dev/null || echo "error")
    
    print_section "Step 3: Result"
    
    if [ "$granted" = "True" ]; then
        print_success "ACCESS GRANTED!"
        
        user=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('user_id', 'N/A'))" 2>/dev/null)
        similarity=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('similarity', 0))" 2>/dev/null)
        door=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('door_name', 'N/A'))" 2>/dev/null)
        
        print_info "User ID: $user"
        print_info "Similarity: $similarity"
        print_info "Door: $door"
        
        return 0
    else
        print_error "ACCESS DENIED"
        reason=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('reason', 'Unknown'))" 2>/dev/null)
        print_info "Reason: $reason"
        
        return 1
    fi
}

# ============================================
# SCENARIO 2: Camera Image
# ============================================

test_scenario_2() {
    local image_path=$1
    local door_id=${2:-1}
    
    if [ ! -f "$image_path" ]; then
        print_error "Image file not found: $image_path"
        return 1
    fi
    
    print_header "📷 SCENARIO 2: esp_camera_toHF (With Camera)"
    
    # Load image
    print_section "Step 1: Load Image"
    
    print_info "Loading image: $image_path"
    
    image_b64=$(image_to_base64 "$image_path")
    
    if [ -z "$image_b64" ]; then
        print_error "Failed to load image"
        return 1
    fi
    
    image_size=$((${#image_b64} / 1024))
    print_success "Image loaded: $image_size KB (base64)"
    
    # Call HF Space
    print_section "Step 2: Send to HF Space"
    
    print_info "Calling: $HF_SPACE_URL/recognize"
    
    hf_payload=$(cat <<EOF
{"image_base64": "$image_b64"}
EOF
)
    
    hf_response=$(curl -s -X POST "$HF_SPACE_URL/recognize" \
        -H "Content-Type: application/json" \
        -d "$hf_payload")
    
    hf_success=$(echo "$hf_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "false")
    
    if [ "$hf_success" != "True" ]; then
        print_error "HF Space recognition failed"
        return 1
    fi
    
    user_id=$(echo "$hf_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('user_id', 0))" 2>/dev/null)
    similarity=$(echo "$hf_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('similarity', 0))" 2>/dev/null)
    
    print_success "Face recognized!"
    print_info "User ID: $user_id"
    print_info "Similarity: $similarity"
    
    # Send to backend
    print_section "Step 3: Send to Backend"
    
    backend_payload=$(cat <<EOF
{
  "door_id": $door_id,
  "user_id": $user_id,
  "face_data": {
    "type": "camera_image",
    "image_base64": "$image_b64"
  }
}
EOF
)
    
    print_info "POST $BACKEND_API/pi/door-access-request"
    
    backend_response=$(curl -s -X POST "$BACKEND_API/pi/door-access-request" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $BACKEND_API_KEY" \
        -d "$backend_payload")
    
    granted=$(echo "$backend_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('granted', False))" 2>/dev/null || echo "error")
    
    print_section "Step 4: Final Result"
    
    if [ "$granted" = "True" ]; then
        print_success "ACCESS GRANTED!"
        
        door=$(echo "$backend_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('door_name', 'N/A'))" 2>/dev/null)
        print_info "Door: $door"
        
        return 0
    else
        print_error "ACCESS DENIED"
        
        return 1
    fi
}

# ============================================
# Main
# ============================================

show_help() {
    cat <<EOF
Door Access Integration Test Script (curl)

Usage:
  $0 --scenario 1 [--door-id DOOR_ID] [--user-id USER_ID]
  $0 --scenario 2 --image IMAGE_PATH [--door-id DOOR_ID]

Options:
  --scenario N         Scenario to test: 1 (embedding) or 2 (camera)
  --door-id N          Door ID (default: 1)
  --user-id N          User ID for Scenario 1 (default: 0 = unknown)
  --image PATH         Path to image file for Scenario 2 (required)
  --backend URL        Backend API URL
  --api-key KEY        Backend API key

Examples:
  $0 --scenario 1 --door-id 1
  $0 --scenario 2 --image photo.jpg --door-id 2

EOF
}

# Parse arguments
scenario=""
door_id=1
user_id=0
image_path=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --scenario)
            scenario="$2"
            shift 2
            ;;
        --door-id)
            door_id="$2"
            shift 2
            ;;
        --user-id)
            user_id="$2"
            shift 2
            ;;
        --image)
            image_path="$2"
            shift 2
            ;;
        --backend)
            BACKEND_API="$2"
            shift 2
            ;;
        --api-key)
            BACKEND_API_KEY="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate
if [ -z "$scenario" ]; then
    print_error "Missing --scenario argument"
    show_help
    exit 1
fi

if [ "$scenario" = "1" ]; then
    test_scenario_1 "$door_id" "$user_id"
    exit $?
elif [ "$scenario" = "2" ]; then
    if [ -z "$image_path" ]; then
        print_error "Scenario 2 requires --image argument"
        show_help
        exit 1
    fi
    test_scenario_2 "$image_path" "$door_id"
    exit $?
else
    print_error "Invalid scenario: $scenario"
    show_help
    exit 1
fi
