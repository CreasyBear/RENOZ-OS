/**
 * DynamicLink Component
 *
 * A type-safe wrapper around TanStack Router's Link component for dynamic routes.
 *
 * TanStack Router 1.150.0 requires explicit search params for routes with validateSearch.
 * When the `to` prop is a runtime variable (not a literal), TypeScript can't infer
 * whether the route has search params or not.
 *
 * This component safely handles dynamic routes by:
 * 1. Accepting any valid route path as a string
 * 2. Not requiring search params (they're optional)
 * 3. Properly typing the component to avoid TS errors
 *
 * @example
 * // For dynamic routes from variables
 * <DynamicLink to={item.href}>{item.label}</DynamicLink>
 *
 * // For routes with known search params
 * <DynamicLink to="/products" search={{ page: 1, pageSize: 20, sortOrder: 'desc' }}>
 *   Products
 * </DynamicLink>
 */
import { Link } from '@tanstack/react-router';
import type { ComponentProps, ReactNode } from 'react';

interface DynamicLinkProps {
  /** The route path to navigate to */
  to: string;
  /** Optional search params object */
  search?: Record<string, unknown>;
  /** Child elements */
  children: ReactNode;
  /** CSS class name */
  className?: string;
  /** Additional props passed to the underlying Link */
  [key: string]: unknown;
}

/**
 * Type-safe Link wrapper for dynamic routes.
 *
 * Use this when the `to` prop comes from a variable and TypeScript
 * can't infer the route type at compile time.
 */
export function DynamicLink({ to, search, children, className, ...rest }: DynamicLinkProps) {
  // Cast to satisfy TanStack Router's type requirements for dynamic routes
  const linkProps = {
    to,
    ...(search !== undefined ? { search } : {}),
    className,
    ...rest,
  } as ComponentProps<typeof Link>;

  return <Link {...linkProps}>{children}</Link>;
}

export default DynamicLink;
