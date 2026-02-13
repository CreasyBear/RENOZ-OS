import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect } from 'react'

import { RootErrorBoundary } from '../components/error-boundary'
import { NotFound } from '../components/not-found'
import { ToastProvider } from '../components/providers'
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

function RootComponent() {
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
        {process.env.NODE_ENV === 'development' && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
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
