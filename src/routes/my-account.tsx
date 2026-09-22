import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  ChevronLeft,
  FileText,
  Headphones,
  Info,
  LogOut,
  MapPin,
  Package,
  Plus,
  Search,
  Share2,
  Shield,
  UserRound,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

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

const items: { label: string; icon: LucideIcon }[] = [
  { label: "حسابي", icon: UserRound },
  { label: "طلباتي", icon: Package },
  { label: "القطع الفورية", icon: Zap },
  { label: "العناوين", icon: MapPin },
  { label: "رصيدي", icon: Wallet },
  { label: "خدمة العملاء", icon: Headphones },
  { label: "الإشعارات", icon: Bell },
  { label: "مشاركة المنصة", icon: Share2 },
  { label: "شروط الاستخدام", icon: FileText },
  { label: "سياسة الخصوصية", icon: Shield },
  { label: "معلومات المنصة", icon: Info },
];

function MyAccountPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("sc_logged_in")) {
      navigate({ to: "/login" });
      return;
    }
    setPhone(localStorage.getItem("sc_phone") ?? "");
  }, [navigate]);

  const signOut = () => {
    localStorage.removeItem("sc_logged_in");
    localStorage.removeItem("sc_code");
    navigate({ to: "/" });
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background px-4 py-6 font-body">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex items-center gap-1 rounded-full bg-card px-4 py-2 text-xs font-bold text-cocoa ring-1 ring-border"
          >
            رجوع <ArrowLeft className="size-4" />
          </button>
          <h1 className="font-display text-lg font-black text-cocoadeep">إدارة الحساب</h1>
          <div className="flex gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border">
              <Search className="size-4" />
            </span>
            <span className="grid size-9 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border">
              <Plus className="size-4" />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
          <span className="grid size-11 place-items-center rounded-full bg-secondary text-clay">
            <UserRound className="size-6" />
          </span>
          <div>
            <p className="text-[11px] text-muted-foreground">أهلاً بك</p>
            <p className="font-display text-base font-black text-cocoa">السوق الشامل</p>
            <p dir="ltr" className="text-[11px] text-muted-foreground">{phone || "أضف عنوان"}</p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {items.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3.5 ring-1 ring-border"
            >
              <span className="flex items-center gap-3">
                <Icon className="size-5 text-clay" />
                <span className="text-sm font-bold text-cocoadeep">{label}</span>
              </span>
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>
          ))}

          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-border"
          >
            <LogOut className="size-5 text-destructive" />
            <span className="text-sm font-bold text-destructive">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );
}
