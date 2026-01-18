import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { RootErrorBoundary } from '../components/error-boundary'
import { NotFound } from '../components/not-found'
import { ToastProvider } from '../components/providers'
import '../styles.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
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
