import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  CircleDollarSign,
  Facebook,
  FileText,
  Hand,
  Instagram,
  Link2,
  Package,
  Search,
  ShoppingCart,
  UserRound,
  Youtube,
  type LucideIcon,
} from "lucide-react";

const WHATSAPP = "https://wa.me/967775527993";
const BRAND = "السوق الشامل";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "السوق الشامل — وسيط شراء يوصلك من العالم إلى اليمن" },
      {
        name: "description",
        content:
          "تسوق عالمياً واستلم محلياً: نشتري لك من TEMU وSHEIN وAmazon وTrendyol وAliExpress ونوصل لباب بيتك في اليمن.",
      },
      { property: "og:title", content: "السوق الشامل — تسوق عالمياً واستلم محلياً" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1.1-1.6-.1-2.5-.7-4.3-2.7-5.4-4.4-.4-.6-.7-1.3-.5-2.1-.4.6-.9.9-1.2.2-.2.5-.2.7 0l.7.9c.1.2.1.4 0.6l-.4.5c.3.6 1.2 1.6 2.3 2.1l.5-.4c.2-.2.4-.2.6-.1l.9.6c.2.1.3.3.2.5Z" />
    </svg>
  );
}

function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z" />
    </svg>
  );
}

function BrandTruck() {
  return (
    <div className="flex items-end">
      <div className="rounded-md bg-card px-2 py-1 ring-1 ring-border shadow-sm">
        <p className="whitespace-nowrap font-display text-[10px] font-extrabold leading-none text-cocoadeep sm:text-xs">
          {BRAND}
        </p>
      </div>
      <div className="-ms-0.5 size-0 border-y-[7px] border-s-[10px] border-y-transparent border-s-cocoa" />
      <div className="relative -ms-1 flex gap-1">
        <span className="size-2 rounded-full bg-cocoadeep ring-2 ring-card" />
        <span className="size-2 rounded-full bg-cocoadeep ring-2 ring-card" />
      </div>
    </div>
  );
}

const heroCircles: { label: string; icon: LucideIcon }[] = [
  { label: "التسجيل", icon: UserRound },
  { label: "الطلب", icon: Hand },
  { label: "الشحن", icon: FileText },
];

const steps: { title: string; desc: string; icon: LucideIcon }[] = [
  { title: "أرسل الرابط", desc: "انسخ رابط المنتج", icon: Link2 },
  { title: "اعرف السعر", desc: "نوضح لك التكلفة", icon: CircleDollarSign },
  { title: "نشتري لك", desc: "نشتري بدلاً عنك", icon: ShoppingCart },
  { title: "تابع الشحنة", desc: "تتبع طلبك أولاً بأول", icon: Search },
  { title: "الاستلام", desc: "يوصلك حتى باب بيتك", icon: Package },
];

const platforms: { name: string; className: string }[] = [
  { name: "TEMU", className: "bg-temu text-white" },
  { name: "Trendyol", className: "bg-trendyol text-white" },
  { name: "SHEIN", className: "bg-shein text-white" },
  { name: "Amazon", className: "bg-card text-amazon ring-1 ring-border" },
  { name: "AliExpress", className: "bg-aliexpress text-white" },
];

const testimonials = [
  { name: "يوسف الحيفي", city: "صنعاء", text: "اشتريت لعبتين للأولاد من شي إن، التعامل كان صادق والتوصيل وصل لباب البيت." },
  { name: "أمة الحكيمي", city: "عدن", text: "وأخيراً لقيت موقع يوصل لعدن! خدمة ممتازة والتجاوب سريع جداً في الواتساب." },
  { name: "ياسر باشديد", city: "حضرموت", text: "التجربة فاقت التوقعات، تتبعت شحنتي كل يوم والتغليف كان ممتاز." },
];

function Stars() {
  return (
    <div className="flex justify-center gap-0.5 text-gold">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-sm leading-none">★</span>
      ))}
    </div>
  );
}

function Confetti() {
  return (
    <div className="mb-1 flex flex-wrap justify-center gap-1" aria-hidden>
      {["size-1.5", "size-2", "size-1.5", "size-2.5", "size-1.5", "size-2"].map((s, i) => (
        <span key={i} className={`${s} rotate-45 bg-goldsoft/70 ${i % 2? "rounded-[2px]" : "rounded-full"}`} />
      ))}
    </div>
  );
}

function Index() {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen overflow-x-hidden bg-background font-body text-foreground">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <Link to="/login" className="grid size-8 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border">
            <UserRound className="size-4" />
          </Link>
          <span className="grid size-8 place-items-center rounded-full bg-card text-cocoa ring-1 ring-border">
            <Bell className="size-4" />
          </span>
        </div>
        <a href="/new-order" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-bold text-white shadow-lg">
          <span className="text-base leading-none">اطلب الآن</span>
        </a>
      </div>

      <header className="px-4 pt-4">
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl bg-cocoa p-6 text-cream ring-1 ring-black/10 sm:p-8">
          <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row">
            <div className="flex items-start gap-4">
              {
