/**
 * Send Email Job
 *
 * Background job to send transactional emails.
 * Handles order confirmations, shipping notifications, and alerts.
 *
 * @see https://trigger.dev/docs/documentation/guides/create-a-job
 */
import { eventTrigger } from '@trigger.dev/sdk'
import {
  client,
  orderEvents,
  inventoryEvents,
  type OrderConfirmedPayload,
  type OrderShippedPayload,
  type LowStockPayload,
} from '../client'

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

// Email template types - will be used when email provider is integrated
// type EmailTemplate = 'order-confirmation' | 'order-shipped' | 'low-stock-alert' | 'deal-won' | 'deal-lost'

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
    const { orderId, orderNumber, customerId, organizationId: _organizationId, total: _total } = payload

    await io.logger.info('Sending order confirmation email', {
      orderId,
      orderNumber,
      customerId,
    })

    // Step 1: Fetch customer email
    const customer = await io.runTask('fetch-customer', async () => {
      // TODO: Fetch from database
      // const { data } = await supabase
      //   .from('customers')
      //   .select('email, name')
      //   .eq('id', customerId)
      //   .single()

      await io.logger.info('Fetching customer details')

      // Placeholder
      return {
        email: 'customer@example.com',
        name: 'Customer Name',
      }
    })

    // Step 2: Fetch organization details
    await io.runTask('fetch-org', async () => {
      // TODO: Fetch from database
      return {
        name: 'Renoz',
        supportEmail: 'support@renoz.com',
      }
    })

    // Step 3: Send email
    const emailResult = await io.runTask('send-email', async () => {
      await io.logger.info('Sending email via provider')

      // TODO: Replace with actual email provider
      // Options: Resend, SendGrid, Postmark, AWS SES

      // Example with Resend:
      // const { data, error } = await resend.emails.send({
      //   from: `${org.name} <orders@${org.domain}>`,
      //   to: customer.email,
      //   subject: `Order Confirmed - ${orderNumber}`,
      //   react: OrderConfirmationEmail({ orderNumber, total, customerName: customer.name }),
      // })

      return {
        success: true,
        messageId: `msg-${Date.now()}`,
        to: customer.email,
      }
    })

    return {
      success: true,
      orderId,
      orderNumber,
      emailSent: emailResult.success,
      messageId: emailResult.messageId,
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
    const { orderId, orderNumber, customerId: _customerId, trackingNumber, carrier } = payload

    await io.logger.info('Sending shipping notification', {
      orderId,
      orderNumber,
      trackingNumber,
    })

    // Step 1: Fetch customer
    const customer = await io.runTask('fetch-customer', async () => {
      return {
        email: 'customer@example.com',
        name: 'Customer Name',
      }
    })

    // Step 2: Generate tracking URL
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

    // Step 3: Send email
    const emailResult = await io.runTask('send-email', async () => {
      await io.logger.info('Sending shipping email')

      // TODO: Send via email provider
      return {
        success: true,
        messageId: `msg-${Date.now()}`,
        to: customer.email,
      }
    })

    return {
      success: true,
      orderId,
      orderNumber,
      trackingUrl,
      emailSent: emailResult.success,
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
    const { productId, organizationId: _organizationId, currentQuantity, reorderPoint, isCritical } = payload

    await io.logger.info('Sending low stock alert', {
      productId,
      currentQuantity,
      reorderPoint,
      isCritical,
    })

    // Step 1: Fetch product details
    const product = await io.runTask('fetch-product', async () => {
      // TODO: Fetch from database
      return {
        name: 'Product Name',
        sku: 'SKU-001',
      }
    })

    // Step 2: Fetch operations team emails
    const recipients = await io.runTask('fetch-ops-team', async () => {
      // TODO: Fetch organization users with 'operations' role
      return ['ops@example.com']
    })

    // Step 3: Send alert email
    const emailResult = await io.runTask('send-alert', async () => {
      await io.logger.info('Sending alert to operations team', {
        recipients,
        isCritical,
      })

      // TODO: Send via email provider
      return {
        success: true,
        messageId: `msg-${Date.now()}`,
        recipientCount: recipients.length,
      }
    })

    return {
      success: true,
      productId,
      product: product.name,
      isCritical,
      emailsSent: emailResult.recipientCount,
    }
  },
})
