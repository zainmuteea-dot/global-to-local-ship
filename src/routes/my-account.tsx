import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Camera,
  ChevronLeft,
  FileText,
  Headphones,
  Info,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Share2,
  Shield,
  UserRound,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const WHATSAPP = "https://wa.me/967775527993";

export const Route = createFileRoute("/my-account")({
  head: () => ({
    meta: [
      { title: "حسابي — السوق الشامل" },
      { name: "description", content: "إدارة الحساب والطلبات في السوق الشامل" },
    ],
  }),
  component: MyAccountPage,
});

type Sheet = null | "support" | "share" | "info";

function MyAccountPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession(true);

  const [profile, setProfile] = useState<{
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [hasAddress, setHasAddress] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (uid: string, currentUser?: any) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone, avatar_url")
      .eq("id", uid)
      .maybeSingle();

    // جلب الاسم ورقم الهاتف من بيانات المستخدم المسجلة أو الذاكرة المؤقتة
    const metaName =
      currentUser?.user_metadata?.full_name ||
      (typeof window !== "undefined" ? sessionStorage.getItem("sc_name") : null);
    const metaPhone =
      currentUser?.user_metadata?.phone ||
      (typeof window !== "undefined" ? sessionStorage.getItem("sc_phone") : null);

    // إذا كان الاسم موجوداً في الحساب وغير موجود في جدول profiles نقوم بحفظه تلقائياً
    if (metaName && (!data || !data.full_name)) {
      await supabase.from("profiles").upsert({
        id: uid,
        full_name: metaName,
        phone: data?.phone || metaPhone || null,
      });
      setProfile({
        full_name: metaName,
        phone: data?.phone || metaPhone || null,
        avatar_url: data?.avatar_url || null,
      });
    } else {
      setProfile(data);
    }

    if (data?.avatar_url) {
      const { data: s } = await supabase.storage
        .from("avatars")
        .createSignedUrl(data.avatar_url, 3600);
      setAvatar(s?.signedUrl ?? null);
    }

    const { count } = await supabase
      .from("addresses")
      .select("id", { count: "exact", head: true });
    setHasAddress((count ?? 0) > 0);
  };

  useEffect(() => {
    if (user) {
      load(user.id, user);
    }
  }, [user]);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#8B5E3C]/30 border-t-[#8B5E3C] rounded-full animate-spin" />
          <p className="text-sm text-[#7D6E63] font-medium">جارٍ تحميل بيانات الحساب...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate({ to: "/login" });
    return null;
  }

  const upload = async (f: File) => {
    if (!user || !f.type.startsWith("image/")) return;
    const path = ${user.id}/avatar-${Date.now()};
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, f, { upsert: true, contentType: f.type });
    if (error) return;
    await supabase.from("profiles").upsert({ id: user.id, avatar_url: path });
    load(user.id, user);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }
    navigate({ to: "/", replace: true });
  };

  // استخراج الاسم الحقيقي ورقم الهاتف بدقة مع خيارات احتياطية ذكية
  const displayName =
    profile?.["full_name"] ||
    user?.user_metadata?.["full_name"] ||
    (typeof window !== "undefined" ? sessionStorage.getItem("sc_name") : null) ||
    user?.email?.split("@")[0] ||
    "عميلنا الكريم";

  const displayPhone =
    profile?.["phone"] ||
    user?.user_metadata?.["phone"] ||
    (typeof window !== "undefined" ? sessionStorage.getItem("sc_phone") : null);

  const items: { label: string; icon: LucideIcon; to?: string; sheet?: Sheet }[] = [
    { label: "حسابي", icon: UserRound, to: "/account/profile" },
    { label: "طلباتي", icon: Package, to: "/account/orders" },
    { label: "فواتير المبيعات", icon: FileText, to: "/account/sales-invoices" },
    { label: "القطع الفورية", icon: Zap, to: "/new-order" },
    { label: "العناوين", icon: MapPin, to: "/account/addresses" },
    { label: "رصيدي", icon: Wallet, to: "/account/wallet" },
    { label: "خدمة العملاء", icon: Headphones, sheet: "support" },
    { label: "الإشعارات", icon: Bell, to: "/notifications" },
    { label: "مشاركة المنصة", icon: Share2, sheet: "share" },
    { label: "شروط الاستخدام", icon: FileText, to: "/terms" },
    { label: "سياسة الخصوصية", icon: Shield, to: "/privacy" },
    { label: "معلومات المنصة", icon: Info, sheet: "info" },
  ];

  const row =
    "flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3.5 ring-1 ring-border transition hover:bg-secondary";

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-6 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex items-center gap-1 rounded-full bg-card px-4 py-2 text-xs font-bold text-cocoa ring-1 ring-border"
          >
            <ArrowRight className="size-4" /> رجوع
          </button>
          <h1 className="font-display text-lg font-black text-cocoadeep">إدارة الحساب</h1>
          <span className="w-16" />
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-clay"
            aria-label="إضافة صورة"
          >
            {avatar ? (
              <img src={avatar} alt="صورتي" className="size-full object-cover" />
            ) : (
              <UserRound className="size-7" />
            )}
            <span className="absolute bottom-0 left-0 grid size-5 place-items-center rounded-tr-lg bg-cocoa text-cream">
              <Camera className="size-3" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">أهلاً بك،</p>
            {/* عرض اسم العميل الحقيقي المسجل */}
            <p className="truncate font-display text-base font-black text-cocoa">
              {displayName}
            </p>
            {/* عرض رقم هاتف العميل المسجل */}
            {displayPhone && (
              <p dir="ltr" className="text-right text-[11px] text-muted-foreground font-medium">
                {displayPhone}
              </p>
            )}
            <Link
              to="/account/addresses"
              className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-clay"
            >
              <MapPin className="size-3" /> {hasAddress ? "عناويني" : "أضف عنوان"}
            </Link>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {items.map(({ label, icon: Icon, to, sheet: s }) => {
            const inner = (
              <>
                <span className="flex items-center gap-3">
                  <Icon className="size-5 text-clay" />
                  <span className="text-sm font-bold text-cocoadeep">{label}</span>
                </span>
                <ChevronLeft className="size-4 text-muted-foreground" />
              </>
            );
            return to ? (
              <Link key={label} to={to} className={row}>
                {inner}
              </Link>
            ) : (
              <button key={label} onClick={() => setSheet(s!)} className={row}>
                {inner}
              </button>
            );
          })}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-border text-destructive hover:bg-red-50/50 transition"
          >
            <LogOut className="size-5" />
            <span className="text-sm font-bold">تسجيل الخروج</span>
          </button>
        </div>
      </div>
      {sheet && <BottomSheet sheet={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}

function BottomSheet({
  sheet,
  onClose,
}: {
  sheet: Exclude<Sheet, null>;
  onClose: () => void;
}) {
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const [copied, setCopied] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="w-full max-w-md rounded-t-3xl bg-card p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">
            {sheet === "share"
              ? "مشاركة المنصة"
              : sheet === "support"
              ? "خدمة العملاء"
              : "معلومات المنصة"}
          </h3>
          <button onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        {sheet === "support" && (
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl bg-green-50 p-3"
          >
            <MessageCircle className="size-5 text-green-600" />
            <span className="text-sm font-bold">تواصل واتساب</span>
          </a>
        )}
        {sheet === "share" && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(url);
              setCopied(true);
            }}
            className="w-full rounded-xl bg-secondary p-3 text-sm font-bold"
          >
            {copied ? "تم النسخ!" : "نسخ رابط المنصة"}
          </button>
        )}
        {sheet === "info" && (
          <p className="text-sm text-muted-foreground">السوق الشامل - تسوق عالمياً واستلم محلياً.</p>
        )}
      </div>
    </div>
  );
}
