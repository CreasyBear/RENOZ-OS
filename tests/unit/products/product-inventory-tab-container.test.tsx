import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockUsePriceLists = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/products", () => ({
  useProductInventory: () => ({
    data: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useProductInventoryStats: () => ({
    data: null,
    isLoading: false,
  }),
  useProductCostLayers: () => ({
    data: null,
  }),
  useLowStockAlerts: () => ({
    data: [],
  }),
}));

vi.mock("@/hooks/suppliers", () => ({
  usePriceLists: (...args: unknown[]) => mockUsePriceLists(...args),
}));

vi.mock("@/components/domain/products/tabs/inventory-tab-view", () => ({
  ProductInventoryTabView: ({
    onOpenReceiveInventory,
    onOrderStock,
  }: {
    onOpenReceiveInventory: () => void;
    onOrderStock: () => void;
  }) => (
    <div>
      <button onClick={onOpenReceiveInventory}>Receive Inventory</button>
      <button onClick={onOrderStock}>Order Stock</button>
    </div>
  ),
}));

describe("ProductInventoryTabContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePriceLists.mockReturnValue({
      data: { items: [] },
    });
  });

  it("launches manual receiving from product detail with contextual route state", async () => {
    const { ProductInventoryTabContainer } = await import(
      "@/components/domain/products/tabs/inventory-tab-container"
    );

    render(
      <ProductInventoryTabContainer
        productId="product-1"
        trackInventory={true}
        isSerialized={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Receive Inventory" }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/inventory/receiving",
      search: {
        productId: "product-1",
        source: "product_detail",
        returnToProductId: "product-1",
      },
    });
  });

  it("launches contextual PO create with preferred supplier when one is available", async () => {
    mockUsePriceLists.mockReturnValue({
      data: {
        items: [{ supplierId: "supplier-1" }],
      },
    });

    const { ProductInventoryTabContainer } = await import(
      "@/components/domain/products/tabs/inventory-tab-container"
    );

    render(
      <ProductInventoryTabContainer
        productId="product-1"
        trackInventory={true}
        isSerialized={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Order Stock" }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/purchase-orders/create",
      search: {
        productId: "product-1",
        source: "product_detail",
        returnToProductId: "product-1",
        supplierId: "supplier-1",
      },
    });
  });

  it("launches contextual PO create without supplier prefill when there is no preferred supplier", async () => {
    const { ProductInventoryTabContainer } = await import(
      "@/components/domain/products/tabs/inventory-tab-container"
    );

    render(
      <ProductInventoryTabContainer
        productId="product-1"
        trackInventory={true}
        isSerialized={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Order Stock" }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/purchase-orders/create",
      search: {
        productId: "product-1",
        source: "product_detail",
        returnToProductId: "product-1",
      },
    });
  });
});
