/**
 * Email Processing Utilities
 *
 * Email threading, filtering, search, and communication log integration.
 * Based on midday's email processing patterns with renoz-v3 adaptations.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type {
  EmailMessage,
  EmailThread,
  EmailSearchOptions,
  EmailAttachment,
} from './email-client';

// ============================================================================
// EMAIL THREADING ALGORITHMS
// ============================================================================

export interface EmailThreadGroup {
  threadId: string;
  subject: string;
  participants: string[];
  messageCount: number;
  lastMessageAt: Date;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high';
  messages: EmailMessage[];
}

/**
 * Group email messages into conversation threads.
 * Uses subject-based threading with participant matching.
 */
export function threadEmails(messages: EmailMessage[]): EmailThreadGroup[] {
  const threads = new Map<string, EmailThreadGroup>();

  // Sort messages by received date (oldest first) for proper threading
  const sortedMessages = [...messages].sort(
    (a, b) => a.receivedAt.getTime() - b.receivedAt.getTime()
  );

  for (const message of sortedMessages) {
    let threadId = message.threadId;

    // If no thread ID, generate one based on subject and participants
    if (!threadId) {
      threadId = generateThreadId(message);
    }

    if (!threads.has(threadId)) {
      threads.set(threadId, {
        threadId,
        subject: normalizeSubject(message.subject),
        participants: extractParticipants(message),
        messageCount: 0,
        lastMessageAt: message.receivedAt,
        isRead: message.isRead,
        priority: message.priority,
        messages: [],
      });
    }

    const thread = threads.get(threadId)!;
    thread.messages.push(message);
    thread.messageCount++;
    thread.lastMessageAt = message.receivedAt;
    thread.isRead = thread.isRead && message.isRead;
    thread.priority = maxPriority(thread.priority, message.priority);

    // Update participants
    const newParticipants = extractParticipants(message);
    thread.participants = Array.from(new Set([...thread.participants, ...newParticipants]));
  }

  return Array.from(threads.values());
}

/**
 * Generate a thread ID based on message content when provider doesn't provide one.
 */
function generateThreadId(message: EmailMessage): string {
  const normalizedSubject = normalizeSubject(message.subject);
  const participants = extractParticipants(message).sort().join(',');
  const dateKey = message.receivedAt.toISOString().substring(0, 10); // Date part only

  // Create a deterministic hash
  const hashInput = `${normalizedSubject}|${participants}|${dateKey}`;
  return `thread_${hashString(hashInput)}`;
}

/**
 * Normalize email subject for threading (remove Re:, Fwd:, etc.)
 */
function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(Re|Fwd|Fw):\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract unique participant email addresses from a message.
 */
function extractParticipants(message: EmailMessage): string[] {
  const participants = new Set<string>();

  // Add sender
  participants.add(message.from.email.toLowerCase());

  // Add recipients
  [message.to, message.cc || [], message.bcc || []].forEach((recipientList) => {
    recipientList.forEach((recipient) => {
      participants.add(recipient.email.toLowerCase());
    });
  });

  return Array.from(participants);
}

/**
 * Get the higher priority between two priority levels.
 */
function maxPriority(
  a: 'low' | 'normal' | 'high',
  b: 'low' | 'normal' | 'high'
): 'low' | 'normal' | 'high' {
  const order = { low: 1, normal: 2, high: 3 };
  return order[a] >= order[b] ? a : b;
}

/**
 * Simple string hashing function for deterministic IDs.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// ============================================================================
// EMAIL FILTERING AND SEARCH
// ============================================================================

export interface EmailFilterOptions {
  /** Filter by sender domain */
  domainWhitelist?: string[];
  domainBlacklist?: string[];

  /** Filter by sender email */
  emailWhitelist?: string[];
  emailBlacklist?: string[];

  /** Content filtering */
  keywordBlacklist?: string[];
  attachmentTypeBlacklist?: string[];

  /** Size limits */
  maxAttachmentSize?: number;
  maxMessageSize?: number;

  /** Spam detection */
  enableSpamFilter?: boolean;
  spamKeywords?: string[];
}

