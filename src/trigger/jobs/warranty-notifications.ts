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
import { db } from '@/lib/db';
import { notifications, type NotificationData } from 'drizzle/schema';
import { type WarrantyRegisteredPayload, type WarrantyExpiringSoonPayload } from '../client';

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
      // These will be used when email templates are implemented
      slaResponseHours: _slaResponseHours,
      slaResolutionDays: _slaResolutionDays,
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

    // Step 1: Send email
    console.log('Sending warranty confirmation email', {
      to: customerEmail,
      warrantyNumber,
      policyType,
    });

    // TODO: Replace with actual email provider (Resend, SendGrid, etc.)
    // Example with Resend:
    // const { data, error } = await resend.emails.send({
    //   from: 'Renoz Energy <warranties@renoz.energy>',
    //   to: customerEmail,
    //   subject: `Your Warranty Certificate - ${productName}`,
    //   react: WarrantyRegisteredEmail({
    //     productName,
    //     productSerial,
    //     policyTypeDisplay,
    //     policyName,
    //     durationDisplay,
    //     cycleLimit,
    //     expiryDate,
    //     slaResponseHours,
    //     slaResolutionDays,
    //     certificateUrl,
    //   }),
    // })

    const emailResult = {
      success: true,
      messageId: `msg-warranty-${Date.now()}`,
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

    console.log('Sending warranty expiry reminder', {
      warrantyId,
      warrantyNumber,
      daysUntilExpiry,
      customerEmail,
    });

    // Determine urgency level
    const urgencyLevel =
      daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 30 ? 'warning' : 'info';

    // Format cycle status for battery warranties
    let cycleStatusDisplay: string | null = null;
    if (policyType === 'battery_performance' && cycleLimit) {
      if (currentCycleCount) {
        const remaining = cycleLimit - currentCycleCount;
        const percentUsed = Math.round((currentCycleCount / cycleLimit) * 100);
        cycleStatusDisplay = `${remaining.toLocaleString()} cycles remaining (${percentUsed}% used)`;
      } else {
        cycleStatusDisplay = `${cycleLimit.toLocaleString()} cycles remaining`;
      }
    }

    // Step 1: Send email
    console.log('Sending expiry reminder email', {
      to: customerEmail,
      urgencyLevel,
      daysUntilExpiry,
    });

    // TODO: Replace with actual email provider
    const emailResult = {
      success: true,
      messageId: `msg-expiry-${Date.now()}`,
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
          message: `Your warranty for ${productName} expires in ${daysUntilExpiry} days (${new Date(expiryDate).toLocaleDateString()}).${cycleStatusDisplay ? ` ${cycleStatusDisplay}` : ''}`,
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
      notificationId,
    };
  },
});
