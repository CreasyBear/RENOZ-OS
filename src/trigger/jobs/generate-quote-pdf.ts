/**
 * Generate Quote PDF Job
 *
 * Background job to generate PDF quotes/invoices for orders.
 * Triggered when a new order is created.
 *
 * @see https://trigger.dev/docs/documentation/guides/create-a-job
 */
import { eventTrigger } from '@trigger.dev/sdk'
import { client, orderEvents, type OrderCreatedPayload } from '../client'

// ============================================================================
// JOB DEFINITION
// ============================================================================

/**
 * Generate Quote PDF Job
 *
 * This job:
 * 1. Fetches order details from the database
 * 2. Fetches customer information
 * 3. Generates a PDF using a template
 * 4. Uploads the PDF to storage
 * 5. Updates the order with the PDF URL
 */
export const generateQuotePdfJob = client.defineJob({
  id: 'generate-quote-pdf',
  name: 'Generate Quote PDF',
  version: '1.0.0',
  trigger: eventTrigger({
    name: orderEvents.created,
  }),
  run: async (payload: OrderCreatedPayload, io) => {
    const { orderId, orderNumber, organizationId, customerId } = payload

    // Step 1: Log job start
    await io.logger.info('Starting PDF generation', {
      orderId,
      orderNumber,
      organizationId,
    })

    // Step 2: Fetch order details
    await io.runTask('fetch-order', async () => {
      // TODO: Replace with actual Supabase client call
      // const { data, error } = await supabase
      //   .from('orders')
      //   .select('*, line_items(*), customer:customers(*)')
      //   .eq('id', orderId)
      //   .single()

      await io.logger.info('Fetching order details from database')

      // Placeholder - in production, fetch from database
      return {
        id: orderId,
        orderNumber,
        organizationId,
        customerId,
        lineItems: [],
        totals: { subtotal: 0, tax: 0, total: 0 },
      }
    })

    // Step 3: Fetch organization settings (for branding)
    await io.runTask('fetch-org-settings', async () => {
      await io.logger.info('Fetching organization settings')

      // Placeholder - fetch org settings for PDF template
      return {
        name: 'Renoz',
        logo: null,
        address: '',
        taxId: '',
      }
    })

    // Step 4: Generate PDF
    const pdfBuffer = await io.runTask('generate-pdf', async () => {
      await io.logger.info('Generating PDF document')

      // TODO: Replace with actual PDF generation
      // Options:
      // - @react-pdf/renderer for React-based PDFs
      // - puppeteer for HTML-to-PDF
      // - pdf-lib for programmatic PDF creation

      // Placeholder - return mock PDF info
      return {
        filename: `quote-${orderNumber}.pdf`,
        size: 0,
        generated: true,
      }
    })

    // Step 5: Upload to storage
    const uploadResult = await io.runTask('upload-pdf', async () => {
      await io.logger.info('Uploading PDF to storage', {
        filename: pdfBuffer.filename,
      })

      // TODO: Upload to Supabase Storage
      // const { data, error } = await supabase.storage
      //   .from('documents')
      //   .upload(`quotes/${organizationId}/${pdfBuffer.filename}`, buffer)

      // Placeholder
      return {
        path: `quotes/${organizationId}/${pdfBuffer.filename}`,
        url: `https://storage.example.com/quotes/${organizationId}/${pdfBuffer.filename}`,
      }
    })

    // Step 6: Update order with PDF URL
    await io.runTask('update-order', async () => {
      await io.logger.info('Updating order with PDF URL', {
        orderId,
        pdfUrl: uploadResult.url,
      })

      // TODO: Update order record
      // await supabase
      //   .from('orders')
      //   .update({ quote_pdf_url: uploadResult.url })
      //   .eq('id', orderId)

      return { success: true }
    })

    // Return job result
    return {
      success: true,
      orderId,
      orderNumber,
      pdfUrl: uploadResult.url,
      pdfPath: uploadResult.path,
    }
  },
})
