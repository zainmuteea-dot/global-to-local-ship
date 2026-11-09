// src/routes/notifications.tsx
// نسخة يدوية مبنية على الملف المتاح في المشروع؛ أضيف زران لفتح لوحتي إشعارات العملاء وطلبات العملاء.
// يحافظ التعديل على المسار والصلاحيات وSupabase وتدفق SMS الموجود.
// لم يُطبّق هذا الملف داخل Lovable أو يُختبر ببناء المشروع.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCheck,
  UserRound,
  PackageCheck,
  CircleDollarSign,
  ChevronLeft,
  Inbox,
  MapPinned,
  MessageCircle,
  PackagePlus,
  Phone,
  RefreshCw,
  Send,
  Trash2,
  Tag,
  Pencil,
  Plus,
  Eye,
  EyeOff,
  X,
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

type SiteTickerRow = {
  id: string;
  message: string;
  placement: "home_guest" | "dashboard" | "both";
  badge: string;
  href: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at?: string;
};

type SiteTickerDraft = {
  id: string | null;
  message: string;
  placement: SiteTickerRow["placement"];
  badge: string;
  href: string;
  sort_order: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const emptyTickerDraft: SiteTickerDraft = {
  id: null,
  message: "",
  placement: "home_guest",
  badge: "",
  href: "",
  sort_order: "0",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

function toLocalDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

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
    const displayName = String(
      user.user_metadata?.["full_name"] ??
        user.user_metadata?.["name"] ??
        user.email?.split("@")[0] ??
        "بك",
    ).trim() || "بك";
    return (
      <CustomerNotificationsPage
        userId={user.id}
        roleError={roleError}
        displayName={displayName}
      />
    );
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

/** واجهة العميل: إشعارات الحساب والعروض العامة النشطة فقط. */
function CustomerNotificationsPage({
  userId,
  roleError,
  displayName,
}: {
  userId: string;
  roleError: string | null;
  displayName: string;
}) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingRead, setSavingRead] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "ord" | "pay" | "acc">("all");
  const pendingReadIds = useRef(new Set<string>());
  const [error, setError] = useState<string | null>(roleError);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      setLoading(true);
      const [notificationsResult, readsResult] = await Promise.all([
        (supabase.from("notifications") as any)
          .select("id,user_id,title,message,type,created_at,sent_by,href,is_active")
          .or(`and(user_id.is.null,is_active.eq.true),user_id.eq.${userId}`)
          .order("created_at", { ascending: false })
          .limit(50),
        loadNotificationReadIds(userId),
      ]);

      if (!active) return;

      if (notificationsResult.error) {
        console.error("تعذر تحميل إشعارات العميل:", notificationsResult.error);
        setError("تعذر تحميل الإشعارات. تحقق من الاتصال والصلاحيات ثم حاول مجددًا.");
      } else {
        const rows = (notificationsResult.data ?? []).filter(
          (item: SystemNotification) => !ADMIN_ONLY_NOTIFICATION_KINDS.has(item.type),
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
      const isActiveBroadcast = notification.user_id === null && notification.is_active === true;
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
        setNotifications((current) => current.filter((item) => item.id !== notification.id));
        return;
      }

      setNotifications((current) =>
        [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 50),
      );
    };

    const channel = supabase
      .channel(`customer-notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, upsertCustomerNotification)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, upsertCustomerNotification)
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications" },
        (payload: any) => {
          if (!active) return;
          const deleted = payload.old as { id?: string };
          if (!deleted?.id) return;
          setNotifications((current) => current.filter((item) => item.id !== deleted.id));
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
      if (readIds.has(notificationId) || pendingReadIds.current.has(notificationId)) return;
      pendingReadIds.current.add(notificationId);
      setSavingRead(true);
      try {
        const { error: saveError } = await saveNotificationReadIds(userId, [notificationId]);
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

  // Keep the existing behavior: a notification becomes read once most of its card is visible.
  useEffect(() => {
    if (loading || notifications.length === 0 || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const notificationId = (entry.target as HTMLElement).dataset["customerNotificationId"];
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
    setReadIds((current) => new Set([...current, ...unread.map((item) => item.id)]));
    setError(null);
  };

  const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length;
  const getCategory = (type: string): "ord" | "pay" | "acc" => {
    const value = (type ?? "").toLowerCase();
    if (/pay|payment|invoice|wallet/.test(value)) return "pay";
    if (/order|shipment|ship|purchase|tracking|delivery/.test(value)) return "ord";
    return "acc";
  };
  const categoryMeta = {
    ord: { label: "الطلبات", Icon: PackageCheck },
    pay: { label: "الدفع", Icon: CircleDollarSign },
    acc: { label: "الحساب", Icon: UserRound },
  } as const;
  const categoryOf = (item: SystemNotification) => getCategory(item.type);
  const categoryCounts = {
    all: notifications.length,
    ord: notifications.filter((item) => categoryOf(item) === "ord").length,
    pay: notifications.filter((item) => categoryOf(item) === "pay").length,
    acc: notifications.filter((item) => categoryOf(item) === "acc").length,
  };
  const filteredNotifications = notifications.filter(
    (item) => activeFilter === "all" || categoryOf(item) === activeFilter,
  );
  const visibleNotifications = [...filteredNotifications].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );

  const handleOpenDetails = async (notification: SystemNotification) => {
    if (!readIds.has(notification.id)) await markRead(notification.id);
    if (notification.href) window.location.assign(notification.href);
  };

  const filters = [
    { key: "all" as const, label: "الكل" },
    { key: "ord" as const, label: "الطلبات" },
    { key: "pay" as const, label: "الدفع" },
    { key: "acc" as const, label: "الحساب" },
  ];

  return (
    <AccountShell title="إشعاراتي">
      <div className="nt-root" dir="rtl">
        <style>{NOTIFICATIONS_CUSTOMER_STYLE}</style>
        <div className="nt-wrap">
          <header className="nt-topbar">
            <div className="nt-topbar-title">
              <Bell className="size-5" aria-hidden="true" />
              <h1>إشعاراتي</h1>
              {unreadCount > 0 && <span className="nt-unread-badge">{unreadCount}</span>}
            </div>
            <button type="button" className="nt-back" onClick={() => void navigate({ to: "/my-account" })}>
              رجوع <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          </header>

          <section className="nt-greet">
            <span className="nt-avatar"><Bell className="size-6" aria-hidden="true" /></span>
            <div className="nt-greet-copy">
              <h2>أهلاً بك يا {displayName} 👋</h2>
              <p>إليك آخر تحديثات إشعاراتك</p>
            </div>
          </section>

          <section className="nt-summary" aria-live="polite">
            <div className="nt-summary-copy">
              <span className={`nt-summary-icon ${unreadCount === 0 ? "is-read" : ""}`}>
                <CheckCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="nt-summary-title">
                  {unreadCount === 0 ? "لا توجد إشعارات غير مقروءة" : `لديك ${unreadCount} إشعار غير مقروء`}
                </p>
                <p className="nt-summary-subtitle">
                  {unreadCount === 0 ? "جميع إشعاراتك مقروءة ومحدّثة" : "تابع آخر المستجدات في حسابك"}
                </p>
              </div>
            </div>
            <button
              className="nt-read-all"
              type="button"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0 || savingRead}
            >
              <CheckCheck className="size-4" aria-hidden="true" />
              تعيين الكل كمقروء
            </button>
          </section>

          <nav className="nt-filters" aria-label="تصفية الإشعارات">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`nt-filter ${activeFilter === filter.key ? "active" : ""}`}
                aria-pressed={activeFilter === filter.key}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}<span className="nt-filter-count">{categoryCounts[filter.key]}</span>
              </button>
            ))}
          </nav>

          {error && (
            <p role="alert" className="nt-error">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" /> {error}
            </p>
          )}

          {loading ? (
            <p role="status" className="nt-loading">جارٍ تحميل إشعاراتك…</p>
          ) : visibleNotifications.length === 0 ? (
            <div className="nt-empty">
              <span className="nt-empty-icon"><Inbox className="size-7" aria-hidden="true" /></span>
              <p className="nt-empty-title">
                {notifications.length === 0 ? "لا توجد إشعارات" : "لا توجد إشعارات في هذا التصنيف"}
              </p>
              <p className="nt-empty-subtitle">
                {notifications.length === 0 ? "ستظهر هنا تحديثات طلباتك ودفعاتك عند وصولها." : "جرّب تصنيفًا آخر من الفلترة بالأعلى."}
              </p>
            </div>
          ) : (
            <section className="nt-list" aria-label="قائمة الإشعارات">
              {visibleNotifications.map((notification) => {
                const isRead = readIds.has(notification.id);
                const category = categoryOf(notification);
                const meta = categoryMeta[category];
                const Icon = meta.Icon;
                const safeMessage = (notification.message ?? "")
                  .replace(/https?:\/\/[^\s]+/g, "")
                  .replace(/\s{2,}/g, " ")
                  .trim();
                const date = notification.created_at
                  ? new Date(notification.created_at).toLocaleString("ar-YE", {
                      year: "numeric", month: "2-digit", day: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })
                  : "";
                return (
                  <article
                    key={notification.id}
                    data-customer-notification-id={notification.id}
                    className={`nt-card ${category} ${isRead ? "read" : "unread"}`}
                  >
                    <div className="nt-card-header">
                      <span className="nt-category-icon"><Icon className="size-5" aria-hidden="true" /></span>
                      <div className="nt-card-content">
                        <div className="nt-meta-row">
                          <span className="nt-category-label">{meta.label}</span>
                          <time className="nt-date" dateTime={notification.created_at}>{date}</time>
                          {!isRead && <span className="nt-new">جديد</span>}
                        </div>
                        <h3 className="nt-card-title">{notification.title}</h3>
                      </div>
                    </div>
                    {safeMessage && <p className="nt-message">{safeMessage}</p>}
                    <div className="nt-card-actions">
                      <button
                        type="button"
                        className="nt-details"
                        onClick={() => void handleOpenDetails(notification)}
                      >
                        {notification.href ? "عرض التفاصيل" : isRead ? "تمت القراءة" : "تعيين كمقروء"}
                        <ChevronLeft className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </div>
    </AccountShell>
  );
}

const NOTIFICATIONS_CUSTOMER_STYLE = `
.nt-root{--nt-primary:#0f4c81;--nt-primary2:#1c6fb8;--nt-ink:#15233b;--nt-muted:#64748b;--nt-line:#e3edf7;--nt-bg:#f3f7fc;direction:rtl;color:var(--nt-ink);font-family:'Tajawal','Cairo',system-ui,sans-serif;background:linear-gradient(135deg,#eef5fd,#f7faff 65%);border-radius:22px;padding:12px;min-height:70vh}
.nt-root *{box-sizing:border-box}.nt-wrap{max-width:680px;margin:0 auto;padding:0 0 26px}.nt-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 2px 14px}.nt-topbar-title{display:flex;align-items:center;gap:9px;color:var(--nt-primary);font-weight:900;font-size:16px}.nt-topbar-title h1{margin:0;font:inherit}.nt-unread-badge{display:inline-flex;min-width:21px;height:21px;align-items:center;justify-content:center;padding:0 6px;border-radius:999px;background:#f97316;color:#fff;font-size:11px;font-weight:900}.nt-back{display:inline-flex;align-items:center;gap:6px;border:1px solid #d5e4f3;border-radius:999px;background:#fff;color:var(--nt-primary);padding:8px 13px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer}.nt-back:hover{background:#eaf3fd}.nt-greet{display:flex;align-items:center;gap:13px;overflow:hidden;position:relative;border-radius:19px;padding:17px 16px;color:white;background:linear-gradient(110deg,#0f4c81,#287fc4);box-shadow:0 12px 25px #0f4c8126}.nt-greet:after{content:'';position:absolute;inset-inline-start:-24px;bottom:-55px;width:130px;height:130px;border-radius:50%;background:#ffffff13}.nt-avatar{display:grid;place-items:center;flex:none;width:48px;height:48px;border-radius:15px;background:#ffffff25;z-index:1}.nt-greet-copy{z-index:1;min-width:0}.nt-greet h2{font-size:clamp(16px,4vw,21px);font-weight:900;margin:0 0 3px}.nt-greet p{font-size:12px;font-weight:600;color:#e4f2ff;margin:0}.nt-summary{margin-top:13px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:13px;border:1px solid var(--nt-line);border-radius:16px;background:#fff;box-shadow:0 7px 18px #0f4c810d}.nt-summary-copy{display:flex;align-items:center;gap:10px;min-width:0}.nt-summary-icon{display:grid;place-items:center;flex:none;width:40px;height:40px;border-radius:13px;background:#e6f7ef;color:#119653}.nt-summary-icon.is-read{background:#e9f7ef}.nt-summary-title{font-size:13px;font-weight:900;margin:0}.nt-summary-subtitle{font-size:10px;color:var(--nt-muted);font-weight:700;margin:3px 0 0}.nt-read-all{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #d7e6f5;border-radius:10px;padding:9px 11px;background:#edf5fd;color:var(--nt-primary);font-family:inherit;font-size:11px;font-weight:800;cursor:pointer}.nt-read-all:disabled{opacity:.48;cursor:not-allowed}.nt-filters{display:flex;gap:7px;overflow-x:auto;margin:13px 0 3px;padding:1px 0 5px;scrollbar-width:none}.nt-filters::-webkit-scrollbar{display:none}.nt-filter{display:inline-flex;align-items:center;gap:6px;flex:none;border:1px solid var(--nt-line);border-radius:999px;padding:7px 11px;background:#fff;color:var(--nt-muted);font-family:inherit;font-size:11px;font-weight:800;cursor:pointer}.nt-filter.active{border-color:transparent;background:linear-gradient(110deg,#0f4c81,#287fc4);color:#fff;box-shadow:0 5px 12px #0f4c8129}.nt-filter-count{display:inline-grid;place-items:center;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#eaf2fb;color:var(--nt-primary);font-size:9px;font-weight:900}.nt-filter.active .nt-filter-count{background:#ffffff32;color:white}.nt-error{display:flex;align-items:flex-start;gap:7px;margin:9px 0;padding:10px 12px;border:1px solid #fde68a;border-radius:12px;background:#fffbeb;color:#92400e;font-size:11px;font-weight:700;line-height:1.6}.nt-loading,.nt-empty{margin-top:12px;border:1px solid var(--nt-line);border-radius:16px;background:#fff;text-align:center;padding:24px 14px;color:var(--nt-muted);font-size:12px}.nt-list{display:flex;flex-direction:column;gap:11px;margin-top:11px}.nt-card{position:relative;overflow:hidden;border:1px solid var(--nt-line);border-radius:17px;background:#fff;padding:13px;box-shadow:0 8px 20px #0f4c810c;transition:transform .18s,box-shadow .18s}.nt-card:hover{transform:translateY(-2px);box-shadow:0 13px 25px #0f4c8119}.nt-card:before{content:'';position:absolute;inset-inline-start:0;top:0;bottom:0;width:4px}.nt-card.ord:before{background:#1c6fb8}.nt-card.pay:before{background:#13a15b}.nt-card.acc:before{background:#8249e8}.nt-card.unread{box-shadow:0 0 0 1px #cfe2f5,0 8px 20px #0f4c8110}.nt-card-header{display:flex;align-items:flex-start;gap:10px}.nt-category-icon{display:grid;place-items:center;flex:none;width:39px;height:39px;border-radius:12px}.nt-card.ord .nt-category-icon{background:#e7f1fc;color:#1c6fb8}.nt-card.pay .nt-category-icon{background:#e5f7ed;color:#119653}.nt-card.acc .nt-category-icon{background:#f1eaff;color:#8249e8}.nt-card-content{flex:1;min-width:0}.nt-meta-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 4px}.nt-category-label,.nt-new{border-radius:999px;padding:3px 7px;font-size:9px;font-weight:900}.nt-card.ord .nt-category-label{background:#e7f1fc;color:#1c6fb8}.nt-card.pay .nt-category-label{background:#e5f7ed;color:#119653}.nt-card.acc .nt-category-label{background:#f1eaff;color:#8249e8}.nt-new{background:#fff1e5;color:#c75a0b}.nt-date{font-size:9px;font-weight:700;color:#8090a5}.nt-card-title{font-size:13px;line-height:1.5;font-weight:900;margin:0;color:var(--nt-ink);overflow-wrap:anywhere}.nt-message{margin:9px 0 0;border:1px solid #e4eef8;border-radius:11px;background:#f7fbff;padding:9px 10px;color:#42536a;font-size:11px;font-weight:650;line-height:1.8;overflow-wrap:anywhere;white-space:pre-wrap}.nt-card-actions{display:flex;justify-content:flex-end;margin-top:9px}.nt-details{display:inline-flex;align-items:center;gap:5px;border:1px solid #d5e5f5;border-radius:10px;background:white;color:var(--nt-primary);padding:7px 10px;font-family:inherit;font-size:10px;font-weight:800;cursor:pointer}.nt-card.pay .nt-details{border-color:#b9e7cc;color:#119653}.nt-card.acc .nt-details{border-color:#dbcafa;color:#8249e8}.nt-details:hover{background:#f1f7fd}.nt-empty{display:flex;flex-direction:column;align-items:center;gap:7px;background:linear-gradient(135deg,#fff,#f6faff)}.nt-empty-icon{display:grid;place-items:center;width:54px;height:54px;border-radius:17px;background:#eaf3fd;color:#0f4c81}.nt-empty-title{margin:3px 0 0;color:var(--nt-ink);font-size:13px;font-weight:900}.nt-empty-subtitle{margin:0;color:var(--nt-muted);font-size:10px;font-weight:650}
@media(max-width:480px){.nt-root{border-radius:16px;padding:9px}.nt-summary{align-items:stretch}.nt-read-all{width:100%}.nt-card{padding:11px}.nt-category-icon{width:36px;height:36px}}
@media(prefers-reduced-motion:reduce){.nt-root *{scroll-behavior:auto!important;transition:none!important}}
`;

/** شاشة الإدارة: لا تظهر إلا بعد نجاح التحقق من دور admin أو staff. */
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
  const [tickerRows, setTickerRows] = useState<SiteTickerRow[]>([]);
  const [tickerLoading, setTickerLoading] = useState(true);
  const [tickerSaving, setTickerSaving] = useState(false);
  const [tickerError, setTickerError] = useState<string | null>(null);
  const [tickerSuccess, setTickerSuccess] = useState<string | null>(null);
  const [tickerDraft, setTickerDraft] = useState<SiteTickerDraft>(emptyTickerDraft);
  const [tickerFormOpen, setTickerFormOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [draftType, setDraftType] = useState("offer");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "offer" | "shipment" | "purchase" | "support"
  >("all");
  const [notificationSearch, setNotificationSearch] = useState("");
  const [activeCustomerPanel, setActiveCustomerPanel] = useState<
    "notifications" | "orders" | null
  >(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(),
  );
  const soundOnRef = useRef(soundOn);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  // رسائل الشريط محفوظة في جدول مستقل، ولا تدخل في تدفق إشعارات العملاء أو SMS.
  const loadTickerRows = useCallback(async () => {
    setTickerLoading(true);
    const { data, error: loadError } = await supabase.from("site_ticker_messages")
      .select("id,message,placement,badge,href,sort_order,starts_at,ends_at,is_active,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (loadError) {
      console.error("تعذر تحميل رسائل أشرطة الموقع:", loadError);
      setTickerError("تعذر تحميل رسائل الشريط. تحقق من تطبيق ترحيل site_ticker_messages والصلاحيات.");
    } else {
      setTickerRows((data ?? []) as SiteTickerRow[]);
      setTickerError(null);
    }
    setTickerLoading(false);
  }, []);

  useEffect(() => { void loadTickerRows(); }, [loadTickerRows]);

  const saveTickerMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = tickerDraft.message.trim();
    const badge = tickerDraft.badge.trim();
    const href = tickerDraft.href.trim();
    const sortOrder = Number(tickerDraft.sort_order);
    if (!message || message.length > 180) {
      setTickerError("اكتب نصًا من 1 إلى 180 حرفًا.");
      return;
    }
    if (badge.length > 30) {
      setTickerError("الشارة يجب ألا تتجاوز 30 حرفًا.");
      return;
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
      setTickerError("الترتيب يجب أن يكون عددًا صحيحًا من 0 إلى 9999.");
      return;
    }
    if (href && (!href.startsWith("/") || href.startsWith("//"))) {
      setTickerError("الرابط يجب أن يكون مسارًا داخليًا يبدأ بـ /.");
      return;
    }
    const starts = tickerDraft.starts_at ? new Date(tickerDraft.starts_at) : null;
    const ends = tickerDraft.ends_at ? new Date(tickerDraft.ends_at) : null;
    if (starts && !Number.isFinite(starts.getTime())) {
      setTickerError("تاريخ البداية غير صالح.");
      return;
    }
    if (ends && !Number.isFinite(ends.getTime())) {
      setTickerError("تاريخ النهاية غير صالح.");
      return;
    }
    if (starts && ends && ends <= starts) {
      setTickerError("يجب أن يكون تاريخ النهاية بعد تاريخ البداية.");
      return;
    }

    setTickerSaving(true);
    setTickerError(null);
    setTickerSuccess(null);
    const payload = {
      message,
      placement: tickerDraft.placement,
      badge,
      href: href || null,
      sort_order: sortOrder,
      starts_at: toIsoDateTime(tickerDraft.starts_at),
      ends_at: toIsoDateTime(tickerDraft.ends_at),
      is_active: tickerDraft.is_active,
      updated_at: new Date().toISOString(),
    };
    const query = tickerDraft.id
      ? supabase.from("site_ticker_messages").update(payload).eq("id", tickerDraft.id)
      : supabase.from("site_ticker_messages").insert(payload);
    const { error: saveError } = await query;
    setTickerSaving(false);
    if (saveError) {
      console.error("تعذر حفظ رسالة الشريط:", saveError);
      setTickerError("تعذر حفظ الرسالة. تحقق من الترحيل وصلاحيات الإدارة.");
      return;
    }
    setTickerSuccess(tickerDraft.id ? "تم تحديث رسالة الشريط." : "تمت إضافة رسالة الشريط.");
    setTickerDraft(emptyTickerDraft);
    setTickerFormOpen(false);
    await loadTickerRows();
  };

  const startTickerEdit = (row: SiteTickerRow) => {
    setTickerDraft({
      id: row.id,
      message: row.message,
      placement: row.placement,
      badge: row.badge ?? "",
      href: row.href ?? "",
      sort_order: String(row.sort_order ?? 0),
      starts_at: toLocalDateTimeInput(row.starts_at),
      ends_at: toLocalDateTimeInput(row.ends_at),
      is_active: row.is_active,
    });
    setTickerSuccess(null);
    setTickerError(null);
    setTickerFormOpen(true);
    document.getElementById("site-ticker-manager")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleTickerActive = async (row: SiteTickerRow) => {
    setTickerError(null);
    setTickerSuccess(null);
    const { error: toggleError } = await supabase.from("site_ticker_messages")
      .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (toggleError) {
      console.error("تعذر تغيير حالة رسالة الشريط:", toggleError);
      setTickerError("تعذر تغيير حالة الرسالة.");
      return;
    }
    setTickerSuccess(row.is_active ? "تم تعطيل الرسالة." : "تم تفعيل الرسالة.");
    await loadTickerRows();
  };

  const deleteTickerMessage = async (row: SiteTickerRow) => {
    if (!window.confirm(`حذف رسالة الشريط «${row.message}» نهائيًا؟`)) return;
    setTickerError(null);
    setTickerSuccess(null);
    const { error: deleteError } = await supabase.from("site_ticker_messages")
      .delete().eq("id", row.id);
    if (deleteError) {
      console.error("تعذر حذف رسالة الشريط:", deleteError);
      setTickerError("تعذر حذف الرسالة.");
      return;
    }
    setTickerRows((rows) => rows.filter((item) => item.id !== row.id));
    if (tickerDraft.id === row.id) {
      setTickerDraft(emptyTickerDraft);
      setTickerFormOpen(false);
    }
    setTickerSuccess("تم حذف رسالة الشريط.");
  };

  // عند اختيار أحد الزرين، افتح القسم المقابل وانتقل إليه داخل /notifications.
  useEffect(() => {
    if (!activeCustomerPanel) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(
          activeCustomerPanel === "notifications"
            ? "customer-notifications-panel"
            : "customer-orders-panel",
        )
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeCustomerPanel]);

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
  const sortedNotifications = [...notifications].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const matchesCategory = (type: string) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "support")
      return !["offer", "shipment", "purchase"].includes(type);
    return type === categoryFilter;
  };
  const searchTerm = notificationSearch.trim().toLowerCase();
  const latestFirst = sortedNotifications.filter((item) => {
    const isRead = readIds.has(item.id);
    if (readFilter === "unread" && isRead) return false;
    if (readFilter === "read" && !isRead) return false;
    if (!matchesCategory(item.type)) return false;
    if (
      searchTerm &&
      !`${item.title} ${item.message ?? ""}`.toLowerCase().includes(searchTerm)
    )
      return false;
    return true;
  });
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
      className="min-h-[100dvh] bg-[#060D1E] px-3 py-5 text-white sm:px-5 sm:py-7"
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(35,119,171,0.12),transparent_68%)]" />
      <div className="relative mx-auto w-full max-w-[1200px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#19274E] bg-[#0B152B]/95 p-4 shadow-[0_0_30px_rgba(245,158,11,0.10)] backdrop-blur-[16px] sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-300 to-amber-600 text-[#10172A] shadow-[0_8px_24px_rgba(245,158,11,0.22)]" aria-label="مركز الإشعارات"><Bell className="size-7 stroke-[2.5]" aria-hidden="true" /></span>
            <div>
              <h1 className="text-xl font-black text-white sm:text-2xl">
                التسوق الشامل - مركز الإشعارات
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                تابع الطلبات والتنبيهات وتواصل مع العملاء من مكان واحد.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void toggleSound()}
              className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2.5 text-xs font-bold transition ${soundOn ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]" : "border-white/10 bg-white/5 text-white/60"}`}
            >
              {soundOn ? "🔔 الصوت يعمل" : "🔕 الصوت متوقف"}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/admin" })}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/80 transition hover:border-[#00D4FF]/40 hover:text-[#00D4FF]"
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
          className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
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
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <article className="rounded-2xl border border-white/10 bg-[#0A1931]/60 p-5">
            <h2 className="font-bold text-white">نسبة القراءة</h2>
            <p className="mt-1 text-[11px] text-[#5D7183]">
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
            <p className="mt-1 text-[11px] text-[#5D7183]">
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
                <p className="mt-1 text-[11px] text-[#5D7183]">
                  أرقام شكلية للمعاينة، وليست بيانات تشغيلية
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
                  <p className="text-[10px] text-[#5D7183]">الإجمالي التوضيحي</p>
                  <p className="font-bold text-[#FF6B00]">885</p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section id="site-ticker-manager" className="scroll-mt-5 rounded-2xl border border-[#EAB308]/30 bg-[#0A1931]/90 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-white"><Tag className="size-5 text-[#EAB308]" /> إدارة أشرطة الموقع</h2>
              <p className="mt-1 text-xs text-[#91A2BD]">رسائل مستقلة عن إشعارات العملاء وSMS. تُعرض حسب الموقع والترتيب وفترة التفعيل.</p>
            </div>
            <button type="button" onClick={() => { setTickerDraft(emptyTickerDraft); setTickerFormOpen((open) => !open); setTickerError(null); setTickerSuccess(null); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#EAB308] px-4 py-2 text-sm font-black text-[#111827] hover:brightness-110">
              {tickerFormOpen ? <X className="size-4" /> : <Plus className="size-4" />}{tickerFormOpen ? "إغلاق النموذج" : "إضافة رسالة شريط"}
            </button>
          </div>
          {tickerError && <p role="alert" className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{tickerError}</p>}
          {tickerSuccess && <p role="status" className="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{tickerSuccess}</p>}

          {tickerFormOpen && <form onSubmit={(event) => void saveTickerMessage(event)} className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold text-slate-300 md:col-span-2">نص الرسالة *
              <textarea required minLength={1} maxLength={180} rows={2} value={tickerDraft.message} onChange={(event) => setTickerDraft((draft) => ({ ...draft, message: event.target.value }))} placeholder="اكتب رسالة الشريط (حتى 180 حرفًا)" className="rounded-xl border border-white/10 bg-[#060D1E] px-3 py-3 text-sm text-white outline-none focus:border-[#EAB308]/60" />
              <span className="text-left text-[11px] text-slate-500">{tickerDraft.message.trim().length}/180</span>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-300">مكان الظهور *
              <select value={tickerDraft.placement} onChange={(event) => setTickerDraft((draft) => ({ ...draft, placement: event.target.value as SiteTickerRow["placement"] }))} className="rounded-xl border border-white/10 bg-[#060D1E] px-3 py-3 text-sm text-white">
                <option value="home_guest">الصفحة الرئيسية للزوار</option><option value="dashboard">لوحة العميل</option><option value="both">كلاهما</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-300">شارة قصيرة (اختيارية)
              <input maxLength={30} value={tickerDraft.badge} onChange={(event) => setTickerDraft((draft) => ({ ...draft, badge: event.target.value }))} placeholder="مثال: عرض أو تنبيه" className="rounded-xl border border-white/10 bg-[#060D1E] px-3 py-3 text-sm text-white" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-300">رابط داخلي اختياري
              <input type="text" value={tickerDraft.href} onChange={(event) => setTickerDraft((draft) => ({ ...draft, href: event.target.value }))} placeholder="مثال: /products" pattern="^(/(?!/).*)?$" title="استخدم مسارًا داخليًا يبدأ بشرطة واحدة /" className="rounded-xl border border-white/10 bg-[#060D1E] px-3 py-3 text-sm text-white" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-300">ترتيب العرض
              <input type="number" min="0" max="9999" step="1" required value={tickerDraft.sort_order} onChange={(event) => setTickerDraft((draft) => ({ ...draft, sort_order: event.target.value }))} className="rounded-xl border border-white/10 bg-[#060D1E] px-3 py-3 text-sm text-white" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-300">يبدأ التفعيل (اختياري)
              <input type="datetime-local" value={tickerDraft.starts_at} onChange={(event) => setTickerDraft((draft) => ({ ...draft, starts_at: event.target.value }))} className="rounded-xl border border-white/10 bg-[#060D1E] px-3 py-3 text-sm text-white" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-300">ينتهي التفعيل (اختياري)
              <input type="datetime-local" value={tickerDraft.ends_at} onChange={(event) => setTickerDraft((draft) => ({ ...draft, ends_at: event.target.value }))} className="rounded-xl border border-white/10 bg-[#060D1E] px-3 py-3 text-sm text-white" />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-200"><input type="checkbox" checked={tickerDraft.is_active} onChange={(event) => setTickerDraft((draft) => ({ ...draft, is_active: event.target.checked }))} className="size-4 accent-amber-400" /> الرسالة نشطة</label>
            <div className="rounded-xl border border-sky-300/20 bg-gradient-to-r from-[#0A2540] to-[#0F4C81] p-3 md:col-span-2">
              <p className="mb-2 text-[10px] font-bold text-sky-200">معاينة الشريط</p>
              <div className="flex min-h-10 items-center gap-2 overflow-hidden rounded-lg border border-sky-300/20 bg-[#071B34] px-3 text-sm text-white">
                {tickerDraft.badge.trim() && <span className="shrink-0 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black">{tickerDraft.badge.trim()}</span>}
                <span className="truncate">{tickerDraft.message.trim() || "سيظهر نص الرسالة هنا"}</span>
              </div>
              {tickerDraft.href.trim() && <p className="mt-1 text-[10px] text-sky-200">رابط: {tickerDraft.href}</p>}
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button type="submit" disabled={tickerSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#EAB308] px-5 py-2.5 text-sm font-black text-[#111827] disabled:opacity-50">{tickerSaving ? "جارٍ الحفظ…" : tickerDraft.id ? "حفظ التعديلات" : "إضافة الرسالة"}</button>
              {tickerDraft.id && <button type="button" onClick={() => { setTickerDraft(emptyTickerDraft); setTickerFormOpen(false); }} className="min-h-11 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80">إلغاء التعديل</button>}
            </div>
          </form>}

          {tickerLoading ? <p className="py-5 text-center text-sm text-slate-400">جارٍ تحميل رسائل الأشرطة…</p> : tickerRows.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-slate-400">لا توجد رسائل بعد. أضف أول رسالة لتظهر بعد تفعيل الترحيل.</p> : <div className="space-y-3">{tickerRows.map((row) => <article key={row.id} className={`rounded-xl border p-3 ${row.is_active ? "border-sky-300/20 bg-[#071B34]/70" : "border-white/10 bg-black/20 opacity-70"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2">{row.badge && <span className="rounded-full bg-orange-500/15 px-2 py-1 text-[10px] font-bold text-orange-200">{row.badge}</span>}<span className="rounded-full bg-sky-400/10 px-2 py-1 text-[10px] text-sky-200">{row.placement === "home_guest" ? "الرئيسية للزوار" : row.placement === "dashboard" ? "لوحة العميل" : "الرئيسية ولوحة العميل"}</span><span className={`rounded-full px-2 py-1 text-[10px] ${row.is_active ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/20 text-slate-400"}`}>{row.is_active ? "مفعلة" : "معطلة"}</span><span className="text-[10px] text-slate-500">ترتيب {row.sort_order}</span></div><p className="text-sm leading-6 text-white">{row.message}</p><p className="mt-1 text-[10px] text-slate-500">{row.href ? `الرابط: ${row.href}` : "دون رابط"} · {row.starts_at ? `من ${new Date(row.starts_at).toLocaleString("ar-YE")}` : "دون بداية محددة"} · {row.ends_at ? `إلى ${new Date(row.ends_at).toLocaleString("ar-YE")}` : "دون نهاية محددة"}</p></div>
              <div className="flex shrink-0 gap-2"><button type="button" onClick={() => startTickerEdit(row)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sky-300/20 px-3 text-xs font-bold text-sky-200 hover:bg-sky-300/10"><Pencil className="size-3.5" /> تعديل</button><button type="button" onClick={() => void toggleTickerActive(row)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-300/20 px-3 text-xs font-bold text-amber-200 hover:bg-amber-300/10">{row.is_active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{row.is_active ? "تعطيل" : "تفعيل"}</button><button type="button" onClick={() => void deleteTickerMessage(row)} aria-label="حذف رسالة الشريط" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-300/20 px-3 text-red-200 hover:bg-red-300/10"><Trash2 className="size-4" /></button></div>
            </div>
          </article>)}</div>}
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
              <p className="mt-1 text-[11px] text-[#5D7183]">
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

        <section
          aria-label="فرز الإشعارات"
          className="rounded-2xl border border-white/10 bg-[#0A1931]/60 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Tag className="size-4 text-[#FF6B00]" />
              فرز الإشعارات والبحث فيها
            </h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", `عرض الكل (${notifications.length})`],
                  ["unread", `غير المقروءة (${unreadSystem})`],
                  ["read", `المقروءة (${readCount})`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={readFilter === value}
                  onClick={() => setReadFilter(value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                    readFilter === value
                      ? "border-[#FF6B00] bg-[#FF6B00] text-white"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "الكل"],
                  ["offer", "عروض"],
                  ["shipment", "تحديثات شحن"],
                  ["purchase", "تحديثات شراء"],
                  ["support", "دعم وإدارة"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={categoryFilter === value}
                  onClick={() => setCategoryFilter(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    categoryFilter === value
                      ? "border-[#EAB308] bg-[#EAB308] text-[#0A1931]"
                      : "border-white/15 bg-transparent text-white/70 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                aria-controls="customer-notifications-panel"
                aria-expanded={activeCustomerPanel === "notifications"}
                onClick={() => setActiveCustomerPanel("notifications")}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:border-[#00D4FF]/50 ${
                  activeCustomerPanel === "notifications"
                    ? "border-[#00D4FF]/60 bg-[#00D4FF]/15 text-[#00D4FF]"
                    : "border-[#00D4FF]/25 bg-[#00D4FF]/5 text-white/80"
                }`}
              >
                <MessageCircle className="size-4 text-[#00D4FF]" aria-hidden="true" />
                إشعارات العملاء
                <span className="rounded-full bg-[#00D4FF]/15 px-2 py-0.5 text-[11px] font-black text-[#00D4FF]">
                  {notifications.length}
                </span>
              </button>
              <button
                type="button"
                aria-controls="customer-orders-panel"
                aria-expanded={activeCustomerPanel === "orders"}
                onClick={() => setActiveCustomerPanel("orders")}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:border-[#FF6B00]/50 ${
                  activeCustomerPanel === "orders"
                    ? "border-[#FF6B00]/60 bg-[#FF6B00]/15 text-[#FF8C32]"
                    : "border-[#FF6B00]/25 bg-[#FF6B00]/5 text-white/80"
                }`}
              >
                <PackagePlus className="size-4 text-[#FF6B00]" aria-hidden="true" />
                طلبات العملاء
                <span className="rounded-full bg-[#FF6B00]/15 px-2 py-0.5 text-[11px] font-black text-[#FF8C32]">
                  {orders.length}
                </span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={savingRead || unreadSystem === 0}
                onClick={() => void markAllSystemRead()}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10 disabled:opacity-50"
              >
                تحديد الكل كمقروء
              </button>
              <input
                type="search"
                value={notificationSearch}
                onChange={(event) => setNotificationSearch(event.target.value)}
                placeholder="بحث في الإشعارات…"
                aria-label="بحث في الإشعارات"
                className="w-56 rounded-lg border border-white/15 bg-[#071226] px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-[#00D4FF] focus:outline-none"
              />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#5D7183]">
            يظهر {latestFirst.length} من {notifications.length} إشعار
          </p>
        </section>




        {activeCustomerPanel === "notifications" && (
          <section
            id="customer-notifications-panel"
            aria-label="إشعارات العملاء والإدارة"
            className="scroll-mt-4 space-y-3 rounded-2xl border border-[#00D4FF]/20 bg-[#0A1931]/70 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">إشعارات العملاء والإدارة</h2>
                <p className="mt-1 text-xs text-white/50">{notifications.length} إشعارًا محفوظًا في القائمة</p>
              </div>
              <button
                type="button"
                disabled={savingRead || unreadSystem === 0}
                onClick={() => void markAllSystemRead()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-4 py-2 text-sm font-bold text-[#00D4FF] hover:bg-[#00D4FF]/20 disabled:opacity-50"
              >
                <CheckCheck className="size-4" aria-hidden="true" />
                تحديد غير المقروء كمقروء ({unreadSystem})
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/20 p-5 text-center text-sm text-white/50">لا توجد إشعارات للعملاء حاليًا.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {sortedNotifications.map((item) => {
                  const isRead = readIds.has(item.id);
                  return (
                    <article key={item.id} className="rounded-xl border border-white/10 bg-[#071226]/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words font-bold text-white">{item.title}</h3>
                          <p className="mt-1 text-[11px] text-white/45">
                            {item.type} · {new Date(item.created_at).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${isRead ? "bg-white/10 text-white/50" : "bg-[#FF6B00]/15 text-[#FF8C32]"}`}>
                          {isRead ? "مقروء" : "جديد"}
                        </span>
                      </div>
                      {item.message && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-white/70">{item.message}</p>}
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void deleteCustomerNotification(item)}
                          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400/10"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          حذف الإشعار
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeCustomerPanel === "orders" && (
          <section
            id="customer-orders-panel"
            aria-label="طلبات العملاء اللحظية"
            className="scroll-mt-4 space-y-3 rounded-2xl border border-[#FF6B00]/20 bg-[#0A1931]/70 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">طلبات العملاء اللحظية</h2>
                <p className="mt-1 text-xs text-white/50">{orders.length} طلبًا محمّلًا · الجديد: {unreadOrders}</p>
              </div>
              <button
                type="button"
                disabled={loading || refreshing}
                onClick={() => void refreshAdminLists()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                تحديث الطلبات
              </button>
            </div>
            {orders.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/20 p-5 text-center text-sm text-white/50">لا توجد طلبات عملاء حاليًا.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {orders.map((order) => (
                  <article key={order.id} className="rounded-xl border border-white/10 bg-[#071226]/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white">{order.customer_name || "عميل"}</h3>
                        <p className="mt-1 text-xs text-[#00D4FF]">رقم التتبع: {order.tracking_code || "—"}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${orderStatusClass(order.status)}`}>{order.status || "جديد"}</span>
                    </div>
                    <p className="mt-3 text-xs text-white/45">{new Date(order.created_at).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}</p>
                    {order.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-white/70">{order.notes}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {order.phone && (
                        <a href={`tel:${order.phone}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#22C55E]/25 bg-[#22C55E]/10 px-3 py-2 text-xs font-bold text-[#22C55E]">
                          <Phone className="size-4" aria-hidden="true" />
                          اتصال بالعميل
                        </a>
                      )}
                      {!order.status?.includes("تم التواصل") && (
                        <button
                          type="button"
                          onClick={() => void markOrderSeen(order.id)}
                          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#00D4FF]/25 bg-[#00D4FF]/10 px-3 py-2 text-xs font-bold text-[#00D4FF]"
                        >
                          <CheckCheck className="size-4" aria-hidden="true" />
                          تسجيل التواصل
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="border-t border-white/10 py-4 text-center text-[10px] text-white/30">
          السوق الشامل © 2026 - مركز الإشعارات
        </footer>
      </div>
    </div>
  );
}

export default NotificationsPage;
