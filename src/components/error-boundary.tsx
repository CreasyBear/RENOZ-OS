import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'

import { logError } from '@/lib/monitoring'
import { getUserFriendlyMessage } from '@/lib/error-handling'

interface RootErrorBoundaryProps {
  error: Error
}

function isChunkLoadError(error: Error): boolean {
  const msg = error.message?.toLowerCase() ?? ''
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('loading chunk') ||
    msg.includes('chunkloaderror')
  )
}

export function RootErrorBoundary({ error }: RootErrorBoundaryProps) {
  const router = useRouter()

  // Surface chunk-load errors with explicit recovery UI; avoid auto-reload loops.
  const isChunkError = isChunkLoadError(error)

  useEffect(() => {
    if (isChunkError) {
      logError('Chunk load error reached error boundary', error, {
        component: 'RootErrorBoundary',
        metadata: { url: typeof window !== 'undefined' ? window.location.href : undefined },
      })
    }
  }, [isChunkError, error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {isChunkError ? 'Could not load app' : 'Something went wrong'}
        </h1>
        <p className="text-gray-600 mb-6">
          {isChunkError
            ? 'A required app bundle failed to load. Please refresh the page. If this keeps happening, contact support.'
            : getUserFriendlyMessage(error)}
        </p>
        {import.meta.env.DEV && (
          <pre className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-800 overflow-auto max-h-48">
            {error.message}
            {error.stack && (
              <>
                {'\n\n'}
                {error.stack}
              </>
            )}
          </pre>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          {isChunkError && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Refresh Page
            </button>
          )}
          {!isChunkError && (
            <button
              onClick={() => router.invalidate()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => router.navigate({ to: '/', search: { code: undefined } })}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
