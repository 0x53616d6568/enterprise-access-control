require('dotenv').config();
const { sendPasswordResetEmail } = require('./utils/emailService');

/**
 * Test Email Service
 * Run with: node test-email.js
 */

const testEmailSending = async () => {
  try {
    console.log('🧪 Testing Email Service...\n');
    console.log('Configuration:');
    console.log('  Gmail User:', process.env.GMAIL_USER || 'NOT SET');
    console.log('  Gmail Client ID:', process.env.GMAIL_CLIENT_ID ? '✓ SET' : '❌ NOT SET');
    console.log('  Gmail Refresh Token:', process.env.GMAIL_REFRESH_TOKEN ? '✓ SET' : '❌ NOT SET');
    console.log('  Using Local Email:', !process.env.GMAIL_CLIENT_ID ? 'YES' : 'NO\n');

    // Test data
    const testUserId = 1;
    const testEmail = 'samehourabi11@gmail.com';
    const testFullName = 'Test User';

    console.log('📧 Attempting to send password reset email...');
    console.log(`   To: ${testEmail}`);
    console.log(`   User: ${testFullName}\n`);

    const result = await sendPasswordResetEmail(testUserId, testEmail, testFullName);
    
    console.log('✅ SUCCESS!');
    console.log('Result:', result);
    console.log('\n📋 Check /backend/emails/emails-log.json to see saved emails');

  } catch (err) {
    console.error('❌ ERROR:');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
};

testEmailSending();
