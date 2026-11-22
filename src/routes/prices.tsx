import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Calculator,
  Globe2,
  MapPin,
  Plane,
  Ship,
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface ServicePrice {
  id: string;
  created_at: string;
  service_name: string;
  price: number;
  unit: string | null;
  notes: string | null;
}

type InternationalRate = {
  id: string;
  country: string;
  flag: string;
  type: "air" | "sea";
  typeLabel: string;
  ratePerKg: number;
  minKg: number;
};

type LocalRate = { id: string; city: string; price: number; duration: string };

const INTERNATIONAL_STORAGE_KEY = "global-shopper:prices:international:v1";
const LOCAL_DELIVERY_STORAGE_KEY = "global-shopper:prices:local-delivery:v1";

function readStoredRates<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

// أسعار الشحن الدولي الافتراضية لكل كجم
const INTERNATIONAL_RATES: InternationalRate[] = [
  {
    id: "cn-air",
    country: "الصين",
    flag: "🇨🇳",
    type: "air",
    typeLabel: "شحن جوي سريع (7-12 يوم)",
    ratePerKg: 14,
    minKg: 0.5,
  },
  {
    id: "cn-sea",
    country: "الصين",
    flag: "🇨🇳",
    type: "sea",
    typeLabel: "شحن بحري اقتصادي (25-35 يوم)",
    ratePerKg: 4.5,
    minKg: 5,
  },
  {
    id: "tr-air",
    country: "تركيا",
    flag: "🇹🇷",
    type: "air",
    typeLabel: "شحن جوي سريع (5-8 أيام)",
    ratePerKg: 12,
    minKg: 0.5,
  },
  {
    id: "us-air",
    country: "أمريكا",
    flag: "🇺🇸",
    type: "air",
    typeLabel: "شحن جوي سريع (7-10 أيام)",
    ratePerKg: 18,
    minKg: 0.5,
  },
  {
    id: "ae-air",
    country: "الإمارات",
    flag: "🇦🇪",
    type: "air",
    typeLabel: "شحن جوي سريع (3-5 أيام)",
    ratePerKg: 9,
    minKg: 0.5,
  },
];

// أسعار التوصيل الافتراضية للمحافظات اليمنية (بالريال اليمني)
const INITIAL_LOCAL_DELIVERY: LocalRate[] = [
  { id: "1", city: "صنعاء (داخل الأمانة)", price: 2000, duration: "نفس اليوم أو خلال 24 ساعة" },
  { id: "2", city: "عدن", price: 4000, duration: "خلال 24-48 ساعة" },
  { id: "3", city: "تعز", price: 4500, duration: "خلال 48 ساعة" },
  { id: "4", city: "إب", price: 3500, duration: "خلال 24-48 ساعة" },
  { id: "5", city: "حضرموت (المكلا / سيئون)", price: 5000, duration: "خلال 2-3 أيام" },
  { id: "6", city: "الحديدة", price: 3500, duration: "خلال 48 ساعة" },
  { id: "7", city: "مأرب", price: 4500, duration: "خلال 48 ساعة" },
  { id: "8", city: "ذمار / عمران", price: 3000, duration: "خلال 24 ساعة" },
];

