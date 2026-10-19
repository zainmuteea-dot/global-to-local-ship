import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import {
  ArrowRight,
  Search,
  Plus,
  Boxes,
  Warehouse,
  MapPin,
  QrCode,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Pencil,
} from "lucide-react";

export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
});

interface InventoryItem {
  id: string;
  trackingCode: string;
  barcode: string;
  clientName: string;
  clientPhone: string;
  warehouse: "الصين (غوانزو)" | "تركيا (إسطنبول)" | "صنعاء (حدة)" | "عدن (المنصورة)";
  shelfLocation: string;
  weightKg: number;
  piecesCount: number;
  arrivalDate: string;
  daysInWarehouse: number;
  status: "جاهز للتسليم" | "قيد الفرز والوزن" | "معاد تغليفه" | "تم التسليم للعميل";
}

type InventoryDbRow = {
  id: string;
  tracking_code: string;
  barcode: string | null;
  client_name: string;
  client_phone: string | null;
  warehouse: string;
  shelf_location: string | null;
  weight_kg: number | string;
  pieces_count: number;
  arrival_date: string;
  status: string;
};

const INVENTORY_STATUSES: InventoryItem["status"][] = [
  "جاهز للتسليم",
  "قيد الفرز والوزن",
  "معاد تغليفه",
  "تم التسليم للعميل",
];

function mapInventoryRow(row: InventoryDbRow): InventoryItem {
  const arrival = new Date(`${row.arrival_date}T00:00:00Z`);
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const arrivalUtc = Date.UTC(
    arrival.getUTCFullYear(),
    arrival.getUTCMonth(),
    arrival.getUTCDate(),
  );
  const daysInWarehouse = Number.isNaN(arrivalUtc)
    ? 0
    : Math.max(0, Math.floor((todayUtc - arrivalUtc) / 86_400_000));

  return {
    id: String(row.id),
    trackingCode: row.tracking_code,
    barcode: row.barcode ?? "",
    clientName: row.client_name,
    clientPhone: row.client_phone ?? "",
    warehouse: row.warehouse as InventoryItem["warehouse"],
    shelfLocation: row.shelf_location ?? "",
    weightKg: Number(row.weight_kg ?? 0),
    piecesCount: Number(row.pieces_count ?? 1),
    arrivalDate: row.arrival_date,
    daysInWarehouse,
    status: INVENTORY_STATUSES.includes(row.status as InventoryItem["status"])
      ? (row.status as InventoryItem["status"])
      : "قيد الفرز والوزن",
  };
}

// Temporary cast until Supabase types are regenerated after creating inventory_items.
const inventoryTable = () => (supabase as any).from("inventory_items");

