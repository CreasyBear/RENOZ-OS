/**
 * Job Document Processing Utilities
 *
 * Document format detection and classification for job-related files.
 * Adapted from midday document processing patterns for job photos, documents, etc.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface JobDocumentFormat {
  numberFormat: 'us' | 'european'; // 1,234.56 vs 1.234,56
  dateFormat: 'us' | 'european' | 'iso'; // MM/DD/YYYY vs DD/MM/YYYY vs YYYY-MM-DD
  language: string | null;
  currency: string | null;
  fileType: 'image' | 'pdf' | 'document' | 'unknown';
  classification:
    | 'job_photo'
    | 'receipt'
    | 'invoice'
    | 'permit'
    | 'specification'
    | 'contract'
    | 'other';
}

// ============================================================================
// FORMAT DETECTION
// ============================================================================

/**
 * Detect document format from file metadata and content analysis.
 * Adapted from midday format detection for job-specific documents.
 */
export function detectJobDocumentFormat(
  filename: string,
  mimeType: string,
  extractedText?: string
): JobDocumentFormat {
  const format: JobDocumentFormat = {
    numberFormat: 'us',
    dateFormat: 'iso',
    language: null,
    currency: 'AUD', // Default to AUD for Australian jobs
    fileType: 'unknown',
    classification: 'other',
  };

  // Detect file type
  if (mimeType.startsWith('image/')) {
    format.fileType = 'image';
  } else if (mimeType === 'application/pdf') {
    format.fileType = 'pdf';
  } else if (
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('text')
  ) {
    format.fileType = 'document';
  }

  // Classify document based on filename and content
  const filenameLower = filename.toLowerCase();

  if (filenameLower.includes('receipt') || filenameLower.includes('invoice')) {
    format.classification = filenameLower.includes('receipt') ? 'receipt' : 'invoice';
  } else if (
    filenameLower.includes('photo') ||
    filenameLower.includes('before') ||
    filenameLower.includes('after') ||
    filenameLower.includes('site') ||
    filenameLower.includes('progress')
  ) {
    format.classification = 'job_photo';
  } else if (
    filenameLower.includes('permit') ||
    filenameLower.includes('approval') ||
    filenameLower.includes('certificate')
  ) {
    format.classification = 'permit';
  } else if (
    filenameLower.includes('spec') ||
    filenameLower.includes('specification') ||
    filenameLower.includes('requirement')
  ) {
    format.classification = 'specification';
  } else if (filenameLower.includes('contract') || filenameLower.includes('agreement')) {
    format.classification = 'contract';
  }

  // Analyze extracted text for format detection (if available)
  if (extractedText) {
    const textLower = extractedText.toLowerCase();

    // Detect currency mentions
    if (textLower.includes('$') || textLower.includes('aud') || textLower.includes('dollar')) {
      format.currency = 'AUD';
    } else if (textLower.includes('€') || textLower.includes('eur')) {
      format.currency = 'EUR';
      format.numberFormat = 'european';
    } else if (textLower.includes('£') || textLower.includes('gbp')) {
      format.currency = 'GBP';
    }

    // Detect European number format (comma as decimal)
    if (/\d+,\d{2}/.test(extractedText)) {
      format.numberFormat = 'european';
    }

    // Detect European date format
    if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(extractedText)) {
      format.dateFormat = 'european';
    }
  }

  return format;
}

/**
 * Get processing hints for document classification.
 * Adapted from midday format-specific hints.
 */
export function getDocumentProcessingHints(format: JobDocumentFormat): string {
  const hints: string[] = [];

  if (format.numberFormat === 'european') {
    hints.push(
      'NUMBER FORMAT: This document uses European number format (1.234,56). Use comma as decimal separator.'
    );
  }

  if (format.dateFormat === 'european') {
    hints.push('DATE FORMAT: This document likely uses European date format (DD/MM/YYYY).');
  }

  if (format.classification === 'receipt') {
    hints.push('DOCUMENT TYPE: Receipt detected. Extract amounts, dates, and vendor information.');
  } else if (format.classification === 'invoice') {
    hints.push('DOCUMENT TYPE: Invoice detected. Extract invoice number, amounts, due dates.');
  } else if (format.classification === 'job_photo') {
    hints.push('DOCUMENT TYPE: Job photo detected. Tag with location, date, and work completed.');
  } else if (format.classification === 'permit') {
    hints.push('DOCUMENT TYPE: Permit/approval document. Extract approval dates and conditions.');
  }

  return hints.join('\n');
}

