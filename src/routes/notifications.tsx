import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCheck,
  Clock,
  Inbox,
  MapPinned,
  MessageCircle,
  PackagePlus,
  Phone,
  RefreshCw,
  Send,
  Trash2,
  Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell, EmptyState } from "@/components/AccountShell";
import { sendSms } from "@/services/sendSms";

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
  sent_by?: string | null;
  href?: string | null;
  is_active: boolean;
};

const ADMIN_ONLY_NOTIFICATION_KINDS = new Set(["new_payment_submitted"]);

// حالة القراءة لهذا الملف مصدرها notification_reads فقط، وليس notifications.is_read.
// يتوقع الجدول notification_id وuser_id وقيدًا فريدًا عليهما معًا.
async function loadNotificationReadIds(userId: string) {
  const { data, error } = await (supabase.from("notification_reads") as any)
    .select("notification_id,user_id")
    .eq("user_id", userId);

  return {
    error,
    readIds: new Set<string>(
      (data ?? [])
        .filter((row: { user_id: string }) => row.user_id === userId)
        .map((row: { notification_id: string }) => row.notification_id),
    ),
  };
}

async function saveNotificationReadIds(
  userId: string,
  notificationIds: string[],
) {
  if (notificationIds.length === 0) return { error: null };

  return await (supabase.from("notification_reads") as any).upsert(
    notificationIds.map((notificationId) => ({
      notification_id: notificationId,
      user_id: userId,
    })),
    { onConflict: "notification_id,user_id" },
  );
}

function NotificationsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    let active = true;

    if (!user) {
      setCanManage(false);
      setRoleError(null);
      return () => {
        active = false;
      };
    }

    setCanManage(null);
    setRoleError(null);

    void Promise.all([
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: user.id, _role: "staff" }),
    ]).then(([adminResult, staffResult]) => {
      if (!active) return;
      if (adminResult.error || staffResult.error) {
        console.error(
          "تعذر التحقق من صلاحية الإدارة:",
          adminResult.error ?? staffResult.error,
        );
        setCanManage(false);
        setRoleError("تعذر التحقق من الصلاحية. لم نعرض أدوات إدارة الإشعارات.");
        return;
      }
      setCanManage(adminResult.data === true || staffResult.data === true);
    });

    return () => {
      active = false;
    };
  }, [sessionLoading, user]);

  if (sessionLoading || (user && canManage === null)) {
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

  if (user && canManage) return <AdminNotificationsPage userId={user.id} />;
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

/** واجهة العميل: تجلب إشعارات الحساب والعروض العامة النشطة فقط. */
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
  const pendingReadIds = useRef(new Set<string>());
  const [error, setError] = useState<string | null>(roleError);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      setLoading(true);
      const [notificationsResult, readsResult] = await Promise.all([
        (supabase.from("notifications") as any)
          .select(
            "id,user_id,title,message,type,created_at,sent_by,href,is_active",
          )
          .or(`and(user_id.is.null,is_active.eq.true),user_id.eq.${userId}`)
          .order("created_at", { ascending: false })
          .limit(50),
        loadNotificationReadIds(userId),
      ]);

      if (!active) return;

      if (notificationsResult.error) {
        console.error("تعذر تحميل إشعارات العميل:", notificationsResult.error);
        setError(
          "تعذر تحميل الإشعارات. تحقق من الاتصال والصلاحيات ثم حاول مجددًا.",
        );
      } else {
        const rows = (notificationsResult.data ?? []).filter(
          (item: SystemNotification) =>
            !ADMIN_ONLY_NOTIFICATION_KINDS.has(item.type),
        );
        setNotifications(rows as SystemNotification[]);
        setError(roleError);
      }

      if (readsResult.error) {
        console.error("تعذر تحميل حالة قراءة الإشعارات:", readsResult.error);
        setError((current) => current ?? "تعذر تحميل حالة قراءة الإشعارات.");
      } else {
        setReadIds(readsResult.readIds);
      }

      setLoading(false);
    };

    void loadNotifications();

    const isVisibleToCustomer = (notification: SystemNotification) => {
      const isOwnNotification = notification.user_id === userId;
      const isActiveBroadcast =
        notification.user_id === null && notification.is_active === true;

      return (
        (isOwnNotification || isActiveBroadcast) &&
        !ADMIN_ONLY_NOTIFICATION_KINDS.has(notification.type)
      );
    };

    const upsertCustomerNotification = (payload: any) => {
      if (!active) return;

      const notification = payload.new as SystemNotification;
      if (!notification?.id) return;

      if (!isVisibleToCustomer(notification)) {
        // Remove it if a broadcast was deactivated or the row is no longer visible.
        setNotifications((current) =>
          current.filter((item) => item.id !== notification.id),
        );
        return;
      }

      setNotifications((current) =>
        [
          notification,
          ...current.filter((item) => item.id !== notification.id),
        ].slice(0, 50),
      );
    };

    const channel = supabase
      .channel(`customer-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        upsertCustomerNotification,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        upsertCustomerNotification,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications" },
        (payload: any) => {
          if (!active) return;
          const deleted = payload.old as { id?: string };
          if (!deleted?.id) return;
          setNotifications((current) =>
            current.filter((item) => item.id !== deleted.id),
          );
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, roleError]);

  const markRead = useCallback(
    async (notificationId: string) => {
      if (
        readIds.has(notificationId) ||
        pendingReadIds.current.has(notificationId)
      )
        return;
      pendingReadIds.current.add(notificationId);
      setSavingRead(true);

      try {
        const { error: saveError } = await saveNotificationReadIds(userId, [
          notificationId,
        ]);
        if (saveError) {
          console.error("تعذر حفظ قراءة الإشعار:", saveError);
          setError("لم تُحفظ حالة القراءة. حاول مرة أخرى.");
          return;
        }

        setReadIds((current) => new Set(current).add(notificationId));
        setError(null);
      } finally {
        pendingReadIds.current.delete(notificationId);
        setSavingRead(pendingReadIds.current.size > 0);
      }
    },
    [readIds, userId],
  );

  // Mark a customer's notification read only after most of its card is visible on screen.
  useEffect(() => {
    if (
      loading ||
      notifications.length === 0 ||
      typeof IntersectionObserver === "undefined"
    )
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const notificationId = (entry.target as HTMLElement).dataset[
            "customerNotificationId"
          ];
          if (!notificationId) continue;
          observer.unobserve(entry.target);
          if (!readIds.has(notificationId)) void markRead(notificationId);
        }
      },
      { threshold: 0.65 },
    );

    document
      .querySelectorAll<HTMLElement>("[data-customer-notification-id]")
      .forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [loading, notifications, readIds, markRead]);

  const markAllRead = async () => {
    const unread = notifications.filter((item) => !readIds.has(item.id));
    if (unread.length === 0) return;
    setSavingRead(true);

    const { error: saveError } = await saveNotificationReadIds(
      userId,
      unread.map((item) => item.id),
    );

    setSavingRead(false);
    if (saveError) {
      console.error("تعذر حفظ قراءة الإشعارات:", saveError);
      setError("لم تُحفظ حالة القراءة. تحقق من الاتصال ثم حاول مرة أخرى.");
      return;
    }

    setReadIds(
      (current) => new Set([...current, ...unread.map((item) => item.id)]),
    );
    setError(null);
  };

  const unreadCount = notifications.filter(
    (item) => !readIds.has(item.id),
  ).length;
  const latestFirst = [...notifications].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );

  return (
    <AccountShell title="إشعاراتي">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">تحديثات حسابك</h2>
          <p className="mt-1 text-xs text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} إشعار غير مقروء`
              : "لا توجد إشعارات غير مقروءة"}
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
          {latestFirst.map((notification) => {
            const isRead = readIds.has(notification.id);
            return (
              <article
                key={notification.id}
                data-customer-notification-id={notification.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${
                  isRead
                    ? "border-slate-200"
                    : "border-sky-300 ring-1 ring-sky-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">
                        {notification.title}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isRead
                            ? "bg-slate-100 text-slate-500"
                            : "bg-orange-100 text-orange-800"
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
                      {new Date(notification.created_at).toLocaleString(
                        "ar-YE",
                      )}
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

/** شاشة الإدارة: لا تعرض إلا بعد نجاح التحقق من دور admin أو staff. */
function AdminNotificationsPage({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderNotification[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.localStorage.getItem("sc_notify") !== "0",
  );
  const [savingRead, setSavingRead] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [draftType, setDraftType] = useState("offer");
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(),
  );
  const soundOnRef = useRef(soundOn);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const playSound = () => {
    if (!soundOnRef.current || typeof window === "undefined") return;
    new Audio(
      "https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3",
    )
      .play()
      .catch(() => undefined);
  };

  useEffect(() => {
    let active = true;

    const loadAdminNotifications = async () => {
      setLoading(true);
      const [ordersResult, notificationsResult, readsResult] =
        await Promise.all([
          supabase
            .from("orders")
            .select(
              "id,tracking_code,customer_name,phone,notes,status,created_at",
            )
            .order("created_at", { ascending: false })
            .limit(500),
          (supabase.from("notifications") as any)
            .select(
              "id,user_id,title,message,type,created_at,sent_by,href,is_active",
            )
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("notification_reads")
            .select("notification_id")
            .eq("user_id", userId),
        ]);

      if (!active) return;

      if (ordersResult.error) {
        console.error("تعذر تحميل طلبات العملاء للإدارة:", ordersResult.error);
        setError("تعذر تحميل طلبات العملاء. تحقق من صلاحيات الإدارة وRLS.");
      } else {
        setOrders(
          (ordersResult.data ?? []).map((order) => ({ ...order, read: true })),
        );
      }

      if (notificationsResult.error) {
        console.error("تعذر تحميل إشعارات الإدارة:", notificationsResult.error);
        setError((current) => current ?? "تعذر تحميل إشعارات الإدارة.");
      } else {
        setNotifications(
          (notificationsResult.data ?? []) as SystemNotification[],
        );
      }

      if (readsResult.error) {
        console.error("تعذر تحميل سجل القراءة:", readsResult.error);
        setError((current) => current ?? "تعذر تحميل حالة قراءة الإشعارات.");
      } else {
        setReadIds(
          new Set((readsResult.data ?? []).map((row) => row.notification_id)),
        );
      }

      setLoading(false);
    };

    void loadAdminNotifications();

    const orderChannel = supabase
      .channel(`admin-orders-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as Omit<OrderNotification, "read">;
          setOrders((current) =>
            [
              { ...order, read: false },
              ...current.filter((item) => item.id !== order.id),
            ].slice(0, 30),
          );
          playSound();
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("طلب جديد - السوق الشامل", {
              body: `${order.customer_name} • ${order.tracking_code}`,
            });
          }
        },
      )
      .subscribe();

    const systemChannel = supabase
      .channel(`admin-system-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const notification = payload.new as SystemNotification;
          if (notification.user_id !== null && notification.user_id !== userId)
            return;
          setNotifications((current) =>
            [
              notification,
              ...current.filter((item) => item.id !== notification.id),
            ].slice(0, 50),
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

  const refreshAdminLists = async () => {
    if (loading || refreshing) return;
    setRefreshing(true);
    const [ordersResult, notificationsResult, readsResult] = await Promise.all([
      supabase
        .from("orders")
        .select("id,tracking_code,customer_name,phone,notes,status,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      (supabase.from("notifications") as any)
        .select(
          "id,user_id,title,message,type,created_at,sent_by,href,is_active",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", userId),
    ]);

    const refreshErrors: string[] = [];
    if (ordersResult.error) {
      console.error("تعذر تحديث طلبات العملاء:", ordersResult.error);
      refreshErrors.push("تعذر تحديث طلبات العملاء.");
    } else {
      setOrders(
        (ordersResult.data ?? []).map((order) => ({ ...order, read: true })),
      );
    }
    if (notificationsResult.error) {
      console.error("تعذر تحديث إشعارات الإدارة:", notificationsResult.error);
      refreshErrors.push("تعذر تحديث الإشعارات.");
    } else {
      setNotifications(
        (notificationsResult.data ?? []) as SystemNotification[],
      );
    }
    if (readsResult.error) {
      console.error("تعذر تحديث حالة القراءة:", readsResult.error);
      refreshErrors.push("تعذر تحديث حالة القراءة.");
    } else {
      setReadIds(
        new Set((readsResult.data ?? []).map((row) => row.notification_id)),
      );
    }
    setError(
      refreshErrors.length ? refreshErrors.join(" ") : "تم تحديث القائمة.",
    );
    setRefreshing(false);
  };

  const toggleSound = async () => {
    const next = !soundOn;
    if (
      next &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
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
        order.id === orderId
          ? { ...order, status: "تم التواصل", read: true }
          : order,
      ),
    );
    setError(null);
  };

  const markAllSystemRead = async () => {
    const unread = notifications.filter((item) => !readIds.has(item.id));
    if (unread.length === 0) return;
    setSavingRead(true);

    const { error: saveError } = await saveNotificationReadIds(
      userId,
      unread.map((item) => item.id),
    );

    setSavingRead(false);
    if (saveError) {
      console.error("تعذر حفظ قراءة إشعارات الإدارة:", saveError);
      setError("تعذر حفظ حالة القراءة. حاول مرة أخرى.");
      return;
    }

    setReadIds(
      (current) => new Set([...current, ...unread.map((item) => item.id)]),
    );
    setError(null);
  };

  const sendCustomerNotification = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const title = draftTitle.trim();
    const message = draftMessage.trim();
    if (!title || !message || sending) return;

    setSending(true);
    setError(null);
    const { data, error: insertError } = await (
      supabase.from("notifications") as any
    )
      .insert({
        user_id: null,
        title,
        message,
        type: draftType,
        is_active: true,
      })
      .select("id,user_id,title,message,type,created_at,sent_by,href,is_active")
      .single();
    setSending(false);

    if (insertError) {
      console.error("تعذر إرسال إشعار العملاء:", insertError);
      setError(
        "تعذر إرسال الإشعار. تحقق من الاتصال وسياسات قاعدة البيانات ثم حاول مجددًا.",
      );
      return;
    }

    setNotifications((current) => [
      data as SystemNotification,
      ...current.filter((item) => item.id !== data.id),
    ]);

    const { data: profiles } = await (supabase.from("profiles") as any)
      .select("phone")
      .not("phone", "is", null)
      .limit(1000);
    const phones: string[] = [
      ...new Set(
        (profiles ?? [])
          .map((profile: { phone?: string | null }) =>
            (profile.phone ?? "").trim(),
          )
          .filter(Boolean),
      ),
    ] as string[];
    const smsResults = await Promise.allSettled(
      phones.map((phone: string) => sendSms(phone, `${title}\n${message}`)),
    );
    const failedSms = smsResults.filter(
      (result) => result.status === "rejected",
    ).length;
    setDraftTitle("");
    setDraftMessage("");
    setError(
      failedSms === 0
        ? `تم نشر العرض وإرسال SMS إلى ${phones.length} عميل.`
        : `تم نشر العرض، لكن تعذر إرسال SMS إلى ${failedSms} من أصل ${phones.length} عميل.`,
    );
  };

  const deleteCustomerNotification = async (
    notification: SystemNotification,
  ) => {
    if (
      !window.confirm(
        `حذف الإشعار «${notification.title}» نهائيًا؟ لن يظهر للعملاء بعد الحذف.`,
      )
    )
      return;
    setError(null);
    const { error: deleteError } = await (supabase.from("notifications") as any)
      .delete()
      .eq("id", notification.id);
    if (deleteError) {
      console.error("تعذر حذف الإشعار:", deleteError);
      setError(
        "تعذر حذف الإشعار. تحقق من صلاحيات المدير/الموظف ثم حاول مرة أخرى.",
      );
      return;
    }
    setNotifications((current) =>
      current.filter((item) => item.id !== notification.id),
    );
    setReadIds((current) => {
      const next = new Set(current);
      next.delete(notification.id);
      return next;
    });
    setError("تم حذف الإشعار.");
  };

  const unreadOrders = orders.filter((order) => !order.read).length;
  const unreadSystem = notifications.filter(
    (item) => !readIds.has(item.id),
  ).length;
  const latestFirst = [...notifications].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const totalShown = notifications.length;
  const readCount = Math.max(0, totalShown - unreadSystem);
  const readPercent = totalShown
    ? Math.round((readCount / totalShown) * 100)
    : 0;
  const unreadPercent = totalShown ? 100 - readPercent : 0;
  const urgentCount = notifications.filter((item) =>
    /urgent|critical|عاجل|طارئ/i.test(`${item.type} ${item.title}`),
  ).length;
  const notificationTypes = [
    {
      label: "عروض",
      count: notifications.filter((n) => n.type === "offer").length,
      color: "#00D4FF",
    },
    {
      label: "تحديثات شحن",
      count: notifications.filter((n) => n.type === "shipment").length,
      color: "#FF6B00",
    },
    {
      label: "تحديثات شراء",
      count: notifications.filter((n) => n.type === "purchase").length,
      color: "#22C55E",
    },
    {
      label: "دعم وإدارة",
      count: notifications.filter(
        (n) => !["offer", "shipment", "purchase"].includes(n.type),
      ).length,
      color: "#EAB308",
    },
  ];
  const typeMax = Math.max(1, ...notificationTypes.map((item) => item.count));
  const orderStatusClass = (status: string) => {
    const normalized = status.trim().toLowerCase();
    if (["جديد", "new"].includes(normalized))
      return "border-[#22C55E]/30 bg-[#22C55E]/20 text-[#22C55E]";
    if (
      normalized.includes("معالج") ||
      normalized.includes("transit") ||
      normalized.includes("تواصل")
    )
      return "border-[#00D4FF]/30 bg-[#00D4FF]/20 text-[#00D4FF]";
    if (normalized.includes("دفع") || normalized.includes("pending"))
      return "border-[#EAB308]/30 bg-[#EAB308]/20 text-[#EAB308]";
    if (normalized.includes("تأكيد") || normalized.includes("confirm"))
      return "border-[#22C55E]/30 bg-[#22C55E]/20 text-[#22C55E]";
    if (normalized.includes("ملغ") || normalized.includes("cancel"))
      return "border-white/20 bg-white/10 text-white/60";
    return "border-white/10 bg-white/5 text-white/70";
  };
  const toggleExpandedMessage = (notificationId: string) => {
    setExpandedMessages((current) => {
      const next = new Set(current);
      if (next.has(notificationId)) next.delete(notificationId);
      else next.add(notificationId);
      return next;
    });
  };
  const cityStats = [
    { name: "صنعاء", count: 412, x: 74, y: 31 },
    { name: "عدن", count: 298, x: 44, y: 73 },
    { name: "تعز", count: 175, x: 58, y: 56 },
  ];

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-[#050A14] px-3 py-5 text-white sm:px-5 sm:py-7"
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(255,107,0,0.15),transparent_68%)]" />
      <div className="relative mx-auto w-full max-w-[1200px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#FF6B00]/20 bg-[#0A1931]/80 p-4 shadow-[0_0_30px_rgba(255,107,0,0.1)] backdrop-blur-[16px] sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] shadow-[inset_0_0_18px_rgba(255,107,0,0.28)]">
              <Bell className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-black text-white sm:text-2xl">
                الشامل للتسوق - مركز الإشعارات
              </h1>
              <p className="mt-1 text-xs text-white/50">
                تابع الطلبات والتنبيهات وتواصل مع العملاء من مكان واحد.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleSound()}
              className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${soundOn ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]" : "border-white/10 bg-white/5 text-white/60"}`}
            >
              {soundOn ? "🔔 الصوت يعمل" : "🔕 الصوت متوقف"}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/admin" })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/80 transition hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
            >
              رجوع للوحة القيادة
            </button>
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-[#EAB308]/30 bg-[#EAB308]/10 p-3 text-sm text-[#EAB308]"
          >
            {error}
          </p>
        )}
        {loading && (
          <p
            role="status"
            className="rounded-xl border border-white/10 bg-[#0A1931]/60 p-3 text-center text-sm text-white/60"
          >
            جارٍ تحميل الإشعارات والطلبات…
          </p>
        )}

        <section
          aria-label="ملخص الإشعارات"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <article className="rounded-2xl border border-[#00D4FF]/20 bg-[#0A1931]/60 p-4 shadow-[0_0_20px_rgba(0,212,255,0.1)]">
            <div className="flex items-start justify-between">
              <span className="text-3xl font-black text-white">
                {totalShown}
              </span>
              <Bell className="size-5 text-[#00D4FF]" />
            </div>
            <p className="mt-2 text-xs text-white/60">
              إشعار ضمن القائمة المعروضة
            </p>
            <span className="mt-3 inline-flex rounded-full bg-[#00D4FF]/20 px-2.5 py-1 text-[11px] font-bold text-[#00D4FF]">
              {unreadSystem} غير مقروء
            </span>
          </article>
          <article className="rounded-2xl border border-[#FF6B00]/20 bg-[#0A1931]/60 p-4 shadow-[0_0_20px_rgba(255,107,0,0.1)]">
            <div className="flex items-start justify-between">
              <span className="text-3xl font-black text-white">
                {unreadPercent}%
              </span>
              <Inbox className="size-5 text-[#FF6B00]" />
            </div>
            <p className="mt-2 text-xs text-white/60">
              لم يتم قراءتها من القائمة
            </p>
            <span className="mt-3 inline-flex rounded-full bg-[#FF6B00]/20 px-2.5 py-1 text-[11px] font-bold text-[#FF6B00]">
              {unreadSystem} إشعار جديد
            </span>
          </article>
          <article className="rounded-2xl border border-[#00D4FF]/20 bg-[#0A1931]/60 p-4 shadow-[0_0_20px_rgba(0,212,255,0.1)]">
            <div className="flex items-start justify-between">
              <span className="text-3xl font-black text-white">
                {readPercent}%
              </span>
              <CheckCheck className="size-5 text-[#22C55E]" />
            </div>
            <p className="mt-2 text-xs text-white/60">
              مقروءة من إجمالي المعروض
            </p>
            <span className="mt-3 inline-flex rounded-full bg-[#22C55E]/20 px-2.5 py-1 text-[11px] font-bold text-[#22C55E]">
              {readCount} مقروء
            </span>
          </article>
          <article className="rounded-2xl border border-[#FF6B00]/20 bg-[#0A1931]/60 p-4 shadow-[0_0_20px_rgba(255,107,0,0.1)]">
            <div className="flex items-start justify-between">
              <span className="text-3xl font-black text-white">
                {urgentCount}
              </span>
              <AlertTriangle className="size-5 text-[#FF6B00]" />
            </div>
            <p className="mt-2 text-xs text-white/60">
              إشعارات عاجلة حسب النوع أو العنوان
            </p>
            <span className="mt-3 inline-flex rounded-full bg-[#FF6B00]/20 px-2.5 py-1 text-[11px] font-bold text-[#FF6B00]">
              {urgentCount ? "يتطلب إجراء" : "لا يوجد عاجل"}
            </span>
          </article>
        </section>

        <section
          aria-label="تحليلات الإشعارات"
          className="grid gap-4 lg:grid-cols-3"
        >
          <article className="rounded-2xl border border-white/10 bg-[#0A1931]/60 p-5">
            <h2 className="font-bold text-white">نسبة القراءة</h2>
            <p className="mt-1 text-[11px] text-white/50">
              من الإشعارات المحمّلة حاليًا
            </p>
            <div className="mt-5 flex items-center justify-center">
              <div
                className="grid size-32 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#FF6B00 0 ${readPercent}%, #00D4FF ${readPercent}% 100%)`,
                }}
              >
                <div className="grid size-[104px] place-items-center rounded-full bg-[#0A1931]">
                  <span className="text-3xl font-black text-white">
                    {readPercent}%
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-5 text-xs">
              <span className="flex items-center gap-2 text-white/70">
                <i className="size-2 rounded-full bg-[#FF6B00]" />
                مقروء {readPercent}%
              </span>
              <span className="flex items-center gap-2 text-white/70">
                <i className="size-2 rounded-full bg-[#00D4FF]" />
                غير مقروء {unreadPercent}%
              </span>
            </div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#0A1931]/60 p-5">
            <h2 className="font-bold text-white">أنواع الإشعارات</h2>
            <p className="mt-1 text-[11px] text-white/50">
              توزيع العناصر المعروضة حسب النوع
            </p>
            <div className="mt-6 space-y-5">
              {notificationTypes.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-white/80">{item.label}</span>
                    <span className="font-bold" style={{ color: item.color }}>
                      {item.count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.count / typeMax) * 100}%`,
                        backgroundColor: item.color,
                        boxShadow: `0 0 10px ${item.color}`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#0A1931]/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white">
                  التوزيع الجغرافي - اليمن
                </h2>
                <p className="mt-1 text-[11px] text-white/50">
                  قيم توضيحية حسب نموذج التصميم
                </p>
              </div>
              <MapPinned className="size-5 text-[#00D4FF]" />
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
              <svg
                viewBox="0 0 100 100"
                role="img"
                aria-label="رسم توضيحي لخريطة اليمن مع مواقع المدن"
                className="h-44 w-full"
              >
                <path
                  d="M17 23 28 17 39 21 48 15 57 19 65 15 72 21 83 23 78 31 88 37 81 46 86 55 78 63 75 75 66 81 59 89 47 84 40 79 31 78 25 68 18 62 21 52 13 45 19 37 15 30Z"
                  fill="#0A1931"
                  stroke="#00D4FF"
                  strokeWidth="1.5"
                  style={{ filter: "drop-shadow(0 0 4px #00D4FF)" }}
                />
                <path
                  d="M24 37 42 32 56 43 74 29M42 32 48 59 67 71M48 59 31 68M48 59 60 45"
                  fill="none"
                  stroke="#00D4FF"
                  strokeWidth=".7"
                  opacity=".75"
                />
                {cityStats.map((city) => (
                  <g key={city.name}>
                    <circle
                      cx={city.x}
                      cy={city.y}
                      r="2.5"
                      fill="#FF6B00"
                      style={{ filter: "drop-shadow(0 0 4px #FF6B00)" }}
                    />
                    <text
                      x={city.x}
                      y={city.y - 5}
                      fill="#FFFFFF"
                      textAnchor="middle"
                      fontSize="5"
                    >
                      {city.name}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="space-y-4 text-left">
                {cityStats.map((city) => (
                  <div key={city.name}>
                    <p className="text-xs text-white">{city.name}</p>
                    <p className="text-sm font-bold text-[#FF6B00]">
                      {city.count}
                    </p>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-2">
                  <p className="text-[10px] text-white/50">الإجمالي التوضيحي</p>
                  <p className="font-bold text-[#FF6B00]">885</p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-[#00D4FF]/20 bg-[#0A1931]/80 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#FF6B00]/20 text-[#FF6B00]">
              <Send className="size-5" />
            </span>
            <div>
              <h2 className="font-bold text-white">
                إرسال عرض أو إشعار للعملاء
              </h2>
              <p className="mt-1 text-[11px] text-white/50">
                ينشر الإشعار للعملاء، ثم يحاول إرسال SMS إلى الأرقام المتاحة.
              </p>
            </div>
          </div>
          <form
            onSubmit={(event) => void sendCustomerNotification(event)}
            className="grid gap-3 md:grid-cols-2"
          >
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              required
              maxLength={120}
              placeholder="عنوان العرض أو الإشعار"
              className="rounded-lg border border-[#00D4FF]/20 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#00D4FF]/60"
            />
            <select
              value={draftType}
              onChange={(event) => setDraftType(event.target.value)}
              className="rounded-lg border border-[#00D4FF]/20 bg-[#050A14] px-3 py-3 text-sm text-white outline-none focus:border-[#00D4FF]/60"
            >
              <option value="offer">عرض</option>
              <option value="system">إشعار عام</option>
              <option value="shipment">تحديث شحن</option>
              <option value="purchase">تحديث شراء</option>
              <option value="support">دعم</option>
            </select>
            <textarea
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              required
              maxLength={2000}
              rows={3}
              placeholder="اكتب تفاصيل العرض أو الإشعار"
              className="rounded-lg border border-[#00D4FF]/20 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#00D4FF]/60 md:col-span-2"
            />
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#FF6B00] to-[#FF8C32] px-4 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(255,107,0,0.4)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
            >
              <Send className="size-4" />
              {sending ? "جارٍ الإرسال…" : "ارسل لجميع العملاء"}
            </button>
          </form>
        </section>

        <section className="grid items-start gap-4 lg:grid-cols-2">
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0A1931]/60">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#00D4FF]/15 text-[#00D4FF]">
                  <Tag className="size-5" />
                </span>
                <div>
                  <h2 className="font-bold text-white">
                    إشعارات العملاء والإدارة
                  </h2>
                  <p className="mt-1 text-[11px] text-white/50">
                    {unreadSystem
                      ? `${unreadSystem} غير مقروءة`
                      : "لا توجد إشعارات غير مقروءة"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading || refreshing}
                  onClick={() => void refreshAdminLists()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/5 px-3 py-2 text-xs font-bold text-[#00D4FF] hover:bg-[#00D4FF]/10 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "جارٍ التحديث…" : "تحديث القائمة"}
                </button>
                {unreadSystem > 0 && (
                  <button
                    type="button"
                    disabled={savingRead}
                    onClick={() => void markAllSystemRead()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/5 px-3 py-2 text-xs font-bold text-[#00D4FF] hover:bg-[#00D4FF]/10 disabled:opacity-50"
                  >
                    <CheckCheck className="size-4" />
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>
            </div>
            {loading ? (
              <p
                role="status"
                className="p-8 text-center text-sm text-white/50"
              >
                جارٍ تحميل الإشعارات…
              </p>
            ) : notifications.length === 0 ? (
              <div className="m-4 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50">
                <Inbox className="mx-auto mb-3 size-8 text-[#00D4FF]" />
                <p className="font-bold text-white">لا توجد إشعارات إدارية</p>
                <p className="mt-1 text-xs text-white/50">
                  ستظهر هنا إشعارات الدفع والعروض التي ترسلها.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-right text-xs">
                  <thead className="bg-white/5 text-[11px] font-bold text-white/50">
                    <tr>
                      <th className="px-4 py-3">الإشعار</th>
                      <th className="px-3 py-3">النوع</th>
                      <th className="px-3 py-3">الحالة</th>
                      <th className="px-3 py-3">التاريخ</th>
                      <th className="px-3 py-3">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestFirst.map((notification) => {
                      const isRead = readIds.has(notification.id);
                      const isBroadcast = notification.user_id === null;
                      const expanded = expandedMessages.has(notification.id);
                      const longMessage =
                        (notification.message ?? "").length > 180;
                      return (
                        <tr
                          key={notification.id}
                          className="border-b border-white/5 align-top hover:bg-white/[0.03]"
                        >
                          <td className="max-w-[360px] px-4 py-4">
                            <p className="font-bold text-white">
                              {notification.title}
                            </p>
                            {notification.message && (
                              <>
                                <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-white/60">
                                  {longMessage && !expanded
                                    ? `${notification.message.slice(0, 180)}…`
                                    : notification.message}
                                </p>
                                {longMessage && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleExpandedMessage(notification.id)
                                    }
                                    className="mt-1 block text-left text-[11px] font-normal text-[#FF6B00] hover:text-[#FF8C32]"
                                  >
                                    {expanded ? "عرض أقل" : "قراءة المزيد"}
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                          <td className="px-3 py-4">
                            <span className="rounded-full bg-[#00D4FF]/15 px-2 py-1 text-[10px] text-[#00D4FF]">
                              {isBroadcast ? "إشعار عام" : "إشعار حساب"}
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] ${isRead ? "bg-white/10 text-white/60" : "bg-[#22C55E]/20 text-[#22C55E]"}`}
                            >
                              {isRead ? "مقروء" : "جديد"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-[10px] text-white/50">
                            {new Date(notification.created_at).toLocaleString(
                              "ar-YE",
                            )}
                          </td>
                          <td className="px-3 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                void deleteCustomerNotification(notification)
                              }
                              aria-label={`حذف إشعار ${notification.title}`}
                              title="حذف الإشعار"
                              className="rounded-lg border border-[#FF6B00]/30 p-2 text-[#FF6B00] hover:bg-[#FF6B00]/10"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0A1931]/60">
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-[#FF6B00]/15 text-[#FF6B00]">
                <PackagePlus className="size-5" />
              </span>
              <div>
                <h2 className="font-bold text-white">طلبات العملاء اللحظية</h2>
                <p className="mt-1 text-[11px] text-white/50">
                  {unreadOrders
                    ? `${unreadOrders} طلبات بانتظار المتابعة`
                    : "لا توجد طلبات بانتظار المتابعة"}
                </p>
              </div>
            </div>
            {loading ? (
              <p
                role="status"
                className="p-8 text-center text-sm text-white/50"
              >
                جارٍ تحميل الطلبات…
              </p>
            ) : orders.length === 0 ? (
              <div className="m-4 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50">
                <PackagePlus className="mx-auto mb-3 size-8 text-[#FF6B00]" />
                <p className="font-bold text-white">لا توجد طلبات جديدة</p>
                <p className="mt-1 text-xs text-white/50">
                  ستظهر طلبات العملاء هنا عند وصولها.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[660px] text-right text-xs">
                  <thead className="bg-white/5 text-[11px] font-bold text-white/50">
                    <tr>
                      <th className="px-3 py-3">العميل</th>
                      <th className="px-3 py-3">رقم الطلب</th>
                      <th className="px-3 py-3">الحالة</th>
                      <th className="px-3 py-3">التاريخ</th>
                      <th className="px-3 py-3">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const phone = (order.phone || "").replace(/\D/g, "");
                      return (
                        <tr
                          key={order.id}
                          className="border-b border-white/5 hover:bg-white/[0.03]"
                        >
                          <td className="px-3 py-3 font-bold text-white">
                            {order.customer_name}
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] text-white/60">
                            {order.tracking_code}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full border px-2 py-1 text-[10px] ${orderStatusClass(order.status)}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-[10px] text-white/50">
                            {new Date(order.created_at).toLocaleString("ar-YE")}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {phone && (
                                <>
                                  <a
                                    aria-label="اتصال بالعميل"
                                    href={`tel:${phone}`}
                                    className="grid size-8 place-items-center rounded-md bg-[#00D4FF]/20 text-[#00D4FF] hover:bg-[#00D4FF]/30"
                                  >
                                    <Phone className="size-4" />
                                  </a>
                                  <a
                                    aria-label="مراسلة العميل عبر واتساب"
                                    href={`https://wa.me/${phone}?text=${encodeURIComponent(`مرحبًا ${order.customer_name}، وصلنا طلبك ${order.tracking_code}`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="grid size-8 place-items-center rounded-md bg-[#22C55E] text-white"
                                  >
                                    <MessageCircle className="size-4" />
                                  </a>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => void markOrderSeen(order.id)}
                                className="rounded-md border border-[#22C55E]/30 bg-[#22C55E]/10 px-2.5 py-2 text-[10px] font-bold text-[#22C55E]"
                              >
                                تمت المتابعة
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>

        <footer className="border-t border-white/10 py-4 text-center text-[10px] text-white/30">
          الشامل للتسوق © 2024 © مركز الإشعارات - جميع الحقوق محفوظة
        </footer>
      </div>
    </div>
  );
}

export default NotificationsPage;
