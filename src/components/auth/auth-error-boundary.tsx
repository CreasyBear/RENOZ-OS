import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Home, LogOut } from 'lucide-react';

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

type ErrorCategory = 'network' | 'validation' | 'auth' | 'server' | 'unknown';

function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch')) {
    return 'network';
  }
  if (message.includes('invalid') || message.includes('validation')) {
    return 'validation';
  }
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('auth')
  ) {
    return 'auth';
  }
  if (message.includes('500') || message.includes('server')) {
    return 'server';
  }
  return 'unknown';
}

function getErrorDisplay(errorCategory: ErrorCategory, _error: Error) {
  switch (errorCategory) {
    case 'network':
      return {
        title: 'Connection Error',
        message: 'Please check your internet connection and try again.',
        icon: '🌐',
        actions: ['retry'],
      };
    case 'validation':
      return {
        title: 'Invalid Input',
        message: 'Please check your input and try again.',
        icon: '📝',
        actions: ['retry'],
      };
    case 'auth':
      return {
        title: 'Authentication Error',
        message: 'Your session may have expired. Please sign in again.',
        icon: '🔐',
        actions: ['login', 'home'],
      };
    case 'server':
      return {
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        icon: '⚠️',
        actions: ['retry', 'home'],
      };
    default:
      return {
        title: 'Unexpected Error',
        message: 'We encountered an unexpected error. Please try again.',
        icon: '❌',
        actions: ['retry', 'home'],
      };
  }
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    const errorId = `auth-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.error(`[${errorId}] Auth error:`, error);

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // reportError(error, { errorId, component: 'AuthErrorBoundary' })
    }

    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth form error details:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorCategory = categorizeError(this.state.error);
      const errorDisplay = getErrorDisplay(errorCategory, this.state.error);

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{errorDisplay.icon}</div>
                  <div>
                    <CardTitle className="text-2xl">{errorDisplay.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">{errorDisplay.message}</p>

                {process.env.NODE_ENV === 'development' && (
                  <details className="rounded bg-gray-50 p-2 text-xs">
                    <summary className="cursor-pointer font-medium">
                      Error Details (Dev Only)
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-red-600">
                      {this.state.error.message}
                      {this.state.errorId && `\n\nError ID: ${this.state.errorId}`}
                    </pre>
                  </details>
                )}

                <div className="flex gap-2">
                  {errorDisplay.actions.includes('retry') && (
                    <Button onClick={this.handleRetry} className="flex-1" variant="default">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                  )}

                  {errorDisplay.actions.includes('login') && (
                    <Button
                      onClick={() => (window.location.href = '/login')}
                      className="flex-1"
                      variant="outline"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign In
                    </Button>
                  )}

                  {errorDisplay.actions.includes('home') && (
                    <Button
                      onClick={() => (window.location.href = '/')}
                      className="flex-1"
                      variant="outline"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Go Home
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
