/**
 * Send Email Job
 *
 * Background job to send transactional emails.
 * Handles order confirmations, shipping notifications, and alerts.
 *
 * @see https://trigger.dev/docs/documentation/guides/create-a-job
 */
import { eventTrigger } from '@trigger.dev/sdk'
import { Resend } from 'resend'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customers, organizations, users, emailHistory, products, type NewEmailHistory } from 'drizzle/schema'
import {
  client,
  orderEvents,
  inventoryEvents,
  type OrderConfirmedPayload,
  type OrderShippedPayload,
  type LowStockPayload,
} from '../client'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// ============================================================================
// EMAIL CONFIGURATION
// ============================================================================

/**
 * Get sender email configuration from environment.
 */
function getSenderConfig() {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@resend.dev'
  const fromName = process.env.EMAIL_FROM_NAME || 'Renoz'
  return {
    fromEmail,
    fromName,
    fromAddress: `${fromName} <${fromEmail}>`,
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

// Email template types - will be used when email provider is integrated
// type EmailTemplate = 'order-confirmation' | 'order-shipped' | 'low-stock-alert' | 'deal-won' | 'deal-lost'

/**
 * Generate order confirmation email HTML.
 */
function generateOrderConfirmationHtml(params: {
  customerName: string
  orderNumber: string
  total: number
  orgName: string
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
</html>`
}

/**
 * Generate shipping notification email HTML.
 */
function generateShippingNotificationHtml(params: {
  customerName: string
  orderNumber: string
  trackingNumber?: string | null
  trackingUrl?: string | null
  orgName: string
}) {
  const trackingSection = params.trackingNumber && params.trackingUrl
    ? `<p>Tracking Number: <strong>${params.trackingNumber}</strong></p>
       <p><a href="${params.trackingUrl}" style="color: #0066cc;">Track Your Order</a></p>`
    : params.trackingNumber
    ? `<p>Tracking Number: <strong>${params.trackingNumber}</strong></p>`
    : ''

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
</html>`
}

/**
 * Generate low stock alert email HTML.
 */
function generateLowStockAlertHtml(params: {
  productName: string
  sku: string
  currentQuantity: number
  reorderPoint: number
  isCritical: boolean
  orgName: string
}) {
  const alertLevel = params.isCritical ? 'CRITICAL' : 'Warning'
  const alertColor = params.isCritical ? '#dc2626' : '#f59e0b'

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
</html>`
}

/**
 * Convert HTML to plain text for email.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ============================================================================
// ORDER CONFIRMATION EMAIL JOB
// ============================================================================

export const sendOrderConfirmationJob = client.defineJob({
  id: 'send-order-confirmation',
  name: 'Send Order Confirmation Email',
  version: '1.0.0',
  trigger: eventTrigger({
    name: orderEvents.confirmed,
  }),
  run: async (payload: OrderConfirmedPayload, io) => {
    const { orderId, orderNumber, customerId, organizationId, total } = payload

    await io.logger.info('Sending order confirmation email', {
      orderId,
      orderNumber,
      customerId,
    })

    // Step 1: Fetch customer email (returns only serializable primitives)
    const customer = await io.runTask('fetch-customer', async () => {
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
        .limit(1)

      if (!customerData || !customerData.email) {
        throw new Error(`Customer ${customerId} not found or has no email`)
      }

      return {
        email: customerData.email,
        name: customerData.name || 'Valued Customer',
      }
    })

    // Step 2: Fetch organization details
    const org = await io.runTask('fetch-org', async () => {
      const [orgData] = await db
        .select({
          name: organizations.name,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1)

      return {
        name: orgData?.name || 'Renoz',
      }
    })

    // Step 3: Create email history, send via Resend, and update status
    const emailResult = await io.runTask('send-email', async () => {
      const senderConfig = getSenderConfig()
      const subject = `Order Confirmed - ${orderNumber}`
      const htmlContent = generateOrderConfirmationHtml({
        customerName: customer.name,
        orderNumber,
        total,
        orgName: org.name,
      })
      const textContent = htmlToText(htmlContent)

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
          status: 'pending',
        } as NewEmailHistory)
        .returning()

      // Send email via Resend
      const { data: sendResult, error } = await resend.emails.send({
        from: senderConfig.fromAddress,
        to: [customer.email],
        subject,
        html: htmlContent,
        text: textContent,
      })

      if (error) {
        // Update email history with failure
        await db
          .update(emailHistory)
          .set({ status: 'failed' })
          .where(eq(emailHistory.id, emailRecord.id))

        throw new Error(`Failed to send email: ${error.message}`)
      }

      // Update email history with success and Resend message ID
      await db
        .update(emailHistory)
        .set({
          status: 'sent',
          sentAt: new Date(),
          resendMessageId: sendResult?.id,
        })
        .where(eq(emailHistory.id, emailRecord.id))

      return {
        success: true,
        messageId: sendResult?.id || null,
        emailHistoryId: emailRecord.id,
      }
    })

    await io.logger.info(`Email sent successfully (resendMessageId: ${emailResult.messageId})`, {
      to: customer.email,
      emailHistoryId: emailResult.emailHistoryId,
    })

    return {
      success: true,
      orderId,
      orderNumber,
      emailSent: emailResult.success,
      messageId: emailResult.messageId,
      emailHistoryId: emailResult.emailHistoryId,
    }
  },
})

// ============================================================================
// SHIPPING NOTIFICATION EMAIL JOB
// ============================================================================

export const sendShippingNotificationJob = client.defineJob({
  id: 'send-shipping-notification',
  name: 'Send Shipping Notification Email',
  version: '1.0.0',
  trigger: eventTrigger({
    name: orderEvents.shipped,
  }),
  run: async (payload: OrderShippedPayload, io) => {
    const { orderId, orderNumber, customerId, organizationId, trackingNumber, carrier } = payload

    await io.logger.info('Sending shipping notification', {
      orderId,
      orderNumber,
      trackingNumber,
    })

    // Step 1: Fetch customer (returns only serializable primitives)
    const customer = await io.runTask('fetch-customer', async () => {
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
        .limit(1)

      if (!customerData || !customerData.email) {
        throw new Error(`Customer ${customerId} not found or has no email`)
      }

      return {
        email: customerData.email,
        name: customerData.name || 'Valued Customer',
      }
    })

    // Step 2: Fetch organization details
    const org = await io.runTask('fetch-org', async () => {
      const [orgData] = await db
        .select({
          name: organizations.name,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1)

      return {
        name: orgData?.name || 'Renoz',
      }
    })

    // Step 3: Generate tracking URL
    const trackingUrl = await io.runTask('generate-tracking-url', async () => {
      if (!trackingNumber || !carrier) return null

      // Generate carrier-specific tracking URL
      const trackingUrls: Record<string, string> = {
        fedex: `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`,
        ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
        usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
        dhl: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      }

      return trackingUrls[carrier.toLowerCase()] || null
    })

    // Step 4: Create email history, send via Resend, and update status
    const emailResult = await io.runTask('send-email', async () => {
      const senderConfig = getSenderConfig()
      const subject = `Your Order ${orderNumber} Has Shipped!`
      const htmlContent = generateShippingNotificationHtml({
        customerName: customer.name,
        orderNumber,
        trackingNumber,
        trackingUrl,
        orgName: org.name,
      })
      const textContent = htmlToText(htmlContent)

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
          status: 'pending',
        } as NewEmailHistory)
        .returning()

      // Send email via Resend
      const { data: sendResult, error } = await resend.emails.send({
        from: senderConfig.fromAddress,
        to: [customer.email],
        subject,
        html: htmlContent,
        text: textContent,
      })

      if (error) {
        // Update email history with failure
        await db
          .update(emailHistory)
          .set({ status: 'failed' })
          .where(eq(emailHistory.id, emailRecord.id))

        throw new Error(`Failed to send email: ${error.message}`)
      }

      // Update email history with success and Resend message ID
      await db
        .update(emailHistory)
        .set({
          status: 'sent',
          sentAt: new Date(),
          resendMessageId: sendResult?.id,
        })
        .where(eq(emailHistory.id, emailRecord.id))

      return {
        success: true,
        messageId: sendResult?.id || null,
        emailHistoryId: emailRecord.id,
      }
    })

    await io.logger.info(`Shipping notification sent (resendMessageId: ${emailResult.messageId})`, {
      to: customer.email,
      emailHistoryId: emailResult.emailHistoryId,
    })

    return {
      success: true,
      orderId,
      orderNumber,
      trackingUrl,
      emailSent: emailResult.success,
      messageId: emailResult.messageId,
      emailHistoryId: emailResult.emailHistoryId,
    }
  },
})

// ============================================================================
// LOW STOCK ALERT EMAIL JOB
// ============================================================================

export const sendLowStockAlertJob = client.defineJob({
  id: 'send-low-stock-alert',
  name: 'Send Low Stock Alert Email',
  version: '1.0.0',
  trigger: eventTrigger({
    name: inventoryEvents.lowStock,
  }),
  run: async (payload: LowStockPayload, io) => {
    const { productId, organizationId, currentQuantity, reorderPoint, isCritical } = payload

    await io.logger.info('Sending low stock alert', {
      productId,
      currentQuantity,
      reorderPoint,
      isCritical,
    })

    // Step 1: Fetch product details (returns only serializable primitives)
    const product = await io.runTask('fetch-product', async () => {
      const [productData] = await db
        .select({
          name: products.name,
          sku: products.sku,
        })
        .from(products)
        .where(
          and(
            eq(products.id, productId),
            eq(products.organizationId, organizationId)
          )
        )
        .limit(1)

      if (!productData) {
        throw new Error(`Product ${productId} not found`)
      }

      return {
        name: productData.name,
        sku: productData.sku,
      }
    })

    // Step 2: Fetch organization details
    const org = await io.runTask('fetch-org', async () => {
      const [orgData] = await db
        .select({
          name: organizations.name,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1)

      return {
        name: orgData?.name || 'Renoz',
      }
    })

    // Step 3: Fetch operations team and admin emails
    const recipients = await io.runTask('fetch-ops-team', async () => {
      // Fetch users with operations, admin, or owner role
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
        )

      const emails = opsUsers
        .map((u) => u.email)
        .filter((email): email is string => !!email)

      if (emails.length === 0) {
        throw new Error(`No operations team members found for organization ${organizationId}`)
      }

      return emails
    })

    // Step 4: Send alerts to all recipients
    const emailResults = await io.runTask('send-alerts', async () => {
      const senderConfig = getSenderConfig()
      const alertType = isCritical ? 'CRITICAL' : 'Warning'
      const subject = `${alertType}: Low Stock Alert - ${product.name}`
      const htmlContent = generateLowStockAlertHtml({
        productName: product.name,
        sku: product.sku,
        currentQuantity,
        reorderPoint,
        isCritical,
        orgName: org.name,
      })
      const textContent = htmlToText(htmlContent)

      const results: Array<{ email: string; messageId: string | null; success: boolean; error?: string }> = []

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
              status: 'pending',
            } as NewEmailHistory)
            .returning()

          // Send email via Resend
          const { data: sendResult, error } = await resend.emails.send({
            from: senderConfig.fromAddress,
            to: [recipientEmail],
            subject,
            html: htmlContent,
            text: textContent,
          })

          if (error) {
            // Update email history with failure
            await db
              .update(emailHistory)
              .set({ status: 'failed' })
              .where(eq(emailHistory.id, emailRecord.id))

            results.push({ email: recipientEmail, messageId: null, success: false, error: error.message })
          } else {
            // Update email history with success and Resend message ID
            await db
              .update(emailHistory)
              .set({
                status: 'sent',
                sentAt: new Date(),
                resendMessageId: sendResult?.id,
              })
              .where(eq(emailHistory.id, emailRecord.id))

            results.push({ email: recipientEmail, messageId: sendResult?.id || null, success: true })
          }
        } catch (err) {
          results.push({
            email: recipientEmail,
            messageId: null,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      return results
    })

    // Log results after task completes
    const successCount = emailResults.filter((r) => r.success).length
    const failedCount = emailResults.filter((r) => !r.success).length

    for (const result of emailResults) {
      if (result.success) {
        await io.logger.info(`Low stock alert sent to ${result.email} (resendMessageId: ${result.messageId})`)
      } else {
        await io.logger.error(`Failed to send alert to ${result.email}: ${result.error}`)
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
    }
  },
})
