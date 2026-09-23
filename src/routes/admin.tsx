import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronLeft,
  Clock,
  LogOut,
  Package,
  Phone,
  Search,
  ShoppingCart,
  TrendingUp,
  Truck,
  User,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الموظفين — السوق الشامل" },
      { name: "description", content: "لوحة تحكم الموظفين لإدارة طلبات السوق الشامل." },
    ],
  }),
  component: AdminPage,
});

const BRAND = "السوق الشامل";

type Order = {
  id: string;
  tracking_code: string;
  customer_name: string;
  phone: string;
  product_link: string;
  product_name: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = [
  "جديد",
  "تم التواصل",
  "تم الشراء",
  "تم الشحن",
  "وصل",
  "ملغي",
] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: LucideIcon }> = {
  "جديد": { bg: "bg-blue-100", text: "text-blue-700", icon: Bell },
  "تم التواصل": { bg: "bg-amber-100", text: "text-amber-700", icon: Phone },
  "تم الشراء": { bg: "bg-purple-100", text: "text-purple-700", icon: ShoppingCart },
  "تم الشحن": { bg: "bg-cyan-100", text: "text-cyan-700", icon: Truck },
  "وصل": { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle2 },
  "ملغي": { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
};

function AdminPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background font-body">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!session) return <AdminLogin />;
  return <AdminDashboard onSignOut={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }} />;
}

