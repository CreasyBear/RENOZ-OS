import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'

import { RootErrorBoundary } from '../components/error-boundary'
import { NotFound } from '../components/not-found'
import { ToastProvider } from '../components/providers'
import { bootstrapAuthListener } from '../lib/auth/route-auth'
import { initWebVitals } from '../lib/performance/web-vitals'
import '../styles.css'

/**
 * Query Client Configuration
 * 
 * Optimized for Renoz CRM performance patterns:
 * - 5min staleTime for most data (reduces refetches)
 * - 30min gcTime (keeps data in cache longer)
 * - Retry once on failure (avoids hammering server)
 * - Structural sharing enabled (reduces memory usage)
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch on tab focus (better UX)
      structuralSharing: true, // Reduce memory usage
    },
    mutations: {
      retry: 1,
    },
  },
})

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab");
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

/**
 * Lazy-loaded devtools. TanStack devtools use @tanstack/devtools-ui (Solid.js) which
 * calls client-only APIs. Must not be imported during SSR - dynamic import in
 * useEffect ensures they only load in the browser.
 */
function ClientDevtools() {
  const [devtoolsNode, setDevtoolsNode] = useState<React.ReactNode>(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    void Promise.all([
      import('@tanstack/react-devtools'),
      import('@tanstack/react-router-devtools'),
      import('@tanstack/react-form-devtools'),
    ]).then(([devtools, routerDevtools, formDevtools]) => {
      setDevtoolsNode(
        React.createElement(devtools.TanStackDevtools, {
          config: { position: 'bottom-right' },
          plugins: [
            {
              name: 'Tanstack Router',
              render: React.createElement(
                routerDevtools.TanStackRouterDevtoolsPanel,
              ),
            },
            formDevtools.formDevtoolsPlugin(),
          ],
        }),
      )
    })
  }, [])

  if (!devtoolsNode) return null
  return <>{devtoolsNode}</>
}

function RootComponent() {
  // Bootstrap auth listener before any route runs (reduces stale token issues)
  useEffect(() => {
    bootstrapAuthListener();
  }, []);

  // Initialize Web Vitals monitoring
  useEffect(() => {
    initWebVitals();
  }, []);

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background text-foreground">
          <Outlet />
        </div>
        <ToastProvider />
        {!import.meta.env.SSR && import.meta.env.DEV && <ClientDevtools />}
      </QueryClientProvider>
    </RootDocument>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: ({ error }) => <RootErrorBoundary error={error} />,
  notFoundComponent: NotFound,
  
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'Renoz CRM' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
})
