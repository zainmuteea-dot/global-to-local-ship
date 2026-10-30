import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock3,
  CreditCard,
  History,
  Layers,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Plane,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  UserRound,
  Warehouse,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
export const Route = createFileRoute("/admin-tracking")({
  head: () => ({
    meta: [{ title: "تتبع الشحنات المباشر — الإدارة | السوق الشامل" }],
  }),
  component: () => (
    <AdminRouteGuard allowStaff redirectTo="/admin-tracking">
      <LiveTrackingAdminRoute />
    </AdminRouteGuard>
  ),
});

type StageCode =
  | "new"
  | "payment_review"
  | "purchased"
  | "international_warehouse"
  | "international_transit"
  | "customs_local"
  | "out_for_delivery"
  | "delivered";
type Channel = "app" | "whatsapp";
type Shipment = {
  id: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  productLink: string;
  storeName: string;
  city: string;
  status: string;
  userId: string | null;
  courierName: string;
  courierPhone: string;
  createdAt: string;
};
type EventRow = {
  id: string;
  stage_code: StageCode;
  channel: Channel;
  delivery_state: string;
  event_type: string;
  message: string;
  created_at: string;
};
type StageSmsRow = {
  id: string;
  stage_code: StageCode;
  sms_status: "sending" | "accepted" | "failed" | "unknown";
  sms_attempt_count: number;
  sms_error: string | null;
  sms_accepted_at: string | null;
  updated_at: string;
};
const STAGES = [
  {
    code: "new",
    title: "استلام الطلب والتدقيق",
    location: "مكتب الاستقبال المركزي",
    detail: "تسجيل الطلب وتدقيق روابط السلع والكميات والمقاسات والألوان.",
    icon: Package,
  },
  {
    code: "payment_review",
    title: "التدقيق المالي والدفع",
    location: "قسم الحسابات والوساطة",
    detail: "حساب التكلفة والعملات وتأكيد استلام الدفعة.",
    icon: CreditCard,
  },
  {
    code: "purchased",
    title: "الشراء من المتجر الدولي",
    location: "الصين / أمريكا / الإمارات / تركيا",
    detail: "إتمام الشراء وإصدار كود الشحن وفاتورة المورد.",
    icon: ShoppingBag,
  },
  {
    code: "international_warehouse",
    title: "وصول مستودع التجميع الدولي",
    location: "كوانزو / دبي / الرياض",
    detail: "فحص الجودة ومطابقة الوزن والتغليف الآمن.",
    icon: Warehouse,
  },
  {
    code: "international_transit",
    title: "الشحن الدولي في الترانزيت",
    location: "في الطريق إلى الجمهورية اليمنية",
    detail: "انطلاق الشحن الجوي أو البحري نحو الموانئ والمطارات اليمنية.",
    icon: Plane,
  },
  {
    code: "customs_local",
    title: "الجمارك والفرز بالمستودع المحلي",
    location: "صنعاء / عدن",
    detail: "التخليص الجمركي والفرز حسب المحافظات والمدن.",
    icon: MapPin,
  },
  {
    code: "out_for_delivery",
    title: "جاري التوصيل مع المندوب",
    location: "مندوب التوصيل الميداني",
    detail: "خرجت الشحنة مع المندوب إلى عنوان العميل.",
    icon: Truck,
  },
  {
    code: "delivered",
    title: "تم التسليم للعميل بنجاح",
    location: "عنوان العميل النهائي",
    detail: "تم استلام الطرد وإغلاق الطلب.",
    icon: CheckCircle2,
  },
] as const;
const stageCodes = STAGES.map((s) => s.code) as StageCode[];
const stageIndex = (status: string) => {
  const s = (status || "").trim().toLowerCase();
  const aliases: Record<string, StageCode> = {
    جديد: "new",
    reviewing: "payment_review",
    "قيد المراجعة": "new",
    "استلام الطلب والتدقيق": "new",
    "تدقيق مالي": "payment_review",
    payment_review: "payment_review",
    "التدقيق المالي والدفع": "payment_review",
    purchased: "purchased",
    "تم الشراء": "purchased",
    "قيد الشراء والتجهيز": "purchased",
    warehouse_china: "international_warehouse",
    "المستودع الدولي": "international_warehouse",
    international_warehouse: "international_warehouse",
    international_ship: "international_transit",
    shipped: "international_transit",
    "شحن دولي": "international_transit",
    local_warehouse: "customs_local",
    customs_local: "customs_local",
    "الفرز والتوصيل": "customs_local",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    "تم التسليم": "delivered",
  };
  const code =
    aliases[s] ||
    (stageCodes.includes(s as StageCode) ? (s as StageCode) : "new");
  return stageCodes.indexOf(code);
};
const detectStore = (link: string) => {
  const value = (link || "").toLowerCase();
  return value.includes("shein")
    ? "SHEIN"
    : value.includes("amazon")
      ? "Amazon"
      : value.includes("aliexpress")
        ? "AliExpress"
        : value.includes("trendyol")
          ? "Trendyol"
          : value.includes("iherb")
            ? "iHerb"
            : value.includes("temu")
              ? "TEMU"
              : "متجر دولي";
};
const trackingUrl = (code: string) =>
  `${window.location.origin}/track/${encodeURIComponent(code)}`;
const messageFor = (s: Shipment, stage: (typeof STAGES)[number]) =>
  `مرحباً ${s.customerName}، تحديث شحنتك ${s.trackingCode}\nالمتجر: ${s.storeName}\nالمرحلة: ${stage.title}\n${stage.detail}${
    stage.code === "out_for_delivery" && s.courierName
      ? `\nالمندوب: ${s.courierName}${s.courierPhone ? ` — ${s.courierPhone}` : ""}`
      : ""
  }\nرابط التتبع: ${trackingUrl(s.trackingCode)}`;
