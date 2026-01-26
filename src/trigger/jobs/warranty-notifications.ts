/**
 * Warranty Notification Jobs
 *
 * Background jobs for warranty-related notifications:
 * - Registration confirmation emails
 * - Expiry reminder emails
 *
 * @see src/trigger/client.ts for event definitions
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-002
 */
import { task } from '@trigger.dev/sdk/v3';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { notifications, type NotificationData } from 'drizzle/schema';
import { type WarrantyRegisteredPayload, type WarrantyExpiringSoonPayload } from '../client';
import { isEmailSuppressedDirect } from '@/server/functions/communications/email-suppression';
import { renderEmail, WarrantyExpiring } from '@/lib/email';

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
      console.log('Skipping warranty registration email - no customer email', {
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
      console.log('Skipping warranty registration email - email suppressed', {
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

    console.log('Sending warranty registration confirmation', {
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
    console.log('Sending warranty confirmation email', {
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
      console.error('Failed to send warranty registration email', {
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
    console.log('Creating notification record', {
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
      console.error('Failed to create notification record', error);
      // Continue without failing the entire operation
    }

    console.log('Warranty registration notification complete', {
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
      console.log('Skipping warranty expiry reminder - no customer email', {
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
      console.log('Skipping warranty expiry reminder - email suppressed', {
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

    console.log('Sending warranty expiry reminder', {
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
        warrantyDetailsUrl: `${process.env.APP_URL ?? 'https://app.renoz.energy'}/warranty/${warrantyId}`,
      })
    );

    // Step 1: Send email via Resend
    console.log('Sending expiry reminder email', {
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
      console.error('Failed to send warranty expiry reminder email', {
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
      console.error('Failed to create notification record', error);
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
