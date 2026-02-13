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

// TanStack Start expects getRouter to get/create the singleton router
let routerInstance: ReturnType<typeof createRouter> | undefined

export function getRouter() {
  if (!routerInstance) {
    routerInstance = createRouter()
  }
  return routerInstance
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
