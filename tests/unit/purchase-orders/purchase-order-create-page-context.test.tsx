import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockUseSuppliers = vi.fn();
const mockUsePriceLists = vi.fn();
const mockUseProducts = vi.fn();
const mockUseProduct = vi.fn();

type WizardProps = Record<string, unknown>;
let lastWizardProps: WizardProps | null = null;

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
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

vi.mock("@/components/domain/suppliers/po-creation-wizard", () => ({
  POCreationWizard: (props: WizardProps) => {
    lastWizardProps = props;
    return <div>PO Wizard</div>;
  },
}));

vi.mock("@/hooks/suppliers", () => ({
  useSuppliers: (...args: unknown[]) => mockUseSuppliers(...args),
  usePriceLists: (...args: unknown[]) => mockUsePriceLists(...args),
}));

vi.mock("@/hooks/products", () => ({
  useProducts: (...args: unknown[]) => mockUseProducts(...args),
  useProduct: (...args: unknown[]) => mockUseProduct(...args),
}));

vi.mock("@/hooks/suppliers/use-purchase-orders", () => ({
  useCreatePurchaseOrder: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("PurchaseOrderCreatePage contextual launches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastWizardProps = null;
    mockUseSuppliers.mockReturnValue({
      data: { items: [{ id: "supplier-1", name: "Supplier", supplierCode: "SUP-1" }] },
      isLoading: false,
    });
    mockUseProducts.mockReturnValue({
      data: { products: [] },
      isLoading: false,
    });
    mockUseProduct.mockReturnValue({
      data: {
        product: {
          id: "product-1",
          name: "Widget",
          sku: "W-1",
          description: "A widget",
          basePrice: 20,
          costPrice: 12,
          status: "active",
          isActive: true,
        },
      },
      error: null,
      isLoading: false,
    });
    mockUsePriceLists.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    });
  });

  it("seeds the PO wizard with the contextual product and preferred supplier", async () => {
    mockUsePriceLists.mockReturnValue({
      data: { items: [{ supplierId: "supplier-2" }] },
      isLoading: false,
    });

    const { default: PurchaseOrderCreatePage } = await import(
      "@/routes/_authenticated/purchase-orders/-create-page"
    );

    render(
      <PurchaseOrderCreatePage
        search={{
          productId: "product-1",
          source: "product_detail",
          returnToProductId: "product-1",
        }}
      />
    );

    expect(screen.getByText("Order Stock for Widget")).toBeInTheDocument();
    expect(screen.getByText("Ordering stock for Widget")).toBeInTheDocument();
    expect(screen.getByText("PO Wizard")).toBeInTheDocument();
    expect(lastWizardProps).toMatchObject({
      initialSupplierId: "supplier-2",
      initialStep: 2,
    });
    expect(lastWizardProps?.initialItems).toEqual([
      expect.objectContaining({
        productId: "product-1",
        productName: "Widget",
        productSku: "W-1",
        quantity: 1,
        unitPrice: 12,
      }),
    ]);
  });

  it("keeps the seeded product but starts at supplier selection when no preferred supplier exists", async () => {
    const { default: PurchaseOrderCreatePage } = await import(
      "@/routes/_authenticated/purchase-orders/-create-page"
    );

    render(
      <PurchaseOrderCreatePage
        search={{
          productId: "product-1",
          source: "product_detail",
          returnToProductId: "product-1",
        }}
      />
    );

    expect(lastWizardProps).toMatchObject({
      initialSupplierId: null,
      initialStep: 1,
    });
    expect(lastWizardProps?.initialItems).toEqual([
      expect.objectContaining({
        productId: "product-1",
        productName: "Widget",
      }),
    ]);
  });
});