function InventoryPageContent() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("الكل");
  const [selectedStatus, setSelectedStatus] = useState<string>("الكل");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState({
    trackingCode: "",
    barcode: "",
    clientName: "",
    clientPhone: "",
    warehouse: "صنعاء (حدة)" as InventoryItem["warehouse"],
    shelfLocation: "",
    weightKg: "",
    piecesCount: "1",
  });

  const filteredItems = useMemo(() => {
    const s = search ?? "";
    return items.filter((item) => {
      const matchSearch =
        item.trackingCode.toLowerCase().includes(s.toLowerCase()) ||
        item.barcode.includes(s) ||
        item.clientName.includes(s) ||
        item.clientPhone.includes(s) ||
        item.shelfLocation.includes(s);
      const matchWarehouse = selectedWarehouse === "الكل" || item.warehouse === selectedWarehouse;
      const matchStatus = selectedStatus === "الكل" || item.status === selectedStatus;
      return matchSearch && matchWarehouse && matchStatus;
    });
  }, [items, search, selectedWarehouse, selectedStatus]);

  const stats = useMemo(() => {
    const totalParcels = items.length;
    const readyForPickup = items.filter((i) => i.status === "جاهز للتسليم").length;
    const inProcessing = items.filter(
      (i) => i.status === "قيد الفرز والوزن" || i.status === "معاد تغليفه",
    ).length;
    const delayed = items.filter(
      (i) => i.daysInWarehouse >= 14 && i.status !== "تم التسليم للعميل",
    ).length;
    const totalWeight = items.reduce((sum, i) => sum + i.weightKg, 0);
    return { totalParcels, readyForPickup, inProcessing, delayed, totalWeight };
  }, [items]);

  useEffect(() => {
    let active = true;
    const loadItems = async () => {
      setLoading(true);
      setPageError("");
      const { data, error } = await inventoryTable()
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setPageError(
          "تعذر تحميل المخزون من قاعدة البيانات. تحقق من وجود جدول inventory_items وسياسات RLS.",
        );
        setLoading(false);
        return;
      }
      setItems(((data ?? []) as InventoryDbRow[]).map(mapInventoryRow));
      setLoading(false);
    };
    void loadItems();
    return () => {
      active = false;
    };
  }, []);

  const openAddModal = () => {
    setPageError("");
    setEditingItemId(null);
    setNewItem({
      trackingCode: "",
      barcode: "",
      clientName: "",
      clientPhone: "",
      warehouse: "صنعاء (حدة)",
      shelfLocation: "",
      weightKg: "",
      piecesCount: "1",
    });
    setShowAddModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setPageError("");
    setEditingItemId(item.id);
    setNewItem({
      trackingCode: item.trackingCode,
      barcode: item.barcode,
      clientName: item.clientName,
      clientPhone: item.clientPhone,
      warehouse: item.warehouse,
      shelfLocation: item.shelfLocation,
      weightKg: String(item.weightKg),
      piecesCount: String(item.piecesCount),
    });
    setShowAddModal(true);
  };

  const handleDeliver = async (id: string) => {
    setPageError("");
    const { data, error } = await inventoryTable()
      .update({ status: "تم التسليم للعميل", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      setPageError("لم يتم حفظ حالة التسليم. تحقق من اتصال قاعدة البيانات وصلاحية المدير.");
      return;
    }
    const updated = mapInventoryRow(data as InventoryDbRow);
    setItems((current) => current.map((item) => (item.id === id ? updated : item)));
  };

  const handleSaveItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPageError("");
    const weight = Number(newItem.weightKg || 0);
    const pieces = Number(newItem.piecesCount || 1);
    if (!newItem.trackingCode.trim() || !newItem.clientName.trim()) {
      setPageError("أدخل رقم التتبع واسم العميل.");
      return;
    }
    if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(pieces) || pieces < 1) {
      setPageError("تحقق من الوزن وعدد القطع، ويجب أن يكون عدد القطع عددًا صحيحًا أكبر من صفر.");
      return;
    }

    setSaving(true);
    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError || !userResult.user) {
        setPageError("انتهت جلسة الدخول. سجّل الدخول مجددًا ثم أعد المحاولة.");
        return;
      }
      const original = editingItemId ? items.find((item) => item.id === editingItemId) : undefined;
      const payload = {
        tracking_code: newItem.trackingCode.trim().toUpperCase(),
        barcode: newItem.barcode.trim() || `6291${Math.floor(10000000 + Math.random() * 90000000)}`,
        client_name: newItem.clientName.trim(),
        client_phone: newItem.clientPhone.trim() || null,
        warehouse: newItem.warehouse,
        shelf_location: newItem.shelfLocation.trim() || "منطقة الاستقبال العام",
        weight_kg: weight,
        pieces_count: pieces,
        arrival_date: original?.arrivalDate ?? new Date().toISOString().slice(0, 10),
        days_in_warehouse: original?.daysInWarehouse ?? 0,
        status: original?.status ?? "قيد الفرز والوزن",
        updated_at: new Date().toISOString(),
      };

      if (editingItemId) {
        const { data, error } = await inventoryTable()
          .update(payload)
          .eq("id", editingItemId)
          .select("*")
          .single();
        if (error) {
          setPageError(
            error.code === "23505"
              ? "رقم التتبع مستخدم في طرد آخر. أدخل رقمًا مختلفًا."
              : "تعذر حفظ التعديلات. تحقق من اتصال قاعدة البيانات وصلاحية المدير.",
          );
          return;
        }
        const updated = mapInventoryRow(data as InventoryDbRow);
        setItems((current) => current.map((item) => (item.id === editingItemId ? updated : item)));
      } else {
        const { data, error } = await inventoryTable()
          .insert({ ...payload, created_by: userResult.user.id })
          .select("*")
          .single();
        if (error) {
          setPageError(
            error.code === "23505"
              ? "رقم التتبع موجود مسبقًا. استخدم رقمًا مختلفًا."
              : "تعذر حفظ الطرد. تحقق من الجدول وسياسات RLS ثم أعد المحاولة.",
          );
          return;
        }
        setItems((current) => [mapInventoryRow(data as InventoryDbRow), ...current]);
      }

      setShowAddModal(false);
      setEditingItemId(null);
      setNewItem({
        trackingCode: "",
        barcode: "",
        clientName: "",
        clientPhone: "",
        warehouse: "صنعاء (حدة)",
        shelfLocation: "",
        weightKg: "",
        piecesCount: "1",
      });
    } catch {
      setPageError("حدث خطأ غير متوقع أثناء الحفظ. لم يتم إغلاق النموذج؛ أعد المحاولة.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] p-4 md:p-8 font-['Cairo',sans-serif]"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-sky-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/admin" })}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#0F4C81] flex items-center gap-2">
                <Boxes className="w-6 h-6 text-[#F97316]" />
                إدارة المخزون والمستودعات
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium">
                متابعة الطرود في مستودعات الصين، تركيا، ونقاط التوزيع في اليمن
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-sm shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              إيداع طرد جديد
            </button>
          </div>
        </div>

        {pageError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800"
          >
            {pageError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-sky-100 shadow-sm">
            <div className="flex items-center justify-between text-sky-600 mb-2">
              <span className="text-xs font-bold">إجمالي الطرود بالمخازن</span>
              <Boxes className="w-5 h-5 bg-sky-50 p-1 rounded-lg" />
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.totalParcels} طرد</div>
            <p className="text-[11px] text-slate-400 mt-1">
              الوزن الإجمالي: {stats.totalWeight.toFixed(1)} كجم
            </p>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold">جاهزة للاستلام والتسليم</span>
              <CheckCircle2 className="w-5 h-5 bg-emerald-50 p-1 rounded-lg" />
            </div>
            <div className="text-2xl font-black text-emerald-700">{stats.readyForPickup} طرد</div>
            <p className="text-[11px] text-slate-400 mt-1">في فروع صنعاء وعدن</p>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-amber-100 shadow-sm">
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-bold">قيد الفرز والوزن</span>
              <Clock className="w-5 h-5 bg-amber-50 p-1 rounded-lg" />
            </div>
            <div className="text-2xl font-black text-amber-600">{stats.inProcessing} طرد</div>
            <p className="text-[11px] text-slate-400 mt-1">تجهيز للشحن الخارجي</p>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-rose-100 shadow-sm">
            <div className="flex items-center justify-between text-rose-600 mb-2">
              <span className="text-xs font-bold">طرود راكدة (+14 يوم)</span>
              <AlertTriangle className="w-5 h-5 bg-rose-50 p-1 rounded-lg" />
            </div>
            <div className="text-2xl font-black text-rose-600">{stats.delayed} طرد</div>
            <p className="text-[11px] text-slate-400 mt-1">بحاجة للتواصل مع العميل</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-500 ml-2">المستودع:</span>
            {["الكل", "الصين (غوانزو)", "تركيا (إسطنبول)", "صنعاء (حدة)", "عدن (المنصورة)"].map(
              (wh) => (
                <button
                  key={wh}
                  onClick={() => setSelectedWarehouse(wh)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${selectedWarehouse === wh ? "bg-[#0F4C81] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {wh}
                </button>
              ),
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث برقم التتبع، الباركود، اسم العميل، الهاتف، أو الرف..."
                value={search ?? ""}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pr-12 pl-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0F4C81] outline-none text-xs md:text-sm font-medium transition"
              />
            </div>
            <div>
              <select
                value={selectedStatus ?? "الكل"}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0F4C81] outline-none text-xs font-bold text-slate-700"
              >
                <option value="الكل">جميع الحالات</option>
                <option value="جاهز للتسليم">جاهز للتسليم</option>
                <option value="قيد الفرز والوزن">قيد الفرز والوزن</option>
                <option value="معاد تغليفه">معاد تغليفه</option>
                <option value="تم التسليم للعميل">تم التسليم للعميل</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs md:text-sm">
              <thead className="bg-[#0F4C81]/5 text-[#0F4C81] text-xs font-bold border-b border-sky-100">
                <tr>
                  <th className="py-3 px-4">رقم الطرد والتتبع</th>
                  <th className="py-3 px-4">صاحب الشحنة</th>
                  <th className="py-3 px-4">المستودع والموقع (الرف)</th>
                  <th className="py-3 px-4 text-center">الوزن / القطع</th>
                  <th className="py-3 px-4 text-center">المدة بالمخزن</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      جارٍ تحميل المخزون من قاعدة البيانات…
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      لا توجد طرود مطابقة. أضف طردًا أو غيّر عوامل البحث.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-[#0F4C81] flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-[#F97316]" />
                          {item.trackingCode}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          باركود: {item.barcode}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.clientName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.clientPhone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <Warehouse className="w-3.5 h-3.5 text-sky-600" />
                          {item.warehouse}
                        </div>
                        <div className="text-[11px] text-amber-700 font-medium mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.shelfLocation}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-900">{item.weightKg} كجم</span>
                        <span className="block text-[11px] text-slate-400">
                          ({item.piecesCount} قطع)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${item.daysInWarehouse >= 14 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}
                        >
                          {item.daysInWarehouse} يوم
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${item.status === "جاهز للتسليم" ? "bg-emerald-100 text-emerald-800" : item.status === "تم التسليم للعميل" ? "bg-slate-100 text-slate-500 line-through" : "bg-amber-100 text-amber-800"}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            aria-label={`تعديل الطرد ${item.trackingCode}`}
                            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {item.status === "جاهز للتسليم" && (
                            <button
                              onClick={() => void handleDeliver(item.id)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition"
                            >
                              تسليم
                            </button>
                          )}
                          <button
                            onClick={() => window.print()}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-lg text-[#0F4C81] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#F97316]" />
                  {editingItemId ? "تعديل بيانات الطرد" : "إيداع طرد جديد في المستودع"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItemId(null);
                    setPageError("");
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
                >
                  ✕
                </button>
              </div>
              {pageError && (
                <div
                  role="alert"
                  className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-bold text-rose-800"
                >
                  {pageError}
                </div>
              )}
              <form onSubmit={handleSaveItem} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      رقم التتبع / الشحنة
                    </label>
                    <input
                      required
                      placeholder="SQ-801..."
                      value={newItem.trackingCode ?? ""}
                      onChange={(e) => setNewItem({ ...newItem, trackingCode: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      الباركود (اختياري)
                    </label>
                    <input
                      placeholder="تلقائي إذا ترك فارغاً"
                      value={newItem.barcode ?? ""}
                      onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      اسم العميل
                    </label>
                    <input
                      required
                      placeholder="محمد عبد الله..."
                      value={newItem.clientName ?? ""}
                      onChange={(e) => setNewItem({ ...newItem, clientName: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      رقم الهاتف
                    </label>
                    <input
                      placeholder="77..."
                      value={newItem.clientPhone ?? ""}
                      onChange={(e) => setNewItem({ ...newItem, clientPhone: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">المستودع</label>
                    <select
                      value={newItem.warehouse ?? "صنعاء (حدة)"}
                      onChange={(e) => setNewItem({ ...newItem, warehouse: e.target.value as any })}
                      className="w-full h-10 px-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="صنعاء (حدة)">صنعاء (حدة)</option>
                      <option value="عدن (المنصورة)">عدن (المنصورة)</option>
                      <option value="الصين (غوانزو)">الصين (غوانزو)</option>
                      <option value="تركيا (إسطنبول)">تركيا (إسطنبول)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      موقع الرف / الزون
                    </label>
                    <input
                      placeholder="مثال: رف B-04"
                      value={newItem.shelfLocation ?? ""}
                      onChange={(e) => setNewItem({ ...newItem, shelfLocation: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      الوزن (كجم)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="1.5"
                      value={newItem.weightKg ?? ""}
                      onChange={(e) => setNewItem({ ...newItem, weightKg: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      عدد القطع / الكراتين
                    </label>
                    <input
                      type="number"
                      placeholder="1"
                      value={newItem.piecesCount ?? ""}
                      onChange={(e) => setNewItem({ ...newItem, piecesCount: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 h-11 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] disabled:opacity-60 text-white font-bold text-sm shadow-md transition"
                  >
                    {saving ? "جارٍ الحفظ…" : editingItemId ? "حفظ التعديلات" : "حفظ وإيداع الطرد"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingItemId(null);
                      setPageError("");
                    }}
                    className="px-4 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <AdminRouteGuard>
      <InventoryPageContent />
    </AdminRouteGuard>
  );
}
