/**
 * Calendar Integration Types
 *
 * Raw API response shapes for Google Calendar and Microsoft Graph.
 * Only consumed fields are typed; APIs may return additional fields.
 */

// ============================================================================
// Google Calendar API
// ============================================================================

export interface GoogleCalendarAttendeeRaw {
  email?: string;
  displayName?: string;
  responseStatus?: string;
  organizer?: boolean;
}

export interface GoogleCalendarEventRaw {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  attendees?: GoogleCalendarAttendeeRaw[];
  status?: string;
  recurrence?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
  updated?: string;
  created?: string;
  etag?: string;
}

// ============================================================================
// Microsoft Graph API
// ============================================================================

export interface MicrosoftCalendarAttendeeRaw {
  emailAddress?: { address?: string; name?: string };
  status?: { response?: string };
  type?: string;
}

export interface MicrosoftCalendarEventRaw {
  id?: string;
  subject?: string;
  body?: { content?: string; contentType?: string };
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  location?: { displayName?: string };
  attendees?: MicrosoftCalendarAttendeeRaw[];
  showAs?: string;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
  '@odata.etag'?: string;
}
