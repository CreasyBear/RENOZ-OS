/**
 * Contacts Deduplication Algorithms
 *
 * Advanced contact deduplication using multiple matching strategies,
 * fuzzy matching, and machine learning-inspired similarity scoring.
 */

import type { Contact } from './contacts-client';

// ============================================================================
// DEDUPLICATION CONFIGURATION
// ============================================================================

export interface DeduplicationConfig {
  /** Whether deduplication is enabled */
  enabled: boolean;

  /** Similarity threshold for considering contacts duplicates (0-1) */
  similarityThreshold: number;

  /** Whether to merge duplicate contacts automatically */
  autoMerge: boolean;

  /** Conflict resolution strategy when merging */
  conflictResolution: 'newest_wins' | 'oldest_wins' | 'manual' | 'most_complete';

  /** Whether to preserve original contact data in metadata */
  preserveOriginalData: boolean;

  /** Maximum number of potential matches to consider per contact */
  maxCandidatesPerContact: number;

  /** Field weights for similarity scoring */
  fieldWeights: {
    name: number;
    email: number;
    phone: number;
    address: number;
    company: number;
  };
}

export const DEFAULT_DEDUPLICATION_CONFIG: DeduplicationConfig = {
  enabled: true,
  similarityThreshold: 0.85,
  autoMerge: false,
  conflictResolution: 'most_complete',
  preserveOriginalData: true,
  maxCandidatesPerContact: 10,
  fieldWeights: {
    name: 0.4,
    email: 0.3,
    phone: 0.2,
    address: 0.05,
    company: 0.05,
  },
};

// ============================================================================
// DEDUPLICATION RESULTS
// ============================================================================

export interface DeduplicationResult {
  totalContacts: number;
  duplicateGroups: DuplicateGroup[];
  uniqueContacts: Contact[];
  processingStats: {
    comparisonsMade: number;
    similarityCalculations: number;
    averageSimilarity: number;
    processingTime: number;
  };
}

export interface DuplicateGroup {
  canonicalContact: Contact;
  duplicates: Contact[];
  similarityScore: number;
  mergeStrategy: 'auto' | 'manual' | 'skip';
  conflicts: FieldConflict[];
}

export interface FieldConflict {
  field: string;
  values: Array<{
    value: unknown;
    sourceContactId: string;
    confidence: number;
  }>;
  resolution?: {
    strategy: string;
    value: unknown;
    reason: string;
  };
}

