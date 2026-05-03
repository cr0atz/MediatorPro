// Test Gmail API scopes and connection
import { google } from 'googleapis';
import pg from 'pg';

const { Client } = pg;

// Ensure environment variables are set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set in environment');
  process.exit(1);
}

async function testGmailScopes() {
  console.log('='.repeat(60));
  console.log('Gmail API Scope and Connection Test');
  console.log('='.repeat(60));

  // Connect to database
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Get calendar settings for user 'danny'
  const result = await client.query(
    'SELECT * FROM calendar_settings WHERE user_id = $1',
    ['danny']
  );

  if (!result.rows.length) {
    console.error('❌ No calendar settings found for user danny');
    await client.end();
    return;
  }

  const settings = result.rows[0];
  console.log('\n📋 Current Settings:');
  console.log('  User:', settings.user_id);
  console.log('  Email:', settings.email);
  console.log('  Has Access Token:', !!settings.access_token);
  console.log('  Has Refresh Token:', !!settings.refresh_token);
  console.log('  Scopes:', settings.scope);
  console.log('  Token Expiry:', settings.expiry_date);

  // Check scopes
  console.log('\n🔍 Scope Analysis:');
  const scopes = settings.scope ? settings.scope.split(' ') : [];
  const requiredScopes = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose'
  ];

  scopes.forEach(scope => {
    console.log('  ✓', scope);
  });

  console.log('\n📝 Required Scopes for Gmail Send:');
  requiredScopes.forEach(scope => {
    const hasScope = scopes.includes(scope);
    console.log(`  ${hasScope ? '✓' : '✗'}`, scope, hasScope ? '(PRESENT)' : '(MISSING)');
  });

  // Test Gmail API connection
  console.log('\n🔌 Testing Gmail API Connection:');

  const oauth2Client = new google.auth.OAuth2(
    settings.client_id,
    settings.client_secret,
    `https://${process.env.PRODUCTION_DOMAIN}/api/calendar/oauth/callback`
  );

  oauth2Client.setCredentials({
    access_token: settings.access_token,
    refresh_token: settings.refresh_token,
    scope: settings.scope,
    expiry_date: settings.expiry_date ? new Date(settings.expiry_date).getTime() : undefined,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    // Test 1: Get Profile
    console.log('  Test 1: Getting Gmail profile...');
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log('  ✓ Profile retrieved successfully');
    console.log('    Email:', profile.data.emailAddress);
    console.log('    Messages Total:', profile.data.messagesTotal);

    // Test 2: List Labels (requires read permission)
    console.log('\n  Test 2: Listing Gmail labels...');
    const labels = await gmail.users.labels.list({ userId: 'me' });
    console.log('  ✓ Labels retrieved:', labels.data.labels?.length || 0, 'labels');

    // Test 3: Try to send a simple test email
    console.log('\n  Test 3: Attempting to send test email...');

    const emailContent = [
      'From: ' + settings.email,
      'To: test@example.com',
      'Subject: Test Email from Gmail API Test Script',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'This is a test email from the Gmail API scope test script.'
    ].join('\n');

    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendResult = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    console.log('  ✓ Email sent successfully!');
    console.log('    Message ID:', sendResult.data.id);

  } catch (error) {
    console.error('\n  ❌ Error:', error.message);
    if (error.code) {
      console.error('    Error Code:', error.code);
    }
    if (error.errors) {
      console.error('    Details:', JSON.stringify(error.errors, null, 2));
    }
  }

  await client.end();
  console.log('\n' + '='.repeat(60));
}

testGmailScopes().catch(console.error);
