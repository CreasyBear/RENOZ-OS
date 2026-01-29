'use server'

export {
  getContactPreferences,
  updateContactPreferences,
  getPreferenceHistory,
} from '@/server/functions/communications/communication-preferences'

export interface LegacyUnsubscribePayload {
  contactId: string
  channel: 'email' | 'sms'
}

export function verifyUnsubscribeToken(token: string): LegacyUnsubscribePayload | null {
  if (!token) {
    return null
  }

  try {
    const normalized = token.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeBase64(normalized)
    const payload = JSON.parse(json) as Partial<LegacyUnsubscribePayload>

    if (typeof payload.contactId !== 'string') {
      return null
    }

    if (payload.channel !== 'email' && payload.channel !== 'sms') {
      return null
    }

    return { contactId: payload.contactId, channel: payload.channel }
  } catch {
    return null
  }
}

function decodeBase64(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8')
  }

  if (typeof atob === 'function') {
    const binary = atob(value)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }

  throw new Error('Base64 decoding not supported in this environment')
}
