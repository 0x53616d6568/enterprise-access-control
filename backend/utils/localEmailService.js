const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Local Email Service
 * Stores emails to a JSON file instead of sending via SMTP
 * Perfect for development and Render deployment without SMTP
 */

// Create emails directory if it doesn't exist
const emailsDir = path.join(__dirname, '../emails');
if (!fs.existsSync(emailsDir)) {
  fs.mkdirSync(emailsDir, { recursive: true });
}

// Store email log
const emailLogFile = path.join(emailsDir, 'emails-log.json');

// Initialize log file if it doesn't exist
const initializeLog = () => {
  if (!fs.existsSync(emailLogFile)) {
    fs.writeFileSync(emailLogFile, JSON.stringify([], null, 2));
  }
};

/**
 * Get all logged emails
 */
const getEmailLog = () => {
  try {
    const data = fs.readFileSync(emailLogFile, 'utf8');
    return JSON.parse(data) || [];
  } catch (err) {
    console.error('Error reading email log:', err.message);
    return [];
  }
};

/**
 * Save email to log
 */
const saveEmailToLog = (emailData) => {
  try {
    const log = getEmailLog();
    const entry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from,
      status: 'SENT_LOCALLY',
      content_preview: emailData.html ? emailData.html.substring(0, 200) : emailData.text || ''
    };

    log.push(entry);
    fs.writeFileSync(emailLogFile, JSON.stringify(log, null, 2));

    // Also save full email to separate file
    const emailFile = path.join(emailsDir, `${entry.id}.json`);
    fs.writeFileSync(emailFile, JSON.stringify(emailData, null, 2));

    console.log(`📧 [LOCAL EMAIL] Saved to ${emailFile}`);
    return entry;
  } catch (err) {
    console.error('Error saving email to log:', err.message);
    throw err;
  }
};

/**
 * Create a mock transporter that saves emails locally
 */
const createLocalTransporter = () => {
  return {
    sendMail: async (mailOptions) => {
      try {
        console.log(`📧 [LOCAL EMAIL] Sending to: ${mailOptions.to}`);
        console.log(`   Subject: ${mailOptions.subject}`);

        const entry = saveEmailToLog(mailOptions);

        return {
          messageId: entry.id,
          response: 'Email saved locally (Render environment - no SMTP available)',
          accepted: [mailOptions.to],
          rejected: [],
          pending: []
        };
      } catch (err) {
        console.error('Error in sendMail:', err.message);
        throw err;
      }
    }
  };
};

/**
 * Get email preview by ID
 */
const getEmailPreview = (emailId) => {
  try {
    const emailFile = path.join(emailsDir, `${emailId}.json`);
    if (fs.existsSync(emailFile)) {
      const data = fs.readFileSync(emailFile, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    console.error('Error reading email preview:', err.message);
    return null;
  }
};

/**
 * Get all emails for a recipient
 */
const getEmailsForRecipient = (email) => {
  try {
    const log = getEmailLog();
    return log.filter(entry => entry.to.toLowerCase() === email.toLowerCase());
  } catch (err) {
    console.error('Error filtering emails:', err.message);
    return [];
  }
};

/**
 * Clear all local emails
 */
const clearAllEmails = () => {
  try {
    // Clear log
    fs.writeFileSync(emailLogFile, JSON.stringify([], null, 2));

    // Clear individual email files
    const files = fs.readdirSync(emailsDir);
    files.forEach(file => {
      if (file !== 'emails-log.json') {
        fs.unlinkSync(path.join(emailsDir, file));
      }
    });

    console.log('✓ All local emails cleared');
    return true;
  } catch (err) {
    console.error('Error clearing emails:', err.message);
    return false;
  }
};

/**
 * Export emails as HTML for viewing
 */
const exportEmailsAsHtml = () => {
  try {
    const log = getEmailLog();
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Local Email Log</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
          .email-item { background: white; padding: 20px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .email-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .email-to { font-weight: bold; color: #2D7DD2; }
          .email-subject { font-size: 14px; margin: 5px 0; }
          .email-time { color: #666; font-size: 12px; }
          .email-preview { color: #666; margin-top: 10px; font-size: 12px; border-left: 3px solid #2D7DD2; padding-left: 10px; }
        </style>
      </head>
      <body>
        <h1>📧 Local Email Log</h1>
        <p>Total emails: ${log.length}</p>
    `;

    log.reverse().forEach(entry => {
      html += `
        <div class="email-item">
          <div class="email-header">
            <div class="email-to">${entry.to}</div>
            <div class="email-time">${new Date(entry.timestamp).toLocaleString()}</div>
          </div>
          <div class="email-subject">📬 ${entry.subject}</div>
          <div class="email-preview">${entry.content_preview}</div>
        </div>
      `;
    });

    html += `
      </body>
      </html>
    `;

    return html;
  } catch (err) {
    console.error('Error exporting emails:', err.message);
    return '<html><body>Error generating email report</body></html>';
  }
};

// Initialize on module load
initializeLog();

module.exports = {
  createLocalTransporter,
  saveEmailToLog,
  getEmailLog,
  getEmailPreview,
  getEmailsForRecipient,
  clearAllEmails,
  exportEmailsAsHtml,
  emailsDir
};
