import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Hand,
  Link2,
  Menu,
  Package,
  Play,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  User,
  LogOut,
  X,
  ExternalLink,
  CheckCheck,
  Clock,
  ArrowRight,
  HelpCircle,
  PhoneCall,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_STORE_LINKS, normalizeStoreUrl } from "@/lib/store-links";
import { AlShamelLogo } from "./index";

type DashboardNotification = {
  id: string;
  user_id: string | null;
  title: string;
  message: string | null;
  type: string | null;
  created_at: string;
  payment_id: string | null;
};

function getDashboardOrderStats(orders: Array<{ status: string | null }>) {
  const normalize = (status: string | null) => (status ?? "").trim().toLowerCase();
  const deliveredStatuses = new Set([
    "delivered",
    "تم التسليم",
    "تم الاستلام",
    "استلم العميل",
    "تم التوصيل",
    "وصل",
    "وصل للعميل",
    "مستلم",
  ]);
  const cancelledStatuses = new Set(["cancelled", "canceled", "ملغي", "ملغى", "ملغية", "ملغاه"]);
  const shippingStatuses = new Set([
    "shipped",
    "international_ship",
    "local_warehouse",
    "out_for_delivery",
    "تم الشحن",
    "شحن دولي",
    "قيد التوصيل",
    "مع المندوب",
    "وصلت اليمن وجارٍ التوزيع مع المندوب",
    "وصلت اليمن وجاري التوزيع مع المندوب",
  ]);

  const delivered = orders.filter((order) => deliveredStatuses.has(normalize(order.status))).length;
  const inProgress = orders.filter((order) => {
    const status = normalize(order.status);
    return (
      !deliveredStatuses.has(status) &&
      !cancelledStatuses.has(status) &&
      !/ملغ|إلغاء|الغاء/.test(status)
    );
  }).length;

  return {
    total: orders.length,
    inProgress,
    shipping: orders.filter((order) => shippingStatuses.has(normalize(order.status))).length,
    delivered,
  };
}

function formatNotificationTime(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "الآن";
  if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
  if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
  return `منذ ${Math.floor(seconds / 86400)} يوم`;
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم والعمليات — السوق الشامل" },
      {
        name: "description",
        content: "لوحة التحكم الرئيسية وإدارة الطلبات والشحنات في السوق الشامل.",
      },
    ],
  }),
  component: DashboardPage,
});

