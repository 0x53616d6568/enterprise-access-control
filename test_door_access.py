#!/usr/bin/env python3
"""
Test Script: Door Access via MQTT
Tests the complete flow: Login -> Request Door Access
"""

import requests
import json

# ============================================
# ⚠️  CONFIGURE THESE PARAMETERS:
# ============================================
EMAIL = "admin@company.com"  # ← CHANGE THIS
PASSWORD = "password"        # ← CHANGE THIS
DOOR_ID = 1                       # ← Door to unlock
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

# Step 2: Request door access (MQTT token auto-generated)
print(f'\n🚪 Step 2: Requesting door access for door {DOOR_ID}...')
access_data = {'doorId': DOOR_ID}
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
    print(f'   Error: {result.get("message", "Unknown error")}')

