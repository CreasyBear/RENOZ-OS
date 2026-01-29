'use server'

/**
 * Email Client Abstraction
 *
 * Provider-agnostic email operations for Gmail and Outlook APIs.
 * Handles message fetching, sending, threading, and attachment processing.
 */

// ============================================================================
// EMAIL DATA TYPES
// ============================================================================

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  body: {
    text?: string;
    html?: string;
  };
  attachments: EmailAttachment[];
  labels?: string[];
  isRead: boolean;
  isStarred: boolean;
  priority: 'low' | 'normal' | 'high';
  sentAt: Date;
  receivedAt: Date;
  headers: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  contentId?: string; // For inline attachments
  isInline: boolean;
  data?: Buffer; // For downloaded content
  url?: string; // For external links
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: EmailAddress[];
  messageCount: number;
  lastMessageAt: Date;
  isRead: boolean;
  labels?: string[];
  messages: EmailMessage[];
}

export interface EmailSearchOptions {
  query?: string;
  from?: string;
  to?: string;
  subject?: string;
  hasAttachments?: boolean;
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  labels?: string[];
  limit?: number;
  offset?: number;
}

export interface EmailSendOptions {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: {
    text?: string;
    html?: string;
  };
  attachments?: EmailAttachmentInput[];
  replyToMessageId?: string;
  threadId?: string;
}

export interface EmailAttachmentInput {
  filename: string;
  mimeType: string;
  data: Buffer;
  contentId?: string; // For inline attachments
}

// ============================================================================
// EMAIL PROVIDER INTERFACE
// ============================================================================

export interface EmailProvider {
  /**
   * List email messages with filtering and pagination
   */
  listMessages(
    connection: { accessToken: string; refreshToken?: string },
    options: EmailSearchOptions
  ): Promise<{
    messages: EmailMessage[];
    totalCount: number;
    hasMore: boolean;
    nextPageToken?: string;
  }>;

  /**
   * Get a specific email message with full details
   */
  getMessage(
    connection: { accessToken: string; refreshToken?: string },
    messageId: string
  ): Promise<EmailMessage>;

  /**
   * Get email threads/conversations
   */
  getThreads(
    connection: { accessToken: string; refreshToken?: string },
    options: {
      limit?: number;
      query?: string;
    }
  ): Promise<EmailThread[]>;

  /**
   * Send an email message
   */
  sendMessage(
    connection: { accessToken: string; refreshToken?: string },
    options: EmailSendOptions
  ): Promise<{ messageId: string; threadId: string }>;

  /**
   * Download email attachment
   */
  downloadAttachment(
    connection: { accessToken: string; refreshToken?: string },
    messageId: string,
    attachmentId: string
  ): Promise<Buffer>;

  /**
   * Mark messages as read/unread
   */
  markAsRead(
    connection: { accessToken: string; refreshToken?: string },
    messageIds: string[],
    read: boolean
  ): Promise<void>;

  /**
   * Add/remove labels or categories
   */
  modifyLabels(
    connection: { accessToken: string; refreshToken?: string },
    messageIds: string[],
    addLabels?: string[],
    removeLabels?: string[]
  ): Promise<void>;

  /**
   * Delete messages
   */
  deleteMessages(
    connection: { accessToken: string; refreshToken?: string },
    messageIds: string[]
  ): Promise<void>;
}

// ============================================================================
// GMAIL PROVIDER IMPLEMENTATION
// ============================================================================

export class GmailProvider implements EmailProvider {
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';

