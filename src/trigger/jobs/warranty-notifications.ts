'use server'

/**
 * Warranty Notification Jobs
 *
 * Background jobs for warranty-related notifications:
 * - Registration confirmation emails
 * - Expiry reminder emails
 * - Claim submitted / resolved notifications
 *
 * @see src/trigger/client.ts for event definitions
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-002
 */
import { eventTrigger } from '@trigger.dev/sdk';
import { task, logger } from '@trigger.dev/sdk/v3';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { notifications, type NotificationData } from 'drizzle/schema';
import {
  client,
  warrantyEvents,
  type WarrantyRegisteredPayload,
  type WarrantyExpiringSoonPayload,
  type WarrantyClaimSubmittedPayload,
  type WarrantyClaimResolvedPayload,
} from '../client';
import { isEmailSuppressedDirect } from '@/server/functions/communications/_shared/suppression-read';
import { renderEmail, WarrantyExpiring } from '@/lib/email';
import { buildDocumentViewUrl, getAppUrl } from '@/lib/documents/urls';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get display label for warranty policy type
 */
function getPolicyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    battery_performance: 'Battery Performance Warranty',
    inverter_manufacturer: 'Inverter Manufacturer Warranty',
    installation_workmanship: 'Installation Workmanship Warranty',
  };
  return labels[type] || type;
}

/**
 * Format duration in months to human-readable string
 */
function formatDuration(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} month${months === 1 ? '' : 's'}`;
  if (months === 0) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years} year${years === 1 ? '' : 's'} ${months} month${months === 1 ? '' : 's'}`;
}

/**
 * Generate HTML email for warranty registration confirmation
 */
