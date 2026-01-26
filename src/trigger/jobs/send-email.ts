/**
 * Send Email Tasks (Trigger.dev v3)
 *
 * Background tasks to send transactional emails.
 * Handles order confirmations, shipping notifications, and alerts.
 *
 * @see https://trigger.dev/docs/v3/tasks
 */
import { task, logger } from "@trigger.dev/sdk/v3";
import { Resend } from "resend";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  organizations,
  users,
  emailHistory,
  products,
  type NewEmailHistory,
} from "drizzle/schema";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// TYPES
// ============================================================================

export interface OrderConfirmedPayload {
  orderId: string;
  orderNumber: string;
  customerId: string;
  organizationId: string;
  total: number;
}

export interface OrderShippedPayload {
  orderId: string;
  orderNumber: string;
  customerId: string;
  organizationId: string;
  trackingNumber?: string;
  carrier?: string;
}

export interface LowStockPayload {
  productId: string;
  locationId: string;
  organizationId: string;
  currentQuantity: number;
  reorderPoint: number;
  reorderQuantity: number;
  isCritical: boolean;
}

// ============================================================================
// EMAIL CONFIGURATION
// ============================================================================

/**
 * Get sender email configuration from environment.
 */
function getSenderConfig() {
  const fromEmail = process.env.EMAIL_FROM || "noreply@resend.dev";
  const fromName = process.env.EMAIL_FROM_NAME || "Renoz";
  return {
    fromEmail,
    fromName,
    fromAddress: `${fromName} <${fromEmail}>`,
  };
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Generate order confirmation email HTML.
 */
function generateOrderConfirmationHtml(params: {
  customerName: string;
  orderNumber: string;
  total: number;
  orgName: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a1a;">Order Confirmed!</h1>
  <p>Hi ${params.customerName},</p>
  <p>Thank you for your order <strong>${params.orderNumber}</strong>.</p>
  <p style="font-size: 18px;">Order Total: <strong>$${params.total.toFixed(2)}</strong></p>
  <p>We'll notify you when your order ships.</p>
  <p>Best regards,<br>The ${params.orgName} Team</p>
</body>
</html>`;
}

/**
 * Generate shipping notification email HTML.
 */
function generateShippingNotificationHtml(params: {
  customerName: string;
  orderNumber: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  orgName: string;
}) {
  const trackingSection =
    params.trackingNumber && params.trackingUrl
      ? `<p>Tracking Number: <strong>${params.trackingNumber}</strong></p>
       <p><a href="${params.trackingUrl}" style="color: #0066cc;">Track Your Order</a></p>`
      : params.trackingNumber
        ? `<p>Tracking Number: <strong>${params.trackingNumber}</strong></p>`
        : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Order Has Shipped</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a1a;">Your Order is On Its Way!</h1>
  <p>Hi ${params.customerName},</p>
  <p>Great news! Your order <strong>${params.orderNumber}</strong> has shipped.</p>
  ${trackingSection}
  <p>Best regards,<br>The ${params.orgName} Team</p>
</body>
</html>`;
}

/**
 * Generate low stock alert email HTML.
 */
function generateLowStockAlertHtml(params: {
  productName: string;
  sku: string;
  currentQuantity: number;
  reorderPoint: number;
  isCritical: boolean;
  orgName: string;
}) {
  const alertLevel = params.isCritical ? "CRITICAL" : "Warning";
  const alertColor = params.isCritical ? "#dc2626" : "#f59e0b";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Low Stock Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h1 style="color: ${alertColor};">${alertLevel}: Low Stock Alert</h1>
  <p>The following product has fallen below its reorder point:</p>
  <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Product</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${params.productName}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>SKU</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${params.sku}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Current Quantity</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd; color: ${alertColor};">${params.currentQuantity}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reorder Point</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${params.reorderPoint}</td>
    </tr>
  </table>
  <p>Please reorder soon to avoid stockouts.</p>
  <p>Best regards,<br>The ${params.orgName} Inventory System</p>
</body>
</html>`;
}

/**
 * Convert HTML to plain text for email.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ============================================================================
// ORDER CONFIRMATION EMAIL TASK
// ============================================================================

export const sendOrderConfirmation = task({
  id: "send-order-confirmation",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: OrderConfirmedPayload) => {
    const { orderId, orderNumber, customerId, organizationId, total } = payload;

    logger.info("Sending order confirmation email", {
      orderId,
      orderNumber,
      customerId,
    });

    // Step 1: Fetch customer email
    const [customerData] = await db
      .select({
        email: customers.email,
        name: customers.name,
      })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!customerData || !customerData.email) {
      throw new Error(`Customer ${customerId} not found or has no email`);
    }

    const customer = {
      email: customerData.email,
      name: customerData.name || "Valued Customer",
    };

    // Step 2: Fetch organization details
    const [orgData] = await db
      .select({
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const org = {
      name: orgData?.name || "Renoz",
    };

    // Step 3: Create email history, send via Resend, and update status
    const senderConfig = getSenderConfig();
    const subject = `Order Confirmed - ${orderNumber}`;
    const htmlContent = generateOrderConfirmationHtml({
      customerName: customer.name,
      orderNumber,
      total,
      orgName: org.name,
    });
    const textContent = htmlToText(htmlContent);

    // Create email history record
    const [emailRecord] = await db
      .insert(emailHistory)
      .values({
        organizationId,
        fromAddress: senderConfig.fromAddress,
        toAddress: customer.email,
        customerId,
        subject,
        bodyHtml: htmlContent,
        bodyText: textContent,
        status: "pending",
      } as NewEmailHistory)
      .returning();

    // Send email via Resend
    const { data: sendResult, error } = await resend.emails.send({
      from: senderConfig.fromAddress,
      to: [customer.email],
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      // Update email history with failure
      await db
        .update(emailHistory)
        .set({ status: "failed" })
        .where(eq(emailHistory.id, emailRecord.id));

      throw new Error(`Failed to send email: ${error.message}`);
    }

    // Update email history with success and Resend message ID
    await db
      .update(emailHistory)
      .set({
        status: "sent",
        sentAt: new Date(),
        resendMessageId: sendResult?.id,
      })
      .where(eq(emailHistory.id, emailRecord.id));

    logger.info(
      `Email sent successfully (resendMessageId: ${sendResult?.id})`,
      {
        to: customer.email,
        emailHistoryId: emailRecord.id,
      }
    );

    return {
      success: true,
      orderId,
      orderNumber,
      emailSent: true,
      messageId: sendResult?.id || null,
      emailHistoryId: emailRecord.id,
    };
  },
});

// ============================================================================
// SHIPPING NOTIFICATION EMAIL TASK
// ============================================================================

export const sendShippingNotification = task({
  id: "send-shipping-notification",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: OrderShippedPayload) => {
    const {
      orderId,
      orderNumber,
      customerId,
      organizationId,
      trackingNumber,
      carrier,
    } = payload;

    logger.info("Sending shipping notification", {
      orderId,
      orderNumber,
      trackingNumber,
    });

    // Step 1: Fetch customer
    const [customerData] = await db
      .select({
        email: customers.email,
        name: customers.name,
      })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.organizationId, organizationId),
          sql`${customers.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!customerData || !customerData.email) {
      throw new Error(`Customer ${customerId} not found or has no email`);
    }

    const customer = {
      email: customerData.email,
      name: customerData.name || "Valued Customer",
    };

    // Step 2: Fetch organization details
    const [orgData] = await db
      .select({
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const org = {
      name: orgData?.name || "Renoz",
    };

    // Step 3: Generate tracking URL
    let trackingUrl: string | null = null;
    if (trackingNumber && carrier) {
      const trackingUrls: Record<string, string> = {
        fedex: `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`,
        ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
        usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
        dhl: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      };
      trackingUrl = trackingUrls[carrier.toLowerCase()] || null;
    }

    // Step 4: Create email history, send via Resend, and update status
    const senderConfig = getSenderConfig();
    const subject = `Your Order ${orderNumber} Has Shipped!`;
    const htmlContent = generateShippingNotificationHtml({
      customerName: customer.name,
      orderNumber,
      trackingNumber,
      trackingUrl,
      orgName: org.name,
    });
    const textContent = htmlToText(htmlContent);

    // Create email history record
    const [emailRecord] = await db
      .insert(emailHistory)
      .values({
        organizationId,
        fromAddress: senderConfig.fromAddress,
        toAddress: customer.email,
        customerId,
        subject,
        bodyHtml: htmlContent,
        bodyText: textContent,
        status: "pending",
      } as NewEmailHistory)
      .returning();

    // Send email via Resend
    const { data: sendResult, error } = await resend.emails.send({
      from: senderConfig.fromAddress,
      to: [customer.email],
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      // Update email history with failure
      await db
        .update(emailHistory)
        .set({ status: "failed" })
        .where(eq(emailHistory.id, emailRecord.id));

      throw new Error(`Failed to send email: ${error.message}`);
    }

    // Update email history with success and Resend message ID
    await db
      .update(emailHistory)
      .set({
        status: "sent",
        sentAt: new Date(),
        resendMessageId: sendResult?.id,
      })
      .where(eq(emailHistory.id, emailRecord.id));

    logger.info(
      `Shipping notification sent (resendMessageId: ${sendResult?.id})`,
      {
        to: customer.email,
        emailHistoryId: emailRecord.id,
      }
    );

    return {
      success: true,
      orderId,
      orderNumber,
      trackingUrl,
      emailSent: true,
      messageId: sendResult?.id || null,
      emailHistoryId: emailRecord.id,
    };
  },
});

// ============================================================================
// LOW STOCK ALERT EMAIL TASK
// ============================================================================

export const sendLowStockAlert = task({
  id: "send-low-stock-alert",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: LowStockPayload) => {
    const {
      productId,
      organizationId,
      currentQuantity,
      reorderPoint,
      isCritical,
    } = payload;

    logger.info("Sending low stock alert", {
      productId,
      currentQuantity,
      reorderPoint,
      isCritical,
    });

    // Step 1: Fetch product details
    const [productData] = await db
      .select({
        name: products.name,
        sku: products.sku,
      })
      .from(products)
      .where(
        and(eq(products.id, productId), eq(products.organizationId, organizationId))
      )
      .limit(1);

    if (!productData) {
      throw new Error(`Product ${productId} not found`);
    }

    const product = {
      name: productData.name,
      sku: productData.sku,
    };

    // Step 2: Fetch organization details
    const [orgData] = await db
      .select({
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const org = {
      name: orgData?.name || "Renoz",
    };

    // Step 3: Fetch operations team and admin emails
    const opsUsers = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          sql`${users.role} IN ('operations', 'admin', 'owner')`,
          sql`${users.deletedAt} IS NULL`,
          sql`${users.status} = 'active'`
        )
      );

    const recipients = opsUsers
      .map((u) => u.email)
      .filter((email): email is string => !!email);

    if (recipients.length === 0) {
      throw new Error(
        `No operations team members found for organization ${organizationId}`
      );
    }

    // Step 4: Send alerts to all recipients
    const senderConfig = getSenderConfig();
    const alertType = isCritical ? "CRITICAL" : "Warning";
    const subject = `${alertType}: Low Stock Alert - ${product.name}`;
    const htmlContent = generateLowStockAlertHtml({
      productName: product.name,
      sku: product.sku,
      currentQuantity,
      reorderPoint,
      isCritical,
      orgName: org.name,
    });
    const textContent = htmlToText(htmlContent);

    const results: Array<{
      email: string;
      messageId: string | null;
      success: boolean;
      error?: string;
    }> = [];

    for (const recipientEmail of recipients) {
      try {
        // Create email history record
        const [emailRecord] = await db
          .insert(emailHistory)
          .values({
            organizationId,
            fromAddress: senderConfig.fromAddress,
            toAddress: recipientEmail,
            subject,
            bodyHtml: htmlContent,
            bodyText: textContent,
            status: "pending",
          } as NewEmailHistory)
          .returning();

        // Send email via Resend
        const { data: sendResult, error } = await resend.emails.send({
          from: senderConfig.fromAddress,
          to: [recipientEmail],
          subject,
          html: htmlContent,
          text: textContent,
        });

        if (error) {
          // Update email history with failure
          await db
            .update(emailHistory)
            .set({ status: "failed" })
            .where(eq(emailHistory.id, emailRecord.id));

          results.push({
            email: recipientEmail,
            messageId: null,
            success: false,
            error: error.message,
          });
        } else {
          // Update email history with success and Resend message ID
          await db
            .update(emailHistory)
            .set({
              status: "sent",
              sentAt: new Date(),
              resendMessageId: sendResult?.id,
            })
            .where(eq(emailHistory.id, emailRecord.id));

          results.push({
            email: recipientEmail,
            messageId: sendResult?.id || null,
            success: true,
          });
        }
      } catch (err) {
        results.push({
          email: recipientEmail,
          messageId: null,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Log results
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    for (const result of results) {
      if (result.success) {
        logger.info(
          `Low stock alert sent to ${result.email} (resendMessageId: ${result.messageId})`
        );
      } else {
        logger.error(
          `Failed to send alert to ${result.email}: ${result.error}`
        );
      }
    }

    return {
      success: successCount > 0,
      productId,
      product: product.name,
      isCritical,
      emailsSent: successCount,
      emailsFailed: failedCount,
      totalRecipients: recipients.length,
    };
  },
});

// ============================================================================
// LEGACY EXPORTS (for backward compatibility during migration)
// ============================================================================

/** @deprecated Use sendOrderConfirmation instead */
export const sendOrderConfirmationJob = sendOrderConfirmation;
/** @deprecated Use sendShippingNotification instead */
export const sendShippingNotificationJob = sendShippingNotification;
/** @deprecated Use sendLowStockAlert instead */
export const sendLowStockAlertJob = sendLowStockAlert;