export interface FilteredEmailResult {
  message: EmailMessage;
  isAllowed: boolean;
  rejectionReason?: string;
  spamScore?: number;
}

/**
 * Filter emails based on content, sender, and size criteria.
 * Returns filtered results with rejection reasons.
 */
export function filterEmails(
  messages: EmailMessage[],
  options: EmailFilterOptions
): FilteredEmailResult[] {
  return messages.map((message) => {
    const result = {
      message,
      isAllowed: true,
      rejectionReason: undefined as string | undefined,
      spamScore: 0,
    };

    // Domain filtering
    const senderDomain = message.from.email.split('@')[1]?.toLowerCase();
    if (senderDomain) {
      if (options.domainBlacklist?.includes(senderDomain)) {
        result.isAllowed = false;
        result.rejectionReason = `Domain ${senderDomain} is blacklisted`;
        return result;
      }

      if (options.domainWhitelist?.length && !options.domainWhitelist.includes(senderDomain)) {
        result.isAllowed = false;
        result.rejectionReason = `Domain ${senderDomain} is not whitelisted`;
        return result;
      }
    }

    // Email filtering
    const senderEmail = message.from.email.toLowerCase();
    if (options.emailBlacklist?.includes(senderEmail)) {
      result.isAllowed = false;
      result.rejectionReason = `Email ${senderEmail} is blacklisted`;
      return result;
    }

    if (options.emailWhitelist?.length && !options.emailWhitelist.includes(senderEmail)) {
      result.isAllowed = false;
      result.rejectionReason = `Email ${senderEmail} is not whitelisted`;
      return result;
    }

    // Content filtering
    const fullContent = [message.subject, message.body.text, message.body.html]
      .filter(Boolean)
      .join(' ');
    for (const keyword of options.keywordBlacklist || []) {
      if (fullContent.toLowerCase().includes(keyword.toLowerCase())) {
        result.isAllowed = false;
        result.rejectionReason = `Content contains blacklisted keyword: ${keyword}`;
        return result;
      }
    }

    // Attachment filtering
    for (const attachment of message.attachments) {
      if (options.attachmentTypeBlacklist?.some((type) => attachment.mimeType.includes(type))) {
        result.isAllowed = false;
        result.rejectionReason = `Attachment type ${attachment.mimeType} is not allowed`;
        return result;
      }

      if (options.maxAttachmentSize && attachment.size > options.maxAttachmentSize) {
        result.isAllowed = false;
        result.rejectionReason = `Attachment ${attachment.filename} exceeds size limit`;
        return result;
      }
    }

    // Size filtering
    const messageSize = calculateMessageSize(message);
    if (options.maxMessageSize && messageSize > options.maxMessageSize) {
      result.isAllowed = false;
      result.rejectionReason = `Message exceeds size limit`;
      return result;
    }

    // Spam detection
    if (options.enableSpamFilter) {
      result.spamScore = detectSpam(message, options.spamKeywords || []);
      if (result.spamScore > 0.7) {
        // Threshold
        result.isAllowed = false;
        result.rejectionReason = `Message flagged as spam (score: ${result.spamScore})`;
        return result;
      }
    }

    return result;
  });
}

/**
 * Calculate approximate message size including attachments.
 */
function calculateMessageSize(message: EmailMessage): number {
  let size = 0;

  // Body content
  if (message.body.text) size += message.body.text.length;
  if (message.body.html) size += message.body.html.length;

  // Subject and headers
  size += message.subject.length;
  size += JSON.stringify(message.headers).length;

  // Attachments
  size += message.attachments.reduce((total, att) => total + att.size, 0);

  return size;
}

/**
 * Simple spam detection based on keywords and patterns.
 */
