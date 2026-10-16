export type OrderStatus =
  | "new"
  | "reviewing"
  | "purchased"
  | "warehouse_china"
  | "international_ship"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  /** Supabase auth user id; null for historical/guest orders. */
  userId?: string | null;
  customerCity?: string;
  productTitle: string;
  productUrl?: string;
  storeName: string;
  status: OrderStatus;
  originalPrice: number;
  intlTrackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}
