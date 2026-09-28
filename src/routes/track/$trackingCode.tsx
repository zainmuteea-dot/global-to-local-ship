import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, Bike, Check, Hash, Home, PackageSearch, Phone, Plane, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/track/$trackingCode")({
  head: () => ({
    meta: [
      { title: "مسار الشحنة — السوق الشامل" },
      { name: "description", content: "شاهد حالة طلبك وجميع مراحل الشحن والتسليم من السوق الشامل." },
    ],
  }),
  component: TrackingDetailPage,
});

const STEPS = [
  { key: "confirmed", title: "الطلب والاعتماد", desc: "تم استلام طلبك ومراجعته واعتماده بنجاح.", icon: Check },
  { key: "shipping", title: "الشراء والشحن الدولي", desc: "جاري شراء المنتجات من المتجر العالمي وشحنها دولياً.", icon: Plane },
  { key: "warehouse", title: "المستودع والفحص", desc: "وصلت الشحنة للمستودع الإقليمي وجاري فحصها وفرزها.", icon: PackageSearch },
  { key: "out", title: "في طريق التوصيل", desc: "الشحنة مع مندوب التوصيل المحلي وهي في طريقها إليك.", icon: Bike },
  { key: "delivered", title: "تم التسليم", desc: "تم تسليم الشحنة بنجاح للعميل.", icon: Home },
];

function statusToIndex(status: string): number {
  const val = (status || "").toLowerCase();
  if (val.includes("تسليم") || val.includes("delivered") || val.includes("مكتمل")) return 4;
  if (val.includes("طريق") || val.includes("توصيل") || val.includes("out")) return 3;
  if (val.includes("مستودع") || val.includes("وصل") || val.includes("مخزن") || val.includes("warehouse")) return 2;
  if (val.includes("شراء") || val.includes("شحن") || val.includes("ship")) return 1;
  return 0; // جديد / تم التواصل
}

function TrackingDetailPage() {
  const { trackingCode } = Route.useParams();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      const cleanCode = (trackingCode || "").trim().toUpperCase();

      // جلب تفاصيل الطلب من قاعدة البيانات
      const { data, error } = await supabase
        .from("orders")
        .select("tracking_code, customer_name, phone, status, product_name, product_link, created_at, updated_at")
        .ilike("tracking_code", cleanCode)
        .maybeSingle();

      if (data && !error) {
        setOrder({
          trackingCode: data.tracking_code,
          customerName: data.customer_name,
          phone: data.phone,
          status: data.status,
          productName: data.product_name,
          productLink: data.product_link,
          createdAt: new Date(data.created_at).toLocaleDateString("ar-YE"),
        });
      }
      setLoading(false);
    };

    fetchOrder();
  }, [trackingCode]);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#FDF8EE] flex items-center justify-center font-body">
        <div className="text-center text-[#8B5E34]">
          <PackageSearch className="size-10 animate-bounce mx-auto mb-2" />
          <p className="font-bold">جاري تحميل مسار الشحنة من قاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-[#FDF8EE] px-5 font-body">
        <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-lg border border-[#e8d7bb]">
          <PackageSearch className="mx-auto size-12 text-[#C17A4A]" />
          <h1 className="mt-4 font-black text-xl text-[#4A3728]">لم يتم العثور على الشحنة</h1>
          <p className="mt-2 text-xs text-gray-500">تأكد من إدخال رقم الشحنة بشكل صحيح (مثال: SC-XXXXXX)</p>
          <Button asChild className="mt-5 h-11 w-full rounded-xl bg-[#8B5E34] text-white hover:bg-[#6e4926]">
            <Link to="/track">العودة إلى شاشة التتبع</Link>
          </Button>
        </div>
      </div>
    );
  }

  const activeIndex = statusToIndex(order.status);

  return (
    <div dir="rtl" className="min-h-screen bg-[#FDF8EE] px-4 pb-14 pt-6 font-body">
      <main className="mx-auto w-full max-w-md">
        {/* Header Card */}
        <header className="rounded-2xl bg-white p-4 shadow-sm border border-[#e8d7bb] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-black text-sm text-[#4A3728]">{order.status}</span>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 text-xs text-[#8B5E34] hover:bg-[#FAF4E6] px-2.5 py-1 rounded-lg border border-[#8B5E34]/30"
          >
            <Printer className="size-3.5" />
            <span>طباعة السند</span>
          </button>
        </header>

        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" className="h-9 rounded-xl px-3 font-bold text-xs bg-white">
            <Link to="/track">
              <ArrowRight className="size-3.5 ml-1" />
              <span>بحث عن شحنة أخرى</span>
            </Link>
          </Button>
        </div>

        {/* Info Box */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-xl border border-[#e8d7bb] shadow-sm">
            <span className="text-[11px] text-gray-500 block">رقم الشحنة</span>
            <span className="font-mono font-black text-sm text-[#8B5E34]">{order.trackingCode}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-[#e8d7bb] shadow-sm">
            <span className="text-[11px] text-gray-500 block">هاتف العميل</span>
            <span className="font-mono font-bold text-xs text-gray-800" dir="ltr">{order.phone}</span>
          </div>
        </div>

        {/* Timeline Steps */}
        <div className="mt-6 bg-white p-5 rounded-2xl border border-[#e8d7bb] shadow-sm">
          <h2 className="mb-5 font-black text-base text-[#4A3728]">مراحل الشحن والتسليم</h2>
          <ol className="relative space-y-6">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const reached = index <= activeIndex;
              const active = index === activeIndex;
              const last = index === STEPS.length - 1;

              return (
                <li key={step.key} className="relative flex gap-3">
                  {!last && (
                    <span
                      className={`absolute right-[15px] top-8 h-[calc(100%+10px)] w-0.5 ${
                        index < activeIndex ? "bg-emerald-500" : "bg-gray-200"
                      }`}
                      aria-hidden
                    />
                  )}
                  <span
                    className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                      active
                        ? "bg-[#8B5E34] text-white ring-4 ring-[#8B5E34]/20"
                        : reached
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-400 border border-gray-200"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className={`flex-1 -mt-0.5 ${active ? "bg-[#FAF4E6] p-2.5 rounded-xl border border-[#8B5E34]/20" : ""}`}>
                    <p className={`text-sm font-black ${reached ? "text-[#4A3728]" : "text-gray-400"}`}>
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </main>
    </div>
  );
}
