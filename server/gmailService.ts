import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import type { CalendarSettings } from '@shared/schema';

export class GmailService {
  private oauth2Client: OAuth2Client;
  private gmail;

  constructor(settings: CalendarSettings) {
    // Reuse the same OAuth setup as Calendar
    let redirectUri = 'http://localhost:5000/api/calendar/oauth/callback';
    
    if (process.env.PRODUCTION_DOMAIN) {
      redirectUri = `https://${process.env.PRODUCTION_DOMAIN}/api/calendar/oauth/callback`;
    } else if (process.env.REPLIT_DEV_DOMAIN) {
      redirectUri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/calendar/oauth/callback`;
    }
    
    this.oauth2Client = new google.auth.OAuth2(
      settings.clientId,
      settings.clientSecret,
      redirectUri
    );

    // Set tokens if available
    if (settings.accessToken && settings.refreshToken) {
      this.oauth2Client.setCredentials({
        access_token: settings.accessToken,
        refresh_token: settings.refreshToken,
        scope: settings.scope || '',
        expiry_date: settings.expiryDate ? new Date(settings.expiryDate).getTime() : undefined,
      });
    }

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  // Send email via Gmail API
  async sendEmail(params: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    from?: string;
  }): Promise<string> {
    try {
      // Create email in RFC 2822 format
      const from = params.from || 'me';
      const messageParts = [
        `From: ${from}`,
        `To: ${params.to}`,
        `Subject: ${params.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        params.html || params.text || '',
      ];
      
      const message = messageParts.join('\n');
      
      // Encode message in base64url format
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return response.data.id || '';
    } catch (error: any) {
      if (error.code === 401) {
        // Token expired, refresh and retry
        await this.refreshAccessToken();
        return this.sendEmail(params);
      }
      throw error;
    }
  }

  // Send email to multiple recipients
  async sendBulkEmail(params: {
    recipients: string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
  }): Promise<string[]> {
    const messageIds: string[] = [];
    
    for (const recipient of params.recipients) {
      const messageId = await this.sendEmail({
        to: recipient,
        subject: params.subject,
        text: params.text,
        html: params.html,
        from: params.from,
      });
      messageIds.push(messageId);
    }
    
    return messageIds;
  }

  // Refresh access token if expired
  async refreshAccessToken() {
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    this.oauth2Client.setCredentials(credentials);
    return {
      accessToken: credentials.access_token!,
      expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(),
    };
  }

  // Test Gmail connection
  async testConnection(): Promise<boolean> {
    try {
      await this.gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      return false;
    }
  }
}
