import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockUsePriceLists = vi.fn();
const mockUseProductInventory = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/products", () => ({
  useProductInventory: (...args: unknown[]) => mockUseProductInventory(...args),
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
    onOpenAdjustment,
    onOrderStock,
    canIncreaseStock,
    canReceiveStock,
    canOrderStock,
    showAdjustment,
    selectedLocationId,
  }: {
    onOpenReceiveInventory: () => void;
    onOpenAdjustment: (locationId?: string) => void;
    onOrderStock: () => void;
    canIncreaseStock: boolean;
    canReceiveStock: boolean;
    canOrderStock: boolean;
    showAdjustment: boolean;
    selectedLocationId?: string;
  }) => (
    <div>
      <div>Can increase stock: {canIncreaseStock ? "yes" : "no"}</div>
      <div>Can receive stock: {canReceiveStock ? "yes" : "no"}</div>
      <div>Can order stock: {canOrderStock ? "yes" : "no"}</div>
      <div>Adjustment open: {showAdjustment ? "yes" : "no"}</div>
      <div>Selected location: {selectedLocationId ?? "none"}</div>
      <button onClick={onOpenReceiveInventory}>Receive Inventory</button>
      <button onClick={() => onOpenAdjustment("location-1")}>Adjust Stock</button>
      <button onClick={onOrderStock}>Order Stock</button>
    </div>
  ),
}));

describe("ProductInventoryTabContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProductInventory.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    });
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
        status="active"
        isActive={true}
        isPurchasable={true}
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
        status="active"
        isActive={true}
        isPurchasable={true}
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
        status="active"
        isActive={true}
        isPurchasable={true}
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

  it("routes ambiguous product-location adjustments to the inventory browser", async () => {
    mockUseProductInventory.mockReturnValue({
      data: {
        productId: "product-1",
        sku: "BAT-1",
        name: "Battery",
        totalOnHand: 15,
        totalAllocated: 0,
        totalAvailable: 15,
        totalValue: 1500,
        locationCount: 1,
        locations: [
          {
            locationId: "location-1",
            locationCode: "WH",
            locationName: "Warehouse",
            inventoryRowCount: 2,
            quantityOnHand: 15,
            quantityAllocated: 0,
            quantityAvailable: 15,
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    const { ProductInventoryTabContainer } = await import(
      "@/components/domain/products/tabs/inventory-tab-container"
    );

    render(
      <ProductInventoryTabContainer
        productId="product-1"
        trackInventory={true}
        isSerialized={false}
        status="active"
        isActive={true}
        isPurchasable={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Adjust Stock" }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/inventory/browser",
      search: {
        productId: "product-1",
        locationId: "location-1",
      },
    });
    expect(screen.getByText("Adjustment open: no")).toBeInTheDocument();
  });

  it("routes multi-location product adjustments to the inventory browser product filter", async () => {
    mockUseProductInventory.mockReturnValue({
      data: {
        productId: "product-1",
        sku: "BAT-1",
        name: "Battery",
        totalOnHand: 18,
        totalAllocated: 0,
        totalAvailable: 18,
        totalValue: 1800,
        locationCount: 2,
        locations: [
          {
            locationId: "location-1",
            locationCode: "WH-A",
            locationName: "Warehouse A",
            inventoryRowCount: 1,
            quantityOnHand: 10,
            quantityAllocated: 0,
            quantityAvailable: 10,
          },
          {
            locationId: "location-2",
            locationCode: "WH-B",
            locationName: "Warehouse B",
            inventoryRowCount: 1,
            quantityOnHand: 8,
            quantityAllocated: 0,
            quantityAvailable: 8,
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    const { ProductInventoryTabContainer } = await import(
      "@/components/domain/products/tabs/inventory-tab-container"
    );

    render(
      <ProductInventoryTabContainer
        productId="product-1"
        trackInventory={true}
        isSerialized={false}
        status="active"
        isActive={true}
        isPurchasable={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Adjust Stock" }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/inventory/browser",
      search: {
        productId: "product-1",
      },
    });
    expect(screen.getByText("Adjustment open: no")).toBeInTheDocument();
  });

  it("keeps single-row product-location adjustments on the product tab dialog", async () => {
    mockUseProductInventory.mockReturnValue({
      data: {
        productId: "product-1",
        sku: "BAT-1",
        name: "Battery",
        totalOnHand: 5,
        totalAllocated: 0,
        totalAvailable: 5,
        totalValue: 500,
        locationCount: 1,
        locations: [
          {
            locationId: "location-1",
            locationCode: "WH",
            locationName: "Warehouse",
            inventoryRowCount: 1,
            quantityOnHand: 5,
            quantityAllocated: 0,
            quantityAvailable: 5,
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    const { ProductInventoryTabContainer } = await import(
      "@/components/domain/products/tabs/inventory-tab-container"
    );

    render(
      <ProductInventoryTabContainer
        productId="product-1"
        trackInventory={true}
        isSerialized={false}
        status="active"
        isActive={true}
        isPurchasable={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Adjust Stock" }));

    expect(mockNavigate).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: "/inventory/browser" })
    );
    expect(screen.getByText("Adjustment open: yes")).toBeInTheDocument();
    expect(screen.getByText("Selected location: location-1")).toBeInTheDocument();
  });

  it("marks stock increases unavailable for inactive product state", async () => {
    const { ProductInventoryTabContainer } = await import(
      "@/components/domain/products/tabs/inventory-tab-container"
    );

    render(
      <ProductInventoryTabContainer
        productId="product-1"
        trackInventory={true}
        isSerialized={false}
        status="inactive"
        isActive={false}
        isPurchasable={true}
      />
    );

    expect(screen.getByText("Can increase stock: no")).toBeInTheDocument();
    expect(screen.getByText("Can receive stock: no")).toBeInTheDocument();
    expect(screen.getByText("Can order stock: no")).toBeInTheDocument();
  });

  it("marks ordering unavailable for non-purchasable product state", async () => {
    const { ProductInventoryTabContainer } = await import(
      "@/components/domain/products/tabs/inventory-tab-container"
    );

    render(
      <ProductInventoryTabContainer
        productId="product-1"
        trackInventory={true}
        isSerialized={false}
        status="active"
        isActive={true}
        isPurchasable={false}
      />
    );

    expect(screen.getByText("Can receive stock: yes")).toBeInTheDocument();
    expect(screen.getByText("Can order stock: no")).toBeInTheDocument();
  });
});