export interface DeduplicationCandidate {
  contact: Contact;
  similarityScore: number;
  matchedFields: string[];
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================================
// CORE DEDUPLICATION ALGORITHMS
// ============================================================================

/**
 * Performs comprehensive contact deduplication using multiple strategies.
 * Returns deduplication results with duplicate groups and unique contacts.
 */
export async function deduplicateContacts(
  contacts: Contact[],
  config: DeduplicationConfig = DEFAULT_DEDUPLICATION_CONFIG
): Promise<DeduplicationResult> {
  const startTime = Date.now();
  const duplicateGroups: DuplicateGroup[] = [];
  const processedContacts = new Set<string>();
  let comparisonsMade = 0;
  let similarityCalculations = 0;
  const similarityScores: number[] = [];

  // Group contacts by potential duplicates using blocking/indexing
  const contactBlocks = createContactBlocks(contacts);

  for (const block of contactBlocks) {
    if (block.contacts.length < 2) continue;

    // Find duplicates within each block
    const blockDuplicates = await findDuplicatesInBlock(block.contacts, config, processedContacts);

    for (const duplicateGroup of blockDuplicates) {
      duplicateGroups.push(duplicateGroup);
      comparisonsMade += duplicateGroup.duplicates.length;
    }
  }

  // Extract unique contacts (those not in any duplicate group)
  const duplicateContactIds = new Set<string>();
  for (const group of duplicateGroups) {
    duplicateContactIds.add(group.canonicalContact.id);
    for (const duplicate of group.duplicates) {
      duplicateContactIds.add(duplicate.id);
    }
  }

  const uniqueContacts = contacts.filter((contact) => !duplicateContactIds.has(contact.id));

  // Calculate statistics
  const averageSimilarity =
    similarityScores.length > 0
      ? similarityScores.reduce((sum, score) => sum + score, 0) / similarityScores.length
      : 0;

  return {
    totalContacts: contacts.length,
    duplicateGroups,
    uniqueContacts,
    processingStats: {
      comparisonsMade,
      similarityCalculations,
      averageSimilarity,
      processingTime: Date.now() - startTime,
    },
  };
}

/**
 * Creates blocking/indexing strategy to efficiently find potential duplicates.
 * Groups contacts by normalized name, email domain, phone area code, etc.
 */
function createContactBlocks(contacts: Contact[]): Array<{ key: string; contacts: Contact[] }> {
  const blocks = new Map<string, Contact[]>();

  for (const contact of contacts) {
    const blockKeys = generateBlockKeys(contact);

    for (const key of blockKeys) {
      if (!blocks.has(key)) {
        blocks.set(key, []);
      }
      blocks.get(key)!.push(contact);
    }
  }

  return Array.from(blocks.entries()).map(([key, contacts]) => ({ key, contacts }));
}

/**
 * Generates blocking keys for a contact to enable efficient duplicate detection.
 */
function generateBlockKeys(contact: Contact): string[] {
  const keys: string[] = [];

  // Name-based blocking
  if (contact.firstName && contact.lastName) {
    const normalizedName = normalizeName(`${contact.firstName} ${contact.lastName}`);
    keys.push(`name:${normalizedName}`);

    // Also add first name only for broader matching
    keys.push(`firstname:${normalizeName(contact.firstName)}`);
  }

  // Email domain blocking
  for (const email of contact.emails) {
    const domain = email.address.split('@')[1]?.toLowerCase();
    if (domain) {
      keys.push(`emaildomain:${domain}`);

      // Also block by email username for exact matches
      const username = email.address.split('@')[0]?.toLowerCase();
      if (username) {
        keys.push(`emailuser:${username}`);
      }
    }
  }

  // Phone area code blocking
  for (const phone of contact.phones) {
    const areaCode = extractAreaCode(phone.number);
    if (areaCode) {
      keys.push(`phone:${areaCode}`);
    }
  }

  // Company blocking
  if (contact.company) {
    const normalizedCompany = normalizeName(contact.company);
    keys.push(`company:${normalizedCompany}`);
  }

  // Fallback to display name
  if (keys.length === 0 && contact.displayName) {
    const normalizedDisplay = normalizeName(contact.displayName);
    keys.push(`display:${normalizedDisplay}`);
  }

  return keys;
}

/**
 * Finds duplicates within a block of contacts.
 */
async function findDuplicatesInBlock(
  blockContacts: Contact[],
  config: DeduplicationConfig,
  processedContacts: Set<string>
): Promise<DuplicateGroup[]> {
  const duplicateGroups: DuplicateGroup[] = [];

  for (let i = 0; i < blockContacts.length; i++) {
    const contactA = blockContacts[i];

    // Skip if already processed
    if (processedContacts.has(contactA.id)) continue;

    const candidates: DeduplicationCandidate[] = [];

    // Compare with remaining contacts in block
    for (let j = i + 1; j < blockContacts.length; j++) {
      const contactB = blockContacts[j];

      if (processedContacts.has(contactB.id)) continue;

      const similarity = calculateContactSimilarity(contactA, contactB, config);
      const confidence = getSimilarityConfidence(similarity);

      if (similarity >= config.similarityThreshold) {
        const matchedFields = getMatchedFields(contactA, contactB);

        candidates.push({
          contact: contactB,
          similarityScore: similarity,
          matchedFields,
          confidence,
        });
      }
    }

    // Sort candidates by similarity score
    candidates.sort((a, b) => b.similarityScore - a.similarityScore);

    // Take top candidates
    const topCandidates = candidates.slice(0, config.maxCandidatesPerContact);

    if (topCandidates.length > 0) {
      const duplicateGroup = createDuplicateGroup(contactA, topCandidates, config);
      duplicateGroups.push(duplicateGroup);

      // Mark all contacts in this group as processed
      processedContacts.add(contactA.id);
      for (const candidate of topCandidates) {
        processedContacts.add(candidate.contact.id);
      }
    }
  }

  return duplicateGroups;
}

/**
 * Calculates similarity score between two contacts using weighted field matching.
 */
function calculateContactSimilarity(
  contactA: Contact,
  contactB: Contact,
  config: DeduplicationConfig
): number {
  let totalScore = 0;
  let totalWeight = 0;

  // Name similarity
  const nameSimilarity = calculateNameSimilarity(contactA, contactB);
  totalScore += nameSimilarity * config.fieldWeights.name;
  totalWeight += config.fieldWeights.name;

  // Email similarity
  const emailSimilarity = calculateEmailSimilarity(contactA, contactB);
  totalScore += emailSimilarity * config.fieldWeights.email;
  totalWeight += config.fieldWeights.email;

  // Phone similarity
  const phoneSimilarity = calculatePhoneSimilarity(contactA, contactB);
  totalScore += phoneSimilarity * config.fieldWeights.phone;
  totalWeight += config.fieldWeights.phone;

  // Address similarity
  const addressSimilarity = calculateAddressSimilarity(contactA, contactB);
  totalScore += addressSimilarity * config.fieldWeights.address;
  totalWeight += config.fieldWeights.address;

  // Company similarity
  const companySimilarity = calculateCompanySimilarity(contactA, contactB);
  totalScore += companySimilarity * config.fieldWeights.company;
  totalWeight += config.fieldWeights.company;

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Creates a duplicate group from a canonical contact and its duplicates.
 */
function createDuplicateGroup(
  canonicalContact: Contact,
  candidates: DeduplicationCandidate[],
  config: DeduplicationConfig
): DuplicateGroup {
  const duplicates = candidates.map((candidate) => candidate.contact);
  const averageSimilarity =
    candidates.reduce((sum, c) => sum + c.similarityScore, 0) / candidates.length;

  // Determine merge strategy
  const mergeStrategy: 'auto' | 'manual' | 'skip' = config.autoMerge ? 'auto' : 'manual';

  // Find field conflicts
  const conflicts = findFieldConflicts(canonicalContact, duplicates);

  return {
    canonicalContact,
    duplicates,
    similarityScore: averageSimilarity,
    mergeStrategy,
    conflicts,
  };
}

// ============================================================================
// FIELD-SPECIFIC SIMILARITY CALCULATIONS
// ============================================================================

/**
 * Calculates name similarity using fuzzy string matching.
 */
function calculateNameSimilarity(contactA: Contact, contactB: Contact): number {
  const nameA = normalizeName(`${contactA.firstName || ''} ${contactA.lastName || ''}`.trim());
  const nameB = normalizeName(`${contactB.firstName || ''} ${contactB.lastName || ''}`.trim());

  if (!nameA || !nameB) return 0;

  // Exact match
  if (nameA === nameB) return 1.0;

  // Fuzzy matching using Levenshtein distance
  const distance = levenshteinDistance(nameA, nameB);
  const maxLength = Math.max(nameA.length, nameB.length);

  return maxLength > 0 ? 1 - distance / maxLength : 0;
}

/**
 * Calculates email similarity.
 */
function calculateEmailSimilarity(contactA: Contact, contactB: Contact): number {
  const emailsA = contactA.emails.map((e) => e.address.toLowerCase());
  const emailsB = contactB.emails.map((e) => e.address.toLowerCase());

  // Exact email match
  for (const emailA of emailsA) {
    if (emailsB.includes(emailA)) return 1.0;
  }

  // Domain match
  const domainsA = emailsA.map((e) => e.split('@')[1]).filter(Boolean);
  const domainsB = emailsB.map((e) => e.split('@')[1]).filter(Boolean);

  for (const domainA of domainsA) {
    if (domainsB.includes(domainA)) return 0.8;
  }

  return 0;
}

/**
 * Calculates phone similarity.
 */
function calculatePhoneSimilarity(contactA: Contact, contactB: Contact): number {
  const phonesA = contactA.phones.map((p) => normalizePhoneNumber(p.number));
  const phonesB = contactB.phones.map((p) => normalizePhoneNumber(p.number));

  // Exact phone match
  for (const phoneA of phonesA) {
    if (phonesB.includes(phoneA)) return 1.0;
  }

  return 0;
}

/**
 * Calculates address similarity.
 */
function calculateAddressSimilarity(contactA: Contact, contactB: Contact): number {
  // Simple implementation - check if any address components match
  for (const addressA of contactA.addresses) {
    for (const addressB of contactB.addresses) {
      let matches = 0;
      let total = 0;

      if (addressA.city && addressB.city) {
        total++;
        if (normalizeName(addressA.city) === normalizeName(addressB.city)) matches++;
      }

      if (addressA.postalCode && addressB.postalCode) {
        total++;
        if (addressA.postalCode === addressB.postalCode) matches++;
      }

      if (total > 0 && matches === total) return 1.0;
    }
  }

  return 0;
}

/**
 * Calculates company similarity.
 */
function calculateCompanySimilarity(contactA: Contact, contactB: Contact): number {
  const companyA = normalizeName(contactA.company || '');
  const companyB = normalizeName(contactB.company || '');

  if (!companyA || !companyB) return 0;

  return companyA === companyB ? 1.0 : 0;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalizes text for comparison (lowercase, remove extra spaces, etc.)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes phone numbers for comparison.
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

/**
 * Extracts area code from phone number.
 */
function extractAreaCode(phone: string): string | null {
  const normalized = normalizePhoneNumber(phone);
  return normalized.length >= 10 ? normalized.substring(0, 3) : null;
}

/**
 * Calculates Levenshtein distance between two strings.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Determines confidence level from similarity score.
 */
function getSimilarityConfidence(similarity: number): 'high' | 'medium' | 'low' {
  if (similarity >= 0.9) return 'high';
  if (similarity >= 0.7) return 'medium';
  return 'low';
}

/**
 * Identifies which fields matched between two contacts.
 */
function getMatchedFields(contactA: Contact, contactB: Contact): string[] {
  const matchedFields: string[] = [];

  if (calculateNameSimilarity(contactA, contactB) > 0.8) matchedFields.push('name');
  if (calculateEmailSimilarity(contactA, contactB) > 0.8) matchedFields.push('email');
  if (calculatePhoneSimilarity(contactA, contactB) > 0.8) matchedFields.push('phone');
  if (calculateAddressSimilarity(contactA, contactB) > 0.8) matchedFields.push('address');
  if (calculateCompanySimilarity(contactA, contactB) > 0.8) matchedFields.push('company');

  return matchedFields;
}

/**
 * Finds field conflicts that need resolution when merging duplicates.
 */
function findFieldConflicts(canonical: Contact, duplicates: Contact[]): FieldConflict[] {
  const conflicts: FieldConflict[] = [];

  // Check each field for conflicts
  const fieldsToCheck = [
    { name: 'displayName', getValue: (c: Contact) => c.displayName },
    { name: 'firstName', getValue: (c: Contact) => c.firstName },
    { name: 'lastName', getValue: (c: Contact) => c.lastName },
    { name: 'company', getValue: (c: Contact) => c.company },
    { name: 'title', getValue: (c: Contact) => c.title },
  ];

  for (const field of fieldsToCheck) {
    const canonicalValue = field.getValue(canonical);
    const conflictingValues = new Set<unknown>();

    for (const duplicate of duplicates) {
      const duplicateValue = field.getValue(duplicate);
      if (duplicateValue && duplicateValue !== canonicalValue) {
        conflictingValues.add(duplicateValue);
      }
    }

    if (conflictingValues.size > 0) {
      conflicts.push({
        field: field.name,
        values: [
          { value: canonicalValue, sourceContactId: canonical.id, confidence: 1.0 },
          ...Array.from(conflictingValues).map((value) => ({
            value,
            sourceContactId: 'multiple',
            confidence: 0.5,
          })),
        ],
      });
    }
  }

  return conflicts;
}

// ============================================================================
// MERGE OPERATIONS
// ============================================================================

/**
 * Merges duplicate contacts into a canonical contact.
 */
export function mergeDuplicateContacts(
  duplicateGroup: DuplicateGroup,
  config: DeduplicationConfig = DEFAULT_DEDUPLICATION_CONFIG
): Contact {
  const merged = { ...duplicateGroup.canonicalContact };

  // Apply conflict resolution strategy
  for (const conflict of duplicateGroup.conflicts) {
    const resolution = resolveFieldConflict(conflict, config.conflictResolution);
    (merged as Record<string, unknown>)[conflict.field] = resolution.value;

    if (config.preserveOriginalData) {
      merged.metadata = {
        ...merged.metadata,
        mergeConflicts: {
          ...(merged.metadata?.mergeConflicts ?? {}),
          [conflict.field]: conflict.values,
        },
      };
    }
  }

  // Update metadata
  merged.metadata = {
    ...merged.metadata,
    mergedFrom: duplicateGroup.duplicates.map((d) => d.id),
    mergeStrategy: config.conflictResolution,
    mergeTimestamp: new Date().toISOString(),
  };

  merged.updatedAt = new Date();
  return merged;
}

/**
 * Resolves a field conflict using the specified strategy.
 */
function resolveFieldConflict(
  conflict: FieldConflict,
  strategy: DeduplicationConfig['conflictResolution']
): { value: unknown; reason: string } {
  switch (strategy) {
    case 'newest_wins':
      // Choose the value from the most recently updated contact
      return { value: conflict.values[0].value, reason: 'newest_wins' };

    case 'oldest_wins':
      return { value: conflict.values[conflict.values.length - 1].value, reason: 'oldest_wins' };

    case 'most_complete': {
      // Choose the most complete/most confident value
      const sorted = conflict.values.sort((a, b) => b.confidence - a.confidence);
      return { value: sorted[0].value, reason: 'most_complete' };
    }

    case 'manual':
    default:
      // Keep the canonical value
      return { value: conflict.values[0].value, reason: 'manual_canonical' };
  }
}
