import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export class GoogleCalendarService {
  async listUpcomingEvents(maxResults: number = 10): Promise<CalendarEvent[]> {
    const calendar = await getUncachableGoogleCalendarClient();
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items as CalendarEvent[] || [];
  }

  async createEvent(event: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    attendees?: Array<{ email: string; displayName?: string }>;
  }): Promise<string> {
    const calendar = await getUncachableGoogleCalendarClient();

    const calendarEvent = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: 'UTC',
      },
      attendees: event.attendees?.map(a => ({
        email: a.email,
        displayName: a.displayName,
      })),
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: calendarEvent,
      sendUpdates: 'all',
    });

    return response.data.id!;
  }

  async updateEvent(eventId: string, event: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    attendees?: Array<{ email: string; displayName?: string }>;
  }): Promise<void> {
    const calendar = await getUncachableGoogleCalendarClient();

    const calendarEvent = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: 'UTC',
      },
      attendees: event.attendees?.map(a => ({
        email: a.email,
        displayName: a.displayName,
      })),
    };

    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: calendarEvent,
      sendUpdates: 'all',
    });
  }

  async deleteEvent(eventId: string): Promise<void> {
    const calendar = await getUncachableGoogleCalendarClient();

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });
  }

  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    const calendar = await getUncachableGoogleCalendarClient();

    try {
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId,
      });
      return response.data as CalendarEvent;
    } catch (error) {
      return null;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
