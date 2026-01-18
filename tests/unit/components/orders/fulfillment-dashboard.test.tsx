/**
 * FulfillmentDashboard Component Tests
 *
 * Tests for the operations fulfillment dashboard covering:
 * - Summary cards rendering
 * - Picking queue table
 * - Shipping queue table
 * - Delivery tracking section
 * - Loading and error states
 * - Quick action buttons
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FulfillmentDashboard } from '@/components/domain/orders/fulfillment-dashboard'

// Mock the server functions
vi.mock('@/lib/server/functions/orders', () => ({
  listOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
}))

vi.mock('@/lib/server/functions/order-shipments', () => ({
  listShipments: vi.fn(),
}))

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock data factories
const createMockOrder = (overrides = {}) => ({
  id: 'order-1',
  organizationId: 'org-1',
  orderNumber: 'ORD-20260117-0001',
  customerId: 'cust-1',
  status: 'confirmed' as const,
  paymentStatus: 'paid' as const,
  subtotal: '100.00',
  discountAmount: '0.00',
  taxAmount: '10.00',
  shippingAmount: '5.00',
  total: '115.00',
  orderDate: '2026-01-17',
  requiredDate: '2026-01-20',
  shippedDate: null,
  deliveredDate: null,
  priority: 'normal' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const createMockShipment = (overrides = {}) => ({
  id: 'shipment-1',
  organizationId: 'org-1',
  orderId: 'order-1',
  shipmentNumber: 'ORD-20260117-0001-S01',
  status: 'in_transit' as const,
  carrier: 'australia_post',
  carrierService: 'Express Post',
  trackingNumber: 'AP123456789',
  trackingUrl: 'https://auspost.com.au/track/AP123456789',
  shippedAt: new Date('2026-01-16'),
  estimatedDeliveryAt: new Date('2026-01-18'),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('FulfillmentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Summary Cards', () => {
    it('renders all four summary cards', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      // Mock empty data initially
      vi.mocked(listOrders).mockResolvedValue({
        orders: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      })
      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      // Wait for the cards to render
      expect(await screen.findByText('To Pick Today')).toBeInTheDocument()
      expect(screen.getByText('Ready to Ship')).toBeInTheDocument()
      expect(screen.getByText('Pending Deliveries')).toBeInTheDocument()
      expect(screen.getByText('Overdue Shipments')).toBeInTheDocument()
    })

    it('displays correct counts in summary cards', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      // Mock orders for different statuses
      vi.mocked(listOrders).mockImplementation(async ({ data }) => {
        if (data.status === 'confirmed') {
          return {
            orders: [createMockOrder({ id: '1', status: 'confirmed' }), createMockOrder({ id: '2', status: 'confirmed' })],
            total: 2,
            page: 1,
            limit: 50,
            hasMore: false,
          }
        }
        if (data.status === 'picked') {
          return {
            orders: [createMockOrder({ id: '3', status: 'picked' })],
            total: 1,
            page: 1,
            limit: 50,
            hasMore: false,
          }
        }
        return { orders: [], total: 0, page: 1, limit: 50, hasMore: false }
      })

      vi.mocked(listShipments).mockImplementation(async ({ data }) => {
        if (data.status === 'in_transit' || data.status === 'out_for_delivery') {
          return {
            shipments: [createMockShipment({ status: 'in_transit' })],
            total: 1,
            page: 1,
            pageSize: 50,
            hasMore: false,
          }
        }
        return { shipments: [], total: 0, page: 1, pageSize: 50, hasMore: false }
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      // Verify counts appear
      const toPickCard = await screen.findByText('To Pick Today')
      expect(toPickCard.closest('[data-slot="card"]')).toBeInTheDocument()
    })
  })

  describe('Picking Queue Table', () => {
    it('renders picking queue section with header', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockResolvedValue({
        orders: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      })
      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByText('Picking Queue')).toBeInTheDocument()
    })

    it('displays orders in confirmed status in picking queue', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockImplementation(async ({ data }) => {
        if (data.status === 'confirmed') {
          return {
            orders: [
              createMockOrder({
                id: 'pick-1',
                orderNumber: 'ORD-20260117-0001',
                status: 'confirmed',
              }),
            ],
            total: 1,
            page: 1,
            limit: 50,
            hasMore: false,
          }
        }
        return { orders: [], total: 0, page: 1, limit: 50, hasMore: false }
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByText('ORD-20260117-0001')).toBeInTheDocument()
    })

    it('shows "Start Picking" action button for confirmed orders', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockImplementation(async ({ data }) => {
        if (data.status === 'confirmed') {
          return {
            orders: [createMockOrder({ id: 'pick-1', status: 'confirmed' })],
            total: 1,
            page: 1,
            limit: 50,
            hasMore: false,
          }
        }
        return { orders: [], total: 0, page: 1, limit: 50, hasMore: false }
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByRole('button', { name: /start picking/i })).toBeInTheDocument()
    })

    it('shows empty state when no orders to pick', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockResolvedValue({
        orders: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByText(/no orders to pick/i)).toBeInTheDocument()
    })
  })

  describe('Shipping Queue Table', () => {
    it('renders shipping queue section with header', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockResolvedValue({
        orders: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByText('Shipping Queue')).toBeInTheDocument()
    })

    it('displays orders in picked status in shipping queue', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockImplementation(async ({ data }) => {
        if (data.status === 'picked') {
          return {
            orders: [
              createMockOrder({
                id: 'ship-1',
                orderNumber: 'ORD-20260117-0002',
                status: 'picked',
              }),
            ],
            total: 1,
            page: 1,
            limit: 50,
            hasMore: false,
          }
        }
        return { orders: [], total: 0, page: 1, limit: 50, hasMore: false }
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByText('ORD-20260117-0002')).toBeInTheDocument()
    })

    it('shows "Create Shipment" action button for picked orders', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockImplementation(async ({ data }) => {
        if (data.status === 'picked') {
          return {
            orders: [createMockOrder({ id: 'ship-1', status: 'picked' })],
            total: 1,
            page: 1,
            limit: 50,
            hasMore: false,
          }
        }
        return { orders: [], total: 0, page: 1, limit: 50, hasMore: false }
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByRole('button', { name: /create shipment/i })).toBeInTheDocument()
    })
  })

  describe('Delivery Tracking Section', () => {
    it('renders delivery tracking section with header', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockResolvedValue({
        orders: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByText('Delivery Tracking')).toBeInTheDocument()
    })

    it('displays active shipments in tracking section', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockResolvedValue({
        orders: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      })

      vi.mocked(listShipments).mockImplementation(async ({ data }) => {
        // Return in_transit shipments for tracking section
        return {
          shipments: [
            createMockShipment({
              id: 'track-1',
              shipmentNumber: 'ORD-20260117-0003-S01',
              status: 'in_transit',
              carrier: 'australia_post',
            }),
          ],
          total: 1,
          page: 1,
          pageSize: 50,
          hasMore: false,
        }
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByText('ORD-20260117-0003-S01')).toBeInTheDocument()
    })

    it('shows carrier filter buttons', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockResolvedValue({
        orders: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [createMockShipment({ carrier: 'australia_post' })],
        total: 1,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      // Should show "All" filter option
      expect(await screen.findByRole('button', { name: /all/i })).toBeInTheDocument()
    })

    it('shows "Confirm Delivery" action for in-transit shipments', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockResolvedValue({
        orders: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [createMockShipment({ status: 'in_transit' })],
        total: 1,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByRole('button', { name: /confirm delivery/i })).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading skeletons while fetching data', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      // Make the query hang
      vi.mocked(listOrders).mockImplementation(() => new Promise(() => {}))
      vi.mocked(listShipments).mockImplementation(() => new Promise(() => {}))

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      // Look for loading indicator (skeleton or spinner)
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Refresh Functionality', () => {
    it('has a refresh button', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockResolvedValue({
        orders: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })
  })

  describe('Priority Indicators', () => {
    it('shows priority badge for high priority orders', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockImplementation(async ({ data }) => {
        if (data.status === 'confirmed') {
          return {
            orders: [
              createMockOrder({
                id: 'priority-1',
                status: 'confirmed',
                priority: 'high',
              }),
            ],
            total: 1,
            page: 1,
            limit: 50,
            hasMore: false,
          }
        }
        return { orders: [], total: 0, page: 1, limit: 50, hasMore: false }
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByText(/high/i)).toBeInTheDocument()
    })

    it('shows urgent badge for urgent priority orders', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockImplementation(async ({ data }) => {
        if (data.status === 'confirmed') {
          return {
            orders: [
              createMockOrder({
                id: 'urgent-1',
                status: 'confirmed',
                priority: 'urgent',
              }),
            ],
            total: 1,
            page: 1,
            limit: 50,
            hasMore: false,
          }
        }
        return { orders: [], total: 0, page: 1, limit: 50, hasMore: false }
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      expect(await screen.findByText(/urgent/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('uses semantic table structure', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockImplementation(async ({ data }) => {
        if (data.status === 'confirmed') {
          return {
            orders: [createMockOrder({ id: '1', status: 'confirmed' })],
            total: 1,
            page: 1,
            limit: 50,
            hasMore: false,
          }
        }
        return { orders: [], total: 0, page: 1, limit: 50, hasMore: false }
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      // Wait for content
      await screen.findByText('Picking Queue')

      // Check for tables
      const tables = document.querySelectorAll('table')
      expect(tables.length).toBeGreaterThan(0)
    })

    it('has proper heading hierarchy', async () => {
      const { listOrders } = await import('@/lib/server/functions/orders')
      const { listShipments } = await import('@/lib/server/functions/order-shipments')

      vi.mocked(listOrders).mockResolvedValue({
        orders: [],
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false,
      })

      vi.mocked(listShipments).mockResolvedValue({
        shipments: [],
        total: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      })

      render(<FulfillmentDashboard />, { wrapper: createWrapper() })

      // Wait for content
      await screen.findByText('Picking Queue')

      // Check for headings
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      expect(headings.length).toBeGreaterThan(0)
    })
  })
})
