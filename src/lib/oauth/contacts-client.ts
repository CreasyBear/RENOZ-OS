/**
 * Contacts Client Abstraction
 *
 * Provider-agnostic contact operations for Google Contacts and Outlook People APIs.
 * Handles contact synchronization, deduplication, and field mapping.
 */

// ============================================================================
// CONTACT DATA TYPES
// ============================================================================

export interface Contact {
  id: string;
  externalId: string;
  connectionId: string;
  organizationId: string;

  // Basic information
  displayName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  nickname?: string;
  title?: string;
  company?: string;
  department?: string;

  // Contact methods
  emails: ContactEmail[];
  phones: ContactPhone[];
  addresses: ContactAddress[];
  websites: ContactWebsite[];

  // Personal information
  birthday?: Date;
  anniversary?: Date;
  notes?: string;

  // Social and professional
  socialProfiles: ContactSocialProfile[];
  instantMessengers: ContactInstantMessenger[];

  // System metadata
  isPrimary: boolean;
  groups: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date;
}

export interface ContactEmail {
  address: string;
  type: 'home' | 'work' | 'other';
  isPrimary: boolean;
}

export interface ContactPhone {
  number: string;
  type: 'home' | 'work' | 'mobile' | 'main' | 'work_fax' | 'home_fax' | 'pager' | 'other';
  isPrimary: boolean;
}

export interface ContactAddress {
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  type: 'home' | 'work' | 'other';
  isPrimary: boolean;
}

export interface ContactWebsite {
  url: string;
  type: 'home' | 'work' | 'blog' | 'profile' | 'other';
}

export interface ContactSocialProfile {
  url: string;
  type: 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'youtube' | 'other';
  username?: string;
}

export interface ContactInstantMessenger {
  address: string;
  type: 'aim' | 'msn' | 'yahoo' | 'skype' | 'qq' | 'hangouts' | 'icq' | 'jabber' | 'other';
  protocol: string;
}

export interface ContactSearchOptions {
  query?: string;
  groupId?: string;
  updatedSince?: Date;
  limit?: number;
  offset?: number;
}

export interface ContactSyncResult {
  contactsProcessed: number;
  contactsCreated: number;
  contactsUpdated: number;
  contactsDeleted: number;
  duplicatesResolved: number;
  errors: string[];
  duration: number;
}

// ============================================================================
// CONTACTS PROVIDER INTERFACE
// ============================================================================

export interface ContactsProvider {
  /**
   * List contacts with filtering and pagination
   */
  listContacts(
    connection: { accessToken: string; refreshToken?: string },
    options: ContactSearchOptions
  ): Promise<{
    contacts: Contact[];
    totalCount: number;
    hasMore: boolean;
    nextSyncToken?: string;
  }>;

  /**
   * Get a specific contact by external ID
   */
  getContact(
    connection: { accessToken: string; refreshToken?: string },
    contactId: string
  ): Promise<Contact>;

  /**
   * Create a new contact
   */
  createContact(
    connection: { accessToken: string; refreshToken?: string },
    contact: ContactInput
  ): Promise<Contact>;

  /**
   * Update an existing contact
   */
  updateContact(
    connection: { accessToken: string; refreshToken?: string },
    contactId: string,
    updates: Partial<ContactInput>
  ): Promise<Contact>;

  /**
   * Delete a contact
   */
  deleteContact(
    connection: { accessToken: string; refreshToken?: string },
    contactId: string
  ): Promise<void>;

  /**
   * Get contact groups/categories
   */
  getContactGroups(connection: {
    accessToken: string;
    refreshToken?: string;
  }): Promise<ContactGroup[]>;

  /**
   * Get changes since last sync (delta sync)
   */
  getChanges(
    connection: { accessToken: string; refreshToken?: string },
    syncToken: string
  ): Promise<{
    contacts: Contact[];
    deletedContacts: string[];
    nextSyncToken: string;
  }>;
}

