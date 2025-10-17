import { randomBytes } from 'crypto';

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface ZoomMeetingResponse {
  id: string;
  join_url: string;
  password?: string;
  start_url: string;
}

interface ZoomMeetingSettings {
  topic: string;
  type: 2; // Scheduled meeting
  start_time: string; // ISO 8601 format
  duration: number; // in minutes
  timezone?: string;
  password?: string;
  settings?: {
    host_video?: boolean;
    participant_video?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    watermark?: boolean;
    use_pmi?: boolean;
    approval_type?: number;
    audio?: string;
    auto_recording?: string;
  };
}

export class ZoomService {
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';

    if (!this.accountId || !this.clientId || !this.clientSecret) {
      throw new Error('Zoom credentials not configured. Please set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET environment variables.');
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get new token using Server-to-Server OAuth
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Zoom access token: ${response.status} ${errorText}`);
    }

    const data: ZoomTokenResponse = await response.json();
    this.accessToken = data.access_token;
    // Set expiry to 5 minutes before actual expiry for safety
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    return this.accessToken;
  }

  async createMeeting(settings: {
    topic: string;
    startTime: Date;
    duration: number;
    timezone?: string;
  }): Promise<{ meetingId: string; joinUrl: string; password: string }> {
    const token = await this.getAccessToken();

    // Generate a secure password
    const password = randomBytes(4).toString('hex');

    const meetingData: ZoomMeetingSettings = {
      topic: settings.topic,
      type: 2, // Scheduled meeting
      start_time: settings.startTime.toISOString(),
      duration: settings.duration,
      timezone: settings.timezone || 'Australia/Sydney',
      password: password,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 0, // Automatically approve
        audio: 'both',
        auto_recording: 'none',
      },
    };

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Zoom meeting: ${response.status} ${errorText}`);
    }

    const meeting: ZoomMeetingResponse = await response.json();

    return {
      meetingId: meeting.id.toString(),
      joinUrl: meeting.join_url,
      password: meeting.password || password,
    };
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`Failed to delete Zoom meeting: ${response.status} ${errorText}`);
    }
  }

  async getMeeting(meetingId: string): Promise<ZoomMeetingResponse> {
    const token = await this.getAccessToken();

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Zoom meeting: ${response.status} ${errorText}`);
    }

    return await response.json();
  }
}

export const zoomService = new ZoomService();
