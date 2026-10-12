import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, Phone, MessageCircle, PackagePlus, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

type OrderNotif = {
  id: string;
  tracking_code: string;
  customer_name: string;
  phone: string;
  notes: string | null;
  status: string;
  created_at: string;
  read: boolean;
};

type SystemNotification = {
  id: string;
  user_id: string | null;
  title: string;
  message: string | null;
  type: string;
  created_at: string;
  payment_id: string | null;
};

function NotificationsPage() {
  const { user } = useSession();
  const [orders, setOrders] = useState<OrderNotif[]>([]);
  const [sysNotifs, setSysNotifs] = useState<SystemNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(() =>
    typeof window === "undefined" ? true : window.localStorage.getItem("sc_notify") !== "0",
  );
  const soundOnRef = useRef(soundOn);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const playSound = () => {
    if (!soundOnRef.current || typeof window === "undefined") return;
    new Audio("https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3")
      .play()
      .catch(() => undefined);
  };

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setSysNotifs([]);
      setReadNotificationIds(new Set());
      setNotificationError(null);
      return;
    }

    let alive = true;

    const loadData = async () => {
      const [ordersResult, notificationsResult, readsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id,tracking_code,customer_name,phone,notes,status,created_at")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("notifications")
          .select("id,user_id,title,message,type,created_at,payment_id")
          .or(`user_id.is.null,user_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("notification_reads")
          .select("notification_id")
          .eq("user_id", user.id),
      ]);

      if (!alive) return;

      if (ordersResult.error) {
        console.error("تعذر تحميل طلبات العملاء:", ordersResult.error);
      } else {
        setOrders((ordersResult.data ?? []).map((order) => ({ ...order, read: true })));
      }

      if (notificationsResult.error) {
        console.error("تعذر تحميل إشعارات العميل:", notificationsResult.error);
        setNotificationError("تعذر تحميل إشعارات العميل. تحقق من الاتصال والصلاحيات.");
      } else {
        setSysNotifs((notificationsResult.data ?? []).filter(
          (notification) => notification.type !== "new_payment_submitted",
        ));
      }

      if (readsResult.error) {
        console.error("تعذر تحميل حالة قراءة الإشعارات:", readsResult.error);
        setNotificationError((current) => current ?? "تعذر تحميل حالة القراءة المحفوظة.");
      } else {
        setReadNotificationIds(new Set((readsResult.data ?? []).map((row) => row.notification_id)));
      }
    };

    void loadData();

    const orderChannel = supabase
      .channel(`orders-notif-live-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const order = payload.new as Omit<OrderNotif, "read">;
        setOrders((current) => [
          { ...order, read: false },
          ...current.filter((item) => item.id !== order.id),
        ].slice(0, 30));
        playSound();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("طلب جديد 🛒", {
            body: `${order.customer_name} - ${order.tracking_code}`,
          });
        }
      })
      .subscribe();

    const notificationChannel = supabase
      .channel(`system-notifications-live-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const notification = payload.new as SystemNotification;
        // نقبل إشعار المستخدم أو الإعلان العام، ونستبعد تنبيهات الإدارة.
        if (notification.user_id !== null && notification.user_id !== user.id) return;
        if (notification.type === "new_payment_submitted") return;
        setSysNotifs((current) => [
          notification,
          ...current.filter((item) => item.id !== notification.id),
        ].slice(0, 50));
        setNotificationError(null);
        playSound();
      })
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(orderChannel);
      void supabase.removeChannel(notificationChannel);
    };
  }, [user]);

  const toggle = async () => {
    const next = !soundOn;
    if (next && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    setSoundOn(next);
    window.localStorage.setItem("sc_notify", next ? "1" : "0");
  };

  const markContacted = async (id: string) => {
    const { error } = await supabase.from("orders").update({ status: "تم التواصل" }).eq("id", id);
    if (error) {
      console.error("تعذر تحديث حالة الطلب:", error);
      return;
    }
    setOrders((current) => current.map((order) =>
      order.id === id ? { ...order, status: "تم التواصل", read: true } : order,
    ));
  };

  const markNotificationRead = async (notificationId: string) => {
    if (!user || readNotificationIds.has(notificationId)) return;

    const { error } = await supabase.from("notification_reads").upsert(
      { notification_id: notificationId, user_id: user.id },
      { onConflict: "notification_id,user_id" },
    );

    if (error) {
      console.error("تعذر حفظ قراءة الإشعار:", error);
      setNotificationError("تعذر حفظ حالة القراءة. حاول مرة أخرى.");
      return;
    }

    setReadNotificationIds((current) => new Set(current).add(notificationId));
    setNotificationError(null);
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadNotifications = sysNotifs.filter((item) => !readNotificationIds.has(item.id));

    if (unreadNotifications.length > 0) {
      const { error } = await supabase.from("notification_reads").upsert(
        unreadNotifications.map((item) => ({ notification_id: item.id, user_id: user.id })),
        { onConflict: "notification_id,user_id" },
      );

      if (error) {
        console.error("تعذر حفظ قراءة الإشعارات:", error);
        setNotificationError("لم تُحفظ القراءة؛ تحقق من الاتصال ثم حاول مجددًا.");
        return;
      }

      setReadNotificationIds((current) => {
        const next = new Set(current);
        unreadNotifications.forEach((item) => next.add(item.id));
        return next;
      });
    }

    // طلبات العملاء ليست صفوفًا في notifications، لذلك تظل حالتها محلية فقط.
    setOrders((current) => current.map((order) => ({ ...order, read: true })));
    setNotificationError(null);
  };

  const unreadOrders = orders.filter((order) => !order.read).length;
  const unreadSystemNotifications = sysNotifs.filter((item) => !readNotificationIds.has(item.id)).length;

  return (
    <AccountShell title="الإشعارات - السوق الشامل">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="size-6 text-amber-300" />
            {unreadOrders > 0 && (
              <span className="absolute -top-2 -left-2 flex size-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {unreadOrders}
              </span>
            )}
          </div>
          <h2 className="font-black">طلبات العملاء اللحظية</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl border border-[#442c1c] bg-[#2a1d14] px-3 py-2 font-bold text-amber-300"
          >
            {soundOn ? "🔔 الصوت يعمل" : "🔕 الصوت متوقف"}
          </button>
          <button
            type="button"
            onClick={() => setOrders((current) => current.map((order) => ({ ...order, read: true })))}
            className="flex items-center gap-1 rounded-xl border border-[#442c1c] bg-[#2a1d14] px-3 py-2 font-bold text-amber-300"
          >
            <CheckCheck className="size-4" /> تعليم طلبات العملاء كمقروءة
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-8 text-amber-300" />}
          title="لا توجد طلبات"
          text="أي طلب جديد من عميل سيظهر هنا فوراً مع صوت وإشعار"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const cleanPhone = (order.phone || "").replace(/\D/g, "");
            return (
              <div
                key={order.id}
                className={`flex flex-wrap justify-between gap-3 rounded-2xl border bg-[#1f150e] p-4 ${
                  !order.read ? "border-amber-600" : "border-[#3b2718]"
                }`}
              >
                <div className="flex gap-3">
                  <div className={`rounded-xl p-2.5 ${!order.read ? "animate-pulse bg-amber-700 text-white" : "bg-[#2a1d14] text-amber-300"}`}>
                    <PackagePlus className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{order.customer_name}</span>
                      {!order.read && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">جديد</span>}
                      <span className="font-mono text-[10px] text-stone-500">{order.tracking_code}</span>
                    </div>
                    <div className="mt-1 text-xs text-stone-400">
                      {order.notes} • {new Date(order.created_at).toLocaleString("ar")}
                    </div>
                    <div className="text-[11px]">الحالة: <span className="font-bold text-amber-300">{order.status}</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cleanPhone && (
                    <>
                      <a aria-label="اتصال بالعميل" href={`tel:${cleanPhone}`} className="rounded-xl bg-amber-700 p-2.5 text-white">
                        <Phone className="size-4" />
                      </a>
                      <a
                        aria-label="مراسلة العميل عبر واتساب"
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً ${order.customer_name}، طلبك ${order.tracking_code} وصلنا`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-emerald-700 p-2.5 text-white"
                      >
                        <MessageCircle className="size-4" />
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => void markContacted(order.id)}
                    className="rounded-xl border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-300"
                  >
                    تمت المتابعة
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section className="mt-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-stone-300">إشعارات الحساب</h3>
            {unreadSystemNotifications > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadSystemNotifications} غير مقروء
              </span>
            )}
          </div>
          {unreadSystemNotifications > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="flex items-center gap-1 rounded-xl border border-[#442c1c] bg-[#2a1d14] px-3 py-2 text-xs font-bold text-amber-300"
            >
              <CheckCheck className="size-4" /> تحديد إشعارات الحساب كمقروءة
            </button>
          )}
        </div>

        {notificationError && (
          <p role="alert" className="mb-2 rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-200">
            {notificationError}
          </p>
        )}

        {sysNotifs.length === 0 ? (
          <p className="rounded-xl border border-[#3b2718] bg-[#1a120b] p-3 text-xs text-stone-500">لا توجد إشعارات حساب.</p>
        ) : (
          <div className="space-y-2">
            {sysNotifs.map((notification) => {
              const isRead = readNotificationIds.has(notification.id);
              return (
                <div
                  key={notification.id}
                  className={`rounded-xl border bg-[#1a120b] p-3 ${isRead ? "border-[#3b2718]" : "border-amber-700"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{notification.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${isRead ? "bg-stone-800 text-stone-400" : "bg-red-600 text-white"}`}>
                          {isRead ? "مقروء" : "جديد"}
                        </span>
                      </div>
                      {notification.message && <p className="mt-1 text-xs leading-5 text-stone-400">{notification.message}</p>}
                      <p className="mt-1 text-[10px] text-stone-500">{new Date(notification.created_at).toLocaleString("ar")}</p>
                    </div>
                    {!isRead && (
                      <button
                        type="button"
                        onClick={() => void markNotificationRead(notification.id)}
                        className="shrink-0 rounded-lg border border-amber-700 px-2.5 py-1.5 text-[10px] font-bold text-amber-300"
                      >
                        تعليم كمقروء
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AccountShell>
  );
}

export default NotificationsPage;