export interface ContactInput {
  displayName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  nickname?: string;
  title?: string;
  company?: string;
  department?: string;
  emails?: Omit<ContactEmail, 'isPrimary'>[];
  phones?: Omit<ContactPhone, 'isPrimary'>[];
  addresses?: Omit<ContactAddress, 'isPrimary'>[];
  websites?: ContactWebsite[];
  birthday?: Date;
  anniversary?: Date;
  notes?: string;
  groups?: string[];
}

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
}

// ============================================================================
// GOOGLE CONTACTS PROVIDER IMPLEMENTATION
// ============================================================================

export class GoogleContactsProvider implements ContactsProvider {
  private baseUrl = 'https://people.googleapis.com/v1';

  async listContacts(
    connection: { accessToken: string; refreshToken?: string },
    options: ContactSearchOptions
  ): Promise<{
    contacts: Contact[];
    totalCount: number;
    hasMore: boolean;
    nextSyncToken?: string;
  }> {
    const params = new URLSearchParams({
      personFields:
        'names,emailAddresses,phoneNumbers,addresses,biographies,birthdays,urls,organizations,relations,userDefined,metadata',
      pageSize: (options.limit || 100).toString(),
    });

    if (options.query) {
      params.set('query', options.query);
    }

    if (options.updatedSince) {
      params.set('updatedMin', options.updatedSince.toISOString());
    }

    const response = await fetch(`${this.baseUrl}/people/me/connections?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Contacts API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      contacts: data.connections?.map((person: any) => this.parseGoogleContact(person)) || [],
      totalCount: data.totalPeople || data.connections?.length || 0,
      hasMore: !!data.nextPageToken,
      nextSyncToken: data.nextSyncToken,
    };
  }

  async getContact(
    connection: { accessToken: string; refreshToken?: string },
    contactId: string
  ): Promise<Contact> {
    const response = await fetch(
      `${this.baseUrl}/people/${contactId}?personFields=names,emailAddresses,phoneNumbers,addresses,biographies,birthdays,urls,organizations,relations,userDefined,metadata`,
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Google contact: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseGoogleContact(data);
  }

  async createContact(
    connection: { accessToken: string; refreshToken?: string },
    contact: ContactInput
  ): Promise<Contact> {
    const googleContact = this.convertToGoogleContact(contact);

    const response = await fetch(`${this.baseUrl}/people:createContact`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleContact),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Google contact: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseGoogleContact(data);
  }

  async updateContact(
    connection: { accessToken: string; refreshToken?: string },
    contactId: string,
    updates: Partial<ContactInput>
  ): Promise<Contact> {
    const googleUpdates = this.convertToGoogleContact(updates);

    const response = await fetch(`${this.baseUrl}/people/${contactId}:updateContact`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...googleUpdates,
        etag: '*', // Force update
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update Google contact: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseGoogleContact(data);
  }

  async deleteContact(
    connection: { accessToken: string; refreshToken?: string },
    contactId: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/people/${contactId}:deleteContact`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete Google contact: ${response.status} ${response.statusText}`);
    }
  }

  async getContactGroups(connection: {
    accessToken: string;
    refreshToken?: string;
  }): Promise<ContactGroup[]> {
    const response = await fetch(`${this.baseUrl}/contactGroups`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Google contact groups: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    return (
      data.contactGroups?.map((group: any) => ({
        id: group.resourceName,
        name: group.name,
        description: group.formattedName,
        memberCount: group.memberCount || 0,
      })) || []
    );
  }

  async getChanges(
    connection: { accessToken: string; refreshToken?: string },
    syncToken: string
  ): Promise<{
    contacts: Contact[];
    deletedContacts: string[];
    nextSyncToken: string;
  }> {
    const params = new URLSearchParams({
      syncToken,
      personFields:
        'names,emailAddresses,phoneNumbers,addresses,biographies,birthdays,urls,organizations,relations,userDefined,metadata',
    });

    const response = await fetch(
      `${this.baseUrl}/people/me/connections:sync?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Contacts sync error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      contacts: data.updated?.map((person: any) => this.parseGoogleContact(person)) || [],
      deletedContacts: data.deleted || [],
      nextSyncToken: data.nextSyncToken,
    };
  }

