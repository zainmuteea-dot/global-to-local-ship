// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import { readCart, writeCart } from "@/lib/extension-cart";

const mocks = vi.hoisted(() => ({
  useSWR: vi.fn(),
  loadMarketplace: vi.fn(),
  rpc: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("swr", () => ({ default: mocks.useSWR }));
vi.mock("@/hooks/use-session", () => ({ useSession: () => ({ user: { id: "customer-1" }, loading: false }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/lib/merchant-marketplace", () => ({
  loadMarketplace: mocks.loadMarketplace,
  getSignedProductImage: vi.fn(async () => null),
  formatMoney: (value: number, currency: string) => `${value} ${currency}`,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={to} {...props}>{children}</a>
  ),
  useNavigate: () => mocks.navigate,
  createFileRoute: () => (options: unknown) => ({ options }),
}));

import { MerchantMarketplace } from "@/components/merchant-marketplace";
import { Route } from "./cart";

const product = {
  id: "product-1",
  store_id: "store-1",
  title: "منتج محلي",
  description: "وصف المنتج",
  category: "عام",
  price: 1200,
  currency: "YER" as const,
  stock: 2,
  image_path: "store-1/product.jpg",
  image_url: "https://example.test/product.jpg",
  status: "approved" as const,
  created_at: "2026-11-15T00:00:00.000Z",
  updated_at: "2026-11-15T00:00:00.000Z",
  store: { id: "store-1", name: "متجر محلي", city: "صنعاء", contact_phone: "777000000" },
};

const CartPage = (Route as unknown as { options: { component: ComponentType } }).options.component;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.useSWR.mockImplementation((key: unknown) => key === "merchant-marketplace"
    ? { data: [product], error: undefined, isLoading: false, mutate: vi.fn() }
    : { data: null, error: undefined, isLoading: false, mutate: vi.fn() });
  mocks.rpc.mockResolvedValue({ data: "order-1", error: null });
});

afterEach(() => cleanup());

async function openCheckout() {
  fireEvent.click(screen.getByRole("button", { name: "أكمل الطلب" }));
  fireEvent.change(screen.getByLabelText("الاسم"), { target: { value: "عميل تجريبي" } });
  fireEvent.change(screen.getByLabelText("رقم الهاتف"), { target: { value: "777123456" } });
  fireEvent.change(screen.getByLabelText("عنوان التوصيل"), { target: { value: "شارع التحرير، صنعاء" } });
}

describe("customer merchant-cart journey", () => {
  it("adds a product, respects quantity and stock limits, then places the order from the cart", async () => {
    const marketplace = render(<MerchantMarketplace />);

    fireEvent.click(screen.getByRole("button", { name: "أضف منتج محلي للسلة" }));
    expect(screen.getByRole("status").textContent).toContain("تمت إضافة «منتج محلي» إلى السلة");
    expect(readCart()).toHaveLength(1);
    expect(readCart()[0]).toMatchObject({ productId: "product-1", quantity: 1 });

    marketplace.unmount();
    render(<CartPage />);

    const increase = screen.getByRole("button", { name: "زيادة كمية منتج محلي" });
    const decrease = screen.getByRole("button", { name: "تقليل كمية منتج محلي" });
    fireEvent.click(increase);
    expect(screen.getByLabelText("الكمية").textContent).toBe("2");
    expect((increase as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(decrease);
    expect(screen.getByLabelText("الكمية").textContent).toBe("1");
    expect((decrease as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(increase);
    expect(screen.getByLabelText("الكمية").textContent).toBe("2");

    await openCheckout();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("merchant_create_order", {
      _product_id: "product-1",
      _quantity: 2,
      _customer_name: "عميل تجريبي",
      _customer_phone: "777123456",
      _customer_city: "صنعاء",
      _delivery_address: "شارع التحرير، صنعاء",
    }));
    expect(await screen.findByText(/تم تسجيل طلبك بنجاح/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "تم" }));
    await waitFor(() => expect(readCart()).toHaveLength(0));
  });

  it("keeps the product in the cart and shows the server stock error when availability changed", async () => {
    writeCart([{
      kind: "merchant",
      id: "merchant-product-1",
      productId: "product-1",
      storeId: "store-1",
      title: "منتج محلي",
      image: "",
      price: 1200,
      currency: "YER",
      quantity: 2,
      stock: 2,
      store: { id: "store-1", name: "متجر محلي", city: "صنعاء" },
      addedAt: "2026-11-15T00:00:00.000Z",
    }]);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "insufficient stock" } });

    render(<CartPage />);
    await openCheckout();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    expect((await screen.findByRole("alert")).textContent).toContain("الكمية المطلوبة غير متوفرة حاليًا.");
    expect(readCart()).toHaveLength(1);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