function PricesPage() {
  const navigate = useNavigate();

  const [internationalRates, setInternationalRates] = useState<InternationalRate[]>(() =>
    readStoredRates(INTERNATIONAL_STORAGE_KEY, INTERNATIONAL_RATES),
  );
  const [localRates, setLocalRates] = useState<LocalRate[]>(() =>
    readStoredRates(LOCAL_DELIVERY_STORAGE_KEY, INITIAL_LOCAL_DELIVERY),
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

  // تتحقق الصفحة من دور المدير لإظهار أدوات الإدارة فقط.
  useEffect(() => {
    let active = true;
    const verifyAdmin = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          if (active) setIsAdmin(false);
          return;
        }
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: authData.user.id,
          _role: "admin",
        });
        if (active) setIsAdmin(!error && data === true);
      } catch {
        if (active) setIsAdmin(false);
      } finally {
        if (active) setAdminCheckComplete(true);
      }
    };

    void verifyAdmin();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void verifyAdmin();
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // الأسعار تحفظ محليًا في هذا المتصفح فقط، ولا تُرسل إلى قاعدة البيانات.
  useEffect(() => {
    try {
      window.localStorage.setItem(INTERNATIONAL_STORAGE_KEY, JSON.stringify(internationalRates));
    } catch (error) {
      console.error("تعذر حفظ أسعار الشحن على هذا المتصفح", error);
    }
  }, [internationalRates]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_DELIVERY_STORAGE_KEY, JSON.stringify(localRates));
    } catch (error) {
      console.error("تعذر حفظ أسعار التوصيل على هذا المتصفح", error);
    }
  }, [localRates]);

  // حالة الحاسبة
  const [selectedRoute, setSelectedRoute] = useState(() =>
    readStoredRates(INTERNATIONAL_STORAGE_KEY, INTERNATIONAL_RATES)[0]?.id ?? INTERNATIONAL_RATES[0]!.id,
  );
  const [weight, setWeight] = useState<number>(1);
  const [declaredValue, setDeclaredValue] = useState<number>(50); // قيمة المنتج بالدولار

  // نموذج المدينة: يستخدم للإضافة والتعديل
  const [newCity, setNewCity] = useState({ city: "", price: "", duration: "" });
  const [showAddCity, setShowAddCity] = useState(false);
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [editingInternationalId, setEditingInternationalId] = useState<string | null>(null);
  const [internationalForm, setInternationalForm] = useState({
    typeLabel: "",
    ratePerKg: "",
    minKg: "",
  });

  // حساب التكاليف
  const activeRoute =
    internationalRates.find((r) => r.id === selectedRoute) ?? internationalRates[0] ?? INTERNATIONAL_RATES[0]!;
  const effectiveWeight = Math.max(weight, activeRoute.minKg);
  const shippingCost = effectiveWeight * activeRoute.ratePerKg;
  const customsEstimated = Number((declaredValue * 0.05).toFixed(1)); // تقدير 5% جمارك ورسوم
  const brokerageFee = 10; // عمولة الوساطة الثابتة 10 دولار
  const totalUSD = shippingCost + customsEstimated + brokerageFee;

  // أسعار الصرف التقريبية
  const totalSAR = (totalUSD * 3.75).toFixed(1);
  const totalYER = Math.round(totalUSD * 535); // سعر صنعاء التقريبي

  const resetCityForm = () => {
    setNewCity({ city: "", price: "", duration: "" });
    setEditingLocalId(null);
    setShowAddCity(false);
  };

  const handleSaveCity = () => {
    if (!isAdmin || !newCity.city.trim() || !newCity.price) return;
    const updated = {
      city: newCity.city.trim(),
      price: Number(newCity.price),
      duration: newCity.duration.trim() || "خلال 48 ساعة",
    };
    if (!Number.isFinite(updated.price) || updated.price < 0) return;

    if (editingLocalId) {
      setLocalRates((prev) => prev.map((item) => item.id === editingLocalId ? { ...item, ...updated } : item));
    } else {
      setLocalRates((prev) => [...prev, { id: crypto.randomUUID(), ...updated }]);
    }
    resetCityForm();
  };

  const startEditCity = (item: LocalRate) => {
    if (!isAdmin) return;
    setEditingLocalId(item.id);
    setNewCity({ city: item.city, price: String(item.price), duration: item.duration });
    setShowAddCity(true);
  };

  const handleDeleteCity = (id: string) => {
    if (!isAdmin || !window.confirm("هل أنت متأكد من حذف هذا السعر؟")) return;
    setLocalRates((prev) => prev.filter((item) => item.id !== id));
  };

  const startEditInternational = (rate: InternationalRate) => {
    if (!isAdmin) return;
    setEditingInternationalId(rate.id);
    setInternationalForm({
      typeLabel: rate.typeLabel,
      ratePerKg: String(rate.ratePerKg),
      minKg: String(rate.minKg),
    });
  };

  const handleSaveInternational = () => {
    if (!isAdmin || !editingInternationalId || !internationalForm.typeLabel.trim()) return;
    const ratePerKg = Number(internationalForm.ratePerKg);
    const minKg = Number(internationalForm.minKg);
    if (!Number.isFinite(ratePerKg) || ratePerKg < 0 || !Number.isFinite(minKg) || minKg <= 0) return;
    setInternationalRates((prev) => prev.map((rate) => rate.id === editingInternationalId
      ? { ...rate, typeLabel: internationalForm.typeLabel.trim(), ratePerKg, minKg }
      : rate));
    setEditingInternationalId(null);
  };

  const handleDeleteInternational = (id: string) => {
    if (!isAdmin || internationalRates.length <= 1 || !window.confirm("هل أنت متأكد من حذف هذا السعر؟")) return;
    const remaining = internationalRates.filter((rate) => rate.id !== id);
    setInternationalRates(remaining);
    if (selectedRoute === id) setSelectedRoute(remaining[0]!.id);
    if (editingInternationalId === id) setEditingInternationalId(null);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-slate-800 font-sans pb-16"
    >
      {/* 1. الشريط العلوي */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/admin" })}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ArrowRight className="size-4" />
              <span>العودة للإدارة</span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Calculator className="size-5 text-[#EA580C]" />
                الأسعار وأجور الشحن والتوصيل
              </h1>
              <p className="text-[11px] font-semibold text-slate-500">
                حاسبة الشحن الدولي ودليل توصيل المحافظات
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-50 text-[#EA580C] border border-orange-200">
            <Sparkles className="size-3.5" />
            تحديث فوري 2026
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
        {/* 2. حاسبة الشحن الدولي التفاعلية */}
        <section className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm shadow-sky-900/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-2xl bg-[#0F4C81]/10 text-[#0F4C81] grid place-items-center font-bold">
                <Globe2 className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  حاسبة تكلفة الشحن الدولي التقديرية
                </h2>
                <p className="text-xs text-slate-500">
                  اختر بلد المصدر والوزن لحساب الشحن والعمولة والجمارك
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* مدخلات الحاسبة */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2">
                  بلد المصدر ونوع الشحن:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {internationalRates.map((rate) => {
                    const isSelected = rate.id === selectedRoute;
                    return (
                      <div
                        key={rate.id}
                        className={`rounded-2xl border transition ${isSelected ? "border-[#EA580C] bg-orange-50/70 shadow-xs" : "border-slate-200 bg-white"}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedRoute(rate.id)}
                          className="w-full p-3 text-right cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{rate.flag}</span>
                            <div>
                              <div className="text-xs font-black flex items-center gap-1">
                                <span>{rate.country}</span>
                                {rate.type === "air" ? (
                                  <Plane className="size-3 text-[#0F4C81]" />
                                ) : (
                                  <Ship className="size-3 text-cyan-600" />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">{rate.typeLabel}</div>
                            </div>
                          </div>
                          <div className="text-left font-mono">
                            <span className="text-xs font-black text-[#EA580C]">${rate.ratePerKg}</span>
                            <span className="text-[10px] text-slate-400">/كجم</span>
                          </div>
                        </button>
                        {isAdmin && (
                          <div className="flex justify-end gap-2 px-3 pb-2">
                            <button type="button" onClick={() => startEditInternational(rate)} className="px-2 py-1 rounded-lg text-sky-700 hover:bg-sky-50 text-[11px] font-bold inline-flex items-center gap-1">
                              <Pencil className="size-3" /> تعديل
                            </button>
                            <button type="button" onClick={() => handleDeleteInternational(rate.id)} disabled={internationalRates.length <= 1} className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40 text-[11px] font-bold inline-flex items-center gap-1">
                              <Trash2 className="size-3" /> حذف
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {isAdmin && editingInternationalId && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع الشحن ومدة التوصيل:</label>
                    <input type="text" value={internationalForm.typeLabel} onChange={(e) => setInternationalForm({ ...internationalForm, typeLabel: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">السعر لكل كجم (دولار):</label>
                    <input type="number" min="0" step="0.1" value={internationalForm.ratePerKg} onChange={(e) => setInternationalForm({ ...internationalForm, ratePerKg: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الحد الأدنى للوزن (كجم):</label>
                    <input type="number" min="0.1" step="0.1" value={internationalForm.minKg} onChange={(e) => setInternationalForm({ ...internationalForm, minKg: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs outline-none" />
                  </div>
                  <div className="sm:col-span-3 flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingInternationalId(null)} className="h-9 px-3 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold">إلغاء</button>
                    <button type="button" onClick={handleSaveInternational} className="h-9 px-4 rounded-xl bg-[#0F4C81] text-white text-xs font-black">حفظ التعديل</button>
                  </div>
                </div>
              )}

              {/* الوزن وقيمة المنتج */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    الوزن الإجمالي التقريبي (كجم):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={weight}
                    onChange={(e) => setWeight(Math.max(0.1, Number(e.target.value) || 0.1))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 focus:border-[#0F4C81] focus:ring-2 focus:ring-sky-100 font-mono text-sm font-bold text-center outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    الحد الأدنى لهذا المسار: {activeRoute.minKg} كجم
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    قيمة البضاعة التقديرية (بالدولار $):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 focus:border-[#0F4C81] focus:ring-2 focus:ring-sky-100 font-mono text-sm font-bold text-center outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    تستخدم لاحتساب الجمارك التقريبية (5%)
                  </span>
                </div>
              </div>
            </div>

            {/* تفصيل الفاتورة الناتجة */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#0A2540] to-[#0F4C81] rounded-3xl p-5 text-white flex flex-col justify-between shadow-lg shadow-sky-900/10">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-sky-800/60 mb-4">
                  <span className="text-xs font-bold text-sky-200">تفصيل تكلفة الشحن والوساطة</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-900/60 text-sky-300">
                    {effectiveWeight} كجم
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sky-200">أجور الشحن الدولي:</span>
                    <span className="font-mono font-bold">${shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sky-200">رسوم التخليص والجمارك (تقديري):</span>
                    <span className="font-mono font-bold">${customsEstimated.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sky-200">عمولة وسيط السوق الشامل الثابتة:</span>
                    <span className="font-mono font-bold text-amber-300">
                      ${brokerageFee.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* الإجمالي بمختلف العملات */}
              <div className="mt-5 pt-4 border-t border-sky-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-orange-400">الإجمالي بالدولار:</span>
                  <span className="text-2xl font-black font-mono text-white">
                    ${totalUSD.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-sky-200 font-mono">
                  <span>ما يعادل بالريال السعودي:</span>
                  <span className="font-bold">{totalSAR} ر.س</span>
                </div>
                <div className="flex items-center justify-between text-xs text-sky-200 font-mono">
                  <span>ما يعادل بالريال اليمني (تقريبي):</span>
                  <span className="font-bold">{totalYER.toLocaleString()} ر.ي</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. جدول أسعار التوصيل لباب البيت للمحافظات */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-2xl bg-[#EA580C]/10 text-[#EA580C] grid place-items-center font-bold">
                <MapPin className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  أسعار التوصيل الداخلي للمحافظات
                </h2>
                <p className="text-xs text-slate-500">
                  أجور توصيل الطرد لباب بيت العميل بعد وصوله لصنعاء أو عدن
                </p>
                {isAdmin && adminCheckComplete && <p className="text-[10px] text-amber-700 mt-1">التعديلات تحفظ في هذا المتصفح فقط ولا تظهر لزوار أو أجهزة أخرى.</p>}
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setEditingLocalId(null);
                  setNewCity({ city: "", price: "", duration: "" });
                  setShowAddCity(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA580C] border border-orange-200 text-xs font-black transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>إضافة مدينة</span>
              </button>
            )}
          </div>

          {/* نموذج إضافة مدينة جديدة */}
          {showAddCity && isAdmin && (
            <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  اسم المحافظة / المنطقة:
                </label>
                <input
                  type="text"
                  placeholder="مثال: شبوة"
                  value={newCity.city}
                  onChange={(e) => setNewCity({ ...newCity, city: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  سعر التوصيل (ريال يمني):
                </label>
                <input
                  type="number"
                  placeholder="مثال: 4500"
                  value={newCity.price}
                  onChange={(e) => setNewCity({ ...newCity, price: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  مدة التوصيل المقدرة:
                </label>
                <input
                  type="text"
                  placeholder="مثال: 48 ساعة"
                  value={newCity.duration}
                  onChange={(e) => setNewCity({ ...newCity, duration: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCity}
                  className="h-10 flex-1 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-black transition cursor-pointer"
                >
                  {editingLocalId ? "حفظ التعديل" : "حفظ التسعيرة"}
                </button>
                <button type="button" onClick={resetCityForm} className="h-10 px-3 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold">
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* جدول المدن */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <th className="py-3 px-4">المحافظة / الوجهة</th>
                  <th className="py-3 px-4">أجرة التوصيل لباب البيت</th>
                  <th className="py-3 px-4">مدة التوصيل المتوقعة</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localRates.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-black text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span>{item.city}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#EA580C]">
                      {item.price.toLocaleString()} ر.ي
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{item.duration}</td>
                    <td className="py-3.5 px-4 text-center">
                      {isAdmin && (
                        <div className="inline-flex items-center gap-1">
                          <button type="button" onClick={() => startEditCity(item)} className="p-1.5 rounded-lg text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition" title="تعديل" aria-label={`تعديل سعر ${item.city}`}>
                            <Pencil className="size-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeleteCity(item.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="حذف" aria-label={`حذف سعر ${item.city}`}>
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/prices")({
  head: () => ({
    meta: [
      { title: "الأسعار وأجور الشحن والتوصيل | السوق الشامل" },
      {
        name: "description",
        content: "حاسبة الشحن الدولي ودليل أسعار التوصيل لجميع المحافظات اليمنية.",
      },
    ],
  }),
  component: PricesPage,
});

export default PricesPage;