  // Helper methods
  private parseGoogleContact(person: any): Contact {
    const names = person.names?.[0];
    const organizations = person.organizations?.[0];

    return {
      id: crypto.randomUUID(),
      externalId: person.resourceName,
      connectionId: '', // Set by caller
      organizationId: '', // Set by caller
      displayName:
        names?.displayName ||
        `${names?.givenName || ''} ${names?.familyName || ''}`.trim() ||
        'Unknown Contact',
      firstName: names?.givenName,
      lastName: names?.familyName,
      middleName: names?.middleName,
      nickname: names?.nickname,
      title: organizations?.title,
      company: organizations?.name,
      department: organizations?.department,
      emails:
        person.emailAddresses?.map((email: any, index: number) => ({
          address: email.value,
          type: this.mapGoogleEmailType(email.type),
          isPrimary: index === 0,
        })) || [],
      phones:
        person.phoneNumbers?.map((phone: any, index: number) => ({
          number: phone.value,
          type: this.mapGooglePhoneType(phone.type),
          isPrimary: index === 0,
        })) || [],
      addresses:
        person.addresses?.map((address: any, index: number) => ({
          street: address.streetAddress,
          city: address.city,
          region: address.region,
          postalCode: address.postalCode,
          country: address.country,
          type: this.mapGoogleAddressType(address.type),
          isPrimary: index === 0,
        })) || [],
      websites:
        person.urls?.map((url: any) => ({
          url: url.value,
          type: this.mapGoogleWebsiteType(url.type),
        })) || [],
      birthday: person.birthdays?.[0]?.date
        ? this.parseGoogleDate(person.birthdays[0].date)
        : undefined,
      notes: person.biographies?.[0]?.value,
      socialProfiles: [], // Google People API doesn't provide social profiles directly
      instantMessengers: [], // Not typically available in Google Contacts
      isPrimary: false,
      groups:
        person.memberships?.map((membership: any) => membership.contactGroupResourceName) || [],
      metadata: {
        etag: person.etag,
        resourceName: person.resourceName,
      },
      createdAt: person.metadata?.sources?.[0]?.updateTime
        ? new Date(person.metadata.sources[0].updateTime)
        : new Date(),
      updatedAt: person.metadata?.sources?.[0]?.updateTime
        ? new Date(person.metadata.sources[0].updateTime)
        : new Date(),
      lastSyncedAt: new Date(),
    };
  }

  private convertToGoogleContact(contact: Partial<ContactInput>): any {
    return {
      names:
        contact.displayName || contact.firstName || contact.lastName
          ? [
              {
                displayName: contact.displayName,
                givenName: contact.firstName,
                middleName: contact.middleName,
                familyName: contact.lastName,
                nickname: contact.nickname,
              },
            ]
          : undefined,
      emailAddresses: contact.emails?.map((email, index) => ({
        value: email.address,
        type: this.reverseMapEmailType(email.type),
        metadata: index === 0 ? { primary: true } : undefined,
      })),
      phoneNumbers: contact.phones?.map((phone, index) => ({
        value: phone.number,
        type: this.reverseMapPhoneType(phone.type),
        metadata: index === 0 ? { primary: true } : undefined,
      })),
      addresses: contact.addresses?.map((address, index) => ({
        streetAddress: address.street,
        city: address.city,
        region: address.region,
        postalCode: address.postalCode,
        country: address.country,
        type: this.reverseMapAddressType(address.type),
        metadata: index === 0 ? { primary: true } : undefined,
      })),
      urls: contact.websites?.map((website) => ({
        value: website.url,
        type: this.reverseMapWebsiteType(website.type),
      })),
      birthdays: contact.birthday
        ? [
            {
              date: {
                year: contact.birthday.getFullYear(),
                month: contact.birthday.getMonth() + 1,
                day: contact.birthday.getDate(),
              },
            },
          ]
        : undefined,
      biographies: contact.notes ? [{ value: contact.notes }] : undefined,
      organizations:
        contact.company || contact.title
          ? [
              {
                name: contact.company,
                title: contact.title,
                department: contact.department,
              },
            ]
          : undefined,
    };
  }

