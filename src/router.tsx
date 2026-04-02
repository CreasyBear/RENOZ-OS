import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 30_000,
  })

  return router
}

function isBrowser() {
  return typeof window !== 'undefined'
}

// TanStack Start calls getRouter for each SSR request. Reusing one router
// instance on the server leaks redirect/location state across requests.
let browserRouterInstance: ReturnType<typeof createRouter> | undefined

export function getRouter() {
  if (!isBrowser()) {
    return createRouter()
  }

  if (!browserRouterInstance) {
    browserRouterInstance = createRouter()
  }

  return browserRouterInstance
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