  async listMessages(
    connection: { accessToken: string; refreshToken?: string },
    options: EmailSearchOptions
  ): Promise<{
    messages: EmailMessage[];
    totalCount: number;
    hasMore: boolean;
    nextPageToken?: string;
  }> {
    // Build Gmail search query
    const query = this.buildGmailQuery(options);

    const params = new URLSearchParams({
      q: query,
      maxResults: (options.limit || 50).toString(),
    });

    if (options.offset) {
      // Gmail uses page tokens, not offsets - this would need proper implementation
      params.set('pageToken', options.offset.toString());
    }

    const response = await fetch(`${this.baseUrl}/messages?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Get full message details for each message
    const messages: EmailMessage[] = [];
    for (const message of data.messages || []) {
      try {
        const fullMessage = await this.getMessage(connection, message.id);
        messages.push(fullMessage);
      } catch (error) {
        console.warn(`Failed to fetch message ${message.id}:`, error);
      }
    }

    return {
      messages,
      totalCount: data.resultSizeEstimate || messages.length,
      hasMore: !!data.nextPageToken,
      nextPageToken: data.nextPageToken,
    };
  }

  async getMessage(
    connection: { accessToken: string; refreshToken?: string },
    messageId: string
  ): Promise<EmailMessage> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}?format=full`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Gmail message: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseGmailMessage(data);
  }

  async getThreads(
    connection: { accessToken: string; refreshToken?: string },
    options: { limit?: number; query?: string }
  ): Promise<EmailThread[]> {
    const params = new URLSearchParams({
      maxResults: (options.limit || 50).toString(),
    });

    if (options.query) {
      params.set('q', options.query);
    }

    const response = await fetch(`${this.baseUrl}/threads?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Gmail threads: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const threads: EmailThread[] = [];

    for (const thread of data.threads || []) {
      try {
        const fullThread = await this.getThreadDetails(connection, thread.id);
        threads.push(fullThread);
      } catch (error) {
        console.warn(`Failed to fetch thread ${thread.id}:`, error);
      }
    }

    return threads;
  }

  async sendMessage(
    connection: { accessToken: string; refreshToken?: string },
    options: EmailSendOptions
  ): Promise<{ messageId: string; threadId: string }> {
    const mimeMessage = this.buildMimeMessage(options);

    const response = await fetch(`${this.baseUrl}/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: Buffer.from(mimeMessage).toString('base64url'),
        threadId: options.threadId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send Gmail message: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      messageId: data.id,
      threadId: data.threadId,
    };
  }

  async downloadAttachment(
    connection: { accessToken: string; refreshToken?: string },
    messageId: string,
    attachmentId: string
  ): Promise<Buffer> {
    const response = await fetch(
      `${this.baseUrl}/messages/${messageId}/attachments/${attachmentId}`,
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to download Gmail attachment: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return Buffer.from(data.data, 'base64url');
  }

  async markAsRead(
    connection: { accessToken: string; refreshToken?: string },
    messageIds: string[],
    read: boolean
  ): Promise<void> {
    const requests = messageIds.map(() => ({
      removeLabelIds: read ? [] : ['UNREAD'],
      addLabelIds: read ? [] : ['UNREAD'],
    }));

    // Gmail API allows batch operations
    for (const request of requests) {
      // This is simplified - would need proper batch implementation
      await fetch(`${this.baseUrl}/messages/${messageIds[0]}/modify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
    }
  }

  async modifyLabels(
    connection: { accessToken: string; refreshToken?: string },
    messageIds: string[],
    addLabels?: string[],
    removeLabels?: string[]
  ): Promise<void> {
    const request = {
      removeLabelIds: removeLabels || [],
      addLabelIds: addLabels || [],
    };

    for (const messageId of messageIds) {
      await fetch(`${this.baseUrl}/messages/${messageId}/modify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
    }
  }

  async deleteMessages(
    connection: { accessToken: string; refreshToken?: string },
    messageIds: string[]
  ): Promise<void> {
    for (const messageId of messageIds) {
      await fetch(`${this.baseUrl}/messages/${messageId}/trash`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }
  }

  // Helper methods
  private buildGmailQuery(options: EmailSearchOptions): string {
    const queryParts: string[] = [];

    if (options.query) queryParts.push(options.query);
    if (options.from) queryParts.push(`from:${options.from}`);
    if (options.to) queryParts.push(`to:${options.to}`);
    if (options.subject) queryParts.push(`subject:${options.subject}`);
    if (options.hasAttachments) queryParts.push('has:attachment');
    if (options.isRead !== undefined) queryParts.push(options.isRead ? '' : 'is:unread');
    if (options.dateFrom) queryParts.push(`after:${options.dateFrom.getTime() / 1000}`);
    if (options.dateTo) queryParts.push(`before:${options.dateTo.getTime() / 1000}`);
    if (options.labels?.length)
      queryParts.push(options.labels.map((label) => `label:${label}`).join(' '));

    return queryParts.join(' ');
  }

  private parseGmailMessage(data: any): EmailMessage {
    const headers = this.parseHeaders(data.payload.headers || []);

    return {
      id: data.id,
      threadId: data.threadId,
      subject: headers.subject || '(no subject)',
      from: this.parseEmailAddress(headers.from),
      to: this.parseEmailAddresses(headers.to),
      cc: headers.cc ? this.parseEmailAddresses(headers.cc) : undefined,
      bcc: headers.bcc ? this.parseEmailAddresses(headers.bcc) : undefined,
      body: this.extractBody(data.payload),
      attachments: this.extractAttachments(data.payload),
      labels: data.labelIds || [],
      isRead: !data.labelIds?.includes('UNREAD'),
      isStarred: data.labelIds?.includes('STARRED') || false,
      priority: this.extractPriority(headers),
      sentAt: new Date(parseInt(data.internalDate)),
      receivedAt: new Date(parseInt(data.internalDate)),
      headers,
    };
  }

  private parseHeaders(headers: any[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const header of headers) {
      result[header.name.toLowerCase()] = header.value;
    }
    return result;
  }

  private parseEmailAddress(address: string): EmailAddress {
    const match =
      address.match(/(?:"?([^"<]+)"?\s*)?<([^>]+)>/) || address.match(/([^<]+)<([^>]+)>/);
    if (match) {
      return {
        name: match[1]?.trim(),
        email: match[2].trim(),
      };
    }
    return { email: address.trim() };
  }

  private parseEmailAddresses(addresses: string): EmailAddress[] {
    return addresses
      .split(',')
      .map((addr) => this.parseEmailAddress(addr.trim()))
      .filter((addr) => addr.email);
  }

  private extractBody(payload: any): { text?: string; html?: string } {
    const body: { text?: string; html?: string } = {};

    if (payload.body?.data) {
      if (payload.mimeType === 'text/plain') {
        body.text = Buffer.from(payload.body.data, 'base64url').toString();
      } else if (payload.mimeType === 'text/html') {
        body.html = Buffer.from(payload.body.data, 'base64url').toString();
      }
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data && !body.text) {
          body.text = Buffer.from(part.body.data, 'base64url').toString();
        } else if (part.mimeType === 'text/html' && part.body?.data && !body.html) {
          body.html = Buffer.from(part.body.data, 'base64url').toString();
        }
      }
    }

    return body;
  }

  private extractAttachments(payload: any): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size || 0,
            isInline:
              part.headers?.some(
                (h: any) => h.name === 'Content-Disposition' && h.value.includes('inline')
              ) || false,
          });
        }
      }
    }

    return attachments;
  }

  private extractPriority(headers: Record<string, string>): 'low' | 'normal' | 'high' {
    const priority = headers['x-priority'] || headers['importance'] || headers['x-msmail-priority'];
    if (priority) {
      const lowerPriority = priority.toLowerCase();
      if (lowerPriority.includes('high') || lowerPriority.includes('1')) return 'high';
      if (lowerPriority.includes('low') || lowerPriority.includes('5')) return 'low';
    }
    return 'normal';
  }

  private async getThreadDetails(
    connection: { accessToken: string; refreshToken?: string },
    threadId: string
  ): Promise<EmailThread> {
    const response = await fetch(`${this.baseUrl}/threads/${threadId}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Gmail thread: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const messages = data.messages.map((msg: any) => this.parseGmailMessage(msg));

    return {
      id: threadId,
      subject: messages[0]?.subject || '(no subject)',
      participants: this.extractParticipants(messages),
      messageCount: messages.length,
      lastMessageAt: messages[messages.length - 1]?.receivedAt || new Date(),
      isRead: messages.every((msg: EmailMessage) => msg.isRead),
      labels: messages[0]?.labels,
      messages,
    };
  }

  private extractParticipants(messages: EmailMessage[]): EmailAddress[] {
    const participants = new Map<string, EmailAddress>();

    for (const message of messages) {
      [message.from, ...message.to, ...(message.cc || []), ...(message.bcc || [])].forEach(
        (addr) => {
          if (!participants.has(addr.email)) {
            participants.set(addr.email, addr);
          }
        }
      );
    }

    return Array.from(participants.values());
  }

  private buildMimeMessage(options: EmailSendOptions): string {
    // This would build a proper MIME message - simplified for now
    const boundary = `boundary_${Date.now()}`;
    let message = `To: ${options.to.map((addr) => addr.email).join(', ')}\r\n`;

    if (options.cc?.length) {
      message += `Cc: ${options.cc.map((addr) => addr.email).join(', ')}\r\n`;
    }

    message += `Subject: ${options.subject}\r\n`;
    message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

    // Text part
    if (options.body.text) {
      message += `--${boundary}\r\n`;
      message += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      message += `${options.body.text}\r\n\r\n`;
    }

    // HTML part
    if (options.body.html) {
      message += `--${boundary}\r\n`;
      message += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
      message += `${options.body.html}\r\n\r\n`;
    }

    // Attachments would be added here

    message += `--${boundary}--\r\n`;

    return message;
  }
}

// ============================================================================
// OUTLOOK PROVIDER IMPLEMENTATION
// ============================================================================

export class OutlookProvider implements EmailProvider {
  private baseUrl = 'https://graph.microsoft.com/v1.0';

  async listMessages(
    connection: { accessToken: string; refreshToken?: string },
    options: EmailSearchOptions
  ): Promise<{
    messages: EmailMessage[];
    totalCount: number;
    hasMore: boolean;
    nextPageToken?: string;
  }> {
    const params = new URLSearchParams({
      $top: (options.limit || 50).toString(),
      $orderby: 'receivedDateTime desc',
    });

    if (options.offset) {
      params.set('$skip', options.offset.toString());
    }

    // Build filter query
    const filters: string[] = [];

    if (options.query) filters.push(`contains(subject,'${options.query}')`);
    if (options.from) filters.push(`contains(from/emailAddress/address,'${options.from}')`);
    if (options.to) filters.push(`contains(toRecipients,'${options.to}')`);
    if (options.subject) filters.push(`contains(subject,'${options.subject}')`);
    if (options.hasAttachments !== undefined)
      filters.push(`hasAttachments eq ${options.hasAttachments}`);
    if (options.isRead !== undefined) filters.push(`isRead eq ${options.isRead}`);
    if (options.dateFrom) filters.push(`receivedDateTime ge ${options.dateFrom.toISOString()}`);
    if (options.dateTo) filters.push(`receivedDateTime le ${options.dateTo.toISOString()}`);

    if (filters.length > 0) {
      params.set('$filter', filters.join(' and '));
    }

    const response = await fetch(`${this.baseUrl}/me/messages?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Outlook API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      messages: data.value.map((msg: any) => this.parseOutlookMessage(msg)),
      totalCount: data['@odata.count'] || data.value.length,
      hasMore: !!data['@odata.nextLink'],
      nextPageToken: data['@odata.nextLink'],
    };
  }

  async getMessage(
    connection: { accessToken: string; refreshToken?: string },
    messageId: string
  ): Promise<EmailMessage> {
    const response = await fetch(`${this.baseUrl}/me/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Outlook message: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseOutlookMessage(data);
  }

  async getThreads(
    connection: { accessToken: string; refreshToken?: string },
    options: { limit?: number; query?: string }
  ): Promise<EmailThread[]> {
    // Outlook doesn't have explicit thread support like Gmail
    // We'll group messages by subject and conversation
    const { messages } = await this.listMessages(connection, {
      limit: options.limit || 50,
      query: options.query,
    });

    // Group messages into threads (simplified)
    const threads = new Map<string, EmailMessage[]>();

    for (const message of messages) {
      const threadKey = message.threadId || message.subject;
      if (!threads.has(threadKey)) {
        threads.set(threadKey, []);
      }
      threads.get(threadKey)!.push(message);
    }

    return Array.from(threads.entries()).map(([id, messages]) => ({
      id,
      subject: messages[0].subject,
      participants: this.extractParticipants(messages),
      messageCount: messages.length,
      lastMessageAt: messages[0].receivedAt,
      isRead: messages.every((msg: EmailMessage) => msg.isRead),
      messages,
    }));
  }

  async sendMessage(
    connection: { accessToken: string; refreshToken?: string },
    options: EmailSendOptions
  ): Promise<{ messageId: string; threadId: string }> {
    const messageData = {
      subject: options.subject,
      body: {
        contentType: options.body.html ? 'HTML' : 'Text',
        content: options.body.html || options.body.text || '',
      },
      toRecipients: options.to.map((addr) => ({
        emailAddress: {
          address: addr.email,
          name: addr.name,
        },
      })),
      ccRecipients: options.cc?.map((addr) => ({
        emailAddress: {
          address: addr.email,
          name: addr.name,
        },
      })),
      bccRecipients: options.bcc?.map((addr) => ({
        emailAddress: {
          address: addr.email,
          name: addr.name,
        },
      })),
    };

    const response = await fetch(`${this.baseUrl}/me/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: messageData }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send Outlook message: ${response.status} ${response.statusText}`);
    }

    // Outlook doesn't return the message ID in sendMail response
    // We'd need to search for the sent message or use a different approach
    return {
      messageId: `sent-${Date.now()}`,
      threadId: options.threadId || `thread-${Date.now()}`,
    };
  }

  async downloadAttachment(
    connection: { accessToken: string; refreshToken?: string },
    messageId: string,
    attachmentId: string
  ): Promise<Buffer> {
    const response = await fetch(
      `${this.baseUrl}/me/messages/${messageId}/attachments/${attachmentId}/$value`,
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to download Outlook attachment: ${response.status} ${response.statusText}`
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async markAsRead(
    connection: { accessToken: string; refreshToken?: string },
    messageIds: string[],
    read: boolean
  ): Promise<void> {
    for (const messageId of messageIds) {
      await fetch(`${this.baseUrl}/me/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: read }),
      });
    }
  }

  async modifyLabels(
    connection: { accessToken: string; refreshToken?: string },
    messageIds: string[],
    addLabels?: string[],
    _removeLabels?: string[]
  ): Promise<void> {
    // Outlook uses categories instead of labels
    // This is simplified - would need proper category mapping
    for (const messageId of messageIds) {
      const updateData: any = {};

      if (addLabels?.length) {
        updateData.categories = addLabels;
      }

      if (Object.keys(updateData).length > 0) {
        await fetch(`${this.baseUrl}/me/messages/${messageId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });
      }
    }
  }

  async deleteMessages(
    connection: { accessToken: string; refreshToken?: string },
    messageIds: string[]
  ): Promise<void> {
    for (const messageId of messageIds) {
      await fetch(`${this.baseUrl}/me/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      });
    }
  }

  // Helper methods
  private parseOutlookMessage(data: any): EmailMessage {
    return {
      id: data.id,
      threadId: data.conversationId || data.id,
      subject: data.subject || '(no subject)',
      from: {
        name: data.from?.emailAddress?.name,
        email: data.from?.emailAddress?.address || '',
      },
      to:
        data.toRecipients?.map((recipient: any) => ({
          name: recipient.emailAddress?.name,
          email: recipient.emailAddress?.address || '',
        })) || [],
      cc: data.ccRecipients?.map((recipient: any) => ({
        name: recipient.emailAddress?.name,
        email: recipient.emailAddress?.address || '',
      })),
      bcc: data.bccRecipients?.map((recipient: any) => ({
        name: recipient.emailAddress?.name,
        email: recipient.emailAddress?.address || '',
      })),
      body: {
        text: data.bodyPreview,
        html: data.body?.contentType === 'html' ? data.body.content : undefined,
      },
      attachments:
        data.attachments?.map((att: any) => ({
          id: att.id,
          filename: att.name,
          mimeType: att.contentType,
          size: att.size,
          isInline: att.isInline || false,
        })) || [],
      labels: data.categories || [],
      isRead: data.isRead || false,
      isStarred: data.flag?.flagStatus === 'flagged',
      priority: this.mapOutlookPriority(data.importance),
      sentAt: new Date(data.sentDateTime),
      receivedAt: new Date(data.receivedDateTime),
      headers: {}, // Outlook doesn't expose headers directly
      metadata: {
        internetMessageId: data.internetMessageId,
        conversationId: data.conversationId,
      },
    };
  }

  private mapOutlookPriority(outlookPriority: string): 'low' | 'normal' | 'high' {
    switch (outlookPriority) {
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      default:
        return 'normal';
    }
  }

  private extractParticipants(messages: EmailMessage[]): EmailAddress[] {
    const participants = new Map<string, EmailAddress>();

    for (const message of messages) {
      [message.from, ...message.to, ...(message.cc || []), ...(message.bcc || [])].forEach(
        (addr) => {
          if (addr.email && !participants.has(addr.email)) {
            participants.set(addr.email, addr);
          }
        }
      );
    }

    return Array.from(participants.values());
  }
}

// ============================================================================
// EMAIL CLIENT FACTORY
// ============================================================================

export function createEmailProvider(provider: 'google_workspace' | 'microsoft_365'): EmailProvider {
  switch (provider) {
    case 'google_workspace':
      return new GmailProvider();
    case 'microsoft_365':
      return new OutlookProvider();
    default:
      throw new Error(`Unsupported email provider: ${provider}`);
  }
}