/* ─────────────────────────── Login ─────────────────────────── */

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("أدخل البريد وكلمة المرور");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) setError(err.message === "Invalid login credentials" ? "بيانات الدخول غير صحيحة" : err.message);
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-8 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <span className="font-display text-3xl font-black text-cocoa">{BRAND}</span>
          <button
            onClick={() => (window.location.href = "/")}
            className="grid size-10 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border"
            aria-label="رجوع"
          >
            <ArrowLeft className="size-5" />
          </button>
        </div>

        <div className="rounded-3xl bg-card p-6 ring-1 ring-border shadow-sm">
          <div className="mb-6 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-cocoa text-cream">
              <User className="size-7" />
            </span>
            <h1 className="mt-3 font-display text-2xl font-black text-cocoadeep">دخول الموظفين</h1>
            <p className="mt-1 text-sm text-muted-foreground">سجّل دخولك لإدارة الطلبات</p>
          </div>

          <label className="mt-4 block text-sm font-bold text-cocoa">البريد الإلكتروني</label>
          <input
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) submit(); }}
            type="email"
            dir="ltr"
            placeholder="employee@example.com"
            className="mt-2 w-full rounded-2xl bg-background px-4 py-3.5 text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa"
          />

          <label className="mt-4 block text-sm font-bold text-cocoa">كلمة المرور</label>
          <input
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) submit(); }}
            type="password"
            dir="ltr"
            placeholder="••••••••"
            className="mt-2 w-full rounded-2xl bg-background px-4 py-3.5 text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa"
          />

          {error && <p className="mt-3 text-xs font-bold text-destructive">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa py-4 font-display text-lg font-extrabold text-cream disabled:opacity-60"
          >
            {loading ? "جاري الدخول..." : "دخول"} <ArrowRight className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Dashboard ─────────────────────── */

function AdminDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("الكل");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("fetch error", error);
    }
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { console.error(error); return; }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, status } : prev));
  };

  const updateNotes = async (id: string, notes: string) => {
    const { error } = await supabase.from("orders").update({ notes }).eq("id", id);
    if (error) { console.error(error); return; }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, notes } : o)));
    if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, notes } : prev));
  };

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) { console.error(error); return; }
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setSelected(null);
  };

  const counts = STATUS_OPTIONS.reduce(
    (acc, s) => { acc[s] = orders.filter((o) => o.status === s).length; return acc; },
    {} as Record<string, number>,
  );
  counts["الكل"] = orders.length;

  const filtered = orders.filter((o) => {
    const matchFilter = filter === "الكل" || o.status === filter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      o.customer_name.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      o.tracking_code.toLowerCase().includes(q) ||
      (o.product_name ?? "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const todayCount = orders.filter((o) => {
    const d = new Date(o.created_at);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background font-body">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-cocoa text-cream">
              <Package className="size-5" />
            </span>
            <span className="font-display text-lg font-black text-cocoadeep">{BRAND}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-clay">موظف</span>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-bold text-destructive ring-1 ring-border"
          >
            <LogOut className="size-4" /> خروج
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={ShoppingCart} label="إجمالي الطلبات" value={counts["الكل"]} color="bg-cocoa text-cream" />
          <StatCard icon={TrendingUp} label="طلبات اليوم" value={todayCount} color="bg-gold text-cocoadeep" />
          <StatCard icon={Truck} label="تم الشحن" value={counts["تم الشحن"] ?? 0} color="bg-cyan-100 text-cyan-700" />
          <StatCard icon={CheckCircle2} label="وصل" value={counts["وصل"] ?? 0} color="bg-green-100 text-green-700" />
        </div>

        {/* Filter tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {["الكل", ...STATUS_OPTIONS].map((s) => {
            const active = filter === s;
            const Style = s !== "الكل" ? STATUS_STYLES[s] : null;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                  active
                    ? "bg-cocoa text-cream"
                    : "bg-card text-cocoadeep ring-1 ring-border"
                }`}
              >
                {Style && <Style.icon className="size-3.5" />}
                {s}
                <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-cream/20" : "bg-secondary text-clay"}`}>
                  {counts[s] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، الهاتف، رقم الطلب، المنتج..."
            className="flex-1 bg-transparent text-sm text-cocoadeep outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Orders list */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="py-12 text-center text-muted-foreground">جاري التحميل...</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-card p-12 text-center ring-1 ring-border">
              <Package className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-bold text-muted-foreground">لا توجد طلبات</p>
            </div>
          ) : (
            filtered.map((o) => {
              const st = STATUS_STYLES[o.status] ?? STATUS_STYLES["جديد"];
              return (
                <button
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="block w-full rounded-2xl bg-card p-4 text-right ring-1 ring-border transition hover:ring-2 hover:ring-cocoa/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-black text-cocoadeep">{o.customer_name}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.bg} ${st.text}`}>
                          {o.status}
                        </span>
                      </div>
                      <p dir="ltr" className="mt-1 text-right text-xs text-muted-foreground">{o.phone}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{o.product_link}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-bold text-cocoa">{o.tracking_code}</span>
                        <span className="flex items-center gap-1"><Clock className="size-3" />{new Date(o.created_at).toLocaleString("ar-YE", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                    </div>
                    <ChevronLeft className="size-5 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </main>

      {/* Detail drawer */}
      {selected && (
        <OrderDetail
          order={selected}
          onClose={() => setSelected(null)}
          onStatus={(status) => updateStatus(selected.id, status)}
          onNotes={(notes) => updateNotes(selected.id, notes)}
          onDelete={() => deleteOrder(selected.id)}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <span className={`grid size-10 place-items-center rounded-xl ${color}`}>
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-display text-2xl font-black text-cocoadeep">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/* ─────────────────────── Order Detail Drawer ─────────────────────── */

function OrderDetail({
  order,
  onClose,
  onStatus,
  onNotes,
  onDelete,
}: {
  order: Order;
  onClose: () => void;
  onStatus: (status: string) => void;
  onNotes: (notes: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(order.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const st = STATUS_STYLES[order.status] ?? STATUS_STYLES["جديد"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-6 ring-1 ring-border sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-black text-cocoadeep">تفاصيل الطلب</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-secondary text-clay">
            <X className="size-5" />
          </button>
        </div>

        {/* Tracking code */}
        <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
          <span className="text-xs font-bold text-clay">رقم التتبع</span>
          <span className="font-display text-base font-black text-cocoadeep">{order.tracking_code}</span>
        </div>

        {/* Customer info */}
        <div className="mt-3 space-y-2.5">
          <InfoRow icon={User} label="الاسم" value={order.customer_name} />
          <InfoRow icon={Phone} label="الهاتف" value={order.phone} ltr />
          <InfoRow icon={Clock} label="التاريخ" value={new Date(order.created_at).toLocaleString("ar-YE")} />
        </div>

        {/* Product link */}
        <div className="mt-3">
          <p className="mb-1 text-xs font-bold text-muted-foreground">رابط المنتج</p>
          <a
            href={order.product_link}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all rounded-2xl bg-background px-4 py-3 text-sm text-blue-600 ring-1 ring-border hover:ring-2 hover:ring-blue-400"
          >
            {order.product_link}
          </a>
        </div>

        {order.product_name && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-bold text-muted-foreground">اسم المنتج</p>
            <p className="rounded-2xl bg-background px-4 py-3 text-sm text-cocoadeep ring-1 ring-border">{order.product_name}</p>
          </div>
        )}

        {/* Status */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-muted-foreground">الحالة الحالية</p>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${st.bg} ${st.text}`}>
              <st.icon className="size-4" /> {order.status}
            </span>
          </div>
          <p className="mb-2 mt-4 text-xs font-bold text-muted-foreground">تغيير الحالة</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => {
              const style = STATUS_STYLES[s];
              const active = order.status === s;
              return (
                <button
                  key={s}
                  onClick={() => onStatus(s)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${
                    active ? `${style.bg} ${style.text} ring-2 ring-cocoa` : "bg-background text-cocoadeep ring-1 ring-border hover:ring-2 hover:ring-cocoa/30"
                  }`}
                >
                  <style.icon className="size-3.5" /> {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-muted-foreground">ملاحظات داخلية</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => { if (notes !== (order.notes ?? "")) onNotes(notes); }}
            placeholder="اكتب ملاحظة..."
            rows={3}
            className="w-full rounded-2xl bg-background px-4 py-3 text-sm text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa"
          />
        </div>

        {/* Delete */}
        <div className="mt-6 border-t border-border pt-4">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button onClick={onDelete} className="flex-1 rounded-2xl bg-destructive py-3 text-sm font-bold text-destructive-foreground">
                تأكيد الحذف
              </button>
              <button onClick={() => setConfirmDelete(false)} className="rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-clay">
                إلغاء
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-bold text-destructive ring-1 ring-border">
              <XCircle className="size-4" /> حذف الطلب
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, ltr }: { icon: LucideIcon; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-background px-4 py-3 ring-1 ring-border">
      <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Icon className="size-4 text-clay" /> {label}
      </span>
      <span dir={ltr ? "ltr" : undefined} className="text-sm font-bold text-cocoadeep">{value}</span>
    </div>
  );
}
