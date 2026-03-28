const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a value using AES-256-GCM
 * @param {string} plaintext - The text to encrypt
 * @returns {object} { encrypted, iv, authTag }
 */
const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
};

/**
 * Decrypts an encrypted value using AES-256-GCM
 * @param {string} encrypted - Encrypted data
 * @param {string} iv - Initialization vector
 * @param {string} authTag - Authentication tag
 * @returns {string} Decrypted plaintext
 */
const decrypt = (encrypted, iv, authTag) => {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    throw new Error('Decryption failed: ' + err.message);
  }
};

/**
 * Hash a value for storage (one-way)
 * @param {string} value - Value to hash
 * @returns {string} SHA256 hash
 */
const hashToken = (value) => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

module.exports = {
  encrypt,
  decrypt,
  hashToken,
};
