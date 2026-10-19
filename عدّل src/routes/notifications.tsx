import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, MessageCircle, PackagePlus, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

type OrderNotification = {
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

const ADMIN_ONLY_NOTIFICATION_TYPES = new Set(["new_payment_submitted"]);

function NotificationsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    let active = true;

    if (!user) {
      setIsAdmin(false);
      setRoleError(null);
      return () => {
        active = false;
      };
    }

    setIsAdmin(null);
    setRoleError(null);

    void supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error("تعذر التحقق من صلاحية الإدارة:", error);
        setIsAdmin(false);
        setRoleError("تعذر التحقق من الصلاحية. لم نعرض إشعارات الإدارة.");
        return;
      }
      setIsAdmin(data === true);
    });

    return () => {
      active = false;
    };
  }, [sessionLoading, user]);

  if (sessionLoading || (user && isAdmin === null)) {
    return (
      <AccountShell title="الإشعارات">
        <p
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600"
        >
          جارٍ تحميل الإشعارات…
        </p>
      </AccountShell>
    );
  }

  if (user && isAdmin) return <AdminNotificationsPage userId={user.id} />;
  if (user) {
    return <CustomerNotificationsPage userId={user.id} roleError={roleError} />;
  }

  return (
    <AccountShell title="إشعاراتي">
      <EmptyState
        icon={<Bell className="size-8" />}
        title="سجّل الدخول لعرض إشعاراتك"
        text="تحتاج إلى تسجيل الدخول أولًا."
      />
    </AccountShell>
  );
}

