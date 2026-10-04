import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Calendar,
  Download,
  Printer,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Database,
  Building,
  Phone,
  MapPin,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  AlertCircle,
  ShoppingBag,
  Bell
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AlShamelLogo } from '@/components/AlShamelLogo';
import { NotificationService } from '@/services/notificationService';

export interface ReportOrderRow {
  id: string;
  orderNumber: string;
  intlTrackingNumber: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  storeName: string;
  productTitle: string;
  quantity: number;
  totalCostUSD: number;
  totalCostYER: number;
  paidAmount: number;
  remainingAmount: number;
  profitAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

export function MerchantReportsPage() {
  const [orders, setOrders] = useState<ReportOrderRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const fetchSupabaseOrders = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setIsSyncing(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: ReportOrderRow[] = data.map((row: any) => {
          const totalUSD = Number(row.total_cost_usd || 0);
          const totalYER = Number(row.total_cost_yer || Math.round(totalUSD * 530));
          const isPaid = row.payment_status === 'paid' || row.status === 'delivered';
          const paid = isPaid ? totalYER : Number(row.paid_amount || 0);
          const remaining = Math.max(0, totalYER - paid);
          const profit = Number(row.profit_amount || Math.round((Number(row.service_fee || 12)) * 530));

          return {
            id: String(row.id),
            orderNumber: row.order_number || row.tracking_code || `ORD-${row.id}`,
            intlTrackingNumber: row.intl_tracking_number || row.tracking_code || row.order_number || `INTL-${row.id}`,
            customerName: row.customer_name || 'عميل كريم',
            customerPhone: row.customer_phone || row.phone || '770000000',
            customerCity: row.customer_city || 'صنعاء',
            storeName: row.store_name || 'SHEIN',
            productTitle: row.product_title || 'شحنة متجر دولي',
            quantity: Number(row.quantity || 1),
            totalCostUSD: totalUSD,
            totalCostYER: totalYER,
            paidAmount: paid,
            remainingAmount: remaining,
            profitAmount: profit,
            paymentStatus: row.payment_status || (isPaid ? 'paid' : 'unpaid'),
            paymentMethod: row.payment_method || 'الدفع عند الاستلام (COD)',
            status: row.status || 'new',
            createdAt: row.created_at || new Date().toISOString(),
          };
        });

        setOrders(mapped);
      }
      setIsSupabaseConnected(true);
    } catch (err) {
      console.warn('Supabase fetch note:', err);
      setIsSupabaseConnected(false);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchSupabaseOrders();

    const channel = supabase
      .channel('merchant-reports-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchSupabaseOrders(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsSupabaseConnected(true);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.intlTrackingNumber.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.customerPhone.includes(q) ||
        ord.productTitle.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'all' || ord.status === statusFilter;
      const matchStore = storeFilter === 'all' || ord.storeName.toLowerCase() === storeFilter.toLowerCase();

      let matchDate = true;
      if (dateFilter !== 'all') {
        const orderDate = new Date(ord.createdAt);
        const now = new Date();
        if (dateFilter === 'today') {
          matchDate = orderDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchDate = orderDate >= sevenDaysAgo;
        } else if (dateFilter === 'month') {
          matchDate = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        }
      }

      return matchSearch && matchStatus && matchStore && matchDate;
    });
  }, [orders, searchQuery, statusFilter, storeFilter, dateFilter]);

  const stats = useMemo(() => {
    const totalOrdersCount = filteredOrders.length;
    const deliveredCount = filteredOrders.filter((o) => o.status === 'delivered').length;
    const totalSalesUSD = filteredOrders.reduce((sum, o) => sum + o.totalCostUSD, 0);
    const totalSalesYER = filteredOrders.reduce((sum, o) => sum + o.totalCostYER, 0);
    const totalProfitYER = filteredOrders.reduce((sum, o) => sum + o.profitAmount, 0);
    const totalCollectedYER = filteredOrders.reduce((sum, o) => sum + o.paidAmount, 0);
    const totalRemainingYER = filteredOrders.reduce((sum, o) => sum + o.remainingAmount, 0);
    const deliveryRate = totalOrdersCount > 0 ? Math.round((deliveredCount / totalOrdersCount) * 100) : 0;

    return {
      totalOrdersCount,
      deliveredCount,
      totalSalesUSD,
      totalSalesYER,
      totalProfitYER,
      totalCollectedYER,
      totalRemainingYER,
      deliveryRate,
    };
  }, [filteredOrders]);

  const handleExportCSV = () => {
    const headers = [
      'رقم الطلب', 'كود التتبع الدولي', 'العميل', 'الهاتف', 'المدينة',
      'المتجر', 'السلعة', 'التكلفة (USD)', 'التكلفة (YER)', 'المسدد', 'المتبقي', 'الربح', 'الحالة', 'التاريخ'
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber, o.intlTrackingNumber, o.customerName, o.customerPhone, o.customerCity,
      o.storeName, `"${o.productTitle.replace(/"/g, '""')}"`, o.totalCostUSD, o.totalCostYER,
      o.paidAmount, o.remainingAmount, o.profitAmount, o.status, o.createdAt.split('T')[0]
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `merchant_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      new: 'استلام الطلب والاعتماد',
      purchased: 'تم الشراء من المتجر',
      international_ship: 'بالمستودع الدولي',
      shipped: 'تم الشحن الدولي ✈️',
      local_warehouse: 'بالمستودع المحلي 🏢',
      out_for_delivery: 'مع المندوب للتوصيل 🚚',
      delivered: 'تم التوصيل بنجاح ✓',
      cancelled: 'ملغي',
    };
    return map[status] || status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#FAF9F6] to-[#FFF7ED] text-[#0A2540] font-sans selection:bg-[#0F4C81] selection:text-white pb-20" dir="rtl">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-sky-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (typeof window !== 'undefined') window.location.href = '/admin'; }}
              className="px-3.5 py-2 rounded-2xl bg-white hover:bg-sky-50 border-2 border-sky-100 hover:border-[#0F4C81] text-xs font-black text-[#0F4C81] transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 group"
            >
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>لوحة الأدمن</span>
            </button>
            <div className="flex items-center gap-2">
              <AlShamelLogo size="sm" showText={false} />
              <div>
                <h1 className="text-base sm:text-xl font-black text-[#0F4C81] flex items-center gap-2">
                  <span>تقارير التاجر والعمليات المالية</span>
                  <span className="text-[11px] font-bold text-white bg-gradient-to-r from-[#FF7A00] to-[#EA580C] px-2.5 py-0.5 rounded-full shadow-2xs">
                    مباشر 📊
                  </span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-black text-emerald-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">مربوط تلقائياً بـ Supabase ⚡</span>
            </div>
            <button
              onClick={() => fetchSupabaseOrders()}
              disabled={isSyncing}
              className="p-2 rounded-xl bg-white hover:bg-sky-50 border border-sky-200 text-[#0F4C81] transition cursor-pointer shadow-xs active:scale-95"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#FF7A00]' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-white hover:bg-sky-50 border border-sky-200 text-[#0F4C81] text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-[#0F4C81]" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0F4C81] via-[#0284C7] to-[#0F4C81] text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main KPI Cards */}
      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/95 backdrop-blur-md border-2 border-sky-100 rounded-3xl p-4 sm:p-5 shadow-xs hover:border-[#0F4C81] transition-all">
            <span className="text-xs font-bold text-slate-500 block mb-1">إجمالي المبيعات</span>
            <div className="text-xl sm:text-2xl font-black text-[#0F4C81] font-mono">
              {stats.totalSalesYER.toLocaleString('ar-YE')} <span className="text-xs font-sans">ر.ي</span>
            </div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 font-mono">${stats.totalSalesUSD.toLocaleString()} USD</div>
          </div>

          <div className="bg-white/95 backdrop-blur-md border-2 border-orange-100 rounded-3xl p-4 sm:p-5 shadow-xs hover:border-[#FF7A00] transition-all">
            <span className="text-xs font-bold text-slate-500 block mb-1">صافي الأرباح المحققة</span>
            <div className="text-xl sm:text-2xl font-black text-[#EA580C] font-mono">
              +{stats.totalProfitYER.toLocaleString('ar-YE')} <span className="text-xs font-sans">ر.ي</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>أرباح الخدمات والعمولات</span>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md border-2 border-emerald-100 rounded-3xl p-4 sm:p-5 shadow-xs hover:border-emerald-500 transition-all">
            <span className="text-xs font-bold text-slate-500 block mb-1">السيولة المحصلة</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
              {stats.totalCollectedYER.toLocaleString('ar-YE')} <span className="text-xs font-sans">ر.ي</span>
            </div>
            <div className="text-[11px] font-bold text-amber-700 mt-1 font-mono">المتبقي: {stats.totalRemainingYER.toLocaleString('ar-YE')} ر.ي</div>
          </div>

          <div className="bg-white/95 backdrop-blur-md border-2 border-indigo-100 rounded-3xl p-4 sm:p-5 shadow-xs hover:border-indigo-500 transition-all">
            <span className="text-xs font-bold text-slate-500 block mb-1">إجمالي الطرود المشحونة</span>
            <div className="text-xl sm:text-2xl font-black text-indigo-900 font-mono">
              {stats.totalOrdersCount} <span className="text-xs font-sans">طرد</span>
            </div>
            <div className="text-[11px] font-bold text-indigo-600 mt-1">نسبة الإنجاز: {stats.deliveryRate}% ✓</div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white/95 backdrop-blur-md border-2 border-sky-100 rounded-[28px] p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث برقم الطلب، التتبع، العميل، الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#0F4C81]"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              {(['all', 'today', 'week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDateFilter(mode)}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    dateFilter === mode ? 'bg-[#0F4C81] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'all' ? 'الكل' : mode === 'today' ? 'اليوم' : mode === 'week' ? 'آخر 7 أيام' : 'هذا الشهر'}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-bold text-[#0F4C81] cursor-pointer"
            >
              <option value="all">كل حالات الشحنات</option>
              <option value="new">استلام الطلب</option>
              <option value="purchased">تم الشراء</option>
              <option value="international_ship">بالمستودع الدولي</option>
              <option value="shipped">تم الشحن الدولي ✈️</option>
              <option value="local_warehouse">بالمستودع المحلي 🏢</option>
              <option value="out_for_delivery">مع المندوب 🚚</option>
              <option value="delivered">تم التوصيل بنجاح ✓</option>
            </select>
          </div>
        </div>

        {/* Orders Ledger Table */}
        <div className="bg-white/95 backdrop-blur-md border-2 border-sky-100 rounded-[32px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F8FAFC] border-b-2 border-sky-100 text-[#0F4C81] font-black">
                <tr>
                  <th className="py-3.5 px-4">رقم الشحنة والكود</th>
                  <th className="py-3.5 px-4">العميل والتواصل</th>
                  <th className="py-3.5 px-4">المتجر والسلعة</th>
                  <th className="py-3.5 px-4">التكلفة الإجمالية</th>
                  <th className="py-3.5 px-4">المسدد والمتبقي</th>
                  <th className="py-3.5 px-4 text-center">حالة الشحنة</th>
                  <th className="py-3.5 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#0A2540]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-bold">
                      جاري مزامنة وجلب تقارير التاجر من Supabase...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                      لا توجد شحنات مطابقة للمعايير المحددة.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-sky-50/50 transition">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-black text-[#0F4C81] text-sm">{ord.orderNumber}</div>
                        <div className="text-[10px] text-slate-400">{ord.intlTrackingNumber}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{ord.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono" dir="ltr">{ord.customerPhone}</div>
                        <div className="text-[10px] text-slate-400">{ord.customerCity}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] font-black text-[10px] border border-sky-200 mb-0.5">
                          {ord.storeName}
                        </span>
                        <div className="text-slate-800 font-bold truncate max-w-[180px]">{ord.productTitle}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black">
                        <div className="text-[#0F4C81]">{ord.totalCostYER.toLocaleString('ar-YE')} ر.ي</div>
                        <div className="text-[10px] text-slate-400">${ord.totalCostUSD} USD</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="text-emerald-700 font-bold">مدفوع: {ord.paidAmount.toLocaleString('ar-YE')}</div>
                        {ord.remainingAmount > 0 ? (
                          <div className="text-rose-600 font-bold text-[11px]">متبقي: {ord.remainingAmount.toLocaleString('ar-YE')}</div>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">مسدد بالكامل ✓</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black shadow-2xs ${
                          ord.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' :
                          ord.status === 'shipped' || ord.status === 'international_ship' ? 'bg-sky-50 text-[#0284C7] border border-sky-300' :
                          'bg-orange-50 text-[#EA580C] border border-orange-300'
                        }`}>
                          {getStatusLabel(ord.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { if (typeof window !== 'undefined') window.location.href = `/track?order=${ord.orderNumber}`; }}
                            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0F4C81] border border-sky-200 transition cursor-pointer"
                            title="تتبع الشحنة"
                          >
                            <Truck className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`https://wa.me/${ord.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً أستاذ ${ord.customerName}، شحنتك رقم (${ord.orderNumber}) حالتها: (${getStatusLabel(ord.status)}). منصة السوق الشامل: ${typeof window !== 'undefined' ? window.location.origin : ''}/track?order=${ord.orderNumber}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition"
                            title="واتساب"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export const Route = (createFileRoute as any)('/merchant-reports')({
  component: MerchantReportsPage,
});

export default MerchantReportsPage;
