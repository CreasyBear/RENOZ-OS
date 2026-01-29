/**
 * Template Utilities
 *
 * Client-safe helpers for email template editing.
 */
export function substituteTemplateVariables(
  content: string,
  variables: Record<string, unknown>,
): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, path) => {
    const value = resolveTemplateValue(variables, path)
    return value == null ? '' : String(value)
  })
}

function resolveTemplateValue(variables: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = variables

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return current
}

export function getSampleTemplateData() {
  return {
    customer: {
      name: 'Alex Johnson',
      email: 'alex@example.com',
      phone: '+61 400 000 000',
    },
    order: {
      number: 'ORD-1234',
      total: '$1,250.00',
      status: 'Confirmed',
      dueDate: '2026-02-15',
    },
    company: {
      name: 'Renoz',
      email: 'support@renoz.com',
      phone: '+61 2 1234 5678',
    },
  }
}
