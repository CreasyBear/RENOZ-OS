'use server'

/**
 * OAuth Token Encryption Utilities
 *
 * AES-256-GCM encryption for OAuth tokens with organization-specific keys.
 * Based on midday encryption patterns for secure token storage.
 *
 * ⚠️ SERVER-ONLY: Uses Node.js crypto and Buffer APIs.
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SIGNATURE_SEPARATOR = '.';

/**
 * Gets the organization-specific encryption key.
 * Uses organization ID to derive a unique key for each org.
 */
function getOrganizationKey(organizationId: string): Buffer {
  const baseKey = process.env.OAUTH_ENCRYPTION_KEY;
  if (!baseKey) {
    throw new Error('OAUTH_ENCRYPTION_KEY environment variable is not set.');
  }

  if (Buffer.from(baseKey, 'hex').length !== 32) {
    throw new Error('OAUTH_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }

  // Derive organization-specific key using HKDF
  const baseKeyBuffer = Buffer.from(baseKey, 'hex');
  const info = `oauth-tokens-${organizationId}`;

  // Use HKDF to derive a unique key per organization
  const prk = crypto.createHmac('sha256', baseKeyBuffer).update(info).digest();
  const hkdf = crypto.createHmac('sha256', prk).update('encryption').digest();

  return hkdf.subarray(0, 32); // Use first 32 bytes
}

function signPayload(payload: string, key: Buffer): string {
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

function splitSignedPayload(payload: string): { data: string; signature: string } {
  const parts = payload.split(SIGNATURE_SEPARATOR);
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid encrypted payload: missing signature');
  }

  return { data: parts[0], signature: parts[1] };
}

/**
 * Encrypts an OAuth token using AES-256-GCM.
 * @param token The plaintext token to encrypt.
 * @param organizationId The organization ID for key derivation.
 * @returns A base64 encoded string containing IV, auth tag, and encrypted token.
 */
export function encryptOAuthToken(token: string, organizationId: string): string {
  const key = getOrganizationKey(organizationId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Concatenate IV, auth tag, and encrypted data
  const encryptedPayload = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]).toString(
    'base64'
  );

  const signature = signPayload(encryptedPayload, key);
  return `${encryptedPayload}${SIGNATURE_SEPARATOR}${signature}`;
}

/**
 * Decrypts an OAuth token encrypted with AES-256-GCM.
 * @param encryptedPayload The base64 encoded encrypted token.
 * @param organizationId The organization ID for key derivation.
 * @returns The original plaintext token.
 */
export function decryptOAuthToken(encryptedPayload: string, organizationId: string): string {
  const key = getOrganizationKey(organizationId);

  if (!encryptedPayload || typeof encryptedPayload !== 'string') {
    throw new Error('Invalid encrypted payload: must be a non-empty string');
  }

  const { data, signature } = splitSignedPayload(encryptedPayload);
  const expectedSignature = signPayload(data, key);

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid encrypted payload: signature mismatch');
  }

  const dataBuffer = Buffer.from(data, 'base64');
  const minLength = IV_LENGTH + AUTH_TAG_LENGTH;

  if (dataBuffer.length < minLength) {
    throw new Error(
      `Invalid encrypted payload: too short. Expected at least ${minLength} bytes, got ${dataBuffer.length}`
    );
  }

  // Extract IV, auth tag, and encrypted data
  const iv = dataBuffer.subarray(0, IV_LENGTH);
  const authTag = dataBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encryptedText = dataBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(
      `Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes, got ${authTag.length}`
    );
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================================================
// OAUTH STATE ENCRYPTION
// ============================================================================

export interface OAuthStatePayload {
  organizationId: string;
  userId: string;
  provider: 'google_workspace' | 'microsoft_365';
  services: ('calendar' | 'email' | 'contacts')[];
  redirectUrl: string;
  timestamp: number;
  nonce: string;
}

/**
 * Encrypts OAuth state to prevent tampering.
 * The state contains sensitive info like organizationId that must be protected.
 */
export function encryptOAuthState(payload: OAuthStatePayload): string {
  return encryptOAuthToken(JSON.stringify(payload), payload.organizationId);
}

/**
 * Decrypts and validates OAuth state from callback.
 * Returns null if state is invalid or tampered with.
 */
export function decryptOAuthState(
  encryptedState: string,
  organizationId: string
): OAuthStatePayload | null {
  try {
    const decrypted = decryptOAuthToken(encryptedState, organizationId);
    const parsed = JSON.parse(decrypted);

    // Validate required fields
    if (
      typeof parsed.organizationId !== 'string' ||
      typeof parsed.userId !== 'string' ||
      !['google_workspace', 'microsoft_365'].includes(parsed.provider) ||
      !Array.isArray(parsed.services) ||
      typeof parsed.redirectUrl !== 'string' ||
      typeof parsed.timestamp !== 'number' ||
      typeof parsed.nonce !== 'string'
    ) {
      return null;
    }

    // Check timestamp (15 minute expiry)
    const now = Date.now();
    const stateAge = now - parsed.timestamp;
    if (stateAge > 15 * 60 * 1000) {
      // 15 minutes
      return null;
    }

    return parsed as OAuthStatePayload;
  } catch {
    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a secure random nonce for OAuth state.
 */
export function generateOAuthNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Validates that a token is properly formatted (but doesn't decrypt it).
 */
export function isValidEncryptedToken(token: string): boolean {
  try {
    const { data } = splitSignedPayload(token);
    const dataBuffer = Buffer.from(data, 'base64');
    const minLength = IV_LENGTH + AUTH_TAG_LENGTH;
    return dataBuffer.length >= minLength;
  } catch {
    return false;
  }
}
