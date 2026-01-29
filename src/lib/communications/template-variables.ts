/**
 * Template Variables
 *
 * Client-safe catalog of available template variables.
 */
import type { TemplateVariable } from '@/lib/schemas/communications'

export const TEMPLATE_VARIABLES: Record<string, TemplateVariable[]> = {
  customer: [
    { name: 'customer.name', description: 'Customer full name' },
    { name: 'customer.email', description: 'Customer email address' },
    { name: 'customer.phone', description: 'Customer phone number' },
  ],
  order: [
    { name: 'order.number', description: 'Order number' },
    { name: 'order.total', description: 'Order total' },
    { name: 'order.status', description: 'Order status' },
    { name: 'order.dueDate', description: 'Order due date' },
  ],
  company: [
    { name: 'company.name', description: 'Company name' },
    { name: 'company.email', description: 'Company email address' },
    { name: 'company.phone', description: 'Company phone number' },
  ],
  general: [{ name: 'today', description: 'Current date' }],
}