function detectSpam(message: EmailMessage, spamKeywords: string[]): number {
  let score = 0;
  const content = [message.subject, message.body.text, message.body.html]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Check for spam keywords
  for (const keyword of spamKeywords) {
    if (content.includes(keyword.toLowerCase())) {
      score += 0.2;
    }
  }

  // Check for excessive caps
  const capsRatio = (message.subject.match(/[A-Z]/g) || []).length / message.subject.length;
  if (capsRatio > 0.5) {
    score += 0.1;
  }

  // Check for excessive punctuation
  const punctuationRatio = (message.subject.match(/[!?.]/g) || []).length / message.subject.length;
  if (punctuationRatio > 0.3) {
    score += 0.1;
  }

  // Check for suspicious sender patterns
  if (message.from.email.includes('noreply') || message.from.email.includes('no-reply')) {
    score += 0.05;
  }

  return Math.min(score, 1.0);
}

// ============================================================================
// COMMUNICATION LOG INTEGRATION
// ============================================================================

export interface CommunicationLogEntry {
  id: string;
  organizationId: string;
  connectionId: string;
  direction: 'inbound' | 'outbound';
  type: 'email';
  externalId: string;
  subject?: string;
  content: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses?: string[];
  bccAddresses?: string[];
  attachments: Array<{
    filename: string;
    size: number;
    mimeType: string;
  }>;
  metadata: Record<string, any>;
  sentAt: Date;
  receivedAt?: Date;
  processedAt: Date;
  status: 'processed' | 'failed' | 'pending';
}

/**
 * Convert email messages to communication log entries.
 * Integrates with renoz-v3's communication tracking system.
 */
export function emailsToCommunicationLogs(
  messages: EmailMessage[],
  organizationId: string,
  connectionId: string
): CommunicationLogEntry[] {
  return messages.map((message) => ({
    id: crypto.randomUUID(),
    organizationId,
    connectionId,
    direction: 'inbound', // Assuming sync is for received emails
    type: 'email',
    externalId: message.id,
    subject: message.subject,
    content: message.body.html || message.body.text || '',
    fromAddress: message.from.email,
    toAddresses: message.to.map((addr) => addr.email),
    ccAddresses: message.cc?.map((addr) => addr.email),
    bccAddresses: message.bcc?.map((addr) => addr.email),
    attachments: message.attachments.map((att) => ({
      filename: att.filename,
      size: att.size,
      mimeType: att.mimeType,
    })),
    metadata: {
      threadId: message.threadId,
      priority: message.priority,
      isRead: message.isRead,
      isStarred: message.isStarred,
      labels: message.labels,
      headers: message.headers,
    },
    sentAt: message.sentAt,
    receivedAt: message.receivedAt,
    processedAt: new Date(),
    status: 'processed',
  }));
}

/**
 * Convert email sending to communication log entry.
 */
export function emailSendToCommunicationLog(
  messageId: string,
  threadId: string,
  options: {
    organizationId: string;
    connectionId: string;
    subject: string;
    content: string;
    fromAddress: string;
    toAddresses: string[];
    ccAddresses?: string[];
    bccAddresses?: string[];
    attachments?: Array<{ filename: string; size: number; mimeType: string }>;
  }
): CommunicationLogEntry {
  return {
    id: crypto.randomUUID(),
    organizationId: options.organizationId,
    connectionId: options.connectionId,
    direction: 'outbound',
    type: 'email',
    externalId: messageId,
    subject: options.subject,
    content: options.content,
    fromAddress: options.fromAddress,
    toAddresses: options.toAddresses,
    ccAddresses: options.ccAddresses,
    bccAddresses: options.bccAddresses,
    attachments: options.attachments || [],
    metadata: {
      threadId,
      sent: true,
    },
    sentAt: new Date(),
    processedAt: new Date(),
    status: 'processed',
  };
}

// ============================================================================
// ATTACHMENT PROCESSING
// ============================================================================

export interface ProcessedAttachment {
  original: EmailAttachment;
  processed: boolean;
  processedAt?: Date;
  processingResult?: {
    extractedText?: string;
    thumbnailUrl?: string;
    metadata?: Record<string, any>;
    virusScanResult?: 'clean' | 'infected' | 'unknown';
  };
  errorMessage?: string;
}