export default function DashboardPage() {
  const navigate = useNavigate();

  // بيانات المستخدم الحقيقية
  const [userName, setUserName] = useState<string>("جاري التحميل...");
  const [userPhone, setUserPhone] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  // حالة النوافذ والقوائم
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // مؤشرات طلبات العميل الشخصية
  const [orderStats, setOrderStats] = useState({
    total: 0,
    inProgress: 0,
    shipping: 0,
    delivered: 0,
  });

  // شريط معلومات عام: لا يعرض تحديثات طلبات أو عروضًا غير مؤكدة.
  const tickerItems = [
    {
      text: "أرسل رابط المنتج الذي ترغب بشرائه وسنراجع تفاصيله قبل تأكيد الطلب.",
      tag: "طريقة الطلب",
      link: "/new-order",
    },
    {
      text: "تابع حالة طلبك ورقم التتبع من صفحة تتبع الطلبات.",
      tag: "تتبع الطلب",
      link: "/track",
    },
    {
      text: "ارفع سند الدفع وتابع تفاصيل دفعتك من صفحة الدفع.",
      tag: "الدفعات",
      link: "/pay",
    },
    {
      text: "تحتاج مساعدة؟ تجد خيارات التواصل في صفحة حسابي.",
      tag: "خدمة العملاء",
      link: "/my-account",
    },
  ];
  const [currentTicker, setCurrentTicker] = useState(0);

  // إشعارات حقيقية من قاعدة البيانات، وحالة القراءة محفوظة في notification_reads.
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<boolean | null>(null);
  const unreadCount = notifications.filter(
    (notification) => !readNotificationIds.has(notification.id),
  ).length;

  // دوران شريط الإشعارات تلقائياً كل 5.5 ثوانٍ
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTicker((prev) => (prev + 1) % tickerItems.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [tickerItems.length]);

  // جلب الجلسة والطلبات والإشعارات الحقيقية للمستخدم المسجل.
  useEffect(() => {
    let active = true;
    let notificationChannel: ReturnType<typeof supabase.channel> | null = null;

    const loadUserData = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError) console.error("تعذر التحقق من جلسة المستخدم:", sessionError);

      const authUser = session?.user ?? null;
      setUserId(authUser?.id ?? null);
      setConnectionState(Boolean(authUser));

      let localName = "";
      let localPhone = "";
      try {
        const stored = localStorage.getItem("alsouk_current_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          localName = parsed.full_name ?? "";
          localPhone = parsed.phone ?? "";
        }
      } catch {
        // تجاهل بيانات محلية غير صالحة.
      }

      const profileResult = authUser
        ? await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", authUser.id)
            .maybeSingle()
        : null;

      if (!active) return;

      const phone =
        authUser?.phone ||
        authUser?.user_metadata?.["phone"] ||
        profileResult?.data?.phone ||
        localPhone ||
        sessionStorage.getItem("sc_phone") ||
        localStorage.getItem("sc_phone") ||
        "";
      const finalName =
        profileResult?.data?.full_name ||
        authUser?.user_metadata?.["full_name"] ||
        localName ||
        (phone ? `عميل (${phone.slice(-4)})` : "زائر");

      setUserName(finalName);
      setUserPhone(phone);

      // الطلبات لا تُجلب إلا باستخدام UID من جلسة Supabase، وليس بهوية محلية قابلة للتزوير.
      if (!authUser) {
        setOrderStats({ total: 0, inProgress: 0, shipping: 0, delivered: 0 });
        setNotifications([]);
        setReadNotificationIds(new Set());
        setNotificationError(null);
        return;
      }

      const [ordersResult, notificationsResult, readsResult] = await Promise.all([
        supabase.from("orders").select("id, status").eq("user_id", authUser.id),
        supabase
          .from("notifications")
          .select("id, user_id, title, message, type, created_at, payment_id")
          .or(`user_id.is.null,user_id.eq.${authUser.id}`)
          .neq("type", "new_payment_submitted")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("notification_reads").select("notification_id").eq("user_id", authUser.id),
      ]);

      if (!active) return;

      if (ordersResult.error) {
        console.error("تعذر تحميل طلبات العميل:", ordersResult.error);
        setOrderStats({ total: 0, inProgress: 0, shipping: 0, delivered: 0 });
      } else {
        setOrderStats(getDashboardOrderStats(ordersResult.data ?? []));
      }

      if (notificationsResult.error) {
        console.error("تعذر تحميل إشعارات العميل:", notificationsResult.error);
        setNotificationError("تعذر تحميل الإشعارات. تحقق من الاتصال والصلاحيات.");
      } else {
        setNotifications(notificationsResult.data ?? []);
        setNotificationError(null);
      }

      if (readsResult.error) {
        console.error("تعذر تحميل حالة قراءة الإشعارات:", readsResult.error);
        setNotificationError((current) => current ?? "تعذر تحميل حالة قراءة الإشعارات.");
      } else {
        setReadNotificationIds(new Set((readsResult.data ?? []).map((row) => row.notification_id)));
      }

      notificationChannel = supabase
        .channel(`dashboard-notifications-${authUser.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          (payload) => {
            const notification = payload.new as DashboardNotification;
            if (notification.user_id && notification.user_id !== authUser.id) return;
            if (notification.type === "new_payment_submitted") return;
            setNotifications((current) =>
              [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 50),
            );
          },
        )
        .subscribe();
    };

    void loadUserData().catch((error) => {
      console.error("حدث خطأ أثناء تحميل لوحة العميل:", error);
      if (active) {
        setConnectionState(false);
        setNotificationError("تعذر تحميل بيانات الحساب حاليًا.");
      }
    });

    return () => {
      active = false;
      if (notificationChannel) void supabase.removeChannel(notificationChannel);
    };
  }, []);

  // تسجيل الخروج: لا نمسح بيانات المتصفح أو نوجّه المستخدم إذا رفض Supabase الخروج.
  const handleSignOut = async () => {
    if (logoutLoading || !window.confirm("هل ترغب بتسجيل الخروج من حسابك؟")) return;

    setLogoutLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // إزالة مفاتيح هوية المنصة المعروفة فقط، دون مسح تخزين الموقع أو التطبيقات الأخرى.
      const appSessionKeys = [
        "alsouk_customer_logged_in",
        "alsouk_current_user",
        "sc_user",
        "sc_phone",
        "sc_name",
      ];
      try {
        appSessionKeys.forEach((key) => {
          window.localStorage.removeItem(key);
          window.sessionStorage.removeItem(key);
        });
      } catch (storageError) {
        // فشل تنظيف بيانات التخزين لا يلغي نجاح تسجيل الخروج من Supabase.
        console.warn("تعذر تنظيف بعض بيانات الجلسة المحلية:", storageError);
      }

      setConnectionState(false);
      setUserId(null);
      setNotifications([]);
      setReadNotificationIds(new Set());
      setIsNotifOpen(false);
      await navigate({ to: "/login", replace: true });
    } catch (error) {
      console.error("تعذر تسجيل الخروج:", error);
      window.alert(
        "تعذر تسجيل الخروج الآن. لم يتم مسح بيانات الجلسة. تحقق من الاتصال وحاول مرة أخرى.",
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  // حفظ القراءة فعليًا في جدول notification_reads.
  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    const unread = notifications.filter(
      (notification) => !readNotificationIds.has(notification.id),
    );
    if (unread.length === 0) return;

    try {
      const { error } = await supabase.from("notification_reads").upsert(
        unread.map((notification) => ({ notification_id: notification.id, user_id: userId })),
        { onConflict: "notification_id,user_id" },
      );

      if (error) {
        console.error("تعذر حفظ قراءة الإشعارات:", error);
        const details = [error.message, error.details, error.hint, error.code]
          .filter(Boolean)
          .join(" — ");
        setNotificationError(
          details ? `تعذر حفظ القراءة: ${details}` : "تعذر حفظ القراءة. حاول مرة أخرى.",
        );
        return;
      }

      setReadNotificationIds((current) => {
        const next = new Set(current);
        unread.forEach((notification) => next.add(notification.id));
        return next;
      });
      setNotificationError(null);
    } catch (error) {
      console.error("تعذر الاتصال لحفظ قراءة الإشعارات:", error);
      setNotificationError(
        error instanceof Error
          ? `تعذر الاتصال لحفظ القراءة: ${error.message}`
          : "تعذر الاتصال لحفظ القراءة. تحقق من الاتصال وحاول مرة أخرى.",
      );
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    if (!userId || readNotificationIds.has(notificationId)) return;
    const { error } = await supabase
      .from("notification_reads")
      .upsert(
        { notification_id: notificationId, user_id: userId },
        { onConflict: "notification_id,user_id" },
      );
    if (error) {
      console.error("تعذر حفظ قراءة الإشعار:", error);
      setNotificationError("تعذر حفظ قراءة الإشعار. حاول مرة أخرى.");
      return;
    }
    setReadNotificationIds((current) => new Set(current).add(notificationId));
    setNotificationError(null);
  };

  // روابط المتاجر التي تحددها الإدارة (مثل رابط علي إكسبريس)
  const [storeLinks, setStoreLinks] = useState<Record<string, string>>(DEFAULT_STORE_LINKS);
  useEffect(() => {
    let active = true;
    supabase
      .from("store_links")
      .select("slug,url")
      .then(({ data }) => {
        if (!active || !data) return;
        const next: Record<string, string> = { ...DEFAULT_STORE_LINKS };
        data.forEach((row) => {
          const clean = normalizeStoreUrl(row.url);
          if (clean) next[row.slug] = clean;
        });
        setStoreLinks(next);
      });
    return () => {
      active = false;
    };
  }, []);

  // المتاجر العالمية — ألوان الهوية ووهج النبض لكل متجر (تظهر على الخلفية الداكنة)
  const platforms = [
    { key: "temu", name: "TEMU", color: "#FF7A1A", glow: "rgba(255,122,26,.55)" },
    { key: "trendyol", name: "TrendYol", color: "#FF9A3D", glow: "rgba(255,154,61,.55)" },
    { key: "shein", name: "SHEIN", color: "#F4F4F6", glow: "rgba(255,255,255,.45)" },
    { key: "amazon", name: "Amazon", color: "#F4F4F6", glow: "rgba(255,153,0,.45)" },
    {
      key: "aliexpress",
      name: "AliExpress",
      color: "#FF5A3C",
      glow: "rgba(255,90,60,.6)",
      italic: true,
    },
  ];

  const steps = [
    {
      title: "أرسل الرابط",
      step: "خطوة 1",
      desc: "انسخ رابط المنتج من أي متجر عالمي",
      icon: Link2,
      color: "text-sky-300",
    },
    {
      title: "اعرف السعر",
      step: "خطوة 2",
      desc: "نوضح لك التكلفة بالريال اليمني أو الدولار",
      icon: CircleDollarSign,
      color: "text-orange-300",
    },
    {
      title: "نشتري لك",
      step: "خطوة 3",
      desc: "نشتري بدلاً عنك ونضمن جودة وتطابق الطلب",
      icon: ShoppingCart,
      color: "text-sky-300",
    },
    {
      title: "تابع الشحنة",
      step: "خطوة 4",
      desc: "تتبع مسار شحنتك لحظة بلحظة برقم التتبع",
      icon: Search,
      color: "text-orange-300",
    },
    {
      title: "الاستلام",
      step: "خطوة 5",
      desc: "توصيل موثوق حتى باب بيتك في كافة المحافظات",
      icon: Package,
      color: "text-sky-300",
    },
  ];

  const testimonials = [
    {
      name: "أحمد القدسي",
      city: "صنعاء",
      text: "أفضل تجربة شراء من شي إن وصلت الطلبية خلال أسبوعين وسليمة 100%",
    },
    {
      name: "سارة باوزير",
      city: "المكلا",
      text: "وفروا علي عناء الدفع الدولي والشحن وصل لباب البيت بأسعار ممتازة جداً",
    },
    {
      name: "فؤاد الردفاني",
      city: "عدن",
      text: "تتبع الشحنة دقيق جداً وخدمة العملاء متعاونين وسريعين في الرد",
    },
  ];

  return (
    <div
      className="relative min-h-screen w-full max-w-full bg-[#071C36] text-slate-100 font-sans pb-24 overflow-x-clip"
      dir="rtl"
    >
      {/* 🌟 خلفية الشاشة الكاملة: تدرّج شعاعي أزرق ملكي (نفس الصورة) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(115% 78% at 50% 16%, #2E6FB0 0%, #1D5490 22%, #143F70 45%, #0D2C52 68%, #071C36 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(50% 38% at 50% 18%, rgba(96,180,255,.22), transparent 72%), radial-gradient(42% 32% at 12% 88%, rgba(255,120,40,.14), transparent 72%)",
        }}
      />

      {/* كل محتوى الصفحة فوق الخلفية */}
      <div className="relative z-10">
        {/* 🌟 1. شريط الإشعارات العلوي المتحرك */}
        <div className="relative bg-gradient-to-r from-[#071B34] via-[#0F4C81] to-[#071B34] text-white text-xs py-2 px-3 sm:px-4 border-b border-sky-400/25">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <span className="shrink-0 bg-[#FF6A00] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm shadow-orange-500/40">
                {tickerItems[currentTicker]?.tag}
              </span>
              <Link
                to={tickerItems[currentTicker]?.link ?? "/dashboard"}
                className="truncate hover:text-[#FFB37A] transition font-medium"
              >
                {tickerItems[currentTicker]?.text}
              </Link>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-sky-200/80">
              <button
                onClick={() =>
                  setCurrentTicker((prev) => (prev - 1 + tickerItems.length) % tickerItems.length)
                }
                className="hover:text-white p-1 rounded-md hover:bg-white/10 transition"
                title="السابق"
              >
                <ChevronRight className="size-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1">
                {currentTicker + 1}/{tickerItems.length}
              </span>
              <button
                onClick={() => setCurrentTicker((prev) => (prev + 1) % tickerItems.length)}
                className="hover:text-white p-1 rounded-md hover:bg-white/10 transition"
                title="التالي"
              >
                <ChevronLeft className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 🌟 2. الهيدر الرئيسي مع كبسولة العميل وزر إدارة حسابي وتسجيل الخروج */}
        <header className="mx-auto flex w-full max-w-6xl flex-col items-stretch justify-between gap-3 px-3 pt-3 pb-3 relative z-30 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:pt-5">
          {/* اليمين: زر القائمة والشعار الرسمي */}
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex flex-col justify-center items-center gap-1 size-11 rounded-2xl bg-[#12558F] hover:bg-[#0F4C81] text-white shadow-lg shadow-sky-900/40 ring-1 ring-sky-400/30 transition-all active:scale-95 cursor-pointer"
              title="القائمة الشاملة"
            >
              <span className="w-5 h-0.5 rounded-full bg-white" />
              <span className="w-5 h-0.5 rounded-full bg-[#FF6A00]" />
              <span className="w-5 h-0.5 rounded-full bg-white" />
            </button>
            <AlShamelLogo size="md" showText={true} />
          </div>

          {/* اليسار: كبسولة العميل + زر إدارة حسابي + زر الخروج + الجرس + زر اطلب الآن */}
          <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-2.5">
            {/* حالة الاتصال معروضة حسب جلسة Supabase الفعلية */}
            <Link
              to="/my-account"
              className={`flex min-w-0 max-w-[138px] flex-1 items-center gap-2 rounded-full bg-white/[0.09] px-2.5 py-1.5 text-xs font-black transition group border sm:max-w-none sm:flex-none sm:px-3.5 ${connectionState ? "border-emerald-400/50 hover:border-emerald-400" : "border-white/20 hover:border-white/40"}`}
              title="عرض ملفي الشخصي"
            >
              <span className="relative flex size-2.5 shrink-0">
                {connectionState && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full size-2.5 ${connectionState ? "bg-emerald-400" : "bg-slate-400"}`}
                />
              </span>
              <span className="text-slate-100 group-hover:text-white max-w-[76px] truncate sm:max-w-[120px]">
                {userName}
              </span>
              <span className="hidden text-white/25 sm:inline">|</span>
              <span
                className={`hidden font-extrabold sm:inline ${connectionState ? "text-emerald-400" : "text-slate-300"}`}
              >
                {connectionState === null ? "جارٍ التحقق" : connectionState ? "متصل" : "غير متصل"}
              </span>
            </Link>

            {/* 🌟 زر إدارة حسابي المطلوب بشكل واضح ومباشر */}
            <Link
              to="/my-account"
              className="hidden sm:inline-flex items-center gap-1.5 bg-white/[0.09] border border-sky-400/40 hover:bg-white/[0.16] text-white text-xs font-bold px-3.5 py-2 rounded-full shadow-xs transition active:scale-95"
              title="الانتقال إلى إعدادات الحساب والعناوين"
            >
              <User className="size-3.5 text-[#FF6A00]" />
              <span>إدارة حسابي</span>
            </Link>

            {/* 🔴 زر تسجيل الخروج */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={logoutLoading}
              aria-busy={logoutLoading}
              className="grid size-11 place-items-center rounded-2xl bg-white/[0.09] text-rose-300 hover:text-white hover:bg-rose-600/90 ring-1 ring-rose-400/40 shadow-xs transition active:scale-95 cursor-pointer group disabled:opacity-60 disabled:cursor-wait"
              title={logoutLoading ? "جارٍ تسجيل الخروج" : "تسجيل الخروج"}
            >
              <LogOut className="size-5 transition-transform group-hover:-translate-x-0.5" />
            </button>

            {/* 🔔 جرس مراجعة الإشعارات التفاعلي */}
            <div className="relative">
              <button
                onClick={async () => {
                  // علّم الإشعارات الحالية كمقروءة عند الضغط على الجرس.
                  // لا يتغير العداد إلا بعد نجاح الحفظ في قاعدة البيانات.
                  await handleMarkAllAsRead();
                  setIsNotifOpen((current) => !current);
                }}
                className="relative grid size-11 place-items-center rounded-2xl bg-white/[0.09] text-sky-300 ring-1 ring-sky-400/40 shadow-xs hover:bg-white/15 transition active:scale-95 cursor-pointer"
                title="مراجعة الإشعارات"
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-5 bg-[#FF6A00] text-white text-[10px] font-black rounded-full grid place-items-center ring-2 ring-[#0A1E3C] animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* نافذة الإشعارات المنسدلة للعميل */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-[calc(100vw-1.5rem)] max-w-80 rounded-3xl bg-gradient-to-b from-[#0F4C81] to-[#0A2540] shadow-2xl border border-sky-400/25 p-4 text-right z-50 animate-in fade-in slide-in-from-top-2 sm:left-0 sm:right-auto sm:w-96">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                      <Bell className="size-4 text-[#FF6A00]" />
                      <span className="font-black text-sm text-white">إشعاراتي</span>
                      <span className="bg-[#FF6A00]/20 text-[#FFB37A] text-[10px] font-black px-2 py-0.5 rounded-full border border-[#FF6A00]/30">
                        {unreadCount} جديد
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-sky-300 hover:text-white font-bold flex items-center gap-1"
                      >
                        <CheckCheck className="size-3.5" />
                        <span>تحديد الكل كمقروء</span>
                      </button>
                    )}
                  </div>

                  {notificationError && (
                    <p className="mt-3 rounded-xl bg-rose-500/15 border border-rose-400/30 p-2 text-xs font-bold text-rose-200">
                      {notificationError}
                    </p>
                  )}

                  <div className="divide-y divide-white/10 max-h-72 overflow-y-auto my-2">
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-xs font-bold text-sky-200/70">
                        {connectionState
                          ? "لا توجد إشعارات حاليًا."
                          : "سجّل الدخول لعرض إشعارات حسابك."}
                      </p>
                    ) : (
                      notifications.map((notif) => {
                        const isRead = readNotificationIds.has(notif.id);
                        return (
                          <button
                            key={notif.id}
                            type="button"
                            onClick={() => void handleMarkNotificationAsRead(notif.id)}
                            className={`w-full rounded-2xl p-3 text-right transition hover:bg-white/10 ${isRead ? "opacity-60" : "bg-[#FF6A00]/10"}`}
                          >
                            <span className="flex items-center justify-between">
                              <span className="font-black text-xs text-white">{notif.title}</span>
                              <span className="text-[10px] text-sky-200/60 font-medium">
                                {formatNotificationTime(notif.created_at)}
                              </span>
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed text-sky-100/75">
                              {notif.message ?? ""}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <Link
                      to="/notifications"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs font-black text-sky-300 hover:text-white hover:underline"
                    >
                      عرض كل الإشعارات ←
                    </Link>
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs text-sky-200/60 hover:text-white font-bold"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* زر اطلب الآن البرتقالي */}
            <Link
              to="/new-order"
              className="relative overflow-hidden group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF8A2B] via-[#FF6A00] to-[#D94800] hover:from-[#FF6A00] hover:to-[#A83800] px-4 sm:px-5 py-2.5 font-black text-xs sm:text-sm text-white shadow-[0_0_22px_-2px_rgba(255,106,0,.85)] ring-1 ring-[#FFA94D]/50 hover:shadow-[0_0_32px_0_rgba(255,106,0,.95)] transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent -skew-x-12 animate-[btn-shine_2.8s_ease-in-out_infinite]"
              />
              <ShoppingCart className="relative z-10 size-4 text-white" />
              <span className="relative z-10">اطلب الآن</span>
            </Link>
          </div>
        </header>

        {/* 🌟 3. بطاقة الهيرو الكحلية الملكية */}
        <section className="px-4 pt-3 pb-6">
          <div
            className="relative mx-auto max-w-5xl overflow-hidden rounded-[24px] bg-white/[0.07] p-4 text-white shadow-2xl shadow-[#04122A]/70 border border-sky-300/40 sm:rounded-[32px] sm:p-9"
            style={
              {
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
              } as React.CSSProperties
            }
          >
            {/* كتل ضوء ضبابية لإبراز الطابع الزجاجي الملكي */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-sky-400/35 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-12 -left-6 h-44 w-44 rounded-full bg-orange-500/30 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute top-1/3 left-1/3 h-32 w-32 rounded-full bg-amber-300/15 blur-3xl"
            />

            {/* الترويسة العلوية للبطاقة: اسم السوق الشامل + أزرار الكبسولات */}
            <div className="flex flex-col-reverse items-start justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">السوق الشامل</h1>
                  <span className="bg-[#FF6A00] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm shadow-orange-600/50">
                    AL SHAMEL
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-sky-100 font-bold mt-1">
                  وسيط الشراء والاستيراد المعتمد في اليمن من كافة المتاجر العالمية
                </p>
              </div>

              {/* الأزرار العلوية الثلاثة: حسابي + الطلب + الشحن */}
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <Link
                  to="/my-account"
                  className="flex flex-col items-center justify-center size-16 rounded-2xl bg-white/10 hover:bg-white/20 border border-sky-300/30 text-white transition active:scale-95"
                  title="إدارة حسابي"
                >
                  <User className="size-5 text-sky-300 mb-0.5" />
                  <span className="text-[11px] font-black">حسابي</span>
                </Link>
                <Link
                  to="/new-order"
                  className="flex flex-col items-center justify-center size-16 rounded-2xl bg-white/10 hover:bg-white/20 border border-[#FF8A2B]/40 text-white transition active:scale-95"
                  title="طلب جديد"
                >
                  <Hand className="size-5 text-[#FF8A2B] mb-0.5" />
                  <span className="text-[11px] font-black">الطلب</span>
                </Link>
                <Link
                  to="/track"
                  className="flex flex-col items-center justify-center size-16 rounded-2xl bg-white/10 hover:bg-white/20 border border-sky-300/30 text-white transition active:scale-95"
                  title="تتبع الشحنات"
                >
                  <FileText className="size-5 text-sky-300 mb-0.5" />
                  <span className="text-[11px] font-black">الشحن</span>
                </Link>
              </div>
            </div>

            {/* محتوى الهيرو: كيف تطلب؟ + زر تشغيل الفيديو التوضيحي */}
            <div className="flex flex-col items-stretch justify-between gap-6 py-6 sm:py-8 md:flex-row md:items-center">
              <div className="w-full max-w-xl space-y-3 text-right">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl sm:text-4xl font-black text-white">كيف تطلب؟</h2>
                  <span className="text-2xl sm:text-4xl font-black text-[#FFB37A]">؟</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                  انسخ رابط أي منتج تريده من أي موقع عالمي وسنتولى الشراء والفحص والشحن الآمن حتى
                  باب بيتك.
                </p>
              </div>

              {/* زر تشغيل الفيديو البرتقالي الكبير */}
              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="relative mx-auto mt-1 size-20 rounded-3xl bg-gradient-to-tr from-[#FF6A00] to-[#FFA94D] grid place-items-center shadow-lg shadow-orange-600/50 cursor-pointer hover:scale-105 active:scale-95 transition group sm:size-24 md:mx-0"
                title="مشاهدة فيديو طريقة الطلب"
              >
                <Play className="size-8 sm:size-10 text-white fill-white ml-1 group-hover:scale-110 transition" />
                <span className="absolute -bottom-6 text-[11px] font-black text-sky-200 whitespace-nowrap">
                  شاهد الشرح 🎥
                </span>
              </button>
            </div>

            {/* الأزرار السفلية وشارة الضمان */}
            <div className="flex flex-col items-stretch justify-between gap-3 pt-4 border-t border-white/10 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Link
                  to="/new-order"
                  className="relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#FF8A2B] via-[#FF6A00] to-[#D94800] px-4 py-3 font-black text-sm text-white shadow-[0_0_24px_-2px_rgba(255,106,0,.85)] ring-1 ring-[#FFA94D]/50 transition hover:-translate-y-0.5 hover:from-[#FF6A00] hover:to-[#A83800] hover:shadow-[0_0_34px_0_rgba(255,106,0,.95)] active:scale-95 sm:w-auto sm:px-6"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent -skew-x-12 animate-[btn-shine_2.8s_ease-in-out_infinite]"
                  />
                  <Hand className="relative z-10 size-4" />
                  <span className="relative z-10">اضغط هنا لطلب منتج</span>
                </Link>
                <Link
                  to="/track"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F4C81]/60 px-5 py-3 font-black text-xs text-white transition hover:bg-[#12558F]/70 border border-sky-400/40 active:scale-95 sm:w-auto"
                >
                  <Search className="size-4 text-sky-300" />
                  <span>تتبع شحنة سابقة</span>
                </Link>
              </div>
              <div className="flex w-full items-start gap-2 rounded-2xl bg-white/[0.07] px-3 py-2 text-xs font-bold text-sky-100 backdrop-blur-md border border-sky-400/25 sm:w-auto sm:items-center sm:px-4">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span>ضمان استرجاع 100% في حال عدم مطابقة المنتج</span>
              </div>
            </div>
          </div>
        </section>

        {/* 🌟 4. مؤشرات طلبات وشحنات العميل الشخصية */}
        <section className="mx-auto mb-8 max-w-5xl px-3 sm:px-4">
          <div className="mb-3 flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-[#FF8A2B]" />
              <h3 className="text-sm font-black text-white">متابعة طلباتي وشحناتي</h3>
            </div>
            <Link
              to="/my-account"
              className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-white/[0.07] px-3 py-1.5 text-xs font-black text-sky-200 backdrop-blur-md border border-sky-400/30 transition hover:text-white sm:w-auto"
            >
              تفاصيل الحساب والفواتير ←
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            <Link
              to="/my-account"
              className="block rounded-2xl bg-white/[0.08] p-3 text-right shadow-2xl shadow-[#04122A]/60 border border-sky-300/35 transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_-4px_rgba(96,180,255,.55)] sm:p-4"
            >
              <span className="block text-xs font-bold leading-relaxed text-sky-100/70">
                إجمالي طلباتي
              </span>
              <div className="text-2xl font-black text-white mt-1">{orderStats.total}</div>
            </Link>

            <Link
              to="/track"
              className="block rounded-2xl bg-white/[0.08] p-3 text-right shadow-2xl shadow-[#04122A]/60 border border-[#FF8A2B]/40 transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_-4px_rgba(255,138,43,.65)] sm:p-4"
            >
              <span className="block text-xs font-bold leading-relaxed text-sky-100/70">
                قيد الشراء والتجهيز
              </span>
              <div className="text-2xl font-black text-[#FFB37A] mt-1">{orderStats.inProgress}</div>
            </Link>

            <Link
              to="/track"
              className="block rounded-2xl bg-white/[0.08] p-3 text-right shadow-2xl shadow-[#04122A]/60 border border-sky-300/40 transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_-4px_rgba(96,180,255,.6)] sm:p-4"
            >
              <span className="block text-xs font-bold leading-relaxed text-sky-100/70">
                شحنات في الطريق
              </span>
              <div className="text-2xl font-black text-[#38BDF8] mt-1">{orderStats.shipping}</div>
            </Link>

            <Link
              to="/my-account"
              className="block rounded-2xl bg-white/[0.08] p-3 text-right shadow-2xl shadow-[#04122A]/60 border border-emerald-400/35 transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_-4px_rgba(16,185,129,.6)] sm:p-4"
            >
              <span className="block text-xs font-bold leading-relaxed text-sky-100/70">
                تم الاستلام
              </span>
              <div className="text-2xl font-black text-emerald-300 mt-1">
                {orderStats.delivered}
              </div>
            </Link>
          </div>
        </section>

        {/* 🌟 5. تسوق عالمياً واستلم محلياً */}
        <section className="max-w-5xl mx-auto px-4 mb-4 text-center">
          <div
            className="p-2.5 sm:p-3 rounded-[28px] bg-white/[0.06] border border-sky-300/40 shadow-2xl shadow-[#04122A]/70"
            style={
              {
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
              } as React.CSSProperties
            }
          >
            <div className="relative rounded-[24px] bg-[#0F4C81]/25 px-4 py-5 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#FF6A00]/15 text-[#FFB37A] border border-[#FF8A2B]/40 mb-2">
                <Sparkles className="size-3.5 text-[#FF8A2B]" /> خدمة الشراء والوساطة الأولى في
                اليمن
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                تسوّق عالمياً، واستلم محلياً
              </h2>
              <p className="text-xs sm:text-sm text-sky-100/85 font-bold mt-1 max-w-2xl mx-auto">
                اطلب من أي مكان في العالم ونوصله لباب بيتك في جميع المحافظات بأقل تكلفة وأعلى
                موثوقية.
              </p>
            </div>
          </div>
        </section>

        {/* 🌟 6. المتاجر العالمية المعتمدة — أزرار زجاجية متحركة (Dark Glass) */}
        <section className="mx-auto mb-8 max-w-5xl px-3 sm:px-4">
          <div className="flex items-center justify-center gap-2 text-xs font-black text-[#FFB37A] mb-4">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FF6A00]/10 border border-[#FF8A2B]/35 backdrop-blur-md">
              🎗️ نستورد لك من أشهر المتاجر العالمية
            </span>
          </div>

          <div
            className="relative overflow-hidden rounded-3xl bg-white/[0.06] p-5 ring-1 ring-sky-300/40 shadow-2xl shadow-[#04122A]/70 animate-[glass-glow_5s_ease-in-out_infinite]"
            style={
              {
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
              } as React.CSSProperties
            }
          >
            <div className="relative z-10 grid grid-cols-2 gap-2 place-items-center sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
              {platforms.map((p, i) => {
                const externalUrl = storeLinks[p.key];
                const boxClass =
                  "group relative h-14 w-full max-w-none overflow-hidden rounded-2xl border border-white/25 bg-white/[0.12] animate-[store-pulse_2s_ease-in-out_infinite] will-change-transform sm:h-16 sm:max-w-[140px]";
                const boxStyle = {
                  animationDelay: `${i * 0.3}s`,
                  "--glow": p.glow,
                } as React.CSSProperties;
                const inner = (
                  <>
                    {/* حافة الزجاج العلوية */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1/2 bg-gradient-to-b from-white/25 to-transparent"
                    />
                    {/* اسم المتجر بلون هويته */}
                    <span
                      className="relative z-20 flex h-full w-full flex-col items-center justify-center px-1 text-center text-[13px] font-black leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,.35)]"
                      style={{ color: p.color, fontStyle: p.italic ? "italic" : "normal" }}
                    >
                      {p.name}
                      {externalUrl && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-bold not-italic text-white/90">
                          <ExternalLink className="size-3" /> تسوّق الآن
                        </span>
                      )}
                    </span>
                    {/* اللمعة المتحركة */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 z-30 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[store-shine_2.5s_linear_infinite]"
                      style={{ animationDelay: `${i * 0.3}s` }}
                    />
                  </>
                );
                return externalUrl ? (
                  <a
                    key={p.key}
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`افتح ${p.name}`}
                    className={boxClass}
                    style={boxStyle}
                  >
                    {inner}
                  </a>
                ) : (
                  <Link
                    key={p.key}
                    to="/new-order"
                    search={{ store: p.key }}
                    title={p.name}
                    className={boxClass}
                    style={boxStyle}
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* keyframes المخصّصة (أسماء فريدة حتى لا تتعارض مع غيرها) */}
          <style>{`
          @keyframes store-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 8px 20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25), 0 0 0 0 var(--glow); }
            50%      { transform: scale(1.05); box-shadow: 0 10px 24px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.3), 0 0 22px 4px var(--glow); }
          }
          @keyframes store-shine {
            0%        { transform: translateX(-180%) skewX(-12deg); }
            55%, 100% { transform: translateX(320%) skewX(-12deg); }
          }
        `}</style>
        </section>

        {/* 🌟 7. خطوات الطلب الـ 5 — بطاقات زجاجية متموّجة */}
        <section className="max-w-5xl mx-auto px-4 mb-10">
          <div
            className="relative overflow-hidden rounded-3xl bg-white/[0.06] p-5 ring-1 ring-sky-300/40 shadow-2xl shadow-[#04122A]/70"
            style={
              {
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
              } as React.CSSProperties
            }
          >
            {/* كتل ضوء ضبابية ليظهر تأثير الزجاج */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-6 right-10 h-24 w-24 rounded-full bg-sky-400/40 blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-8 left-16 h-24 w-24 rounded-full bg-orange-500/40 blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/15 blur-2xl"
            />

            <div className="relative z-10 grid grid-cols-1 gap-2.5 sm:gap-3.5 md:grid-cols-2">
              {steps.map((st, i) => {
                const Icon = st.icon;
                const cardClass = `group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/25 bg-white/[0.12] p-3 text-right text-inherit no-underline shadow-lg transition hover:bg-white/[0.18] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A2540] sm:gap-4 sm:p-4 ${
                  i === 4 ? "md:col-span-2 md:w-2/3 md:mx-auto" : ""
                }`;
                const content = (
                  <>
                    {/* حافة الزجاج العلوية */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent"
                    />
                    <div className="relative z-10 min-w-0 flex-1 space-y-1 text-right">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{st.title}</span>
                        <span className="text-[10px] font-black text-amber-200 bg-white/10 px-2 py-0.5 rounded-md border border-white/20">
                          {st.step}
                        </span>
                      </div>
                      <p className="text-xs text-sky-100/80 font-bold">{st.desc}</p>
                    </div>
                    <div className="relative z-10 size-11 rounded-2xl bg-white/15 grid place-items-center shrink-0 border border-white/20">
                      <Icon className={`size-5 ${st.color}`} />
                    </div>
                  </>
                );
                const ariaLabel = `${st.title}: ${st.desc}`;

                if (i === 0) {
                  return (
                    <a
                      key={i}
                      href="/new-order?step=link"
                      className={cardClass}
                      aria-label={ariaLabel}
                    >
                      {content}
                    </a>
                  );
                }
                if (i === 1) {
                  return (
                    <a
                      key={i}
                      href="/new-order?step=price"
                      className={cardClass}
                      aria-label={ariaLabel}
                    >
                      {content}
                    </a>
                  );
                }
                if (i === 2) {
                  return (
                    <a
                      key={i}
                      href="/new-order?step=buy"
                      className={cardClass}
                      aria-label={ariaLabel}
                    >
                      {content}
                    </a>
                  );
                }
                if (i === 3) {
                  return (
                    <Link
                      key={i}
                      to="/track"
                      className={cardClass}
                      aria-label={ariaLabel}
                    >
                      {content}
                    </Link>
                  );
                }
                return (
                  <Link
                    key={i}
                    to="/account/orders"
                    className={cardClass}
                    aria-label={ariaLabel}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* أزرار العمليات السريعة */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
              to="/new-order"
              className="relative overflow-hidden group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF8A2B] via-[#FF6A00] to-[#D94800] hover:from-[#FF6A00] hover:to-[#A83800] text-white px-6 py-3 font-black text-xs sm:text-sm shadow-[0_0_24px_-2px_rgba(255,106,0,.85)] ring-1 ring-[#FFA94D]/50 hover:shadow-[0_0_34px_0_rgba(255,106,0,.95)] transition hover:-translate-y-0.5 active:scale-95"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent -skew-x-12 animate-[btn-shine_2.8s_ease-in-out_infinite]"
              />
              <ShoppingCart className="relative z-10 size-4" />
              <span className="relative z-10">اطلب الآن فوراً</span>
            </Link>
            <Link
              to="/track"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#12558F] hover:bg-[#1668AD] border border-sky-400/40 text-white px-6 py-3 font-black text-xs sm:text-sm shadow-lg shadow-sky-950/50 transition hover:-translate-y-0.5 active:scale-95"
            >
              <Search className="size-4 text-[#FF8A2B]" />
              <span>تتبع شحنتك الآن</span>
            </Link>
          </div>
        </section>

        {/* 🌟 8. قسم آراء وتجارب العملاء */}
        <section className="max-w-5xl mx-auto px-4 mb-14 text-center">
          <h3 className="text-lg font-black text-white mb-5">
            آراء وتجارب عملائنا الكرام ⭐⭐⭐⭐⭐
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="relative space-y-3 overflow-hidden rounded-3xl bg-white/[0.07] p-4 text-center shadow-2xl shadow-[#04122A]/70 border border-sky-300/35 sm:p-5"
                style={
                  {
                    backdropFilter: "blur(18px)",
                    WebkitBackdropFilter: "blur(18px)",
                  } as React.CSSProperties
                }
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-8 -right-6 h-20 w-20 rounded-full bg-orange-500/25 blur-2xl"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent"
                />
                <div className="relative z-10 flex justify-center text-amber-400 text-sm">
                  ★★★★★
                </div>
                <p className="relative z-10 text-xs text-sky-50/90 font-bold leading-relaxed">
                  {t.text}
                </p>
                <div className="relative z-10 pt-2 border-t border-sky-400/25">
                  <span className="block text-xs font-black text-white">{t.name}</span>
                  <span className="text-[10px] font-bold text-[#FFB37A]">{t.city}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 🌟 القائمة الجانبية المنسدلة (Slide-Over Drawer) */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-[#071C36]/70 backdrop-blur-sm animate-in fade-in">
            <div className="h-full w-[min(20rem,90vw)] max-w-[90vw] overflow-y-auto bg-[#0A2540]/85 p-4 shadow-2xl backdrop-blur-xl border-r border-sky-400/25 animate-in slide-in-from-right sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <AlShamelLogo size="sm" showText={true} />
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="size-9 rounded-xl bg-white/10 grid place-items-center text-sky-200 hover:bg-white/20"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* بطاقة العميل المتصل داخل القائمة */}
                <div className="bg-white/[0.07] backdrop-blur-md rounded-2xl p-3.5 my-4 border border-sky-400/25">
                  <span className="text-[11px] font-bold text-sky-200/70 block">
                    حساب العميل المتصل:
                  </span>
                  <span className="text-sm font-black text-white block mt-0.5">{userName}</span>
                  {userPhone && (
                    <span className="text-xs font-bold text-sky-100/75 block mt-0.5">
                      {userPhone}
                    </span>
                  )}
                </div>

                {/* روابط التنقل السريع */}
                <nav className="space-y-2 mt-4 text-right">
                  <Link
                    to="/dashboard"
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[#1572B6]/30 border border-sky-400/30 font-black text-sm text-white"
                  >
                    <ShoppingCart className="size-4 text-[#FF8A2B]" />
                    <span>لوحة العمليات الرئيسية</span>
                  </Link>
                  <Link
                    to="/new-order"
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 font-black text-sm text-sky-100 transition"
                  >
                    <Hand className="size-4 text-sky-300" />
                    <span>طلب شراء جديد</span>
                  </Link>
                  <Link
                    to="/track"
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 font-black text-sm text-sky-100 transition"
                  >
                    <Truck className="size-4 text-sky-300" />
                    <span>تتبع الشحنات المباشر</span>
                  </Link>
                  <Link
                    to="/my-account"
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 font-black text-sm text-sky-100 transition"
                  >
                    <User className="size-4 text-sky-300" />
                    <span>إدارة حسابي والفواتير</span>
                  </Link>
                  <Link
                    to="/prices"
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 font-black text-sm text-sky-100 transition"
                  >
                    <CircleDollarSign className="size-4 text-sky-300" />
                    <span>دليل الأسعار والعمولات</span>
                  </Link>
                  <a
                    href="https://wa.me/967770000000"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-emerald-500/15 text-emerald-300 font-black text-sm transition"
                  >
                    <PhoneCall className="size-4 text-emerald-400" />
                    <span>الدعم الفني عبر الواتساب</span>
                  </a>
                </nav>
              </div>

              {/* زر تسجيل الخروج */}
              <div className="pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={logoutLoading}
                  aria-busy={logoutLoading}
                  className="w-full flex items-center justify-center gap-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-200 font-black text-sm py-3 rounded-2xl transition disabled:opacity-60 disabled:cursor-wait"
                >
                  <LogOut className="size-4" />
                  <span>{logoutLoading ? "جارٍ تسجيل الخروج…" : "تسجيل الخروج"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 نافذة الفيديو التوضيحي المنبثقة */}
        {isVideoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#071C36]/75 p-3 backdrop-blur-sm animate-in fade-in sm:p-4">
            <div
              className="relative my-auto w-full max-w-lg rounded-3xl bg-[#0F4C81]/35 p-4 text-right shadow-2xl shadow-[#04122A]/70 border border-sky-300/40 sm:p-6 max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
              style={
                {
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                } as React.CSSProperties
              }
            >
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="absolute top-4 left-4 size-9 rounded-full bg-white/10 grid place-items-center text-sky-200 hover:bg-white/20"
              >
                <X className="size-5" />
              </button>

              <div className="flex items-center gap-2 mb-4 text-white">
                <Play className="size-5 text-[#FF8A2B] fill-[#FF8A2B]" />
                <h3 className="font-black text-lg">شرح طريقة الطلب والاستيراد</h3>
              </div>

              <div className="space-y-3 text-sm text-sky-100/85 font-bold leading-relaxed">
                <div className="p-3 rounded-2xl bg-sky-400/10 border border-sky-400/25">
                  <span className="font-black text-sky-200 block mb-1">1. انسخ الرابط:</span>
                  تصفح متجرك المفضل (شي إن، أمازون، تيمو) وانسخ رابط أي منتج يعجبك.
                </div>
                <div className="p-3 rounded-2xl bg-[#FF6A00]/12 border border-[#FF8A2B]/30">
                  <span className="font-black text-[#FFB37A] block mb-1">2. أرسل الطلب:</span>
                  اضغط على «اطلب الآن» والصق الرابط، وسيقوم النظام فوراً بحساب التكلفة.
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/12 border border-emerald-400/30">
                  <span className="font-black text-emerald-300 block mb-1">
                    3. الاستلام عند باب بيتك:
                  </span>
                  نتولى الشراء والفحص والشحن ونوصلها لك في أي محافظة يمنية.
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Link
                  to="/new-order"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="relative overflow-hidden group bg-gradient-to-r from-[#FF8A2B] via-[#FF6A00] to-[#D94800] text-white px-5 py-2.5 rounded-2xl font-black text-xs hover:from-[#FF6A00] hover:to-[#A83800] transition shadow-[0_0_22px_-2px_rgba(255,106,0,.85)] ring-1 ring-[#FFA94D]/50"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent -skew-x-12 animate-[btn-shine_2.8s_ease-in-out_infinite]"
                  />
                  <span className="relative z-10">ابدأ الطلب الآن ⚡</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🌟 keyframes: لمعان الأزرار البرتقالية + نبضة الخلفية الزجاجية */}
      <style>{`
        @keyframes btn-shine {
          0%        { transform: translateX(-160%) skewX(-20deg); opacity: 0; }
          12%       { opacity: .95; }
          55%, 100% { transform: translateX(320%) skewX(-20deg); opacity: 0; }
        }
        @keyframes glass-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(96,180,255,.12), 0 10px 30px -12px rgba(0,0,0,.55); }
          50%      { box-shadow: 0 0 26px 3px rgba(96,180,255,.28), 0 14px 34px -12px rgba(0,0,0,.60); }
        }
        @media (max-width: 639px) {
          [dir="rtl"] { text-rendering: optimizeLegibility; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\[store-pulse_2s_ease-in-out_infinite\],
          .animate-\[store-shine_2\.5s_linear_infinite\],
        }
      `}</style>
    </div>
  );
}
