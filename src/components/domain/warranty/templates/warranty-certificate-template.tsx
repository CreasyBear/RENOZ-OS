/**
 * Warranty Certificate Template
 *
 * React-based HTML template for generating professional warranty certificates.
 * Designed to be rendered to PDF using a server-side PDF generation library.
 *
 * Features:
 * - Company logo placeholder
 * - Warranty number and registration date
 * - Customer name and address
 * - Product name, serial number, category
 * - Warranty policy details (type, duration, terms)
 * - Expiry date prominently displayed
 * - Coverage details from the policy
 * - QR code placeholder for verification
 * - Footer with company contact info
 * - Australian date format (DD/MM/YYYY)
 * - Professional styling suitable for customer-facing documents
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-004a
 */

import * as React from 'react';
import { formatDateAustralian } from '@/lib/warranty';

// Import types from schemas per SCHEMA-TRACE.md
import type {
  WarrantyCertificateProps,
  WarrantyCertificateCustomerAddress,
  WarrantyPolicyTypeValue,
} from '@/lib/schemas/warranty';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get human-readable policy type name
 */
function getPolicyTypeDisplayName(type: WarrantyPolicyTypeValue): string {
  switch (type) {
    case 'battery_performance':
      return 'Battery Performance Warranty';
    case 'inverter_manufacturer':
      return 'Inverter Manufacturer Warranty';
    case 'installation_workmanship':
      return 'Installation Workmanship Warranty';
    default:
      return 'Warranty';
  }
}

/**
 * Get policy type badge color
 */
