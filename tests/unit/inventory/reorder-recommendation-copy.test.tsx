import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReorderRecommendations } from '@/components/domain/inventory/forecasting/reorder-recommendations';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('reorder recommendation copy', () => {
  it('labels reorder current stock as available stock in the recommendations table', () => {
    render(
      <ReorderRecommendations
        recommendations={[
          {
            productId: 'product-1',
            productSku: 'BAT-001',
            productName: 'Battery Unit',
            currentStock: 3,
            reorderPoint: 10,
            safetyStock: 2,
            recommendedQuantity: 12,
            urgency: 'high',
            daysUntilStockout: 4,
          },
        ]}
        onReorder={vi.fn()}
      />
    );

    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
  });

  it('uses available-stock copy in purchase order notes and summary labels', () => {
    const dialog = read(
      'src/components/domain/inventory/forecasting/create-po-from-recommendation-dialog.tsx'
    );

    expect(dialog).toContain('Available stock: ${recommendation.currentStock}');
    expect(dialog).toContain('<span>Available Stock:</span>');
    expect(dialog).not.toContain('Current stock: ${recommendation.currentStock}');
    expect(dialog).not.toContain('<span>Current Stock:</span>');
  });
});