// ============================================================================
// CLASSIFICATION UTILITIES
// ============================================================================

/**
 * Classify job document based on filename and content analysis.
 */
export function classifyJobDocument(
  filename: string,
  content?: string
): JobDocumentFormat['classification'] {
  const filenameLower = filename.toLowerCase();
  const contentLower = content?.toLowerCase() || '';

  // Photo classification
  if (
    filenameLower.includes('photo') ||
    filenameLower.includes('img') ||
    filenameLower.includes('pic') ||
    filenameLower.includes('before') ||
    filenameLower.includes('after') ||
    filenameLower.includes('site') ||
    filenameLower.includes('progress') ||
    filenameLower.includes('installation') ||
    filenameLower.includes('completion')
  ) {
    return 'job_photo';
  }

  // Receipt/Invoice classification
  if (
    filenameLower.includes('receipt') ||
    filenameLower.includes('invoice') ||
    contentLower.includes('receipt') ||
    contentLower.includes('invoice') ||
    contentLower.includes('paid') ||
    contentLower.includes('amount due')
  ) {
    return filenameLower.includes('receipt') || contentLower.includes('receipt')
      ? 'receipt'
      : 'invoice';
  }

  // Permit classification
  if (
    filenameLower.includes('permit') ||
    filenameLower.includes('approval') ||
    filenameLower.includes('certificate') ||
    filenameLower.includes('licence') ||
    filenameLower.includes('license') ||
    contentLower.includes('approved') ||
    contentLower.includes('permit') ||
    contentLower.includes('certificate')
  ) {
    return 'permit';
  }

  // Specification classification
  if (
    filenameLower.includes('spec') ||
    filenameLower.includes('specification') ||
    filenameLower.includes('requirement') ||
    filenameLower.includes('drawing') ||
    filenameLower.includes('diagram') ||
    contentLower.includes('specification') ||
    contentLower.includes('requirements')
  ) {
    return 'specification';
  }

  // Contract classification
  if (
    filenameLower.includes('contract') ||
    filenameLower.includes('agreement') ||
    filenameLower.includes('quote') ||
    contentLower.includes('contract') ||
    contentLower.includes('agreement')
  ) {
    return 'contract';
  }

  return 'other';
}

// ============================================================================
// METADATA EXTRACTION
// ============================================================================

/**
 * Extract metadata from job documents for automatic tagging.
 */
export function extractJobDocumentMetadata(
  filename: string,
  extractedText?: string
): {
  tags: string[];
  location?: string;
  date?: string;
  jobNumber?: string;
} {
  const tags: string[] = [];
  let location: string | undefined;
  let date: string | undefined;
  let jobNumber: string | undefined;

  const filenameLower = filename.toLowerCase();
  const text = extractedText || '';

  // Extract job number from filename
  const jobNumberMatch = filename.match(/job[_-]?(\d+)/i) || filename.match(/(\d{4,})/);
  if (jobNumberMatch) {
    jobNumber = jobNumberMatch[1];
    tags.push(`job-${jobNumber}`);
  }

  // Extract dates
  const dateMatches =
    text.match(/\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/g) ||
    text.match(/\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b/g);
  if (dateMatches && dateMatches.length > 0) {
    date = dateMatches[0];
  }

  // Extract location mentions
  const locationPatterns = [
    /\b(?:at|in|location)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi,
    /\b(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g, // Address patterns
  ];

  for (const pattern of locationPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      location = matches[0].replace(/^(?:at|in|location)\s+/i, '');
      break;
    }
  }

  // Add classification-based tags
  const classification = classifyJobDocument(filename, extractedText);
  tags.push(classification);

  // Add work type tags
  if (filenameLower.includes('solar') || filenameLower.includes('panel')) {
    tags.push('solar', 'renewable');
  }
  if (filenameLower.includes('battery') || filenameLower.includes('storage')) {
    tags.push('battery', 'storage');
  }
  if (filenameLower.includes('electrical') || filenameLower.includes('wiring')) {
    tags.push('electrical', 'wiring');
  }
  if (filenameLower.includes('roof') || filenameLower.includes('mounting')) {
    tags.push('roof', 'mounting');
  }

  return {
    tags: [...new Set(tags)], // Remove duplicates
    location,
    date,
    jobNumber,
  };
}

/**
 * Extract a job number from document filename/content.
 */
export function extractJobNumberFromDocument(
  filename: string,
  format: JobDocumentFormat,
  extractedText?: string
): string | undefined {
  void format;
  return extractJobDocumentMetadata(filename, extractedText).jobNumber;
}