/** واجهة العميل: لا تجلب إلا الإشعارات المرتبطة بمعرّف جلسته. */
function CustomerNotificationsPage({
  userId,
  roleError,
}: {
  userId: string;
  roleError: string | null;
}) {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingRead, setSavingRead] = useState(false);
  const [error, setError] = useState<string | null>(roleError);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      setLoading(true);
      const [notificationsResult, readsResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("id,user_id,title,message,type,created_at,payment_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("notification_reads").select("notification_id").eq("user_id", userId),
      ]);

      if (!active) return;

      if (notificationsResult.error) {
        console.error("تعذر تحميل إشعارات العميل:", notificationsResult.error);
        setError("تعذر تحميل الإشعارات. تحقق من الاتصال والصلاحيات ثم حاول مجددًا.");
      } else {
        const rows = (notificationsResult.data ?? []).filter(
          (item) => !ADMIN_ONLY_NOTIFICATION_TYPES.has(item.type),
        );
        setNotifications(rows as SystemNotification[]);
        setError(roleError);
      }

      if (readsResult.error) {
        console.error("تعذر تحميل حالة قراءة الإشعارات:", readsResult.error);
        setError((current) => current ?? "تعذر تحميل حالة قراءة الإشعارات.");
      } else {
        setReadIds(new Set((readsResult.data ?? []).map((row) => row.notification_id)));
      }

      setLoading(false);
    };

    void loadNotifications();

    const channel = supabase
      .channel(`customer-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const notification = payload.new as SystemNotification;
          if (
            notification.user_id !== userId ||
            ADMIN_ONLY_NOTIFICATION_TYPES.has(notification.type)
          ) {
            return;
          }
          setNotifications((current) =>
            [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 50),
          );
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, roleError]);

  const markRead = async (notificationId: string) => {
    if (readIds.has(notificationId)) return;
    setSavingRead(true);

    const { error: saveError } = await supabase
      .from("notification_reads")
      .upsert(
        { notification_id: notificationId, user_id: userId },
        { onConflict: "notification_id,user_id" },
      );

    setSavingRead(false);
    if (saveError) {
      console.error("تعذر حفظ قراءة الإشعار:", saveError);
      setError("لم تُحفظ حالة القراءة. حاول مرة أخرى.");
      return;
    }

    setReadIds((current) => new Set(current).add(notificationId));
    setError(null);
  };

  const markAllRead = async () => {
    const unread = notifications.filter((item) => !readIds.has(item.id));
    if (unread.length === 0) return;
    setSavingRead(true);

    const { error: saveError } = await supabase.from("notification_reads").upsert(
      unread.map((item) => ({ notification_id: item.id, user_id: userId })),
      { onConflict: "notification_id,user_id" },
    );

    setSavingRead(false);
    if (saveError) {
      console.error("تعذر حفظ قراءة الإشعارات:", saveError);
      setError("لم تُحفظ حالة القراءة. تحقق من الاتصال ثم حاول مرة أخرى.");
      return;
    }

    setReadIds((current) => new Set([...current, ...unread.map((item) => item.id)]));
    setError(null);
  };

  const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length;

  return (
    <AccountShell title="إشعاراتي">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">تحديثات حسابك</h2>
          <p className="mt-1 text-xs text-slate-500">
            {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : "لا توجد إشعارات غير مقروءة"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={savingRead}
            onClick={() => void markAllRead()}
            className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-50 disabled:opacity-50"
          >
            <CheckCheck className="size-4" /> تحديد الكل كمقروء
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600"
        >
          جارٍ تحميل إشعاراتك…
        </p>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-8" />}
          title="لا توجد إشعارات"
          text="ستظهر هنا تحديثات طلباتك ودفعاتك عند وصولها."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isRead = readIds.has(notification.id);
            return (
              <article
                key={notification.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${
                  isRead ? "border-slate-200" : "border-sky-300 ring-1 ring-sky-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">{notification.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isRead ? "bg-slate-100 text-slate-500" : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {isRead ? "مقروء" : "جديد"}
                      </span>
                    </div>
                    {notification.message && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {notification.message}
                      </p>
                    )}
                    <time
                      className="mt-2 block text-xs text-slate-400"
                      dateTime={notification.created_at}
                    >
                      {new Date(notification.created_at).toLocaleString("ar-YE")}
                    </time>
                  </div>
                  {!isRead && (
                    <button
                      type="button"
                      disabled={savingRead}
                      onClick={() => void markRead(notification.id)}
                      className="shrink-0 rounded-lg border border-sky-200 px-2.5 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-50 disabled:opacity-50"
                    >
                      تعليم كمقروء
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}

/** شاشة الإدارة: لا تعرض إلا بعد نجاح التحقق من has_role(admin). */
function AdminNotificationsPage({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<OrderNotification[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(() =>
    typeof window === "undefined" ? true : window.localStorage.getItem("sc_notify") !== "0",
  );
  const [savingRead, setSavingRead] = useState(false);
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
    let active = true;

    const loadAdminNotifications = async () => {
      setLoading(true);
      const [ordersResult, notificationsResult, readsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id,tracking_code,customer_name,phone,notes,status,created_at")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("notifications")
          .select("id,user_id,title,message,type,created_at,payment_id")
          .or(`user_id.is.null,user_id.eq.${userId}`)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("notification_reads").select("notification_id").eq("user_id", userId),
      ]);

      if (!active) return;

      if (ordersResult.error) {
        console.error("تعذر تحميل طلبات العملاء للإدارة:", ordersResult.error);
        setError("تعذر تحميل طلبات العملاء. تحقق من صلاحيات الإدارة وRLS.");
      } else {
        setOrders((ordersResult.data ?? []).map((order) => ({ ...order, read: true })));
      }

      if (notificationsResult.error) {
        console.error("تعذر تحميل إشعارات الإدارة:", notificationsResult.error);
        setError((current) => current ?? "تعذر تحميل إشعارات الإدارة.");
      } else {
        setNotifications((notificationsResult.data ?? []) as SystemNotification[]);
      }

      if (readsResult.error) {
        console.error("تعذر تحميل سجل القراءة:", readsResult.error);
        setError((current) => current ?? "تعذر تحميل حالة قراءة الإشعارات.");
      } else {
        setReadIds(new Set((readsResult.data ?? []).map((row) => row.notification_id)));
      }

      setLoading(false);
    };

    void loadAdminNotifications();

    const orderChannel = supabase
      .channel(`admin-orders-notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const order = payload.new as Omit<OrderNotification, "read">;
        setOrders((current) =>
          [{ ...order, read: false }, ...current.filter((item) => item.id !== order.id)].slice(
            0,
            30,
          ),
        );
        playSound();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("طلب جديد - السوق الشامل", {
            body: `${order.customer_name} • ${order.tracking_code}`,
          });
        }
      })
      .subscribe();

    const systemChannel = supabase
      .channel(`admin-system-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const notification = payload.new as SystemNotification;
          if (notification.user_id !== null && notification.user_id !== userId) return;
          setNotifications((current) =>
            [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 50),
          );
          setError(null);
          playSound();
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(orderChannel);
      void supabase.removeChannel(systemChannel);
    };
  }, [userId]);

  const toggleSound = async () => {
    const next = !soundOn;
    if (next && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    setSoundOn(next);
    window.localStorage.setItem("sc_notify", next ? "1" : "0");
  };

  const markOrderSeen = async (orderId: string) => {
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "تم التواصل" })
      .eq("id", orderId);

    if (updateError) {
      console.error("تعذر تحديث حالة الطلب:", updateError);
      setError("تعذر تحديث حالة الطلب. تحقق من صلاحيات الإدارة.");
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: "تم التواصل", read: true } : order,
      ),
    );
    setError(null);
  };

  const markAllSystemRead = async () => {
    const unread = notifications.filter((item) => !readIds.has(item.id));
    if (unread.length === 0) return;
    setSavingRead(true);

    const { error: saveError } = await supabase.from("notification_reads").upsert(
      unread.map((item) => ({ notification_id: item.id, user_id: userId })),
      { onConflict: "notification_id,user_id" },
    );

    setSavingRead(false);
    if (saveError) {
      console.error("تعذر حفظ قراءة إشعارات الإدارة:", saveError);
      setError("تعذر حفظ حالة القراءة. حاول مرة أخرى.");
      return;
    }

    setReadIds((current) => new Set([...current, ...unread.map((item) => item.id)]));
    setError(null);
  };

  const unreadOrders = orders.filter((order) => !order.read).length;
  const unreadSystem = notifications.filter((item) => !readIds.has(item.id)).length;

  return (
    <AccountShell title="إشعارات الإدارة" back="/admin">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="size-6 text-orange-600" />
            {unreadOrders > 0 && (
              <span className="absolute -left-2 -top-2 grid size-5 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {unreadOrders}
              </span>
            )}
          </div>
          <h2 className="font-black text-slate-900">طلبات العملاء اللحظية</h2>
        </div>
        <button
          type="button"
          onClick={() => void toggleSound()}
          className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-800"
        >
          {soundOn ? "🔔 الصوت يعمل" : "🔕 الصوت متوقف"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600"
        >
          جارٍ تحميل بيانات الإدارة…
        </p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<PackagePlus className="size-8" />}
          title="لا توجد طلبات جديدة"
          text="ستظهر طلبات العملاء هنا عند وصولها."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const phone = (order.phone || "").replace(/\D/g, "");
            return (
              <article
                key={order.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${
                  order.read ? "border-slate-200" : "border-orange-300 ring-1 ring-orange-100"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">{order.customer_name}</h3>
                      {!order.read && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          جديد
                        </span>
                      )}
                      <span className="font-mono text-xs text-slate-500">
                        {order.tracking_code}
                      </span>
                    </div>
                    {order.notes && <p className="mt-1 text-sm text-slate-600">{order.notes}</p>}
                    <p className="mt-1 text-xs text-slate-500">
                      الحالة: {order.status} • {new Date(order.created_at).toLocaleString("ar-YE")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {phone && (
                      <>
                        <a
                          aria-label="اتصال بالعميل"
                          href={`tel:${phone}`}
                          className="rounded-xl bg-sky-700 p-2.5 text-white"
                        >
                          <Phone className="size-4" />
                        </a>
                        <a
                          aria-label="مراسلة العميل عبر واتساب"
                          href={`https://wa.me/${phone}?text=${encodeURIComponent(`مرحبًا ${order.customer_name}، وصلنا طلبك ${order.tracking_code}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-emerald-600 p-2.5 text-white"
                        >
                          <MessageCircle className="size-4" />
                        </a>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => void markOrderSeen(order.id)}
                      className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800"
                    >
                      تمت المتابعة
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-900">إشعارات الإدارة</h2>
            <p className="mt-1 text-xs text-slate-500">
              {unreadSystem > 0 ? `${unreadSystem} غير مقروء` : "لا توجد إشعارات غير مقروءة"}
            </p>
          </div>
          {unreadSystem > 0 && (
            <button
              type="button"
              disabled={savingRead}
              onClick={() => void markAllSystemRead()}
              className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-800 disabled:opacity-50"
            >
              <CheckCheck className="size-4" /> تحديد إشعارات الإدارة كمقروءة
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
            لا توجد إشعارات إدارية.
          </p>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const isRead = readIds.has(notification.id);
              return (
                <article
                  key={notification.id}
                  className={`rounded-2xl border bg-white p-4 ${
                    isRead ? "border-slate-200" : "border-orange-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900">{notification.title}</h3>
                      {notification.message && (
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {notification.message}
                        </p>
                      )}
                      <time
                        className="mt-2 block text-xs text-slate-400"
                        dateTime={notification.created_at}
                      >
                        {new Date(notification.created_at).toLocaleString("ar-YE")}
                      </time>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                      {isRead ? "مقروء" : "جديد"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AccountShell>
  );
}

export default NotificationsPage;