const normalizePhone = (input: string) => {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `967${digits.slice(1)}`;
  else if (digits.length === 9) digits = `967${digits}`;
  return digits;
};
function LiveTrackingAdminRoute() {
  const [access, setAccess] = useState<
    "loading" | "admin" | "staff" | "denied"
  >("loading");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [history, setHistory] = useState<EventRow[]>([]);
  const [smsHistory, setSmsHistory] = useState<StageSmsRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [smsHistoryError, setSmsHistoryError] = useState<string | null>(null);
  const [smsAuditUnavailable, setSmsAuditUnavailable] = useState(false);
  const historyRequestId = useRef(0);
  const [courierName, setCourierName] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: "",
    customerPhone: "",
    productName: "",
    productLink: "",
    courierName: "",
    courierPhone: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [storeFilter, setStoreFilter] = useState<"all" | "Amazon" | "SHEIN">(
    "all",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          if (alive) setAccess("denied");
          return;
        }
        const [
          { data: isAdmin, error: adminError },
          { data: isStaff, error: staffError },
        ] = await Promise.all([
          supabase.rpc("has_role", {
            _user_id: user.id,
            _role: "admin",
          } as any),
          supabase.rpc("has_role", {
            _user_id: user.id,
            _role: "staff",
          } as any),
        ]);
        if (!alive) return;
        if (adminError || staffError) {
          setAccess("denied");
          setNotice("تعذر التحقق من دور الحساب. راجع صلاحيات RPC has_role.");
          return;
        }
        setAccess(
          isAdmin === true ? "admin" : isStaff === true ? "staff" : "denied",
        );
      } catch {
        if (alive) {
          setAccess("denied");
          setNotice("تعذر التحقق من صلاحيات الحساب.");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("orders")
      .select(
        "id,tracking_code,customer_name,phone,product_name,product_link,status,user_id,created_at,notes,courier_name,courier_phone",
      )
      .order("created_at", { ascending: false });
    if (error) setNotice(`تعذّر تحميل الطلبات: ${error.message}`);
    else {
      setShipments(
        (data || []).map((r: any) => ({
          id: r.id,
          trackingCode: r.tracking_code,
          customerName: r.customer_name || "عميل",
          customerPhone: r.phone || "",
          productName: r.product_name || "شحنة",
          productLink: r.product_link || "",
          storeName: detectStore(r.product_link || ""),
          city: r.notes || "غير محدد",
          status: r.status || "new",
          userId: r.user_id || null,
          courierName: r.courier_name || "",
          courierPhone: r.courier_phone || "",
          createdAt: r.created_at,
        })),
      );
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    if (access !== "admin" && access !== "staff") return;
    void refresh();
    const channel = supabase
      .channel("admin-tracking-orders-v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [access, refresh]);

  const loadHistory = useCallback(async (shipment: Shipment) => {
    const requestId = ++historyRequestId.current;
    setHistory([]);
    setSmsHistory([]);
    setHistoryError(null);
    setSmsHistoryError(null);
    setHistoryLoading(true);

    const asErrorMessage = (error: unknown) =>
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "خطأ غير معروف";

    try {
      const [historyResult, smsResult] = await Promise.all([
        db
          .rpc("admin_shipment_notification_history", {
            _order_id: shipment.id,
          })
          .then((result: { data: EventRow[] | null; error: unknown }) => result)
          .catch((error: unknown) => ({ data: null, error })),
        db
          .from("shipment_stage_sms")
          .select(
            "id,stage_code,sms_status,sms_attempt_count,sms_error,sms_accepted_at,updated_at",
          )
          .eq("order_id", shipment.id)
          .order("updated_at", { ascending: false })
          .then(
            (result: { data: StageSmsRow[] | null; error: unknown }) => result,
          )
          .catch((error: unknown) => ({ data: null, error })),
      ]);

      if (requestId !== historyRequestId.current) return;

      if (historyResult.error) {
        setHistoryError(asErrorMessage(historyResult.error));
      } else {
        setHistoryError(null);
        setHistory(historyResult.data || []);
      }

      if (smsResult.error) {
        const message = asErrorMessage(smsResult.error);
  const errorCode =
  typeof smsResult.error === "object" &&
  smsResult.error !== null &&
  "code" in smsResult.error
  ? String((smsResult.error as { code: unknown }).code)
  : "";
  const auditMissing =
  errorCode === "PGRST205" ||
  (message.includes("shipment_stage_sms") &&
  message.includes("schema cache")) ||
  message.includes(
  "Could not find the table 'public.shipment_stage_sms'",
  );
  setSmsHistory([]);
  setSmsAuditUnavailable(auditMissing);
        setSmsHistoryError(auditMissing ? null : message);
      } else {
        setSmsAuditUnavailable(false);
        setSmsHistoryError(null);
        setSmsHistory(smsResult.data || []);
      }
    } catch (error) {
      if (requestId !== historyRequestId.current) return;
      const message = asErrorMessage(error);
      setHistoryError(message);
      setSmsHistoryError(message);
      setSmsAuditUnavailable(false);
    } finally {
      if (requestId === historyRequestId.current) setHistoryLoading(false);
    }
  }, []);
  useEffect(() => {
    if (selected) {
      setCourierName(selected.courierName);
      setCourierPhone(selected.courierPhone);
      void loadHistory(selected);
    } else {
      historyRequestId.current += 1;
      setHistory([]);
      setSmsHistory([]);
      setHistoryError(null);
      setSmsHistoryError(null);
      setSmsAuditUnavailable(false);
      setHistoryLoading(false);
    }
  }, [selected, loadHistory]);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(t);
  }, [notice]);

  const isDelayed = (s: Shipment) => {
    if (s.status === "delivered") return false;
    const days =
      (Date.now() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return days > 30;
  };
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 86400000 : null;
    return shipments.filter((s) => {
      const matchText =
        !q ||
        `${s.trackingCode} ${s.customerName} ${s.customerPhone} ${s.storeName}`
          .toLowerCase()
          .includes(q);
      const matchStore = storeFilter === "all" || s.storeName === storeFilter;
      const created = new Date(s.createdAt).getTime();
      const matchFrom = from === null || created >= from;
      const matchTo = to === null || created < to;
      return matchText && matchStore && matchFrom && matchTo;
    });
  }, [shipments, search, storeFilter, dateFrom, dateTo]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );
  useEffect(() => {
    setPage(1);
  }, [search, storeFilter, dateFrom, dateTo]);
  const stageCounts = useMemo(
    () =>
      STAGES.map(
        (_stage, i) =>
          shipments.filter((s) => stageIndex(s.status) === i).length,
      ),
    [shipments],
  );
  const resetFilters = () => {
    setSearch("");
    setStoreFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };
  const startEdit = (shipment: Shipment) => {
    setEditing(shipment);
    setEditForm({
      customerName:
        shipment.customerName === "عميل" ? "" : shipment.customerName,
      customerPhone: shipment.customerPhone,
      productName: shipment.productName === "شحنة" ? "" : shipment.productName,
      productLink: shipment.productLink,
      courierName: shipment.courierName,
      courierPhone: shipment.courierPhone,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const customerName = editForm.customerName.trim();
    const customerPhone = editForm.customerPhone.trim();
    const productLink = editForm.productLink.trim();
    if (!customerName || !customerPhone || !productLink) {
      setNotice("الاسم والهاتف ورابط المنتج حقول مطلوبة.");
      return;
    }
    setSavingEdit(true);
    setNotice("");
    try {
      const { data, error } = await db
        .from("orders")
        .update({
          customer_name: customerName,
          phone: customerPhone,
          product_name: editForm.productName.trim() || null,
          product_link: productLink,
          courier_name: editForm.courierName.trim() || null,
          courier_phone: editForm.courierPhone.trim() || null,
        })
        .eq("id", editing.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error(
          "لم يتم تحديث السجل. تأكد من دور admin وسياسات RLS في قاعدة البيانات.",
        );
      }
      const updated = {
        ...editing,
        customerName,
        customerPhone,
        productName: editForm.productName.trim() || "شحنة",
        productLink,
        storeName: detectStore(productLink),
        courierName: editForm.courierName.trim(),
        courierPhone: editForm.courierPhone.trim(),
      };
      setShipments((prev) =>
        prev.map((s) => (s.id === editing.id ? updated : s)),
      );
      setSelected((prev) => (prev?.id === editing.id ? updated : prev));
      setEditing(null);
      setNotice("تم حفظ تعديلات الشحنة.");
    } catch (e) {
      setNotice(
        `تعذّر حفظ التعديل: ${e instanceof Error ? e.message : "خطأ غير معروف"}`,
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteShipment = async (shipment: Shipment) => {
    if (access !== "admin") {
      setNotice("الحذف متاح للمدير فقط.");
      return;
    }
    const confirmed = window.confirm(
      `حذف نهائي للشحنة ${shipment.trackingCode} للعميل ${shipment.customerName}؟\nلا يمكن التراجع عن هذا الإجراء. إذا ارتبط الطلب بمدفوعات أو فواتير فقد تمنع قاعدة البيانات الحذف.`,
    );
    if (!confirmed) return;
    setDeletingId(shipment.id);
    setNotice("");
    try {
      const { data, error } = await db
        .from("orders")
        .delete()
        .eq("id", shipment.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error(
          "لم يُحذف السجل. تأكد من دور admin وسياسة RLS، أو من ارتباط السجل ببيانات أخرى.",
        );
      }
      setShipments((prev) => prev.filter((s) => s.id !== shipment.id));
      setSelected((prev) => (prev?.id === shipment.id ? null : prev));
      setNotice(`تم حذف الشحنة ${shipment.trackingCode} نهائيًا.`);
    } catch (e) {
      setNotice(
        `تعذّر حذف الشحنة: ${e instanceof Error ? e.message : "خطأ غير معروف"}`,
      );
    } finally {
      setDeletingId(null);
    }
  };
  const doAction = async (
    shipment: Shipment,
    stage: (typeof STAGES)[number],
    action: "advance" | "notify",
    channel: Channel,
  ) => {
    if (channel === "whatsapp" && !normalizePhone(shipment.customerPhone)) {
      setNotice("لا يوجد رقم هاتف صالح لهذا العميل.");
      return;
    }
    const activeCourierName =
      selected?.id === shipment.id
        ? courierName.trim() || shipment.courierName.trim()
        : shipment.courierName.trim();
    const activeCourierPhone =
      selected?.id === shipment.id
        ? courierPhone.trim() || shipment.courierPhone.trim()
        : shipment.courierPhone.trim();
    if (
      stage.code === "out_for_delivery" &&
      action === "advance" &&
      (!activeCourierName || !normalizePhone(activeCourierPhone))
    ) {
      setSelected(shipment);
      setNotice(
        "أدخل اسم المندوب ورقمه في تفاصيل الشحنة قبل تفعيل مرحلة التوصيل.",
      );
      return;
    }
    const popup =
      channel === "whatsapp" ? window.open("about:blank", "_blank") : null;
    setBusy(true);
    setNotice("");
    try {
      const text = messageFor(
        {
          ...shipment,
          courierName: activeCourierName,
          courierPhone: activeCourierPhone,
        },
        stage,
      );
      const { data, error } = await db.rpc("admin_set_shipment_stage", {
        _order_id: shipment.id,
        _stage_code: stage.code,
        _action: action,
        _channel: channel,
        _message: text,
        _courier_name:
          stage.code === "out_for_delivery" ? activeCourierName : null,
        _courier_phone:
          stage.code === "out_for_delivery"
            ? normalizePhone(activeCourierPhone)
            : null,
      });
      if (error) throw error;
      if (action === "advance") {
        const applyStage = (current: Shipment): Shipment => ({
          ...current,
          status: stage.code,
          courierName:
            stage.code === "out_for_delivery"
              ? activeCourierName
              : current.courierName,
          courierPhone:
            stage.code === "out_for_delivery"
              ? normalizePhone(activeCourierPhone)
              : current.courierPhone,
        });
        setShipments((prev) =>
          prev.map((current) =>
            current.id === shipment.id ? applyStage(current) : current,
          ),
        );
        // The open modal renders from `selected`, not from the shipments list.
        // Keep it in sync after the database RPC succeeds.
        setSelected((current) =>
          current?.id === shipment.id ? applyStage(current) : current,
        );
      }
      await loadHistory(shipment);
      let smsNotice = "";
      if (action === "advance") {
        try {
          const { data: smsResult, error: smsError } =
            await supabase.functions.invoke("send-shipment-stage-sms", {
              body: { orderId: shipment.id, stageCode: stage.code },
            });
          if (smsError) {
            smsNotice =
              "لم يتم تأكيد إرسال SMS. راجع سجل SMS قبل أي إعادة محاولة.";
          } else if (smsResult?.status === "accepted") {
            smsNotice =
              "قبل TextBee طلب SMS، لكن هذا لا يؤكد وصول الرسالة إلى هاتف العميل.";
          } else if (
            smsResult?.status === "unknown" ||
            smsResult?.status === "sending"
          ) {
            smsNotice =
              smsResult?.message ||
              "نتيجة SMS غير محسومة؛ تحقق من سجل المزود ولا تعِد الإرسال الآن.";
          } else if (smsResult?.status === "failed") {
            smsNotice = `لم تُرسل SMS: ${smsResult?.message || "رفض مزود الرسائل الطلب."}`;
          } else {
            smsNotice = `تعذر تأكيد إرسال SMS: ${smsResult?.message || "راجع سجل SMS."}`;
          }
        } catch {
          // The stage was already saved. Keep SMS transport errors separate from stage success.
          smsNotice =
            "لم يتم تأكيد إرسال SMS بسبب تعذر الاتصال؛ راجع سجل SMS قبل أي إعادة محاولة.";
        }
        await loadHistory(shipment);
      }
      if (channel === "whatsapp") {
        if (popup) {
          popup.location.href = `https://wa.me/${normalizePhone(
            shipment.customerPhone,
          )}?text=${encodeURIComponent(text)}`;
        } else {
          setNotice(
            "حُفظت الرسالة كجاهزة في السجل، لكن المتصفح منع نافذة واتساب. اسمح بالنوافذ المنبثقة وافتح سجل الرسائل.",
          );
        }
        if (popup) {
          setNotice(
            "فُتح واتساب برسالة جاهزة. لم تُرسل تلقائياً؛ أكّد الإرسال داخل واتساب.",
          );
        }
      } else if (action === "advance") {
        const inAppNotice =
          data?.notification_state === "created"
            ? "وحُفظ إشعار العميل داخل التطبيق."
            : "لكن العميل لا يملك حساباً مرتبطاً لتلقي إشعار داخل التطبيق.";
        setNotice(`تم تفعيل المرحلة بنجاح ${inAppNotice} ${smsNotice}`);
      } else {
        setNotice(
          data?.notification_state === "created"
            ? "تم حفظ التذكير داخل التطبيق دون تغيير حالة الشحنة."
            : "تم حفظ السجل، لكن العميل لا يملك حساباً مرتبطاً لتلقي إشعار داخل التطبيق.",
        );
      }
      if (action === "advance") await refresh();
    } catch (e) {
      popup?.close();
      setNotice(
        `لم تكتمل العملية: ${e instanceof Error ? e.message : "خطأ غير معروف"}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleStageSelection = (shipment: Shipment, stageCode: string) => {
    const stage = STAGES.find((item) => item.code === stageCode);
    if (!stage) return;
    const requestedIndex = stageIndex(stage.code);
    if (requestedIndex <= stageIndex(shipment.status)) return;

    const hasCourierName =
      selected?.id === shipment.id
        ? courierName.trim() || shipment.courierName.trim()
        : shipment.courierName.trim();
    const hasCourierPhone =
      selected?.id === shipment.id
        ? courierPhone.trim() || shipment.courierPhone.trim()
        : shipment.courierPhone.trim();
    if (
      stage.code === "out_for_delivery" &&
      (!hasCourierName || !normalizePhone(hasCourierPhone))
    ) {
      setSelected(shipment);
      setNotice(
        "أدخل اسم المندوب ورقمه في تفاصيل الشحنة، ثم فعّل مرحلة التوصيل.",
      );
      return;
    }
    void doAction(shipment, stage, "advance", "app");
  };

  const retryStageSms = async (row: StageSmsRow) => {
    if (!selected || row.sms_status !== "failed") return;
    setBusy(true);
    setNotice("");
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-shipment-stage-sms",
        {
          body: {
            orderId: selected.id,
            stageCode: row.stage_code,
            retry: true,
          },
        },
      );
      if (error) throw error;
      setNotice(
        data?.status === "accepted"
          ? "قبل TextBee طلب SMS للمرحلة؛ تحقق من سجل المزود للتسليم."
          : data?.message || "لم يؤكد TextBee قبول إعادة المحاولة.",
      );
      await loadHistory(selected);
    } catch (e) {
      setNotice(
        `تعذرت إعادة محاولة SMS: ${e instanceof Error ? e.message : "خطأ غير معروف"}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const fontStack = {
    fontFamily: "Tajawal, system-ui, 'Segoe UI', sans-serif",
  };

  if (access === "loading") {
    return (
      <div
        dir="rtl"
        style={fontStack}
        className="grid min-h-screen place-items-center bg-[#f7f8fb] text-slate-600"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#2196F3]" />
          <span className="text-sm font-bold">جارٍ التحقق من الصلاحيات...</span>
        </div>
      </div>
    );
  }
  if (access === "denied") {
    return (
      <div
        dir="rtl"
        style={fontStack}
        className="grid min-h-screen place-items-center bg-[#f7f8fb] p-6"
      >
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-amber-50">
            <ShieldCheck className="size-8 text-amber-500" />
          </div>
          <h1 className="text-lg font-black text-slate-800">
            هذه الصفحة للمدير والموظفين
          </h1>
          <p className="my-4 text-sm leading-6 text-slate-500">
            سجّل الدخول بحساب مخوّل لمتابعة الطلبات.
          </p>
          <Link
            to="/login"
            className="inline-block rounded-2xl bg-[#0F4C81] px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/25 transition hover:opacity-95"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  const todayCount = shipments.filter(
    (s) => new Date(s.createdAt).toDateString() === new Date().toDateString(),
  ).length;
  const deliveredCount = shipments.filter(
    (s) => s.status === "delivered",
  ).length;
  const delayedCount = shipments.filter((s) => isDelayed(s)).length;
  const stats = [
    {
      label: "طلبات اليوم",
      value: todayCount,
      icon: CalendarDays,
      color: "#2196F3",
      soft: "bg-blue-50",
    },
    {
      label: "إجمالي الطلبات",
      value: shipments.length,
      icon: Clock3,
      color: "#6D28D9",
      soft: "bg-violet-50",
    },
    {
      label: "مكتملة / تم التسليم",
      value: deliveredCount,
      icon: CheckCircle2,
      color: "#16A34A",
      soft: "bg-emerald-50",
    },
    {
      label: "متأخرة أكثر من شهر",
      value: delayedCount,
      icon: AlertTriangle,
      color: "#DC2626",
      soft: "bg-red-50",
    },
  ];

  return (
    <div
      dir="rtl"
      style={fontStack}
      className="min-h-screen bg-[#f7f8fb] pb-16 text-slate-800"
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-slate-800">
                لوحة تحكم طلبات
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                وسيط الطلبات – متابعة وإدارة طلبات Amazon و SHEIN
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setStoreFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  storeFilter === "all"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setStoreFilter("Amazon")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  storeFilter === "Amazon"
                    ? "bg-[#131921] text-white shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Amazon
              </button>
              <button
                onClick={() => setStoreFilter("SHEIN")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  storeFilter === "SHEIN"
                    ? "bg-[#F97316] text-white shadow-sm"
                    : "text-slate-500"
                }`}
              >
                SHEIN
              </button>
            </div>
            <button
              onClick={() => void refresh()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
              />{" "}
              تحدي��
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-xl ${stat.soft}`}
                    style={{ color: stat.color }}
                  >
                    <Icon className="size-5" />
                  </span>
                </div>
                <p
                  className="mt-3 text-3xl font-black leading-none"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
                <p className="mt-1.5 text-xs font-bold text-slate-500">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
            <Layers className="size-4 text-[#0F4C81]" />
            توزيع الطلبات على المسارات
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {STAGES.map((stage, i) => (
              <div
                key={stage.code}
                className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center"
              >
                <p className="text-xl font-black text-[#0F4C81]">
                  {stageCounts[i]}
                </p>
                <p className="mt-1 text-[10px] font-bold leading-tight text-slate-500">
                  {stage.title}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto_auto]">
            <label className="text-xs font-bold text-slate-500">
              من
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-[#2196F3]"
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              إلى
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-[#2196F3]"
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              بحث
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="رقم الشحنة أو العميل أو الهاتف"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-10 pl-3 text-sm outline-none focus:border-[#2196F3]"
                />
              </div>
            </label>
            <button
              onClick={resetFilters}
              className="flex items-center justify-center gap-2 self-end rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw className="size-4" />
              إعادة تعيين
            </button>
            <button
              onClick={() => setPage(1)}
              className="flex items-center justify-center gap-2 self-end rounded-xl bg-[#0F4C81] px-5 py-2.5 text-sm font-black text-white shadow-md shadow-blue-500/20 transition hover:opacity-95"
            >
              <Search className="size-4" />
              بحث
            </button>
          </div>
        </div>
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-start gap-2 rounded-2xl border p-3.5 text-sm font-bold shadow-sm ${
              notice.startsWith("تم تفعيل المرحلة بنجاح")
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : notice.startsWith("لم تكتمل العملية") ||
                    notice.startsWith("تعذّر") ||
                    notice.startsWith("تعذر")
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-sky-200 bg-sky-50 text-sky-900"
            }`}
          >
            {notice.startsWith("تم تفعيل المرحلة بنجاح") ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <Bell className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{notice}</span>
          </div>
        )}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {loading && !shipments.length ? (
            <div className="grid place-items-center gap-3 p-12 text-center text-slate-500">
              <Loader2 className="size-7 animate-spin text-[#2196F3]" />
              <span className="text-sm font-bold">جارٍ تحميل الطلبات...</span>
            </div>
          ) : paged.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-right text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-black text-slate-500">
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">رقم الطلب</th>
                    <th className="px-3 py-3">المتجر</th>
                    <th className="px-3 py-3">المنتج</th>
                    <th className="px-3 py-3">المرحلة الحالية</th>
                    <th className="px-3 py-3">التاريخ</th>
                    <th className="px-3 py-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.map((s, rowIdx) => {
                    const idx = stageIndex(s.status);
                    const current = STAGES[idx];
                    const delayed = isDelayed(s);
                    const storeClass =
                      s.storeName === "SHEIN"
                        ? "bg-orange-50 text-[#F97316]"
                        : s.storeName === "Amazon"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600";
                    return (
                      <tr
                        key={s.id}
                        className={delayed ? "bg-red-50/60" : "bg-white"}
                      >
                        <td className="px-3 py-3 text-xs font-bold text-slate-400">
                          {(safePage - 1) * PAGE_SIZE + rowIdx + 1}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            dir="ltr"
                            className="block font-mono text-xs font-black text-[#0F4C81]"
                          >
                            {s.trackingCode}
                          </span>
                          <span className="mt-1 block font-bold text-slate-700">
                            {s.customerName}
                          </span>
                          <span
                            dir="ltr"
                            className="block text-[11px] text-slate-400"
                          >
                            {s.customerPhone}
                          </span>
                          {delayed && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-[#DC2626]">
                              <AlertTriangle className="size-3" />
                              متأخر
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold ${storeClass}`}
                          >
                            {s.storeName}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="block max-w-[160px] truncate text-xs text-slate-600">
                            {s.productName}
                          </span>
                          {s.productLink && (
                            <button
                              onClick={() =>
                                window.open(
                                  s.productLink,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                              className="mt-1 text-[11px] font-bold text-[#2196F3] hover:underline"
                            >
                              رابط الشراء
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <label className="block min-w-[245px]">
                            <span className="sr-only">
                              المرحلة الحالية للطلب {s.trackingCode}
                            </span>
                            <select
                              dir="rtl"
                              value={current?.code || STAGES[0].code}
                              disabled={busy}
                              onChange={(event) =>
                                handleStageSelection(s, event.target.value)
                              }
                              aria-label={`تغيير مرحلة الطلب ${s.trackingCode}`}
                              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 shadow-sm outline-none transition hover:border-blue-300 focus:border-[#2196F3] focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
                            >
                              {STAGES.map((stage, stageIdx) => (
                                <option
                                  key={stage.code}
                                  value={stage.code}
                                  disabled={stageIdx <= idx}
                                >
                                  {stageIdx + 1}. {stage.title}
                                  {stageIdx === idx ? " — الحالية" : ""}
                                </option>
                              ))}
                            </select>
                            <span className="mt-1 block text-[10px] text-slate-500">
                              اختر مرحلة قادمة للتحديث الفوري وإشعار العميل
                            </span>
                          </label>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          {new Date(s.createdAt).toLocaleDateString("ar-YE")}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setNotice("");
                                setSelected(s);
                              }}
                              aria-label={`عرض مسار الشحنة ${s.trackingCode}`}
                              title={`عرض مسار الشحنة ${s.trackingCode}`}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#0F4C81] px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0b3d69] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3] focus-visible:ring-offset-2"
                            >
                              <Bell aria-hidden="true" className="size-3.5" />
                              المسار
                            </button>
                            {access === "admin" && (
                              <>
                                <button
                                  onClick={() => startEdit(s)}
                                  className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-[#0F4C81] transition hover:bg-blue-100"
                                >
                                  <Pencil className="size-3.5" />
                                  تعديل
                                </button>
                                <button
                                  disabled={deletingId === s.id}
                                  onClick={() => void deleteShipment(s)}
                                  className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-[#DC2626] transition hover:bg-red-100 disabled:opacity-50"
                                >
                                  <Trash2 className="size-3.5" />
                                  {deletingId === s.id ? "..." : "حذف"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid place-items-center gap-3 p-12 text-center text-slate-500">
              <div className="grid size-14 place-items-center rounded-2xl bg-slate-50">
                <Package className="size-7 text-slate-300" />
              </div>
              <span className="text-sm font-bold">لا توجد طلبات مطابقة.</span>
            </div>
          )}
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              عرض {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} من{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`grid size-9 place-items-center rounded-lg text-xs font-bold transition ${
                    p === safePage
                      ? "bg-[#0F4C81] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-sm sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shipment-modal-title"
        >
          <section className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6">
              <div>
                <h2
                  id="shipment-modal-title"
                  className="font-black text-slate-800"
                >
                  مسار الشحنة {selected.trackingCode}
                </h2>
                <p className="text-xs text-slate-500">
                  {selected.customerName} · {selected.storeName}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="grid size-9 place-items-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-xs leading-6 text-sky-950">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-sky-500" />
              <span>
                تحديث المرحلة ينشئ إشعاراً داخل التطبيق. زر واتساب يفتح رسالة
                جاهزة ويسجلها «جاهزة»، ولا يثبت الإرسال حتى تؤكده من واتساب.
              </span>
            </div>
            {STAGES.some((s) => s.code === "out_for_delivery") && (
              <div className="mb-4 grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">
                  اسم المندوب (مطلوب عند التوصيل)
                  <input
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 outline-none focus:border-[#2196F3]"
                    placeholder="اسم المندوب"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  هاتف المندوب
                  <input
                    value={courierPhone}
                    onChange={(e) => setCourierPhone(e.target.value)}
                    dir="ltr"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-right outline-none focus:border-[#2196F3]"
                    placeholder="7xxxxxxxx"
                  />
                </label>
              </div>
            )}
            <ol className="space-y-3">
              {STAGES.map((stage, i) => {
                const Icon = stage.icon;
                const active = i === stageIndex(selected.status);
                const done = i < stageIndex(selected.status);
                return (
                  <li
                    key={stage.code}
                    className={`rounded-2xl border p-3 transition ${
                      active
                        ? "border-blue-300 bg-blue-50"
                        : done
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                          done
                            ? "bg-emerald-600 text-white"
                            : active
                              ? "bg-gradient-to-l from-[#0F4C81] to-[#1565C0] text-white"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {done ? (
                          <Check className="size-4" />
                        ) : (
                          <Icon className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <b className="text-sm text-slate-800">
                            {i + 1}. {stage.title}
                          </b>
                          {active && (
                            <span className="rounded-full bg-[#0F4C81] px-2 py-0.5 text-[10px] font-bold text-white">
                              الحالية
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {stage.location} · {stage.detail}
                        </p>
                        {stage.code === "out_for_delivery" &&
                          selected.courierName && (
                            <p className="mt-1 text-xs font-bold text-emerald-800">
                              المندوب: {selected.courierName}{" "}
                              {selected.courierPhone && (
                                <span dir="ltr">· {selected.courierPhone}</span>
                              )}
                            </p>
                          )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(() => {
                            const canAdvance = i > stageIndex(selected.status);
                            return (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void doAction(
                                    selected,
                                    stage,
                                    canAdvance ? "advance" : "notify",
                                    "app",
                                  )
                                }
                                className={`rounded-lg px-3 py-2 text-[11px] font-black transition disabled:opacity-50 ${
                                  canAdvance
                                    ? "bg-[#F97316] text-white shadow-sm hover:brightness-95"
                                    : "border border-blue-200 bg-white text-[#0F4C81] hover:bg-blue-50"
                                }`}
                              >
                                {busy
                                  ? "جارٍ الحفظ..."
                                  : canAdvance
                                    ? "تفعيل المرحلة وإشعار التطبيق"
                                    : "إشعار بهذه المرحلة داخل التطبيق"}
                              </button>
                            );
                          })()}
                          <button
                            disabled={
                              busy || !normalizePhone(selected.customerPhone)
                            }
                            onClick={() =>
                              void doAction(
                                selected,
                                stage,
                                "notify",
                                "whatsapp",
                              )
                            }
                            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                          >
                            <MessageCircle className="size-3.5" />
                            فتح رسالة واتساب
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <section className="mt-5 rounded-2xl border border-slate-100 p-4">
              <h3 className="flex items-center gap-2 font-black text-slate-800">
                <History className="size-4 text-slate-500" />
                سجل الإشعارات
              </h3>
              {historyLoading ? (
                <p
                  className="mt-3 flex items-center gap-2 text-xs text-slate-500"
                  role="status"
                >
                  <Loader2 className="size-4 animate-spin" /> جارٍ تحميل سجل
                  الإشعارات...
                </p>
              ) : historyError ? (
                <div
                  className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                  role="alert"
                >
                  <p className="font-bold">
                    تعذّر تحميل سجل الإشعارات من قاعدة البيانات.
                  </p>
                  <p className="mt-1 break-words">
                    تفاصيل الخطأ: {historyError}
                  </p>
                  <p className="mt-1">
                    تحقق من اتصال قاعدة البيانات وصلاحيات الحساب وإعداد الترحيل
                    الخاص بسجل الشحنات.
                  </p>
                </div>
              ) : history.length ? (
                <ul className="mt-3 space-y-2">
                  {history.map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                    >
                      <div className="flex flex-wrap justify-between gap-2 font-bold text-slate-700">
                        <span>
                          {ev.event_type === "stage" ? "تغيير مرحلة" : "تذكير"}{" "}
                          · {ev.channel === "app" ? "التطبيق" : "واتساب"} ·{" "}
                          {ev.delivery_state === "created"
                            ? "أُنشئ إشعار التطبيق"
                            : ev.delivery_state === "prepared"
                              ? "رسالة مجهزة، بانتظار تأكيد واتساب"
                              : ev.delivery_state === "no_account"
                                ? "لا يوجد حساب تطبيق للعميل"
                                : ev.delivery_state}
                        </span>
                        <time className="text-slate-400">
                          {new Date(ev.created_at).toLocaleString("ar-YE")}
                        </time>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-slate-600">
                        {ev.message}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  لا توجد أحداث إشعارات مسجلة لهذه الشحنة.
                </p>
              )}
            </section>
            <section className="mt-4 rounded-2xl border border-emerald-100 p-4">
              <h3 className="flex items-center gap-2 font-black text-slate-800">
                <MessageCircle className="size-4 text-emerald-600" />
                رسائل SMS لمراحل الشحنة
              </h3>
              {historyLoading ? (
                <p
                  className="mt-3 flex items-center gap-2 text-xs text-slate-500"
                  role="status"
                >
                  <Loader2 className="size-4 animate-spin" /> جارٍ تحميل سجل
                  SMS...
                </p>
              ) : smsHistoryError ? (
                <div
                  className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                  role="alert"
                >
                  <p className="font-bold">تعذّر تحميل سجل SMS.</p>
                  <p className="mt-1 break-words">تفاصيل الخطأ: {smsHistoryError}</p>
                </div>
              ) : smsAuditUnavailable ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <p className="font-bold">سجل SMS غير مفعّل في قاعدة البيانات بعد.</p>
                  <p className="mt-1">
                    سيحاول النظام إرسال الإشعار إلى TextBee، لكن لن يظهر سجل المحاولة ولن تتوفر حماية منع التكرار حتى تطبيق ترحيل SMS.
                  </p>
                </div>
              ) : smsAuditUnavailable ? (
                <div
                  className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
                  role="status"
                >
                  <p className="font-bold">
                    سجل SMS غير متاح في قاعدة البيانات.
                  </p>
                  <p className="mt-1">
                    لم تُرسل رسالة SMS لأن حماية منع التكرار وسجل المحاولات غير
                    جاهزين. يلزم تطبيق ومراجعة ترحيل قاعدة البيانات أولاً.
                  </p>
                </div>
              ) : smsHistory.length ? (
                <ul className="mt-3 space-y-2">
                  {smsHistory.map((row) => {
                    const stageTitle =
                      STAGES.find((item) => item.code === row.stage_code)
                        ?.title || row.stage_code;
                    const stateLabel =
                      row.sms_status === "accepted"
                        ? "قبل TextBee"
                        : row.sms_status === "failed"
                          ? "فشل مؤكد"
                          : row.sms_status === "unknown"
                            ? "النتيجة غير مؤكدة"
                            : "جارٍ الإرسال";
                    return (
                      <li
                        key={row.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <b className="text-slate-700">
                            {stageTitle} · {stateLabel} · محاولات:{" "}
                            {row.sms_attempt_count}
                          </b>
                          <time className="text-slate-400">
                            {new Date(row.updated_at).toLocaleString("ar-YE")}
                          </time>
                        </div>
                        {row.sms_error && (
                          <p className="mt-1 text-[#DC2626]">{row.sms_error}</p>
                        )}
                        {row.sms_status === "accepted" && (
                          <p className="mt-1 text-emerald-700">
                            قبول المزود لا يؤكد التسليم النهائي.
                          </p>
                        )}
                        {row.sms_status === "unknown" && (
                          <p className="mt-1 text-amber-700">
                            لا تعاود الإرسال قبل التحقق من سجل TextBee.
                          </p>
                        )}
                        {row.sms_status === "failed" && (
                          <button
                            disabled={busy}
                            onClick={() => void retryStageSms(row)}
                            className="mt-2 rounded-lg border border-orange-200 bg-white px-3 py-2 font-bold text-[#F97316] transition hover:bg-orange-50 disabled:opacity-50"
                          >
                            {busy
                              ? "جا��ٍ التحقق..."
                              : "إعادة محاولة بعد تصحيح السبب"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  لا توجد سجلات SMS مسجلة لمراحل هذه الشحنة.
                </p>
              )}
            </section>
          </section>
        </div>
      )}
      {editing && access === "admin" && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-shipment-title"
        >
          <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2
                  id="edit-shipment-title"
                  className="flex items-center gap-2 font-black text-slate-800"
                >
                  <Pencil className="size-4 text-[#0F4C81]" />
                  تعديل بيانات الشحنة
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  رقم التتبع: {editing.trackingCode} (لا يتغير)
                </p>
              </div>
              <button
                onClick={() => setEditing(null)}
                disabled={savingEdit}
                className="grid size-9 place-items-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">
                اسم العميل *
                <input
                  value={editForm.customerName}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      customerName: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-[#2196F3]"
                  maxLength={200}
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                هاتف العميل *
                <input
                  value={editForm.customerPhone}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      customerPhone: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-[#2196F3]"
                  maxLength={30}
                  dir="ltr"
                />
              </label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                اسم المنتج
                <input
                  value={editForm.productName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, productName: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-[#2196F3]"
                  maxLength={300}
                />
              </label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                رابط المنتج *
                <input
                  value={editForm.productLink}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, productLink: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-[#2196F3]"
                  maxLength={2000}
                  dir="ltr"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                اسم المندوب
                <input
                  value={editForm.courierName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, courierName: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-[#2196F3]"
                  maxLength={200}
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                هاتف المندوب
                <input
                  value={editForm.courierPhone}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      courierPhone: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-[#2196F3]"
                  maxLength={30}
                  dir="ltr"
                />
              </label>
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <span>
                لا يمكن من هذه النافذة تعديل المالك أو رقم التتبع أو حالة الشحنة
                أو الملاحظات. الحذف منفصل ونهائي.
              </span>
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => void saveEdit()}
                disabled={savingEdit}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0F4C81] to-[#1565C0] px-4 py-3 text-sm font-black text-white shadow-md shadow-blue-500/20 transition hover:opacity-95 disabled:opacity-50"
              >
                <Save className="size-4" />
                {savingEdit ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              </button>
              <button
                onClick={() => setEditing(null)}
                disabled={savingEdit}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
export default LiveTrackingAdminRoute;
