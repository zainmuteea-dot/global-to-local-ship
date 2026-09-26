import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Bell, Camera, ChevronLeft, Facebook, FileText, Headphones, Info, Instagram, LogOut,
  MapPin, MessageCircle, Package, Share2, Shield, UserRound, Wallet, X, Youtube, Zap, Link2, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const WHATSAPP = "https://wa.me/967700000000";

export const Route = createFileRoute("/my-account")({
  head: () => ({
    meta: [
      { title: "إدارة الحساب — السوق الشامل" },
      { name: "description", content: "إدارة حسابك وطلباتك وعناوينك ورصيدك في السوق الشامل." },
      { property: "og:title", content: "إدارة الحساب — السوق الشامل" },
      { property: "og:description", content: "إدارة حسابك وطلباتك وعناوينك ورصيدك في السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyAccountPage,
});

type Sheet = null | "support" | "share" | "info";

function MyAccountPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; avatar_url: string | null } | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [hasAddress, setHasAddress] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", uid).maybeSingle();
    setProfile(data);
    if (data?.avatar_url) {
      const { data: s } = await supabase.storage.from("avatars").createSignedUrl(data.avatar_url, 3600);
      setAvatar(s?.signedUrl ?? null);
    }
    const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true });
    setHasAddress((count ?? 0) > 0);
  };

  useEffect(() => { if (user) load(user.id); }, [user]);

  const upload = async (f: File) => {
    if (!user || !f.type.startsWith("image/")) return;
    const path = `${user.id}/avatar-${Date.now()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, f, { upsert: true, contentType: f.type });
    if (error) return;
    await supabase.from("profiles").upsert({ id: user.id, avatar_url: path });
    load(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const items: { label: string; icon: LucideIcon; to?: string; sheet?: Sheet }[] = [
    { label: "حسابي", icon: UserRound, to: "/account/profile" },
    { label: "طلباتي", icon: Package, to: "/account/orders" },
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

  const row = "flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3.5 ring-1 ring-border transition hover:bg-secondary";

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-6 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-1 rounded-full bg-card px-4 py-2 text-xs font-bold text-cocoa ring-1 ring-border">
            <ArrowRight className="size-4" /> رجوع
          </button>
          <h1 className="font-display text-lg font-black text-cocoadeep">إدارة الحساب</h1>
          <span className="w-16" />
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
          <button onClick={() => fileRef.current?.click()} className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-clay" aria-label="إضافة صورة">
            {avatar ? <img src={avatar} alt="صورتي" className="size-full object-cover" /> : <UserRound className="size-7" />}
            <span className="absolute bottom-0 left-0 grid size-5 place-items-center rounded-tr-lg bg-cocoa text-cream"><Camera className="size-3" /></span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">أهلاً بك،</p>
            <p className="truncate font-display text-base font-black text-cocoa">{profile?.full_name || "عميل السوق الشامل"}</p>
            {profile?.phone && <p dir="ltr" className="text-right text-[11px] text-muted-foreground">{profile.phone}</p>}
            <Link to="/account/addresses" className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-clay">
              <MapPin className="size-3" /> {hasAddress ? "عناويني" : "أضف عنوان"}
            </Link>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {items.map(({ label, icon: Icon, to, sheet: s }) => {
            const inner = (
              <>
                <span className="flex items-center gap-3"><Icon className="size-5 text-clay" /><span className="text-sm font-bold text-cocoadeep">{label}</span></span>
                <ChevronLeft className="size-4 text-muted-foreground" />
              </>
            );
            return to ? (
              <Link key={label} to={to} className={row}>{inner}</Link>
            ) : (
              <button key={label} onClick={() => setSheet(s!)} className={row}>{inner}</button>
            );
          })}
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-border">
            <LogOut className="size-5 text-destructive" /><span className="text-sm font-bold text-destructive">تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {sheet && <BottomSheet sheet={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}

function BottomSheet({ sheet, onClose }: { sheet: Exclude<Sheet, null>; onClose: () => void }) {
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const msg = encodeURIComponent(`تسوّق عالمياً واستلم محلياً مع السوق الشامل 🛍️ ${url}`);
  const [copied, setCopied] = useState(false);
  const socials = [
    { label: "إنستغرام", sub: "تابع أحدث العروض والمنتجات", icon: Instagram, href: "https://instagram.com" },
    { label: "فيسبوك", sub: "تابع أحدث الأخبار والعروض", icon: Facebook, href: "https://facebook.com" },
    { label: "يوتيوب", sub: "شروحات ومحتوى المنصة", icon: Youtube, href: "https://youtube.com" },
  ];
  const shares = [
    { label: "واتساب", icon: MessageCircle, href: `https://wa.me/?text=${msg}` },
    { label: "فيسبوك", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: "تيليجرام", icon: Share2, href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${msg}` },
    { label: "إكس", icon: X, href: `https://twitter.com/intent/tweet?text=${msg}` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoadeep/40 backdrop-blur-sm" onClick={onClose}>
      <div dir="rtl" className="w-full max-w-md rounded-t-3xl bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
        {sheet === "support" && (
          <>
            <h2 className="font-display text-lg font-black text-cocoadeep">خدمة العملاء</h2>
            <p className="text-xs text-muted-foreground">نحن هنا لمساعدتك على مدار الساعة</p>
            <div className="mt-4 flex flex-col items-center gap-2 rounded-3xl bg-cocoa p-6 text-center text-cream">
              <MessageCircle className="size-8" />
              <p className="font-display font-black">الدعم الفني المباشر</p>
              <p className="text-xs opacity-90">تواصل معنا مباشرة للاستفسارات وخدمة الطلبات</p>
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="mt-1 rounded-xl bg-card px-5 py-2 text-sm font-bold text-cocoa">ابدأ المحادثة الآن</a>
            </div>
            <div className="mt-3 space-y-2">
              {socials.map(({ label, sub, icon: Icon, href }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-background p-3 ring-1 ring-border">
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-clay"><Icon className="size-5" /></span>
                  <span><span className="block text-sm font-bold text-cocoadeep">{label}</span><span className="text-[11px] text-muted-foreground">{sub}</span></span>
                </a>
              ))}
            </div>
          </>
        )}
        {sheet === "share" && (
          <>
            <h2 className="font-display text-lg font-black text-cocoadeep">مشاركة المنصة</h2>
            <p className="text-xs text-muted-foreground">شارك السوق الشامل مع أصدقائك</p>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {shares.map(({ label, icon: Icon, href }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5">
                  <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-clay"><Icon className="size-5" /></span>
                  <span className="text-[11px] font-bold text-cocoadeep">{label}</span>
                </a>
              ))}
            </div>
            <button
              onClick={async () => {
                if (navigator.share) { try { await navigator.share({ title: "السوق الشامل", url }); } catch { /* cancelled */ } return; }
                await navigator.clipboard.writeText(url); setCopied(true);
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa py-3 font-bold text-cream"
            >
              <Link2 className="size-4" /> {copied ? "تم نسخ الرابط" : "نسخ / مشاركة الرابط"}
            </button>
          </>
        )}
        {sheet === "info" && (
          <>
            <h2 className="font-display text-lg font-black text-cocoadeep">معلومات المنصة</h2>
            <p className="mt-3 text-sm leading-7 text-cocoadeep">
              السوق الشامل وسيط شراء يمني: ترسل لنا رابط المنتج من المتاجر العالمية (TEMU، Trendyol، SHEIN، Amazon، AliExpress)، نشتريه لك ونشحنه حتى يصلك داخل اليمن.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">الإصدار 1.0 · © 2026 السوق الشامل</p>
          </>
        )}
      </div>
    </div>
  );
}
