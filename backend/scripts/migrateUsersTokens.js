/**
 * BLE Token Migration Script
 * Issues BLE tokens to all existing users in the system
 * 
 * Usage:
 *   node backend/scripts/migrateUsersTokens.js
 * 
 * This script:
 * 1. Connects to database
 * 2. Finds all active users without tokens
 * 3. Creates BLE tokens for each user
 * 4. Logs results
 * 5. Exits gracefully
 */

require('dotenv').config({ path: '.env' });
const db = require('../config/db');
const { createBleToken, logBleActivity } = require('../utils/bleTokenService');

const BATCH_SIZE = 10; // Process users in batches

async function migrateUserTokens() {
  console.log('\n🔑 Starting BLE Token Migration...\n');
  
  let activeConnection;
  try {
    // Get connection from pool
    activeConnection = await db.getConnection();
    console.log('✓ Database connected');

    // Get all active users without tokens
    const [users] = await activeConnection.query(`
      SELECT u.user_id, u.full_name, u.email, u.department, u.status
      FROM users u
      WHERE u.status = 'ACTIVE'
        AND u.user_id NOT IN (
          SELECT DISTINCT user_id FROM ble_tokens WHERE is_revoked = 0
        )
      ORDER BY u.user_id ASC
      LIMIT 1000
    `);

    console.log(`📊 Found ${users.length} users without active tokens\n`);

    if (users.length === 0) {
      console.log('✓ All users already have tokens! Nothing to migrate.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process users in batches
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}...`);

      for (const user of batch) {
        try {
          // Create token with device name based on department/role
          const deviceName = `${user.department || 'Default'} Device`;
          
          const token = await createBleToken(user.user_id, deviceName);
          
          console.log(`   ✓ ${user.full_name} (${user.email})`);
          console.log(`      Token: ${token.displayToken} | Expires: ${new Date(token.expiresAt).toDateString()}`);
          
          successCount++;
        } catch (batchError) {
          errorCount++;
          const errorMsg = `   ✗ ${user.full_name}: ${batchError.message}`;
          console.log(errorMsg);
          errors.push({
            user_id: user.user_id,
            email: user.email,
            error: batchError.message
          });
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✓ Successful: ${successCount}/${users.length}`);
    console.log(`✗ Failed: ${errorCount}/${users.length}`);
    console.log('='.repeat(60) + '\n');

    if (errors.length > 0) {
      console.log('⚠️  Failed Users:');
      errors.forEach(err => {
        console.log(`   - ${err.email} (ID: ${err.user_id}): ${err.error}`);
      });
      console.log();
    }

    // Verify tokens created
    const [verification] = await activeConnection.query(`
      SELECT COUNT(*) as total_tokens, COUNT(DISTINCT user_id) as users_with_tokens
      FROM ble_tokens
      WHERE is_revoked = 0
    `);

    console.log('✓ Verification:');
    console.log(`  - Total active tokens: ${verification[0].total_tokens}`);
    console.log(`  - Users with tokens: ${verification[0].users_with_tokens}\n`);

    if (successCount > 0) {
      console.log('🎉 Migration completed successfully!\n');
      console.log('📝 Next steps:');
      console.log('   1. Users can view tokens via the app (Profile > Security & BLE Token)');
      console.log('   2. Users should save their tokens in a secure location');
      console.log('   3. Tokens expire after 365 days\n');
    }

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    // Release connection back to pool
    if (activeConnection) {
      try {
        await activeConnection.release();
        console.log('✓ Database connection closed');
      } catch (releaseErr) {
        console.error('Error releasing connection:', releaseErr);
      }
    }
    process.exit(0);
  }
}

// Run migration
migrateUserTokens().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