function getPolicyTypeColor(type: WarrantyPolicyTypeValue): {
  bg: string;
  text: string;
  border: string;
} {
  switch (type) {
    case 'battery_performance':
      return { bg: '#DCFCE7', text: '#166534', border: '#22C55E' }; // Green
    case 'inverter_manufacturer':
      return { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' }; // Blue
    case 'installation_workmanship':
      return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' }; // Yellow
    default:
      return { bg: '#F3F4F6', text: '#374151', border: '#9CA3AF' }; // Gray
  }
}

/**
 * Format duration for display
 */
function formatDuration(months: number): string {
  if (months >= 12 && months % 12 === 0) {
    const years = months / 12;
    return `${years} Year${years > 1 ? 's' : ''}`;
  }
  return `${months} Month${months > 1 ? 's' : ''}`;
}

/**
 * Format address for display
 */
function formatAddress(address?: WarrantyCertificateCustomerAddress): string | null {
  if (!address) return null;
  const parts: string[] = [];
  if (address.street) parts.push(address.street);
  const cityLine = [address.suburb, address.state, address.postcode].filter(Boolean).join(' ');
  if (cityLine) parts.push(cityLine);
  if (address.country && address.country !== 'Australia') {
    parts.push(address.country);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Format cycle limit for display
 */
function formatCycleLimit(limit?: number): string | null {
  if (!limit) return null;
  return `${limit.toLocaleString()} cycles`;
}

// ============================================================================
// CERTIFICATE TEMPLATE COMPONENT
// ============================================================================

/**
 * Warranty Certificate Template
 *
 * This component renders an HTML document suitable for PDF generation.
 * It follows a professional certificate layout with Renoz Energy branding.
 *
 * Usage with PDF generation:
 * ```ts
 * import { renderToStaticMarkup } from 'react-dom/server'
 * import { WarrantyCertificateTemplate } from './warranty-certificate-template'
 * import puppeteer from 'puppeteer'
 *
 * const html = renderToStaticMarkup(<WarrantyCertificateTemplate {...props} />)
 * const browser = await puppeteer.launch()
 * const page = await browser.newPage()
 * await page.setContent(html)
 * const pdf = await page.pdf({ format: 'A4' })
 * ```
 */
export function WarrantyCertificateTemplate({
  // Certificate
  warrantyNumber,
  registrationDate,
  // Customer
  customerName,
  customerAddress,
  customerEmail,
  customerPhone,
  // Product
  productName,
  productSerial,
  productCategory,
  productSku,
  items,
  // Policy
  policyType,
  policyName,
  durationMonths,
  cycleLimit,
  expiryDate,
  coverageDetails,
  // SLA
  slaResponseHours,
  slaResolutionDays,
  // Verification
  verificationUrl,
  // Branding
  logoUrl,
  companyName = 'Renoz Energy',
  supportEmail = 'support@renoz.energy',
  supportPhone = '1300 RENOZ (1300 736 693)',
  companyWebsite = 'www.renoz.energy',
  companyAbn = '12 345 678 901',
}: WarrantyCertificateProps): React.ReactElement {
  const policyTypeDisplay = getPolicyTypeDisplayName(policyType);
  const policyTypeColor = getPolicyTypeColor(policyType);
  const formattedRegistrationDate = formatDateAustralian(registrationDate, 'numeric');
  const formattedExpiryDate = formatDateAustralian(expiryDate, 'numeric');
  const formattedAddress = formatAddress(customerAddress);
  const formattedCycleLimit = formatCycleLimit(cycleLimit);
  const formattedDuration = formatDuration(durationMonths);
  const isBatteryWarranty = policyType === 'battery_performance';

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Warranty Certificate - {warrantyNumber}</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @page {
                size: A4;
                margin: 0;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            `,
          }}
        />
      </head>
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: '#FFFFFF',
          margin: 0,
          padding: 0,
          color: '#1F2937',
          lineHeight: 1.5,
        }}
      >
        {/* Main Container */}
        <div
          style={{
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            position: 'relative',
          }}
        >
          {/* Decorative Border */}
          <div
            style={{
              position: 'absolute',
              top: '10mm',
              left: '10mm',
              right: '10mm',
              bottom: '10mm',
              border: '2px solid #E5E7EB',
              borderRadius: '4px',
              pointerEvents: 'none',
            }}
          />

          {/* Content Area */}
          <div
            style={{
              padding: '15mm 20mm',
            }}
          >
            {/* Header */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '10mm',
                borderBottom: '2px solid #111827',
                paddingBottom: '8mm',
              }}
            >
              {/* Logo Placeholder */}
              <div
                style={{
                  marginBottom: '6mm',
                }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={companyName}
                    style={{
                      height: '40px',
                      maxWidth: '200px',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: '#111827',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {companyName}
                  </div>
                )}
              </div>

              {/* Certificate Title */}
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: '0 0 4mm 0',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                WARRANTY CERTIFICATE
              </h1>

              {/* Policy Type Badge */}
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: policyTypeColor.bg,
                  color: policyTypeColor.text,
                  padding: '4px 16px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: `1px solid ${policyTypeColor.border}`,
                }}
              >
                {policyTypeDisplay}
              </div>
            </div>

            {/* Certificate Number and Date Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8mm',
                fontSize: '14px',
              }}
            >
              <div>
                <span style={{ color: '#6B7280' }}>Certificate No: </span>
                <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{warrantyNumber}</span>
              </div>
              <div>
                <span style={{ color: '#6B7280' }}>Registered: </span>
                <span style={{ fontWeight: '600' }}>{formattedRegistrationDate}</span>
              </div>
            </div>

            {/* Main Content Grid */}
            <div
              style={{
                display: 'flex',
                gap: '8mm',
                marginBottom: '8mm',
              }}
            >
              {/* Left Column - Customer & Product */}
              <div style={{ flex: 1 }}>
                {/* Customer Information */}
                <div
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    padding: '6mm',
                    marginBottom: '6mm',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      margin: '0 0 4mm 0',
                    }}
                  >
                    Registered Owner
                  </h3>
                  <p
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: '0 0 2mm 0',
                    }}
                  >
                    {customerName}
                  </p>
                  {formattedAddress && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#4B5563',
                        margin: '0 0 1mm 0',
                      }}
                    >
                      {formattedAddress}
                    </p>
                  )}
                  {customerEmail && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#6B7280',
                        margin: '0 0 1mm 0',
                      }}
                    >
                      {customerEmail}
                    </p>
                  )}
                  {customerPhone && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#6B7280',
                        margin: 0,
                      }}
                    >
                      {customerPhone}
                    </p>
                  )}
                </div>

                {/* Product Information */}
                <div
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    padding: '6mm',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      margin: '0 0 4mm 0',
                    }}
                  >
                    Covered Product
                  </h3>
                  <p
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: '0 0 2mm 0',
                    }}
                  >
                    {productName}
                  </p>
                  {productCategory && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#4B5563',
                        margin: '0 0 2mm 0',
                      }}
                    >
                      Category: {productCategory}
                    </p>
                  )}
                  {productSerial && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#4B5563',
                        margin: '0 0 1mm 0',
                      }}
                    >
                      Serial No:{' '}
                      <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                        {productSerial}
                      </span>
                    </p>
                  )}
                  {productSku && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#6B7280',
                        margin: 0,
                      }}
                    >
                      SKU: {productSku}
                    </p>
                  )}
                  {items && items.length > 0 && (
                    <div style={{ marginTop: '6px' }}>
                      <p
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#6B7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          margin: '6px 0 4px 0',
                        }}
                      >
                        Covered Items
                      </p>
                      {items.map((item) => (
                        <p
                          key={item.id}
                          style={{
                            fontSize: '12px',
                            color: '#4B5563',
                            margin: '0 0 2px 0',
                          }}
                        >
                          {item.productName ?? 'Unknown Product'}
                          {item.productSku ? ` (${item.productSku})` : ''}
                          {item.productSerial ? ` — ${item.productSerial}` : ''}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Warranty Details */}
              <div style={{ flex: 1 }}>
                {/* Expiry Date Highlight */}
                <div
                  style={{
                    backgroundColor: '#111827',
                    borderRadius: '8px',
                    padding: '6mm',
                    marginBottom: '6mm',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      margin: '0 0 2mm 0',
                    }}
                  >
                    Valid Until
                  </p>
                  <p
                    style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: '#FFFFFF',
                      margin: 0,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {formattedExpiryDate}
                  </p>
                </div>

                {/* Policy Details */}
                <div
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    padding: '6mm',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      margin: '0 0 4mm 0',
                    }}
                  >
                    Warranty Policy
                  </h3>
                  <p
                    style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: '0 0 3mm 0',
                    }}
                  >
                    {policyName}
                  </p>

                  <table
                    cellPadding="0"
                    cellSpacing="0"
                    style={{ width: '100%', fontSize: '13px' }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            padding: '2mm 0',
                            color: '#6B7280',
                            width: '40%',
                          }}
                        >
                          Duration:
                        </td>
                        <td
                          style={{
                            padding: '2mm 0',
                            color: '#111827',
                            fontWeight: '500',
                          }}
                        >
                          {formattedDuration}
                        </td>
                      </tr>
                      {isBatteryWarranty && formattedCycleLimit && (
                        <tr>
                          <td style={{ padding: '2mm 0', color: '#6B7280' }}>Cycle Limit:</td>
                          <td
                            style={{
                              padding: '2mm 0',
                              color: '#111827',
                              fontWeight: '500',
                            }}
                          >
                            {formattedCycleLimit}
                          </td>
                        </tr>
                      )}
                      {slaResponseHours && (
                        <tr>
                          <td style={{ padding: '2mm 0', color: '#6B7280' }}>Response SLA:</td>
                          <td
                            style={{
                              padding: '2mm 0',
                              color: '#111827',
                              fontWeight: '500',
                            }}
                          >
                            {slaResponseHours} hours
                          </td>
                        </tr>
                      )}
                      {slaResolutionDays && (
                        <tr>
                          <td style={{ padding: '2mm 0', color: '#6B7280' }}>Resolution SLA:</td>
                          <td
                            style={{
                              padding: '2mm 0',
                              color: '#111827',
                              fontWeight: '500',
                            }}
                          >
                            {slaResolutionDays} business days
                          </td>
                        </tr>
                      )}
                      {coverageDetails?.transferable !== undefined && (
                        <tr>
                          <td style={{ padding: '2mm 0', color: '#6B7280' }}>Transferable:</td>
                          <td
                            style={{
                              padding: '2mm 0',
                              color: '#111827',
                              fontWeight: '500',
                            }}
                          >
                            {coverageDetails.transferable ? 'Yes' : 'No'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Coverage Details Section */}
            {coverageDetails &&
              (coverageDetails.coverage?.length ||
                coverageDetails.exclusions?.length ||
                coverageDetails.claimRequirements?.length) && (
                <div
                  style={{
                    marginBottom: '8mm',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: '0 0 4mm 0',
                      borderBottom: '1px solid #E5E7EB',
                      paddingBottom: '2mm',
                    }}
                  >
                    Coverage Details
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      gap: '6mm',
                    }}
                  >
                    {/* What's Covered */}
                    {coverageDetails.coverage && coverageDetails.coverage.length > 0 && (
                      <div style={{ flex: 1 }}>
                        <h4
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#166534',
                            margin: '0 0 2mm 0',
                          }}
                        >
                          What&apos;s Covered
                        </h4>
                        <ul
                          style={{
                            margin: 0,
                            padding: '0 0 0 5mm',
                            fontSize: '12px',
                            color: '#374151',
                          }}
                        >
                          {coverageDetails.coverage.map((item, index) => (
                            <li key={index} style={{ marginBottom: '1mm' }}>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Exclusions */}
                    {coverageDetails.exclusions && coverageDetails.exclusions.length > 0 && (
                      <div style={{ flex: 1 }}>
                        <h4
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#991B1B',
                            margin: '0 0 2mm 0',
                          }}
                        >
                          Exclusions
                        </h4>
                        <ul
                          style={{
                            margin: 0,
                            padding: '0 0 0 5mm',
                            fontSize: '12px',
                            color: '#374151',
                          }}
                        >
                          {coverageDetails.exclusions.map((item, index) => (
                            <li key={index} style={{ marginBottom: '1mm' }}>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Claim Requirements */}
                    {coverageDetails.claimRequirements &&
                      coverageDetails.claimRequirements.length > 0 && (
                        <div style={{ flex: 1 }}>
                          <h4
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#1E40AF',
                              margin: '0 0 2mm 0',
                            }}
                          >
                            Claim Requirements
                          </h4>
                          <ul
                            style={{
                              margin: 0,
                              padding: '0 0 0 5mm',
                              fontSize: '12px',
                              color: '#374151',
                            }}
                          >
                            {coverageDetails.claimRequirements.map((item, index) => (
                              <li key={index} style={{ marginBottom: '1mm' }}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                </div>
              )}

            {/* QR Code and Verification Section */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                padding: '5mm 6mm',
                marginBottom: '8mm',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: '0 0 1mm 0',
                  }}
                >
                  Verify This Certificate
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: '#6B7280',
                    margin: 0,
                  }}
                >
                  Scan the QR code or visit:{' '}
                  <span style={{ color: '#2563EB' }}>
                    {verificationUrl || `${companyWebsite}/verify/${warrantyNumber}`}
                  </span>
                </p>
              </div>

              {/* QR Code Placeholder */}
              <div
                style={{
                  width: '25mm',
                  height: '25mm',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* QR code will be injected here during PDF generation */}
                <div
                  style={{
                    width: '22mm',
                    height: '22mm',
                    backgroundColor: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    color: '#9CA3AF',
                    textAlign: 'center',
                  }}
                  data-qr-placeholder="true"
                  data-qr-url={verificationUrl || `${companyWebsite}/verify/${warrantyNumber}`}
                >
                  [QR Code]
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div
              style={{
                backgroundColor: '#FEF3C7',
                borderRadius: '6px',
                padding: '4mm 5mm',
                marginBottom: '8mm',
                borderLeft: '3px solid #F59E0B',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  color: '#92400E',
                  margin: 0,
                  fontWeight: '500',
                }}
              >
                Important: Please retain this certificate for your records.
                {coverageDetails?.transferable &&
                  ' This warranty is transferable - contact us to transfer ownership.'}
              </p>
            </div>

            {/* Footer */}
            <div
              style={{
                borderTop: '1px solid #E5E7EB',
                paddingTop: '5mm',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  color: '#374151',
                  margin: '0 0 2mm 0',
                  fontWeight: '500',
                }}
              >
                {companyName}
              </p>
              <p
                style={{
                  fontSize: '11px',
                  color: '#6B7280',
                  margin: '0 0 1mm 0',
                }}
              >
                {supportPhone} | {supportEmail} | {companyWebsite}
              </p>
              <p
                style={{
                  fontSize: '10px',
                  color: '#9CA3AF',
                  margin: 0,
                }}
              >
                ABN {companyAbn}
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default WarrantyCertificateTemplate;
