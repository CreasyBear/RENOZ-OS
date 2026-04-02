import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockUseSearch = vi.fn();
const mockUseProduct = vi.fn();
const mockUseProducts = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

vi.mock("@/components/layout", () => {
  function MockPageLayoutRoot({ children }: { children: ReactNode }) {
    return <div>{children}</div>;
  }
  MockPageLayoutRoot.displayName = "MockPageLayout";

  function MockPageLayoutHeader({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: ReactNode;
  }) {
    return (
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {actions}
      </div>
    );
  }
  MockPageLayoutHeader.displayName = "MockPageLayoutHeader";

  function MockPageLayoutContent({ children }: { children: ReactNode }) {
    return <div>{children}</div>;
  }
  MockPageLayoutContent.displayName = "MockPageLayoutContent";

  MockPageLayoutRoot.Header = MockPageLayoutHeader;
  MockPageLayoutRoot.Content = MockPageLayoutContent;

  return { PageLayout: MockPageLayoutRoot };
});

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/domain/inventory/receiving/receiving-form", () => ({
  ReceivingForm: ({
    defaultProductId,
    lockProductSelection,
    onCancel,
  }: {
    defaultProductId?: string;
    lockProductSelection?: boolean;
    onCancel?: () => void;
  }) => (
    <div>
      <div>defaultProduct:{defaultProductId ?? "none"}</div>
      <div>lockProductSelection:{String(lockProductSelection)}</div>
      <button onClick={onCancel}>Cancel Receive</button>
    </div>
  ),
}));

vi.mock("@/components/domain/inventory/receiving/receiving-history", () => ({
  ReceivingHistory: () => <div>Receiving History</div>,
}));

vi.mock("@/hooks/inventory", () => ({
  useLocations: () => ({
    locations: [{ id: "loc-1", code: "MAIN", name: "Main" }],
    isLoading: false,
  }),
  useMovements: () => ({
    data: { movements: [] },
    isLoading: false,
  }),
  useReceiveInventory: () => ({
    mutateAsync: vi.fn(),
    error: null,
  }),
}));

vi.mock("@/hooks/products", () => ({
  useProducts: (...args: unknown[]) => mockUseProducts(...args),
  useProduct: (...args: unknown[]) => mockUseProduct(...args),
}));

describe("ReceivingPage contextual launches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearch.mockReturnValue({
      productId: "product-1",
      source: "product_detail",
      returnToProductId: "product-1",
    });
    mockUseProducts.mockReturnValue({
      data: { products: [] },
      isLoading: false,
    });
  });

  it("shows product-context receiving UI and returns to the originating product on cancel", async () => {
    mockUseProduct.mockReturnValue({
      data: {
        product: {
          id: "product-1",
          name: "Widget",
          sku: "W-1",
          costPrice: 12,
          isSerialized: false,
        },
      },
      error: null,
      isLoading: false,
    });

    const { default: ReceivingPage } = await import(
      "@/routes/_authenticated/inventory/receiving-page"
    );

    render(<ReceivingPage />);

    expect(screen.getByText("Receive Inventory for Widget")).toBeInTheDocument();
    expect(
      screen.getByText("Record non-PO inbound stock for Widget (W-1)")
    ).toBeInTheDocument();
    expect(screen.getByText("defaultProduct:product-1")).toBeInTheDocument();
    expect(screen.getByText("lockProductSelection:true")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel Receive" }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/products/$productId",
      params: { productId: "product-1" },
      replace: true,
    });
  });

  it("shows a blocking fallback when product context is stale and hides the receive form", async () => {
    mockUseProduct.mockReturnValue({
      data: undefined,
      error: new Error("Not found"),
      isLoading: false,
    });

    const { default: ReceivingPage } = await import(
      "@/routes/_authenticated/inventory/receiving-page"
    );

    render(<ReceivingPage />);

    expect(screen.getByText("Product context is no longer available")).toBeInTheDocument();
    expect(
      screen.getByText(/continue with a generic non-po receipt/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Receiving History")).not.toBeInTheDocument();
    expect(screen.queryByText(/defaultProduct:/i)).not.toBeInTheDocument();
  });
});
