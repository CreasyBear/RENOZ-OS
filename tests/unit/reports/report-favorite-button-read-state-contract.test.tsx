import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportFavoriteButton } from '@/components/domain/reports/report-favorite-button';
import { formatReportFavoritesReadError } from '@/components/domain/reports/report-favorite-read-errors';

const mockUseReportFavorites = vi.fn();
const mockUseCreateReportFavorite = vi.fn();
const mockUseDeleteReportFavorite = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

vi.mock('@/hooks/reports', () => ({
  useReportFavorites: (...args: unknown[]) => mockUseReportFavorites(...args),
  useCreateReportFavorite: (...args: unknown[]) => mockUseCreateReportFavorite(...args),
  useDeleteReportFavorite: (...args: unknown[]) => mockUseDeleteReportFavorite(...args),
}));

describe('ReportFavoriteButton read-state contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateMutateAsync.mockResolvedValue(undefined);
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    mockUseReportFavorites.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
    });
    mockUseCreateReportFavorite.mockReturnValue({
      mutateAsync: mockCreateMutateAsync,
      isPending: false,
    });
    mockUseDeleteReportFavorite.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    });
  });

  it('fails closed when report favorites cannot be read', () => {
    const unsafeError = new Error('postgres duplicate key violates report_favorites_org_idx');

    mockUseReportFavorites.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: unsafeError,
    });

    render(<ReportFavoriteButton reportType="financial" />);

    const button = screen.getByRole('button', { name: 'Report favorites unavailable' });
    const unavailableMessage =
      'Report favorites are temporarily unavailable. Please refresh and try again.';

    expect(formatReportFavoritesReadError(unsafeError)).toBe(unavailableMessage);
    expect(button).toBeDisabled();
    expect(button.parentElement).toHaveAttribute('title', unavailableMessage);

    fireEvent.click(button);

    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  it('keeps cached favorite state visible but blocks mutation from a failed read', () => {
    mockUseReportFavorites.mockReturnValue({
      data: {
        items: [{ reportType: 'financial', reportId: null }],
      },
      isLoading: false,
      error: new Error('Report favorites are temporarily unavailable. Please refresh and try again.'),
    });

    render(<ReportFavoriteButton reportType="financial" />);

    const button = screen.getByRole('button', { name: 'Report favorites unavailable' });
    const star = button.querySelector('svg');

    expect(button).toBeDisabled();
    expect(star?.getAttribute('class')).toContain('fill-amber-400');

    fireEvent.click(button);

    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  it('only mutates after a successful favorite read proves the current state', async () => {
    mockUseReportFavorites.mockReturnValue({
      data: {
        items: [{ reportType: 'financial', reportId: null }],
      },
      isLoading: false,
      error: null,
    });

    render(<ReportFavoriteButton reportType="financial" />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove from favorites' }));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith({
        reportType: 'financial',
        reportId: undefined,
      });
    });
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });
});
