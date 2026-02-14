import { describe, expect, it } from 'vitest'
import * as ReactDOMServerShim from '@/lib/shims/react-dom-server'

describe('react-dom/server shim', () => {
  it('exposes a streaming renderer used by TanStack Start SSR', () => {
    const hasStreamRenderer =
      typeof (ReactDOMServerShim as { renderToReadableStream?: unknown }).renderToReadableStream ===
        'function' ||
      typeof (ReactDOMServerShim as { renderToPipeableStream?: unknown }).renderToPipeableStream ===
        'function'

    expect(hasStreamRenderer).toBe(true)
  })
})
