/**
 * Contacts Integration Types
 *
 * Raw API response shapes for Google People API and Microsoft Graph.
 * Only consumed fields are typed; APIs may return additional fields.
 */

// ============================================================================
// Google People API
// ============================================================================

export interface GoogleEmailRaw {
  value?: string;
  type?: string;
}

export interface GooglePhoneRaw {
  value?: string;
  type?: string;
}

export interface GoogleAddressRaw {
  streetAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  type?: string;
}

export interface GoogleUrlRaw {
  value?: string;
  type?: string;
}

export interface GoogleMembershipRaw {
  contactGroupResourceName?: string;
}

export interface GooglePersonRaw {
  resourceName?: string;
  etag?: string;
  names?: Array<{
    displayName?: string;
    givenName?: string;
    familyName?: string;
    middleName?: string;
    nickname?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
    department?: string;
  }>;
  emailAddresses?: GoogleEmailRaw[];
  phoneNumbers?: GooglePhoneRaw[];
  addresses?: GoogleAddressRaw[];
  urls?: GoogleUrlRaw[];
  memberships?: GoogleMembershipRaw[];
  birthdays?: Array<{ date?: { year?: number; month?: number; day?: number } }>;
  biographies?: Array<{ value?: string }>;
  metadata?: {
    sources?: Array<{ updateTime?: string }>;
  };
}

export interface GoogleContactGroupRaw {
  resourceName?: string;
  name?: string;
  formattedName?: string;
  memberCount?: number;
}

// ============================================================================
// Microsoft Graph API
// ============================================================================

export interface OutlookContactEmailRaw {
  address?: string;
  name?: string;
}

export interface OutlookContactPhoneRaw {
  number?: string;
  type?: string;
}

export interface OutlookContactAddressRaw {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryOrRegion?: string;
  type?: string;
}

export interface OutlookContactWebsiteRaw {
  address?: string;
  type?: string;
}

export interface OutlookContactRaw {
  id?: string;
  changeKey?: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  middleName?: string;
  nickName?: string;
  title?: string;
  companyName?: string;
  department?: string;
  emailAddresses?: OutlookContactEmailRaw[];
  phoneNumbers?: OutlookContactPhoneRaw[];
  addresses?: OutlookContactAddressRaw[];
  websites?: OutlookContactWebsiteRaw[];
  birthday?: string;
  anniversary?: string;
  personalNotes?: string;
  categories?: string[];
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

export interface OutlookContactFolderRaw {
  id?: string;
  displayName?: string;
}

// ============================================================================
// Deduplication
// ============================================================================

/** Generic field value for deduplication (string, number, date, etc.) */
export type ContactFieldValue = string | number | boolean | Date | undefined;
