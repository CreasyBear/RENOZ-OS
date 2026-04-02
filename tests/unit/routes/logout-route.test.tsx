import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/auth/hooks', () => ({
  useSignOut: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

vi.mock('@/components/layout/page-layout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('logout route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  it('navigates to login with benign logged_out reason after successful logout', async () => {
    const { Route } = await import('@/routes/logout');
    const LogoutPage = Route.options.component;

    if (!LogoutPage) {
      throw new Error('Expected logout route component');
    }

    render(<LogoutPage />);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/login',
        search: { reason: 'logged_out' },
        replace: true,
      });
    });
  });

  it('shows an error message if logout fails', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('boom'));

    const { Route } = await import('@/routes/logout');
    const LogoutPage = Route.options.component;

    if (!LogoutPage) {
      throw new Error('Expected logout route component');
    }

    render(<LogoutPage />);

    await waitFor(() => {
      expect(screen.getByText(/logout error/i)).toBeInTheDocument();
      expect(screen.getByText(/unexpected error occurred during logout/i)).toBeInTheDocument();
    });
  });
});
