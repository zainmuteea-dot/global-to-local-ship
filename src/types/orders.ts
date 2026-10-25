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
  userId?: string | null;
  customerName?: string;
  customerPhone?: string;
  customerCity?: string;
  customerAddress?: string;
  productTitle: string;
  productUrl?: string;
  storeName: string;
  status: OrderStatus;
  originalPrice?: number;
  quantity?: number;
  totalCostUSD?: number;
  totalCostSAR?: number;
  totalCostYER?: number;
  intlTrackingNumber?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
