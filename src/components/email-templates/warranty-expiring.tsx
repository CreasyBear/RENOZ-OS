/**
 * Warranty Expiring Email Template
 *
 * React email template for warranty expiry notifications.
 * Sent to customers at 30/60/90 day intervals before warranty expiry.
 *
 * Features:
 * - Battery cycle status display for battery warranties
 * - Renewal/extension link for battery performance warranties
 * - Urgency level styling based on days until expiry
 * - Renoz Energy branding
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003a
 */

import * as React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface WarrantyExpiringEmailProps {
  /** Customer's first name */
  customerName: string;
  /** Product name (e.g., "Tesla Powerwall 2") */
  productName: string;
  /** Product serial number */
  productSerial?: string;
  /** Warranty number for reference */
  warrantyNumber: string;
  /** Human-readable policy type (e.g., "Battery Performance Warranty") */
  policyTypeDisplay: string;
  /** Warranty policy name */
  policyName: string;
  /** Number of days until warranty expires */
  daysUntilExpiry: number;
  /** Expiry date formatted for display */
  expiryDateDisplay: string;
  /** Current battery cycle count (for battery warranties) */
  currentCycleCount?: number;
  /** Maximum cycle limit (for battery warranties) */
  cycleLimit?: number;
  /** URL to warranty renewal/extension page (for battery warranties) */
  renewalUrl?: string;
  /** URL to view warranty details */
  warrantyDetailsUrl: string;
  /** Support email for questions */
  supportEmail?: string;
  /** Unsubscribe URL for opt-out */
  unsubscribeUrl?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get urgency color based on days until expiry
 */
function getUrgencyColor(daysUntilExpiry: number): { bg: string; text: string; border: string } {
  if (daysUntilExpiry <= 7) {
    return { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' }; // Red - critical
  }
  if (daysUntilExpiry <= 30) {
    return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' }; // Yellow - warning
  }
  return { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' }; // Blue - info
}

/**
 * Get urgency label
 */
function getUrgencyLabel(daysUntilExpiry: number): string {
  if (daysUntilExpiry <= 7) return 'Expires Very Soon';
  if (daysUntilExpiry <= 30) return 'Expiring Soon';
  return 'Expiry Reminder';
}

/**
 * Format cycle status for display
 */
function formatCycleStatus(currentCount?: number, limit?: number): string | null {
  if (!limit) return null;

  if (currentCount !== undefined) {
    const remaining = limit - currentCount;
    const percentUsed = Math.round((currentCount / limit) * 100);
    return `${remaining.toLocaleString()} cycles remaining (${percentUsed}% of ${limit.toLocaleString()} used)`;
  }

  return `${limit.toLocaleString()} cycle limit`;
}

// ============================================================================
// EMAIL TEMPLATE COMPONENT
// ============================================================================

/**
 * Warranty Expiring Email Template
 *
 * This component renders an HTML email for warranty expiry notifications.
 * It's designed to work with email providers like Resend, SendGrid, etc.
 *
 * Usage with Resend:
 * ```ts
 * import { render } from '@react-email/render'
 * import { WarrantyExpiringEmail } from './warranty-expiring'
 *
 * const html = render(WarrantyExpiringEmail({ ...props }))
 * await resend.emails.send({
 *   from: 'warranties@renoz.energy',
 *   to: customerEmail,
 *   subject: `Your Warranty Expires in ${daysUntilExpiry} Days`,
 *   html,
 * })
 * ```
 */
export function WarrantyExpiringEmail({
  customerName,
  productName,
  productSerial,
  warrantyNumber,
  policyTypeDisplay,
  policyName,
  daysUntilExpiry,
  expiryDateDisplay,
  currentCycleCount,
  cycleLimit,
  renewalUrl,
  warrantyDetailsUrl,
  supportEmail = 'support@renoz.energy',
  unsubscribeUrl,
}: WarrantyExpiringEmailProps): React.ReactElement {
  const urgency = getUrgencyColor(daysUntilExpiry);
  const urgencyLabel = getUrgencyLabel(daysUntilExpiry);
  const cycleStatus = formatCycleStatus(currentCycleCount, cycleLimit);
  const isBatteryWarranty = !!cycleLimit;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`Warranty ${urgencyLabel} - ${productName}`}</title>
      </head>
      <body
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: '#F3F4F6',
          margin: 0,
          padding: 0,
        }}
      >
        {/* Container */}
        <table
          cellPadding="0"
          cellSpacing="0"
          style={{
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Header */}
          <tr>
            <td
              style={{
                backgroundColor: '#111827',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <h1
                style={{
                  color: '#FFFFFF',
                  fontSize: '24px',
                  fontWeight: '700',
                  margin: 0,
                }}
              >
                Renoz Energy
              </h1>
              <p
                style={{
                  color: '#9CA3AF',
                  fontSize: '14px',
                  margin: '8px 0 0 0',
                }}
              >
                Warranty Services
              </p>
            </td>
          </tr>

          {/* Urgency Banner */}
          <tr>
            <td
              style={{
                backgroundColor: urgency.bg,
                borderLeft: `4px solid ${urgency.border}`,
                padding: '16px 24px',
              }}
            >
              <p
                style={{
                  color: urgency.text,
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: 0,
                }}
              >
                {urgencyLabel}: {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''} remaining
              </p>
            </td>
          </tr>

          {/* Main Content */}
          <tr>
            <td style={{ padding: '32px 24px' }}>
              {/* Greeting */}
              <p
                style={{
                  fontSize: '16px',
                  color: '#374151',
                  margin: '0 0 24px 0',
                }}
              >
                Hi {customerName},
              </p>

              <p
                style={{
                  fontSize: '16px',
                  color: '#374151',
                  margin: '0 0 24px 0',
                  lineHeight: '1.5',
                }}
              >
                This is a reminder that your <strong>{policyTypeDisplay}</strong> for{' '}
                <strong>{productName}</strong> will expire on <strong>{expiryDateDisplay}</strong>.
              </p>

              {/* Warranty Details Card */}
              <table
                cellPadding="0"
                cellSpacing="0"
                style={{
                  width: '100%',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  marginBottom: '24px',
                }}
              >
                <tr>
                  <td style={{ padding: '20px' }}>
                    <h3
                      style={{
                        fontSize: '14px',
                        color: '#6B7280',
                        margin: '0 0 12px 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Warranty Details
                    </h3>

                    <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                      <tr>
                        <td style={{ padding: '4px 0' }}>
                          <span style={{ color: '#6B7280', fontSize: '14px' }}>
                            Warranty Number:
                          </span>
                        </td>
                        <td style={{ padding: '4px 0', textAlign: 'right' }}>
                          <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>
                            {warrantyNumber}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0' }}>
                          <span style={{ color: '#6B7280', fontSize: '14px' }}>Product:</span>
                        </td>
                        <td style={{ padding: '4px 0', textAlign: 'right' }}>
                          <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>
                            {productName}
                          </span>
                        </td>
                      </tr>
                      {productSerial && (
                        <tr>
                          <td style={{ padding: '4px 0' }}>
                            <span style={{ color: '#6B7280', fontSize: '14px' }}>Serial:</span>
                          </td>
                          <td style={{ padding: '4px 0', textAlign: 'right' }}>
                            <span
                              style={{
                                color: '#111827',
                                fontSize: '14px',
                                fontFamily: 'monospace',
                              }}
                            >
                              {productSerial}
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ padding: '4px 0' }}>
                          <span style={{ color: '#6B7280', fontSize: '14px' }}>Policy:</span>
                        </td>
                        <td style={{ padding: '4px 0', textAlign: 'right' }}>
                          <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>
                            {policyName}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0' }}>
                          <span style={{ color: '#6B7280', fontSize: '14px' }}>Expires:</span>
                        </td>
                        <td style={{ padding: '4px 0', textAlign: 'right' }}>
                          <span
                            style={{ color: urgency.text, fontSize: '14px', fontWeight: '600' }}
                          >
                            {expiryDateDisplay}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              {/* Battery Cycle Status (only for battery warranties) */}
              {isBatteryWarranty && cycleStatus && (
                <table
                  cellPadding="0"
                  cellSpacing="0"
                  style={{
                    width: '100%',
                    backgroundColor: '#F0FDF4',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  <tr>
                    <td style={{ padding: '16px 20px' }}>
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#166534',
                          margin: 0,
                          fontWeight: '500',
                        }}
                      >
                        Battery Cycle Status
                      </p>
                      <p
                        style={{
                          fontSize: '16px',
                          color: '#15803D',
                          margin: '8px 0 0 0',
                          fontWeight: '600',
                        }}
                      >
                        {cycleStatus}
                      </p>
                    </td>
                  </tr>
                </table>
              )}

              {/* Call to Action */}
              <p
                style={{
                  fontSize: '16px',
                  color: '#374151',
                  margin: '0 0 24px 0',
                  lineHeight: '1.5',
                }}
              >
                {renewalUrl
                  ? 'Consider extending your warranty coverage to continue protecting your investment.'
                  : 'Review your warranty details and coverage options before expiry.'}
              </p>

              {/* CTA Buttons */}
              <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                <tr>
                  {renewalUrl && (
                    <td style={{ paddingRight: '8px' }}>
                      <a
                        href={renewalUrl}
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          fontWeight: '600',
                          padding: '12px 24px',
                          borderRadius: '6px',
                          textDecoration: 'none',
                        }}
                      >
                        Extend Warranty
                      </a>
                    </td>
                  )}
                  <td>
                    <a
                      href={warrantyDetailsUrl}
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: '600',
                        padding: '12px 24px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        border: '1px solid #D1D5DB',
                      }}
                    >
                      View Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td
              style={{
                backgroundColor: '#F9FAFB',
                padding: '24px',
                borderTop: '1px solid #E5E7EB',
              }}
            >
              <p
                style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  margin: '0 0 8px 0',
                  textAlign: 'center',
                }}
              >
                Questions about your warranty? Contact us at{' '}
                <a
                  href={`mailto:${supportEmail}`}
                  style={{ color: '#2563EB', textDecoration: 'none' }}
                >
                  {supportEmail}
                </a>
              </p>

              <p
                style={{
                  fontSize: '12px',
                  color: '#9CA3AF',
                  margin: '0',
                  textAlign: 'center',
                }}
              >
                Renoz Energy Pty Ltd | ABN 12 345 678 901
              </p>

              {unsubscribeUrl && (
                <p
                  style={{
                    fontSize: '12px',
                    color: '#9CA3AF',
                    margin: '8px 0 0 0',
                    textAlign: 'center',
                  }}
                >
                  <a
                    href={unsubscribeUrl}
                    style={{ color: '#9CA3AF', textDecoration: 'underline' }}
                  >
                    Unsubscribe from warranty reminders
                  </a>
                </p>
              )}
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default WarrantyExpiringEmail;