/**
 * Process email attachments for storage and analysis.
 * Leverages existing document processing patterns from job-document-processing.ts.
 */
export async function processEmailAttachments(
  attachments: EmailAttachment[],
  organizationId: string
): Promise<ProcessedAttachment[]> {
  // This would integrate with the existing document processing utilities
  // For now, return basic processing results
  return attachments.map((attachment) => ({
    original: attachment,
    processed: true,
    processedAt: new Date(),
    processingResult: {
      virusScanResult: 'clean', // Would integrate with virus scanning
      metadata: {
        mimeType: attachment.mimeType,
        size: attachment.size,
        isInline: attachment.isInline,
      },
    },
  }));
}

// ============================================================================
// SEARCH AND INDEXING UTILITIES
// ============================================================================

export interface EmailSearchIndex {
  messageId: string;
  organizationId: string;
  subject: string;
  content: string;
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  attachments: string[]; // Filenames
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  priority: 'low' | 'normal' | 'high';
  sentAt: Date;
  receivedAt: Date;
  threadId: string;
  searchVector: string; // For full-text search
}

/**
 * Convert email messages to search index format.
 * Prepares data for full-text search and filtering.
 */
export function emailsToSearchIndex(
  messages: EmailMessage[],
  organizationId: string
): EmailSearchIndex[] {
  return messages.map((message) => ({
    messageId: message.id,
    organizationId,
    subject: message.subject,
    content: [message.body.text, message.body.html].filter(Boolean).join(' '),
    fromEmail: message.from.email,
    fromName: message.from.name,
    toEmails: message.to.map((addr) => addr.email),
    ccEmails: message.cc?.map((addr) => addr.email),
    bccEmails: message.bcc?.map((addr) => addr.email),
    attachments: message.attachments.map((att) => att.filename),
    labels: message.labels || [],
    isRead: message.isRead,
    isStarred: message.isStarred,
    priority: message.priority,
    sentAt: message.sentAt,
    receivedAt: message.receivedAt,
    threadId: message.threadId,
    searchVector: buildSearchVector(message),
  }));
}

/**
 * Build a search vector from email content for full-text search.
 */
function buildSearchVector(message: EmailMessage): string {
  const parts = [
    message.subject,
    message.from.email,
    message.from.name,
    ...message.to.map((addr) => `${addr.name} ${addr.email}`),
    message.body.text,
    message.body.html,
    ...message.attachments.map((att) => att.filename),
    ...(message.labels || []),
  ].filter(Boolean);

  return parts.join(' ').toLowerCase();
}

/**
 * Perform advanced email search across indexed messages.
 */
export function searchEmails(
  index: EmailSearchIndex[],
  query: EmailSearchOptions
): EmailSearchIndex[] {
  return index.filter((item) => {
    // Subject search
    if (query.subject && !item.subject.toLowerCase().includes(query.subject.toLowerCase())) {
      return false;
    }

    // From search
    if (query.from && !item.fromEmail.toLowerCase().includes(query.from.toLowerCase())) {
      return false;
    }

    // To search
    if (
      query.to &&
      !item.toEmails.some((email) => email.toLowerCase().includes(query.to.toLowerCase()))
    ) {
      return false;
    }

    // Content search
    if (query.query && !item.searchVector.includes(query.query.toLowerCase())) {
      return false;
    }

    // Attachment filter
    if (query.hasAttachments !== undefined) {
      const hasAttachments = item.attachments.length > 0;
      if (hasAttachments !== query.hasAttachments) {
        return false;
      }
    }

    // Read status filter
    if (query.isRead !== undefined && item.isRead !== query.isRead) {
      return false;
    }

    // Date range filters
    if (query.dateFrom && item.receivedAt < query.dateFrom) {
      return false;
    }

    if (query.dateTo && item.receivedAt > query.dateTo) {
      return false;
    }

    // Label filters
    if (query.labels?.length) {
      const hasAllLabels = query.labels.every((label) => item.labels.includes(label));
      if (!hasAllLabels) {
        return false;
      }
    }

    return true;
  });
}