  private mapGoogleEmailType(type?: string): 'home' | 'work' | 'other' {
    switch (type?.toLowerCase()) {
      case 'home':
        return 'home';
      case 'work':
        return 'work';
      default:
        return 'other';
    }
  }

  private mapGooglePhoneType(
    type?: string
  ): 'home' | 'work' | 'mobile' | 'main' | 'work_fax' | 'home_fax' | 'pager' | 'other' {
    switch (type?.toLowerCase()) {
      case 'home':
        return 'home';
      case 'work':
        return 'work';
      case 'mobile':
        return 'mobile';
      case 'main':
        return 'main';
      case 'workfax':
        return 'work_fax';
      case 'homefax':
        return 'home_fax';
      case 'pager':
        return 'pager';
      default:
        return 'other';
    }
  }

  private mapGoogleAddressType(type?: string): 'home' | 'work' | 'other' {
    switch (type?.toLowerCase()) {
      case 'home':
        return 'home';
      case 'work':
        return 'work';
      default:
        return 'other';
    }
  }

  private mapGoogleWebsiteType(type?: string): 'home' | 'work' | 'blog' | 'profile' | 'other' {
    switch (type?.toLowerCase()) {
      case 'home':
        return 'home';
      case 'work':
        return 'work';
      case 'blog':
        return 'blog';
      case 'profile':
        return 'profile';
      default:
        return 'other';
    }
  }

  private parseGoogleDate(date: any): Date {
    return new Date(date.year || 2000, (date.month || 1) - 1, date.day || 1);
  }

  private reverseMapEmailType(type: 'home' | 'work' | 'other'): string {
    return type.toUpperCase();
  }

  private reverseMapPhoneType(type: ContactPhone['type']): string {
    const mappings: Record<ContactPhone['type'], string> = {
      home: 'HOME',
      work: 'WORK',
      mobile: 'MOBILE',
      main: 'MAIN',
      work_fax: 'WORKFAX',
      home_fax: 'HOMEFAX',
      pager: 'PAGER',
      other: 'OTHER',
    };
    return mappings[type];
  }

  private reverseMapAddressType(type: ContactAddress['type']): string {
    return type.toUpperCase();
  }

  private reverseMapWebsiteType(type: ContactWebsite['type']): string {
    return type.toUpperCase();
  }
}

// ============================================================================
// OUTLOOK CONTACTS PROVIDER IMPLEMENTATION
// ============================================================================

export class OutlookContactsProvider implements ContactsProvider {
  private baseUrl = 'https://graph.microsoft.com/v1.0';

