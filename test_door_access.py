#!/usr/bin/env python3
"""
Test Script: Door Access via MQTT
Tests the complete flow: Login -> Generate Token -> Request Door Access
"""

import requests
import json

# ============================================
# ⚠️  CONFIGURE THESE PARAMETERS:
# ============================================
EMAIL = "admin@company.com"  # ← CHANGE THIS
PASSWORD = "password"        # ← CHANGE THIS
DOOR_ID = 1                       # ← Optional: change if testing different door
DEVICE_NAME = "ESP32-Door-1"      # ← Optional: device name for token
# ============================================

# Step 1: Login
print('🔐 Step 1: Logging in...')
login_data = {'email': EMAIL, 'password': PASSWORD}
resp = requests.post('https://enterprise-access-control.onrender.com/api/auth/login', json=login_data)
result = resp.json()
print(json.dumps(result, indent=2))

if not result.get('success'):
    print('❌ Login failed!')
    print(f'   Used: {EMAIL} / {PASSWORD}')
    exit(1)

token = result['data']['accessToken']
print('✅ JWT Token obtained')
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Step 2: Generate MQTT token
print('\n🔑 Step 2: Generating MQTT token...')
token_data = {'deviceName': DEVICE_NAME}
resp = requests.post('https://enterprise-access-control.onrender.com/api/mqtt/token/generate', json=token_data, headers=headers)
result = resp.json()
print(json.dumps(result, indent=2))

if not result.get('success'):
    print('❌ Token generation failed!')
    exit(1)

mqtt_token_id = result['data']['id']
print(f'✅ MQTT Token ID: {mqtt_token_id}')

# Step 3: Request door access
print(f'\n🚪 Step 3: Requesting door access for door {DOOR_ID}...')
access_data = {'doorId': DOOR_ID, 'tokenId': mqtt_token_id}
resp = requests.post('https://enterprise-access-control.onrender.com/api/mqtt/request-access', json=access_data, headers=headers)
result = resp.json()
print(json.dumps(result, indent=2))

if result.get('success'):
    request_id = result['data']['requestId']
    status = result['data']['status']
    door_name = result['data']['doorName']
    print(f'\n✅ SUCCESS! Access request created')
    print(f'   Request ID: {request_id}')
    print(f'   Status: {status}')
    print(f'   Door: {door_name}')
    print('\n🔓 MQTT UNLOCK COMMAND PUBLISHED TO HIVEMQ!')
    print(f'   Topic: doors/{DOOR_ID}/unlock')
    print('   → ESP32 should receive command and unlock door')
    print('   → LED should blink (ON for 3 seconds, then OFF)')
else:
    print('❌ Access request failed!')

