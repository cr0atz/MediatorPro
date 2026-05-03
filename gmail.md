# Gmail API Integration Issue

## Problem Statement

The Gmail API test functionality is failing with error:
```
Error 400: Precondition check failed
```

## Root Cause Analysis

After extensive debugging and multiple iterations, we've identified the core issue:

**Gmail API does not allow sending emails where the From and To addresses are the same.**

This is an anti-spam and anti-loop protection mechanism built into Gmail API.

### Current Situation

- **OAuth Connection**: ✅ Working - Successfully authenticated with Google
- **Access Token**: ✅ Valid - Has required scopes including `https://mail.google.com/`
- **Refresh Token**: ✅ Working - Can refresh expired tokens
- **Gmail Account**: `danny@mediator.life`
- **Test Email Configuration**:
  - From: `danny@mediator.life` (authenticated Gmail account)
  - To: `danny@mediator.life` (same as From)
  - Result: **FAILED** - "Precondition check failed"

### Issues Resolved

1. ✅ **Read Receipt Headers** - Removed `Disposition-Notification-To` and `Return-Receipt-To` headers (not supported by Gmail API)
2. ✅ **CC Loop** - Prevented CC when mediator email matches To address
3. ✅ **Email Format** - Properly formatted RFC 2822 compliant email structure
4. ✅ **Base64 Encoding** - Correct base64url encoding of message

## Gmail API Restrictions Discovered

1. **No Self-Sending**: Cannot send email from account to same account
2. **No Read Receipts**: Cannot use `Disposition-Notification-To` or `Return-Receipt-To` headers
3. **No Duplicate Recipients**: All From/To/CC addresses must be unique

## Solution Plan

### Option 1: Use Different Test Recipient (RECOMMENDED)
Change the test email to send to a different address:
- From: `danny@mediator.life` (authenticated account)
- To: `test@example.com` OR `noreply@mediator.life` OR any other valid email
- This will work with Gmail API restrictions

### Option 2: Skip Gmail API Test
Since Gmail API authentication is already verified via OAuth:
- Remove the "Test Gmail API" button
- Only test when actually sending case-related emails
- Show connection status based on OAuth token validity

### Option 3: Use SMTP for Self-Testing
Keep Gmail API for actual email sending, but use SMTP for testing:
- Gmail API: For sending real case emails (more reliable, no DKIM issues)
- SMTP: For test emails only (allows self-sending)

## Recommended Implementation

**We will implement Option 1** - Change test recipient to avoid Gmail API restriction.

### Changes Required

File: `server/routes.ts` (line ~1631)

**Before:**
```typescript
const testEmailTo = 'danny@mediator.life';
```

**After:**
```typescript
// Use a different email for testing to avoid Gmail API "From = To" restriction
const testEmailTo = settings.email || 'danny@mediator.life';
// If settings.email is same as authenticated account, use fallback
if (testEmailTo === settings.email) {
  testEmailTo = 'mediator-test@example.com'; // Safe fallback
}
```

## Alternative: Multi-Recipient Test

Send test email to the authenticated user as CC, not as primary recipient:
```typescript
const messageId = await gmailService.sendEmail({
  to: 'noreply@mediator.life', // Different recipient
  cc: settings.email,          // User receives via CC
  subject: 'Gmail API Test Email - Mediator Pro',
  html: '...'
});
```

## **ROOT CAUSE DISCOVERED** ⚠️

### Scope Test Results (2025-10-29 23:49)

Ran comprehensive Gmail API scope test (`test-gmail-scopes.mjs`):

**Current Scopes:**
- ✓ `https://www.googleapis.com/auth/userinfo.email`
- ✓ `openid`
- ✓ `https://mail.google.com/`
- ✓ `https://www.googleapis.com/auth/calendar`

**Problem:**
Even with `https://mail.google.com/` (full Gmail access scope), the Gmail API returns:
```
❌ Error: Precondition check failed (Error Code: 400)
```

This error occurs even when just trying to get the Gmail profile, not just sending emails.

### Analysis

**Possible Causes:**
1. **Wrong Scope Format**: `https://mail.google.com/` may be deprecated or not properly recognized
2. **OAuth App Not Verified**: Google may require app verification for Gmail API access
3. **Sensitive Scopes Restriction**: Gmail scopes require additional verification steps in Google Cloud Console
4. **API Not Enabled**: Gmail API may not be enabled in the Google Cloud project

###  Recommended Scopes for Gmail Send:
- `https://www.googleapis.com/auth/gmail.send` - Send email only (recommended for our use case)
- `https://www.googleapis.com/auth/gmail.compose` - Compose and send drafts
- `https://mail.google.com/` - Full Gmail access (legacy/deprecated?)

## Gmail API Documentation References

- **Send Messages**: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send
- **Message Format**: https://datatracker.ietf.org/doc/html/rfc2822
- **Gmail API Scopes**: https://developers.google.com/gmail/api/auth/scopes
- **Known Limitations**: Gmail API enforces stricter rules than SMTP to prevent abuse

## **ACTION REQUIRED** 🔧

The "Precondition check failed" error indicates that the Gmail API is not properly configured in Google Cloud Console.

### Steps to Fix:

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Select Your Project**: Choose the project with Client ID `86294858363-ee32jgj10rmu1iou04blrnsea6b08plk`
3. **Enable Gmail API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"
4. **Verify OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Ensure Gmail scopes are added to the consent screen
5. **Update OAuth Scopes**:
   - Go to "APIs & Services" → "Credentials"
   - Edit your OAuth 2.0 Client ID
   - Add these scopes:
     - `https://www.googleapis.com/auth/gmail.send`
     - OR `https://mail.google.com/` (if already there, verify it's correct)
6. **Re-authenticate**:
   - In Mediator Pro Settings → Google Calendar
   - Click "Disconnect" then re-connect
   - This will request the Gmail scope again

### Alternative: Use SMTP Instead

If Gmail API continues to fail or requires app verification:
- Remove Gmail API integration
- Use existing SMTP settings for sending emails
- SMTP is simpler and doesn't require Google Cloud setup

## Testing Checklist

After implementing fix:
- [ ] Test email sends successfully
- [ ] User receives test email
- [ ] Success toast appears in UI
- [ ] No errors in server logs
- [ ] Gmail API scopes are sufficient
- [ ] Token refresh works if needed

## Production Deployment Notes

Gmail API sending for actual case emails will work fine because:
- From: `danny@mediator.life` (mediator's Gmail)
- To: `client@example.com` (case party email)
- These are different addresses, so no restriction applies

The issue only affects the test functionality where we were trying to send from an account to itself.
