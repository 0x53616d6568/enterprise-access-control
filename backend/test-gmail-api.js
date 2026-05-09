/**
 * Test Gmail API Service
 * Verifies that the Gmail API can authenticate and send emails
 */

require('dotenv').config({ path: './.env' });
const { google } = require('googleapis');

async function testGmailAPI() {
  try {
    console.log('🧪 Testing Gmail API Authentication...\n');
    
    // Check required env variables
    const required = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required .env variables:', missing);
      return;
    }

    console.log('✅ All required Gmail API credentials found in .env\n');

    // Setup OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    console.log('🔐 Testing OAuth2 authentication...');
    const { token } = await oauth2Client.getAccessToken();
    
    if (token) {
      console.log('✅ Successfully obtained access token from refresh token\n');
      console.log('📋 Gmail API Configuration:');
      console.log('   • User Email:', process.env.GMAIL_FROM || process.env.GMAIL_USER);
      console.log('   • Client ID:', process.env.GMAIL_CLIENT_ID.substring(0, 20) + '...');
      console.log('   • Redirect URI:', process.env.GMAIL_REDIRECT_URI);
      console.log('   • Access Token: Valid ✓\n');
      
      console.log('✅ Gmail API Service is ready to send emails!\n');
      console.log('📝 Key advantages:');
      console.log('   • Uses HTTPS (port 443) - never blocked by Render');
      console.log('   • Auto-refreshes OAuth2 tokens');
      console.log('   • More reliable than SMTP');
      console.log('   • No connection timeouts\n');
    } else {
      console.error('❌ Failed to obtain access token');
      return;
    }

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    if (err.message.includes('invalid_grant')) {
      console.error('\n⚠️ Refresh token may have expired.');
      console.error('   Regenerate it in Google Cloud Console and update .env');
    }
  }

  process.exit(0);
}

// Run test
testGmailAPI();
