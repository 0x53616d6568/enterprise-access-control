/**
 * Face Enrollment Debug Script
 * Tests the entire enrollment flow to identify the network error
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}\n${colors.bright}${msg}${colors.reset}`),
  details: (obj) => console.log(JSON.stringify(obj, null, 2)),
};

// Configuration
const config = {
  FACE_SERVICE_URL: process.env.FACE_SERVICE_URL || 'http://localhost:5000',
  FACE_SERVICE_API_KEY: process.env.FACE_SERVICE_API_KEY || 'your-secret-key-change-in-production',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
  BACKEND_JWT_TOKEN: process.env.BACKEND_JWT_TOKEN || null,
};

log.section('FACE ENROLLMENT DEBUG - Configuration');
log.info(`Face Service URL: ${config.FACE_SERVICE_URL}`);
log.info(`Face Service API Key: ${config.FACE_SERVICE_API_KEY.substring(0, 10)}...`);
log.info(`Backend URL: ${config.BACKEND_URL}`);

/**
 * Test 1: Check Face Microservice Health
 */
async function testMicroserviceHealth() {
  log.section('Test 1: Face Microservice Health Check');
  
  try {
    log.info(`Checking health at: ${config.FACE_SERVICE_URL}/health`);
    
    const response = await axios.get(`${config.FACE_SERVICE_URL}/health`, {
      timeout: 5000,
    });
    
    log.success('Health check passed');
    log.info(`Status: ${response.status}`);
    log.details(response.data);
    return true;
  } catch (err) {
    log.error(`Health check failed: ${err.message}`);
    
    if (err.code === 'ECONNREFUSED') {
      log.error('Cannot connect to microservice. Is it running?');
      log.error(`Expected: ${config.FACE_SERVICE_URL}`);
    } else if (err.code === 'ENOTFOUND') {
      log.error('DNS resolution failed. Check the FACE_SERVICE_URL.');
    } else if (err.response) {
      log.error(`Status: ${err.response.status}`);
      log.details(err.response.data);
    }
    
    return false;
  }
}

/**
 * Test 2: Create Sample Base64 Image
 */
function createSampleBase64() {
  log.section('Test 2: Creating Sample Base64 Image');
  
  try {
    // Create a minimal valid JPEG using a pixel
    // This is a 1x1 red pixel JPEG
    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x09, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
      0x7f, 0xff, 0xd9,
    ]);
    
    const base64 = jpegBuffer.toString('base64');
    log.success('Sample JPEG created (1x1 pixel)');
    log.info(`Base64 length: ${base64.length} characters`);
    
    return base64;
  } catch (err) {
    log.error(`Failed to create sample image: ${err.message}`);
    return null;
  }
}

/**
 * Test 3: Test Microservice Enroll Endpoint Directly
 */
async function testMicroserviceEnroll(base64Image) {
  log.section('Test 3: Test Microservice Enroll Endpoint Directly');
  
  try {
    const payload = {
      user_id: 999,
      image_base64: base64Image,
    };
    
    log.info(`Calling: POST ${config.FACE_SERVICE_URL}/enroll`);
    log.info(`Payload size: ${JSON.stringify(payload).length} bytes`);
    
    const response = await axios.post(
      `${config.FACE_SERVICE_URL}/enroll`,
      payload,
      {
        headers: {
          'X-API-Key': config.FACE_SERVICE_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    
    log.success('Microservice enroll succeeded');
    log.info(`Status: ${response.status}`);
    log.info(`Response success: ${response.data.success}`);
    
    if (response.data.data && response.data.data.embedding) {
      log.info(`Embedding received (${response.data.data.embedding.length} chars)`);
    }
    
    return response.data;
  } catch (err) {
    log.error(`Microservice enroll failed: ${err.message}`);
    
    if (err.code === 'ECONNREFUSED') {
      log.error('Connection refused to microservice');
    } else if (err.response) {
      log.error(`Status: ${err.response.status}`);
      log.error(`Response:`);
      log.details(err.response.data);
    }
    
    return null;
  }
}

/**
 * Test 4: Test Backend Enroll Endpoint
 */
async function testBackendEnroll(base64Image) {
  log.section('Test 4: Test Backend Enroll Endpoint');
  
  if (!config.BACKEND_JWT_TOKEN) {
    log.warn('No JWT token provided. Skipping backend test.');
    log.info('To test backend, set BACKEND_JWT_TOKEN environment variable');
    return null;
  }
  
  try {
    const payload = {
      user_id: 999,
      image_base64: base64Image,
    };
    
    log.info(`Calling: POST ${config.BACKEND_URL}/api/face/enroll`);
    
    const response = await axios.post(
      `${config.BACKEND_URL}/api/face/enroll`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${config.BACKEND_JWT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 150000,
      }
    );
    
    log.success('Backend enroll succeeded');
    log.info(`Status: ${response.status}`);
    log.details(response.data);
    
    return response.data;
  } catch (err) {
    log.error(`Backend enroll failed: ${err.message}`);
    
    if (err.response) {
      log.error(`Status: ${err.response.status}`);
      log.error(`Response:`);
      log.details(err.response.data);
    }
    
    return null;
  }
}

/**
 * Test 5: Check Network Connectivity
 */
async function testNetworkConnectivity() {
  log.section('Test 5: Network Connectivity Checks');
  
  // Check if we can reach google.com (general internet)
  try {
    log.info('Testing general internet connectivity...');
    await axios.get('https://www.google.com', { timeout: 5000 });
    log.success('✓ General internet connectivity OK');
  } catch (err) {
    log.warn('Cannot reach google.com (may be network issue)');
  }
  
  // Check if we can reach the face service
  try {
    log.info(`Testing HF Space connectivity (${config.FACE_SERVICE_URL})...`);
    const response = await axios.head(config.FACE_SERVICE_URL, { timeout: 5000 });
    log.success(`✓ HF Space is reachable (${response.status})`);
  } catch (err) {
    if (err.response && err.response.status === 400) {
      log.success('✓ HF Space is reachable (400 on HEAD is normal)');
    } else if (err.code === 'ECONNREFUSED') {
      log.error('✗ HF Space connection refused');
    } else if (err.code === 'ENOTFOUND') {
      log.error('✗ HF Space DNS resolution failed');
    } else {
      log.warn(`Connectivity test inconclusive: ${err.message}`);
    }
  }
}

/**
 * Main Debug Function
 */
async function debugEnrollmentFlow() {
  log.section('STARTING FACE ENROLLMENT DEBUG SESSION');
  
  try {
    // Run tests in sequence
    const healthOk = await testMicroserviceHealth();
    
    if (!healthOk) {
      log.warn('Microservice health check failed. Continuing with other tests...');
    }
    
    await testNetworkConnectivity();
    
    const base64Image = createSampleBase64();
    
    if (base64Image) {
      const microserviceResult = await testMicroserviceEnroll(base64Image);
      await testBackendEnroll(base64Image);
    }
    
    log.section('DEBUG SESSION COMPLETE');
    log.info('Review the results above to identify the issue');
    
    if (!healthOk) {
      log.error('\n⚠️  The microservice appears to be unreachable.');
      log.error('   Check:');
      log.error('   1. Is FACE_SERVICE_URL correct?');
      log.error('   2. Is the HF Space running/deployed?');
      log.error('   3. Are there any network/firewall issues?');
    }
    
  } catch (err) {
    log.error(`Unexpected error: ${err.message}`);
  }
}

// Run debug
debugEnrollmentFlow().catch(console.error);