  async listContacts(
    connection: { accessToken: string; refreshToken?: string },
    options: ContactSearchOptions
  ): Promise<{
    contacts: Contact[];
    totalCount: number;
    hasMore: boolean;
    nextSyncToken?: string;
  }> {
    const params = new URLSearchParams({
      $top: (options.limit || 100).toString(),
      $orderby: 'displayName',
    });

    if (options.query) {
      params.set('$search', `"${options.query}"`);
    }

    const response = await fetch(`${this.baseUrl}/me/contacts?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Outlook Contacts API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      contacts: data.value?.map((contact: any) => this.parseOutlookContact(contact)) || [],
      totalCount: data['@odata.count'] || data.value?.length || 0,
      hasMore: !!data['@odata.nextLink'],
      nextSyncToken: undefined, // Outlook doesn't use sync tokens the same way
    };
  }

  async getContact(
    connection: { accessToken: string; refreshToken?: string },
    contactId: string
  ): Promise<Contact> {
    const response = await fetch(`${this.baseUrl}/me/contacts/${contactId}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Outlook contact: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseOutlookContact(data);
  }

  async createContact(
    connection: { accessToken: string; refreshToken?: string },
    contact: ContactInput
  ): Promise<Contact> {
    const outlookContact = this.convertToOutlookContact(contact);

    const response = await fetch(`${this.baseUrl}/me/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(outlookContact),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create Outlook contact: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return this.parseOutlookContact(data);
  }

  async updateContact(
    connection: { accessToken: string; refreshToken?: string },
    contactId: string,
    updates: Partial<ContactInput>
  ): Promise<Contact> {
    const outlookUpdates = this.convertToOutlookContact(updates);

    const response = await fetch(`${this.baseUrl}/me/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(outlookUpdates),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update Outlook contact: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return this.parseOutlookContact(data);
  }

  async deleteContact(
    connection: { accessToken: string; refreshToken?: string },
    contactId: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/me/contacts/${contactId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to delete Outlook contact: ${response.status} ${response.statusText}`
      );
    }
  }

  async getContactGroups(connection: {
    accessToken: string;
    refreshToken?: string;
  }): Promise<ContactGroup[]> {
    const response = await fetch(`${this.baseUrl}/me/contactFolders`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Outlook contact folders: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    return (
      data.value?.map((folder: any) => ({
        id: folder.id,
        name: folder.displayName,
        description: folder.displayName,
        memberCount: 0, // Not provided in folder metadata
      })) || []
    );
  }

  async getChanges(
    connection: { accessToken: string; refreshToken?: string },
    syncToken: string
  ): Promise<{
    contacts: Contact[];
    deletedContacts: string[];
    nextSyncToken: string;
  }> {
    // Outlook doesn't have a direct equivalent to Google Contacts sync
    // This is a simplified implementation
    const response = await fetch(`${this.baseUrl}/me/contacts?$delta=true`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Outlook Contacts delta sync error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      contacts: data.value?.map((contact: any) => this.parseOutlookContact(contact)) || [],
      deletedContacts: [], // Would need to check for @removed properties
      nextSyncToken: data['@odata.deltaLink'] || syncToken,
    };
  }

  // Helper methods
  private parseOutlookContact(contact: any): Contact {
    return {
      id: crypto.randomUUID(),
      externalId: contact.id,
      connectionId: '', // Set by caller
      organizationId: '', // Set by caller
      displayName:
        contact.displayName ||
        `${contact.givenName || ''} ${contact.surname || ''}`.trim() ||
        'Unknown Contact',
      firstName: contact.givenName,
      lastName: contact.surname,
      middleName: contact.middleName,
      nickname: contact.nickName,
      title: contact.title,
      company: contact.companyName,
      department: contact.department,
      emails:
        contact.emailAddresses?.map((email: any, index: number) => ({
          address: email.address,
          type: this.mapOutlookEmailType(email.name),
          isPrimary: index === 0,
        })) || [],
      phones:
        contact.phoneNumbers?.map((phone: any, index: number) => ({
          number: phone.number,
          type: this.mapOutlookPhoneType(phone.type),
          isPrimary: index === 0,
        })) || [],
      addresses:
        contact.addresses?.map((address: any, index: number) => ({
          street: address.street,
          city: address.city,
          region: address.state,
          postalCode: address.postalCode,
          country: address.countryOrRegion,
          type: this.mapOutlookAddressType(address.type),
          isPrimary: index === 0,
        })) || [],
      websites:
        contact.websites?.map((website: any) => ({
          url: website.address,
          type: this.mapOutlookWebsiteType(website.type),
        })) || [],
      birthday: contact.birthday ? new Date(contact.birthday) : undefined,
      anniversary: contact.anniversary ? new Date(contact.anniversary) : undefined,
      notes: contact.personalNotes,
      socialProfiles: [], // Outlook doesn't provide social profiles directly
      instantMessengers: [], // Not typically available
      isPrimary: false,
      groups: contact.categories || [],
      metadata: {
        changeKey: contact.changeKey,
        createdDateTime: contact.createdDateTime,
        lastModifiedDateTime: contact.lastModifiedDateTime,
      },
      createdAt: contact.createdDateTime ? new Date(contact.createdDateTime) : new Date(),
      updatedAt: contact.lastModifiedDateTime ? new Date(contact.lastModifiedDateTime) : new Date(),
      lastSyncedAt: new Date(),
    };
  }

  private convertToOutlookContact(contact: Partial<ContactInput>): any {
    return {
      displayName: contact.displayName,
      givenName: contact.firstName,
      middleName: contact.middleName,
      surname: contact.lastName,
      nickName: contact.nickname,
      title: contact.title,
      companyName: contact.company,
      department: contact.department,
      emailAddresses: contact.emails?.map((email) => ({
        address: email.address,
        name: this.reverseMapEmailType(email.type),
      })),
      phoneNumbers: contact.phones?.map((phone) => ({
        number: phone.number,
        type: this.reverseMapPhoneType(phone.type),
      })),
      addresses: contact.addresses?.map((address) => ({
        street: address.street,
        city: address.city,
        state: address.region,
        postalCode: address.postalCode,
        countryOrRegion: address.country,
        type: this.reverseMapAddressType(address.type),
      })),
      websites: contact.websites?.map((website) => ({
        address: website.url,
        type: this.reverseMapWebsiteType(website.type),
      })),
      birthday: contact.birthday?.toISOString().substring(0, 10), // YYYY-MM-DD format
      anniversary: contact.anniversary?.toISOString().substring(0, 10),
      personalNotes: contact.notes,
      categories: contact.groups,
    };
  }

  private mapOutlookEmailType(name?: string): 'home' | 'work' | 'other' {
    if (!name) return 'other';
    const lowerName = name.toLowerCase();
    if (lowerName.includes('home')) return 'home';
    if (lowerName.includes('work')) return 'work';
    return 'other';
  }

  private mapOutlookPhoneType(
    type?: string
  ): 'home' | 'work' | 'mobile' | 'main' | 'work_fax' | 'home_fax' | 'pager' | 'other' {
    if (!type) return 'other';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('home')) return 'home';
    if (lowerType.includes('work')) {
      if (lowerType.includes('fax')) return 'work_fax';
      return 'work';
    }
    if (lowerType.includes('mobile')) return 'mobile';
    if (lowerType.includes('main')) return 'main';
    if (lowerType.includes('fax')) return 'home_fax';
    if (lowerType.includes('pager')) return 'pager';
    return 'other';
  }

  private mapOutlookAddressType(type?: string): 'home' | 'work' | 'other' {
    if (!type) return 'other';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('home')) return 'home';
    if (lowerType.includes('work')) return 'work';
    return 'other';
  }

  private mapOutlookWebsiteType(type?: string): 'home' | 'work' | 'blog' | 'profile' | 'other' {
    if (!type) return 'other';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('home')) return 'home';
    if (lowerType.includes('work')) return 'work';
    if (lowerType.includes('blog')) return 'blog';
    if (lowerType.includes('profile')) return 'profile';
    return 'other';
  }

  private reverseMapEmailType(type: 'home' | 'work' | 'other'): string {
    switch (type) {
      case 'home':
        return 'Home';
      case 'work':
        return 'Work';
      case 'other':
        return 'Other';
    }
  }

  private reverseMapPhoneType(type: ContactPhone['type']): string {
    const mappings: Record<ContactPhone['type'], string> = {
      home: 'Home',
      work: 'Work',
      mobile: 'Mobile',
      main: 'Main',
      work_fax: 'WorkFax',
      home_fax: 'HomeFax',
      pager: 'Pager',
      other: 'Other',
    };
    return mappings[type];
  }

  private reverseMapAddressType(type: ContactAddress['type']): string {
    switch (type) {
      case 'home':
        return 'Home';
      case 'work':
        return 'Work';
      case 'other':
        return 'Other';
    }
  }

  private reverseMapWebsiteType(type: ContactWebsite['type']): string {
    switch (type) {
      case 'home':
        return 'Home';
      case 'work':
        return 'Work';
      case 'blog':
        return 'Blog';
      case 'profile':
        return 'Profile';
      case 'other':
        return 'Other';
    }
  }
}

// ============================================================================
// CONTACTS CLIENT FACTORY
// ============================================================================

export function createContactsProvider(
  provider: 'google_workspace' | 'microsoft_365'
): ContactsProvider {
  switch (provider) {
    case 'google_workspace':
      return new GoogleContactsProvider();
    case 'microsoft_365':
      return new OutlookContactsProvider();
    default:
      throw new Error(`Unsupported contacts provider: ${provider}`);
  }
}
