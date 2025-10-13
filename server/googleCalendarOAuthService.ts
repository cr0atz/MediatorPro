import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import type { CalendarSettings } from '@shared/schema';

export class GoogleCalendarOAuthService {
  private oauth2Client: OAuth2Client;
  private calendar;

  constructor(settings: CalendarSettings) {
    // Create OAuth2 client with user's credentials
    const redirectUri = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/calendar/oauth/callback`
      : 'http://localhost:5000/api/calendar/oauth/callback';
    
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

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // Generate OAuth URL for user consent
  getAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      state,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  // Exchange authorization code for tokens
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      scope: tokens.scope!,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(),
    };
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

  // List upcoming events
  async listUpcomingEvents(maxResults: number = 50): Promise<any[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error: any) {
      if (error.code === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        return this.listUpcomingEvents(maxResults);
      }
      throw error;
    }
  }

  // Create a calendar event
  async createEvent(params: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    attendees?: { email: string; displayName?: string }[];
  }): Promise<string> {
    try {
      const event = {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: {
          dateTime: params.startDateTime,
        },
        end: {
          dateTime: params.endDateTime,
        },
        attendees: params.attendees?.map(a => ({
          email: a.email,
          displayName: a.displayName,
        })),
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
      });

      return response.data.id!;
    } catch (error: any) {
      if (error.code === 401) {
        await this.refreshAccessToken();
        return this.createEvent(params);
      }
      throw error;
    }
  }

  // Get a specific event
  async getEvent(eventId: string): Promise<any> {
    try {
      const response = await this.calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      return response.data;
    } catch (error: any) {
      if (error.code === 401) {
        await this.refreshAccessToken();
        return this.getEvent(eventId);
      }
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  // Delete a calendar event
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all',
      });
    } catch (error: any) {
      if (error.code === 401) {
        await this.refreshAccessToken();
        return this.deleteEvent(eventId);
      }
      if (error.code === 404) {
        // Event already deleted
        return;
      }
      throw error;
    }
  }

  // Check if user is connected (has valid tokens)
  isConnected(): boolean {
    const creds = this.oauth2Client.credentials;
    return !!(creds.access_token && creds.refresh_token);
  }
}
