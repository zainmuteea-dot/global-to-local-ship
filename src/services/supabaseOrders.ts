import type { OrderItem } from '@/types/orders';

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  reviewing: 'قيد المراجعة',
  purchased: 'تم الشراء',
  warehouse_china: 'مستودع الصين',
  international_ship: 'شحن دولي',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

export const OrdersService = {
  getLocalOrders(): OrderItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('alsouk_orders');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as OrderItem[]) : [];
    } catch {
      return [];
    }
  },

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  },
};