function generateWarrantyRegistrationHtml(params: {
  productName: string;
  productSerial: string | null;
  policyTypeDisplay: string;
  policyName: string;
  durationDisplay: string;
  cycleDisplay: string | null;
  expiryDate: string;
  slaResponseHours: number;
  slaResolutionDays: number;
  certificateUrl: string | null;
}): string {
  const {
    productName,
    productSerial,
    policyTypeDisplay,
    policyName,
    durationDisplay,
    cycleDisplay,
    expiryDate,
    slaResponseHours,
    slaResolutionDays,
    certificateUrl,
  } = params;

  const expiryDateFormatted = new Date(expiryDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Warranty Registration Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">Warranty Registered</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.5;">
                Great news! Your warranty has been successfully registered. Here are your coverage details:
              </p>

              <!-- Product Info Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f5; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #18181b;">${productName}</h2>
                    ${productSerial ? `<p style="margin: 0; font-size: 14px; color: #71717a;">Serial: ${productSerial}</p>` : ''}
                  </td>
                </tr>
              </table>

              <!-- Warranty Details -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="font-size: 14px; color: #71717a;">Policy Type</span>
                    <p style="margin: 4px 0 0; font-size: 16px; color: #18181b; font-weight: 500;">${policyTypeDisplay}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="font-size: 14px; color: #71717a;">Policy Name</span>
                    <p style="margin: 4px 0 0; font-size: 16px; color: #18181b; font-weight: 500;">${policyName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="font-size: 14px; color: #71717a;">Coverage Duration</span>
                    <p style="margin: 4px 0 0; font-size: 16px; color: #18181b; font-weight: 500;">${durationDisplay}${cycleDisplay ? ` / ${cycleDisplay}` : ''}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <span style="font-size: 14px; color: #71717a;">Expires</span>
                    <p style="margin: 4px 0 0; font-size: 16px; color: #18181b; font-weight: 500;">${expiryDateFormatted}</p>
                  </td>
                </tr>
              </table>

              <!-- SLA Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #eff6ff; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1e40af;">Service Level Agreement</h3>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #1e3a8a;">Response Time: Within ${slaResponseHours} hours</p>
                    <p style="margin: 0; font-size: 14px; color: #1e3a8a;">Resolution Time: Within ${slaResolutionDays} business days</p>
                  </td>
                </tr>
              </table>

              ${certificateUrl ? `
              <!-- Certificate Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${certificateUrl}" style="display: inline-block; padding: 14px 32px; background-color: #18181b; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 8px;">View Certificate</a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f4f4f5; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 14px; color: #71717a; text-align: center;">
                This email was sent by Renoz. If you have any questions, please contact support.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email for warranty registration confirmation
 */
function generateWarrantyRegistrationText(params: {
  productName: string;
  productSerial: string | null;
  policyTypeDisplay: string;
  policyName: string;
  durationDisplay: string;
  cycleDisplay: string | null;
  expiryDate: string;
  slaResponseHours: number;
  slaResolutionDays: number;
  certificateUrl: string | null;
}): string {
  const {
    productName,
    productSerial,
    policyTypeDisplay,
    policyName,
    durationDisplay,
    cycleDisplay,
    expiryDate,
    slaResponseHours,
    slaResolutionDays,
    certificateUrl,
  } = params;

  const expiryDateFormatted = new Date(expiryDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
WARRANTY REGISTRATION CONFIRMATION

Great news! Your warranty has been successfully registered.

PRODUCT DETAILS
Product: ${productName}${productSerial ? `\nSerial: ${productSerial}` : ''}

WARRANTY COVERAGE
Policy Type: ${policyTypeDisplay}
Policy Name: ${policyName}
Duration: ${durationDisplay}${cycleDisplay ? ` / ${cycleDisplay}` : ''}
Expires: ${expiryDateFormatted}

SERVICE LEVEL AGREEMENT
Response Time: Within ${slaResponseHours} hours
Resolution Time: Within ${slaResolutionDays} business days
${certificateUrl ? `\nView your certificate: ${certificateUrl}` : ''}

---
This email was sent by Renoz. If you have any questions, please contact support.
  `.trim();
}

function getClaimantRoleLabel(role: string | undefined): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'internal':
      return 'Internal Team';
    case 'other':
      return 'Other';
    default:
      return 'Channel Partner';
  }
}

function buildClaimDetailsUrl(claimId: string): string {
  return `${getAppUrl()}/support/claims/${claimId}`;
}

function resolveClaimNotificationRecipient(args: {
  customerId: string;
  customerName: string;
  customerEmail?: string;
  claimantRole?: 'channel_partner' | 'owner' | 'internal' | 'other';
  claimantCustomerId?: string;
  claimantName?: string;
  claimantEmail?: string;
}) {
  const role = args.claimantRole ?? 'channel_partner';
  const isDirectClaim = role !== 'channel_partner';

  return {
    role,
    recipientEmail: isDirectClaim ? args.claimantEmail : args.customerEmail,
    recipientName: isDirectClaim ? args.claimantName ?? 'there' : args.customerName,
    notificationUserId: isDirectClaim ? args.claimantCustomerId ?? null : args.customerId,
    recipientKind: isDirectClaim ? 'claimant' : 'commercial_customer',
  };
}

function generateClaimSubmittedHtml(params: {
  recipientName: string;
  claimNumber: string;
  warrantyNumber: string;
  productName: string;
  claimType: string;
  claimantRoleLabel: string;
  description: string;
  submittedAt: string;
  channelBypassReason?: string;
  claimUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Warranty Claim Submitted</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; border-collapse: collapse;">
          <tr>
            <td style="padding: 32px; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; color: #18181b;">Warranty Claim Submitted</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.5;">Hi ${params.recipientName}, your warranty claim has been recorded and is now awaiting review.</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7;"><strong>Claim</strong><br>${params.claimNumber}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7;"><strong>Warranty</strong><br>${params.warrantyNumber}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7;"><strong>Product</strong><br>${params.productName}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7;"><strong>Claim Type</strong><br>${params.claimType}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7;"><strong>Claim Path</strong><br>${params.claimantRoleLabel}</td></tr>
                <tr><td style="padding: 10px 0;"><strong>Submitted</strong><br>${new Date(params.submittedAt).toLocaleString('en-AU')}</td></tr>
              </table>
              <p style="margin: 0 0 16px; color: #3f3f46; line-height: 1.5;"><strong>Description</strong><br>${params.description}</p>
              ${params.channelBypassReason ? `<p style="margin: 0 0 16px; color: #3f3f46; line-height: 1.5;"><strong>Channel Bypass Reason</strong><br>${params.channelBypassReason}</p>` : ''}
              <p style="margin: 24px 0 0;">
                <a href="${params.claimUrl}" style="display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px;">View Claim</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generateClaimSubmittedText(params: {
  recipientName: string;
  claimNumber: string;
  warrantyNumber: string;
  productName: string;
  claimType: string;
  claimantRoleLabel: string;
  description: string;
  submittedAt: string;
  channelBypassReason?: string;
  claimUrl: string;
}): string {
  return `
WARRANTY CLAIM SUBMITTED

Hi ${params.recipientName},

Your warranty claim has been recorded and is now awaiting review.

Claim: ${params.claimNumber}
Warranty: ${params.warrantyNumber}
Product: ${params.productName}
Claim Type: ${params.claimType}
Claim Path: ${params.claimantRoleLabel}
Submitted: ${new Date(params.submittedAt).toLocaleString('en-AU')}

Description:
${params.description}
${params.channelBypassReason ? `\nChannel Bypass Reason:\n${params.channelBypassReason}\n` : ''}
View Claim: ${params.claimUrl}
  `.trim();
}

function generateClaimResolvedHtml(params: {
  recipientName: string;
  claimNumber: string;
  warrantyNumber: string;
  claimantRoleLabel: string;
  resolutionType: string;
  resolution: string;
  resolvedAt: string;
  resolutionNotes?: string;
  claimUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Warranty Claim Resolved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; border-collapse: collapse;">
          <tr>
            <td style="padding: 32px; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; color: #18181b;">Warranty Claim Resolved</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px; color: #3f3f46; line-height: 1.5;">Hi ${params.recipientName}, your warranty claim has been resolved.</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7;"><strong>Claim</strong><br>${params.claimNumber}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7;"><strong>Warranty</strong><br>${params.warrantyNumber}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7;"><strong>Claim Path</strong><br>${params.claimantRoleLabel}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7;"><strong>Resolution Type</strong><br>${params.resolutionType}</td></tr>
                <tr><td style="padding: 10px 0;"><strong>Resolved</strong><br>${new Date(params.resolvedAt).toLocaleString('en-AU')}</td></tr>
              </table>
              <p style="margin: 0 0 16px; color: #3f3f46; line-height: 1.5;"><strong>Outcome</strong><br>${params.resolution}</p>
              ${params.resolutionNotes ? `<p style="margin: 0 0 16px; color: #3f3f46; line-height: 1.5;"><strong>Resolution Notes</strong><br>${params.resolutionNotes}</p>` : ''}
              <p style="margin: 24px 0 0;">
                <a href="${params.claimUrl}" style="display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px;">View Claim</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generateClaimResolvedText(params: {
  recipientName: string;
  claimNumber: string;
  warrantyNumber: string;
  claimantRoleLabel: string;
  resolutionType: string;
  resolution: string;
  resolvedAt: string;
  resolutionNotes?: string;
  claimUrl: string;
}): string {
  return `
WARRANTY CLAIM RESOLVED

Hi ${params.recipientName},

Your warranty claim has been resolved.

Claim: ${params.claimNumber}
Warranty: ${params.warrantyNumber}
Claim Path: ${params.claimantRoleLabel}
Resolution Type: ${params.resolutionType}
Resolved: ${new Date(params.resolvedAt).toLocaleString('en-AU')}

Outcome:
${params.resolution}
${params.resolutionNotes ? `\nResolution Notes:\n${params.resolutionNotes}\n` : ''}
View Claim: ${params.claimUrl}
  `.trim();
}

async function createClaimNotificationRecord(args: {
  organizationId: string;
  userId: string | null;
  title: string;
  message: string;
  metadata: NotificationData;
}) {
  if (!args.userId) {
    return { created: false, reason: 'no_notification_user' as const };
  }

  const [record] = await db
    .insert(notifications)
    .values({
      organizationId: args.organizationId,
      userId: args.userId,
      type: 'warranty',
      title: args.title,
      message: args.message,
      data: args.metadata,
      status: 'pending',
    })
    .returning();

  return { created: true, notificationId: record?.id };
}

// ============================================================================
// WARRANTY REGISTRATION CONFIRMATION EMAIL
// ============================================================================

/**
 * Send warranty registration confirmation email to customer.
 *
 * Triggered when:
 * - Warranty is auto-registered from order delivery
 * - Warranty is manually registered
 *
 * Acceptance criteria from DOM-WAR-002:
 * - Email uses WarrantyRegistered template with warranty details
 * - Includes policy type (battery/inverter/installation)
 * - Includes certificate link
 * - Shows SLA terms (24h response, 5 day resolution)
 * - Creates notification record
 * - Skips if no customer email
 */
export const sendWarrantyRegistrationEmail = task({
  id: 'send-warranty-registration-email',
  run: async (payload: WarrantyRegisteredPayload) => {
    const {
      warrantyId,
      warrantyNumber,
      organizationId,
      customerId,
      customerEmail,
      productName,
      productSerial,
      policyType,
      policyName,
      durationMonths,
      cycleLimit,
      expiryDate,
      slaResponseHours,
      slaResolutionDays,
      certificateUrl,
    } = payload;

    // Skip if no customer email
    if (!customerEmail) {
      logger.info('Skipping warranty registration email - no customer email', {
        warrantyId,
        warrantyNumber,
        customerId,
      });
      return {
        success: false,
        reason: 'no_customer_email',
        warrantyId,
      };
    }

    // Check email suppression before sending
    const suppression = await isEmailSuppressedDirect(organizationId, customerEmail);
    if (suppression.suppressed) {
      logger.info('Skipping warranty registration email - email suppressed', {
        warrantyId,
        warrantyNumber,
        customerEmail,
        reason: suppression.reason,
      });
      return {
        success: false,
        reason: 'suppressed',
        suppressionReason: suppression.reason,
        warrantyId,
      };
    }

    logger.info('Sending warranty registration confirmation', {
      warrantyId,
      warrantyNumber,
      customerEmail,
      policyType,
    });

    // Format display values
    const policyTypeDisplay = getPolicyTypeLabel(policyType);
    const durationDisplay = formatDuration(durationMonths);
    const cycleDisplay = cycleLimit ? `${cycleLimit.toLocaleString()} cycles` : null;

    // Generate email content (coerce undefined to null/defaults for template)
    const emailHtml = generateWarrantyRegistrationHtml({
      productName,
      productSerial: productSerial ?? null,
      policyTypeDisplay,
      policyName: policyName ?? policyTypeDisplay,
      durationDisplay,
      cycleDisplay,
      expiryDate,
      slaResponseHours: slaResponseHours ?? 24,
      slaResolutionDays: slaResolutionDays ?? 5,
      certificateUrl: certificateUrl ?? null,
    });

    const emailText = generateWarrantyRegistrationText({
      productName,
      productSerial: productSerial ?? null,
      policyTypeDisplay,
      policyName: policyName ?? policyTypeDisplay,
      durationDisplay,
      cycleDisplay,
      expiryDate,
      slaResponseHours: slaResponseHours ?? 24,
      slaResolutionDays: slaResolutionDays ?? 5,
      certificateUrl: certificateUrl ?? null,
    });

    // Step 1: Send email via Resend
    logger.info('Sending warranty confirmation email', {
      to: customerEmail,
      warrantyNumber,
      policyType,
    });

    const fromEmail = process.env.EMAIL_FROM || 'warranties@renoz.energy';
    const fromName = process.env.EMAIL_FROM_NAME || 'Renoz';

    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: customerEmail,
      subject: `Your Warranty Certificate - ${productName}`,
      html: emailHtml,
      text: emailText,
    });

    if (sendError) {
      logger.error('Failed to send warranty registration email', {
        warrantyId,
        warrantyNumber,
        customerEmail,
        error: sendError,
      });
      return {
        success: false,
        reason: 'send_failed',
        error: sendError.message,
        warrantyId,
      };
    }

    const emailResult = {
      success: true,
      messageId: sendResult?.id || `msg-warranty-${Date.now()}`,
      to: customerEmail,
    };

    // Step 2: Create notification record
    let notificationId: string | undefined;
    logger.info('Creating notification record', {
      warrantyId,
      customerId,
    });

    try {
      const metadata: NotificationData = {
        entityId: warrantyId,
        entityType: 'warranty',
        subType: 'registration',
        warrantyNumber,
        productName,
        productSerial,
        policyType,
        policyName,
        expiryDate,
        certificateUrl,
      };

      const [record] = await db
        .insert(notifications)
        .values({
          organizationId,
          userId: customerId,
          type: 'warranty',
          title: `Warranty Registered: ${productName}`,
          message: `Your ${policyTypeDisplay} has been registered. Coverage: ${durationDisplay}${cycleDisplay ? ` / ${cycleDisplay}` : ''}. Expires: ${new Date(expiryDate).toLocaleDateString()}.`,
          data: metadata,
          status: 'pending',
        })
        .returning();

      notificationId = record?.id;
    } catch (error) {
      logger.error('Failed to create notification record', {
        warrantyId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue without failing the entire operation
    }

    logger.info('Warranty registration notification complete', {
      warrantyId,
      warrantyNumber,
      emailSent: emailResult.success,
      notificationId,
    });

    return {
      success: true,
      warrantyId,
      warrantyNumber,
      emailSent: emailResult.success,
      messageId: emailResult.messageId,
      notificationId,
      recipient: customerEmail,
    };
  },
});

// ============================================================================
// WARRANTY EXPIRING SOON REMINDER EMAIL
// ============================================================================

/**
 * Send warranty expiry reminder email to customer.
 *
 * Triggered by scheduled job when warranty is approaching expiry.
 * Sent at configurable intervals (30/60/90 days).
 *
 * For DOM-WAR-003a (future implementation)
 */
export const sendWarrantyExpiryReminder = task({
  id: 'send-warranty-expiry-reminder',
  run: async (payload: WarrantyExpiringSoonPayload) => {
    const {
      warrantyId,
      warrantyNumber,
      organizationId,
      customerId,
      customerEmail,
      productName,
      policyType,
      expiryDate,
      daysUntilExpiry,
      currentCycleCount,
      cycleLimit,
      renewalUrl,
    } = payload;

    // Skip if no customer email
    if (!customerEmail) {
      logger.info('Skipping warranty expiry reminder - no customer email', {
        warrantyId,
        warrantyNumber,
        customerId,
      });
      return {
        success: false,
        reason: 'no_customer_email',
        warrantyId,
      };
    }

    // Check email suppression before sending
    const suppression = await isEmailSuppressedDirect(organizationId, customerEmail);
    if (suppression.suppressed) {
      logger.info('Skipping warranty expiry reminder - email suppressed', {
        warrantyId,
        warrantyNumber,
        customerEmail,
        reason: suppression.reason,
      });
      return {
        success: false,
        reason: 'suppressed',
        suppressionReason: suppression.reason,
        warrantyId,
      };
    }

    logger.info('Sending warranty expiry reminder', {
      warrantyId,
      warrantyNumber,
      daysUntilExpiry,
      customerEmail,
    });

    // Determine urgency level for logging and metadata
    const urgencyLevel =
      daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 30 ? 'warning' : 'info';

    // Get policy type display
    const policyTypeDisplay = getPolicyTypeLabel(policyType);

    // Generate email content using React Email template (EMAIL-TPL-002)
    const { html: emailHtml, text: emailText } = await renderEmail(
      WarrantyExpiring({
        customerName: customerEmail.split('@')[0], // Extract name from email as fallback
        productName,
        warrantyNumber: warrantyNumber ?? undefined,
        policyTypeDisplay,
        daysUntilExpiry,
        expiryDate,
        currentCycleCount: currentCycleCount ?? undefined,
        cycleLimit: cycleLimit ?? undefined,
        renewalUrl: renewalUrl ?? undefined,
        warrantyDetailsUrl: buildDocumentViewUrl('warranty', warrantyId),
      })
    );

    // Step 1: Send email via Resend
    logger.info('Sending expiry reminder email', {
      to: customerEmail,
      urgencyLevel,
      daysUntilExpiry,
    });

    const fromEmail = process.env.EMAIL_FROM || 'warranties@renoz.energy';
    const fromName = process.env.EMAIL_FROM_NAME || 'Renoz';

    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: customerEmail,
      subject: `Warranty Expiring Soon - ${productName}`,
      html: emailHtml,
      text: emailText,
    });

    if (sendError) {
      logger.error('Failed to send warranty expiry reminder email', {
        warrantyId,
        warrantyNumber,
        customerEmail,
        error: sendError,
      });
      return {
        success: false,
        reason: 'send_failed',
        error: sendError.message,
        warrantyId,
      };
    }

    const emailResult = {
      success: true,
      messageId: sendResult?.id || `msg-expiry-${Date.now()}`,
      to: customerEmail,
    };

    // Step 2: Create notification record
    let notificationId: string | undefined;
    try {
      const metadata: NotificationData = {
        entityId: warrantyId,
        entityType: 'warranty',
        subType: 'expiry_reminder',
        warrantyNumber,
        productName,
        policyType,
        expiryDate,
        daysUntilExpiry,
        urgencyLevel,
        currentCycleCount,
        cycleLimit,
        renewalUrl,
      };

      const [record] = await db
        .insert(notifications)
        .values({
          organizationId,
          userId: customerId,
          type: 'warranty',
          title: `Warranty Expiring Soon: ${productName}`,
          message: `Your warranty for ${productName} expires in ${daysUntilExpiry} days (${new Date(expiryDate).toLocaleDateString()}).`,
          data: metadata,
          status: 'pending',
        })
        .returning();

      notificationId = record?.id;
    } catch (error) {
      logger.error('Failed to create notification record', {
        warrantyId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue without failing the entire operation
    }

    return {
      success: true,
      warrantyId,
      warrantyNumber,
      daysUntilExpiry,
      urgencyLevel,
      emailSent: emailResult.success,
      messageId: emailResult.messageId,
      notificationId,
      recipient: customerEmail,
    };
  },
});

// ============================================================================
// WARRANTY CLAIM SUBMITTED EMAIL
// ============================================================================

export const sendWarrantyClaimSubmittedNotification = client.defineJob({
  id: 'send-warranty-claim-submitted-notification',
  name: 'Send Warranty Claim Submitted Notification',
  version: '1.0.0',
  trigger: eventTrigger({
    name: warrantyEvents.claimSubmitted,
  }),
  run: async (payload: WarrantyClaimSubmittedPayload, io) => {
    const recipient = resolveClaimNotificationRecipient(payload);
    const claimUrl = buildClaimDetailsUrl(payload.claimId);
    const claimantRoleLabel = getClaimantRoleLabel(payload.claimantRole);
    const metadata: NotificationData = {
      entityId: payload.claimId,
      entityType: 'warranty_claim',
      subType: 'claim_submitted',
      actionUrl: claimUrl,
      claimId: payload.claimId,
      claimNumber: payload.claimNumber,
      warrantyId: payload.warrantyId,
      warrantyNumber: payload.warrantyNumber,
      commercialCustomerId: payload.customerId,
      commercialCustomerName: payload.customerName,
      claimantRole: payload.claimantRole ?? 'channel_partner',
      claimantCustomerId: payload.claimantCustomerId ?? null,
      claimantName: payload.claimantName ?? null,
      channelBypassReason: payload.channelBypassReason ?? null,
      recipientKind: recipient.recipientKind,
    };

    if (!recipient.recipientEmail) {
      await io.logger.warn('Skipping warranty claim submitted email - no recipient email', {
        claimId: payload.claimId,
        claimNumber: payload.claimNumber,
        recipientKind: recipient.recipientKind,
        claimantRole: payload.claimantRole ?? 'channel_partner',
      });

      const notificationResult = await createClaimNotificationRecord({
        organizationId: payload.organizationId,
        userId: recipient.notificationUserId,
        title: `Warranty Claim Submitted: ${payload.claimNumber}`,
        message: `${payload.productName} claim submitted via ${claimantRoleLabel}.`,
        metadata,
      });

      return {
        success: false,
        reason: 'no_recipient_email',
        claimId: payload.claimId,
        notificationId:
          notificationResult.created ? notificationResult.notificationId : undefined,
      };
    }

    const suppression = await isEmailSuppressedDirect(
      payload.organizationId,
      recipient.recipientEmail
    );
    if (suppression.suppressed) {
      await io.logger.info('Skipping warranty claim submitted email - email suppressed', {
        claimId: payload.claimId,
        claimNumber: payload.claimNumber,
        recipientEmail: recipient.recipientEmail,
        reason: suppression.reason,
      });

      return {
        success: false,
        reason: 'suppressed',
        suppressionReason: suppression.reason,
        claimId: payload.claimId,
      };
    }

    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME || 'Renoz'} <${process.env.EMAIL_FROM || 'warranties@renoz.energy'}>`,
      to: recipient.recipientEmail,
      subject: `Warranty Claim Submitted - ${payload.claimNumber}`,
      html: generateClaimSubmittedHtml({
        recipientName: recipient.recipientName,
        claimNumber: payload.claimNumber,
        warrantyNumber: payload.warrantyNumber,
        productName: payload.productName,
        claimType: payload.claimType,
        claimantRoleLabel,
        description: payload.description,
        submittedAt: payload.submittedAt,
        channelBypassReason: payload.channelBypassReason,
        claimUrl,
      }),
      text: generateClaimSubmittedText({
        recipientName: recipient.recipientName,
        claimNumber: payload.claimNumber,
        warrantyNumber: payload.warrantyNumber,
        productName: payload.productName,
        claimType: payload.claimType,
        claimantRoleLabel,
        description: payload.description,
        submittedAt: payload.submittedAt,
        channelBypassReason: payload.channelBypassReason,
        claimUrl,
      }),
    });

    if (sendError) {
      await io.logger.error('Failed to send warranty claim submitted email', {
        claimId: payload.claimId,
        claimNumber: payload.claimNumber,
        recipientEmail: recipient.recipientEmail,
        error: sendError.message,
      });
      return {
        success: false,
        reason: 'send_failed',
        error: sendError.message,
        claimId: payload.claimId,
      };
    }

    const notificationResult = await createClaimNotificationRecord({
      organizationId: payload.organizationId,
      userId: recipient.notificationUserId,
      title: `Warranty Claim Submitted: ${payload.claimNumber}`,
      message: `${payload.productName} claim submitted via ${claimantRoleLabel}.`,
      metadata,
    });

    return {
      success: true,
      claimId: payload.claimId,
      messageId: sendResult?.id,
      recipient: recipient.recipientEmail,
      notificationId:
        notificationResult.created ? notificationResult.notificationId : undefined,
      notificationSkipped:
        notificationResult.created === false ? 'no_notification_user' : undefined,
    };
  },
});

// ============================================================================
// WARRANTY CLAIM RESOLVED EMAIL
// ============================================================================

export const sendWarrantyClaimResolvedNotification = client.defineJob({
  id: 'send-warranty-claim-resolved-notification',
  name: 'Send Warranty Claim Resolved Notification',
  version: '1.0.0',
  trigger: eventTrigger({
    name: warrantyEvents.claimResolved,
  }),
  run: async (payload: WarrantyClaimResolvedPayload, io) => {
    const recipient = resolveClaimNotificationRecipient(payload);
    const claimUrl = buildClaimDetailsUrl(payload.claimId);
    const claimantRoleLabel = getClaimantRoleLabel(payload.claimantRole);
    const metadata: NotificationData = {
      entityId: payload.claimId,
      entityType: 'warranty_claim',
      subType: 'claim_resolved',
      actionUrl: claimUrl,
      claimId: payload.claimId,
      claimNumber: payload.claimNumber,
      warrantyId: payload.warrantyId,
      warrantyNumber: payload.warrantyNumber,
      commercialCustomerId: payload.customerId,
      commercialCustomerName: payload.customerName,
      claimantRole: payload.claimantRole ?? 'channel_partner',
      claimantCustomerId: payload.claimantCustomerId ?? null,
      claimantName: payload.claimantName ?? null,
      channelBypassReason: payload.channelBypassReason ?? null,
      recipientKind: recipient.recipientKind,
      resolutionType: payload.resolutionType,
    };

    if (!recipient.recipientEmail) {
      await io.logger.warn('Skipping warranty claim resolved email - no recipient email', {
        claimId: payload.claimId,
        claimNumber: payload.claimNumber,
        recipientKind: recipient.recipientKind,
        claimantRole: payload.claimantRole ?? 'channel_partner',
      });

      const notificationResult = await createClaimNotificationRecord({
        organizationId: payload.organizationId,
        userId: recipient.notificationUserId,
        title: `Warranty Claim Resolved: ${payload.claimNumber}`,
        message: `${payload.claimNumber} was resolved with ${payload.resolutionType}.`,
        metadata,
      });

      return {
        success: false,
        reason: 'no_recipient_email',
        claimId: payload.claimId,
        notificationId:
          notificationResult.created ? notificationResult.notificationId : undefined,
      };
    }

    const suppression = await isEmailSuppressedDirect(
      payload.organizationId,
      recipient.recipientEmail
    );
    if (suppression.suppressed) {
      await io.logger.info('Skipping warranty claim resolved email - email suppressed', {
        claimId: payload.claimId,
        claimNumber: payload.claimNumber,
        recipientEmail: recipient.recipientEmail,
        reason: suppression.reason,
      });

      return {
        success: false,
        reason: 'suppressed',
        suppressionReason: suppression.reason,
        claimId: payload.claimId,
      };
    }

    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME || 'Renoz'} <${process.env.EMAIL_FROM || 'warranties@renoz.energy'}>`,
      to: recipient.recipientEmail,
      subject: `Warranty Claim Resolved - ${payload.claimNumber}`,
      html: generateClaimResolvedHtml({
        recipientName: recipient.recipientName,
        claimNumber: payload.claimNumber,
        warrantyNumber: payload.warrantyNumber,
        claimantRoleLabel,
        resolutionType: payload.resolutionType,
        resolution: payload.resolution,
        resolvedAt: payload.resolvedAt,
        resolutionNotes: payload.resolutionNotes,
        claimUrl,
      }),
      text: generateClaimResolvedText({
        recipientName: recipient.recipientName,
        claimNumber: payload.claimNumber,
        warrantyNumber: payload.warrantyNumber,
        claimantRoleLabel,
        resolutionType: payload.resolutionType,
        resolution: payload.resolution,
        resolvedAt: payload.resolvedAt,
        resolutionNotes: payload.resolutionNotes,
        claimUrl,
      }),
    });

    if (sendError) {
      await io.logger.error('Failed to send warranty claim resolved email', {
        claimId: payload.claimId,
        claimNumber: payload.claimNumber,
        recipientEmail: recipient.recipientEmail,
        error: sendError.message,
      });
      return {
        success: false,
        reason: 'send_failed',
        error: sendError.message,
        claimId: payload.claimId,
      };
    }

    const notificationResult = await createClaimNotificationRecord({
      organizationId: payload.organizationId,
      userId: recipient.notificationUserId,
      title: `Warranty Claim Resolved: ${payload.claimNumber}`,
      message: `${payload.claimNumber} was resolved with ${payload.resolutionType}.`,
      metadata,
    });

    return {
      success: true,
      claimId: payload.claimId,
      messageId: sendResult?.id,
      recipient: recipient.recipientEmail,
      notificationId:
        notificationResult.created ? notificationResult.notificationId : undefined,
      notificationSkipped:
        notificationResult.created === false ? 'no_notification_user' : undefined,
    };
  },
});
