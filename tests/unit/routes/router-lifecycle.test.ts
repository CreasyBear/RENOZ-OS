import { beforeEach, describe, expect, it, vi } from 'vitest'

const originalWindow = globalThis.window

vi.mock('@/routeTree.gen', () => ({
  routeTree: { id: 'test-route-tree' },
}))

vi.mock('@tanstack/react-router', () => ({
  createRouter: vi.fn(() => ({ id: Symbol('router-instance') })),
}))

function setWindow(value: Window | undefined) {
  Object.defineProperty(globalThis, 'window', {
    value,
    writable: true,
    configurable: true,
  })
}

describe('router lifecycle', () => {
  beforeEach(() => {
    vi.resetModules()
    setWindow(originalWindow)
  })

  it('creates a fresh router per server request', async () => {
    setWindow(undefined)
    const { getRouter } = await import('@/router')

    const first = getRouter()
    const second = getRouter()

    expect(first).not.toBe(second)
  })

  it('reuses the singleton router in the browser', async () => {
    setWindow({} as Window)
    const { getRouter } = await import('@/router')

    const first = getRouter()
    const second = getRouter()

    expect(first).toBe(second)
  })
})
