import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { PackageCheck, ArrowRight, Printer, Copy, Check, Tag, DollarSign } from "lucide-react";

export const Route = createFileRoute("/new-order")({ component: NewOrder });

const LOGOS: Record<string, string> = {
  SHEIN: "https://upload.wikimedia.org/wikipedia/commons/2/25/Shein-logo.png",
  Amazon: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  TEMU: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Temu-logo.svg",
  AliExpress: "https://upload.wikimedia.org/wikipedia/commons/8/83/AliExpress_logo.svg",
  noon: "https://upload.wikimedia.org/wikipedia/commons/4/48/Noon-logo.svg",
  eBay: "https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg",
  ZARA: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Zara_Logo.svg",
};

function detectStore(url: string) {
  const u = url.toLowerCase();
  if (u.includes("shein")) return "SHEIN";
  if (u.includes("amazon")) return "Amazon";
  if (u.includes("temu")) return "TEMU";
  if (u.includes("aliexpress")) return "AliExpress";
  if (u.includes("noon")) return "noon";
  if (u.includes("ebay")) return "eBay";
  if (u.includes("zara")) return "ZARA";
  return "";
}

// دالة لاستخراج نوع المنتج واسمه التلقائي من الرابط
function extractProductInfo(url: string) {
  try {
    const cleanUrl = url.split("?")[0];
    const segments = cleanUrl.split("/").filter(Boolean);
    const lastPart = segments[segments.length - 1] || "";
    // تنظيف الكلمات وإزالة الامتدادات والأرقام الزائدة
    const cleaned = decodeURIComponent(lastPart)
      .replace(/\.(html|htm|php)$/i, "")
      .replace(/[-_]/g, " ")
      .replace(/\b(p|dp|item|product)\b/gi, "")
      .trim();

    return cleaned.length > 3 ? cleaned : "منتج تسوق عالمي";
  } catch {
    return "منتج تسوق عالمي";
  }
}

function NewOrder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [store, setStore] = useState("");
  const [productType, setProductType] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("$");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const autoFill = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        navigate({ to: "/signup" });
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      const savedName =
        prof?.full_name ||
        user.user_metadata?.full_name ||
        sessionStorage.getItem("sc_name") ||
        "";

      const savedPhone =
        prof?.phone ||
        user.user_metadata?.phone ||
        sessionStorage.getItem("sc_phone") ||
        "";

      if (savedName) setName(savedName);
      if (savedPhone) setPhone(savedPhone);
    };
    autoFill();
  }, [navigate]);

  const onUrl = (v: string) => {
    setUrl(v);
    if (v.length > 10) {
      const detected = detectStore(v);
      setStore(detected);
      const extracted = extractProductInfo(v);
      if (extracted) setProductType(extracted);
    } else {
      setStore("");
      setProductType("");
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLng(p.coords.longitude.toFixed(6));
        setAddress(`موقع محدد: ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`);
      },
      () => alert("تعذر تحديد الموقع الجغرافي")
    );
  };

  const submit = async () => {
    if (!name || !phone || !address) {
      alert("يرجى إكمال الاسم ورقم الهاتف وعنوان التوصيل");
      return;
    }
    setLoading(true);
    try {
      const fullNotes = `العنوان: ${address}${lat ? ` (إحداثيات: ${lat}, ${lng})` : ""}${price ? ` | السعر التقريبي: ${price} ${currency}` : ""}`;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      const fullProductName = productType
        ? `${productType}${store ? ` (${store})` : ""}`
        : store
        ? `منتج من ${store}`
        : "طلب وسيط شراء";

      const { data, error } = await supabase
        .from("orders")
        .insert([
          {
            customer_name: name.trim(),
            phone: phone.trim(),
            product_link: url.trim(),
            product_name: fullProductName,
            status: "جديد",
            notes: fullNotes,
            user_id: user?.id,
          },
        ])
        .select("tracking_code")
        .single();

      if (error) throw error;
      if (data) setTrackingCode(data.tracking_code);
    } catch (err: any) {
      alert("حدث خطأ أثناء الإرسال: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!trackingCode) return;
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (trackingCode) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#EDE0CC] flex items-center justify-center p-4 font-body">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 border border-[#dfcca9]">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
            <PackageCheck className="size-9" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#4A3728]">تم استلام طلبك بنجاح!</h1>
            <p className="text-xs text-gray-500 mt-1">احتفظ برقم الشحنة لتتبع مسار طلبك حتى وصوله إليك</p>
          </div>
          <div className="bg-[#FFFBF2] border-2 border-dashed border-[#8B5E34] rounded-2xl p-4">
            <span className="text-[11px] font-bold text-gray-500 block mb-1">رقم تتبع الشحنة</span>
            <div className="text-2xl font-black font-mono text-[#8B5E34] tracking-wider select-all">
              {trackingCode}
            </div>
            <button
              onClick={copyCode}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#8B5E34] bg-white px-3 py-1.5 rounded-lg border shadow-sm hover:bg-[#FAF4E6]"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? "تم النسخ!" : "نسخ الرقم"}
            </button>
          </div>
          <div className="text-right text-xs bg-gray-50 p-3.5 rounded-xl space-y-1.5 text-gray-700">
            <div><span className="font-bold">اسم العميل:</span> {name}</div>
            <div><span className="font-bold">رقم الهاتف:</span> <span dir="ltr">{phone}</span></div>
            <div><span className="font-bold">المنتج:</span> {productType || "منتج تسوق"}</div>
            {price && <div><span className="font-bold">السعر التقديري:</span> {price} {currency}</div>}
            <div><span className="font-bold">العنوان:</span> {address}</div>
            {store && <div><span className="font-bold">المتجر:</span> {store}</div>}
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              to="/pay"
              search={{ order: trackingCode }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition"
            >
              <span>المتابعة إلى طريقة الدفع</span>
              <ArrowRight className="size-4" />
            </Link>
            <button
              onClick={() => window.print()}
              type="button"
              className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs"
            >
              <Printer className="size-4" />
              <span>طباعة سند الاستلام</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E9DCC3] py-6 px-4 font-body" dir="rtl">
      <div className="max-w-[430px] mx-auto bg-[#FFFBF2] rounded-[20px] p-5 shadow space-y-4">
        {step === 1 && (
          <>
            <div className="flex justify-between items-center">
              <h1 className="font-black text-[16px]">الخطوة 1: رابط المنتج</h1>
              <span className="text-[11px] bg-[#F1E6D0] px-2 py-1 rounded-full">الخطوة 1 من 2</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-bold block mb-1">رابط المنتج</label>
                <input
                  value={url}
                  onChange={(e) => onUrl(e.target.value)}
                  placeholder="الصق رابط شي إن / أمازون / Temu..."
                  dir="ltr"
                  className="w-full bg-[#F9F5EB] border rounded-xl px-4 py-3 text-[12px] font-mono text-left outline-none focus:ring-2 focus:ring-[#8B5E34]"
                />
              </div>

              {/* شارة التعرف على المتجر */}
              {store && (
                <div className="flex items-center justify-center gap-2 bg-white border border-emerald-200 rounded-xl py-2.5 shadow-sm">
                  <img
                    src={LOGOS[store]}
                    className="h-5 max-w-[90px] object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    alt={store}
                  />
                  <span className="bg-black text-white text-[11px] font-black px-2.5 py-0.5 rounded-full">
                    {store}
                  </span>
                  <span className="text-emerald-600 text-[11px] font-bold">✓ تم التعرف على {store}</span>
                </div>
              )}

              {/* حقلا النوع والسعر الظاهران تلقائياً */}
              {url.length > 10 && (
                <div className="bg-white/80 border border-[#dfcca9] rounded-xl p-3.5 space-y-3 animate-in fade-in">
                  <div>
                    <label className="text-[11px] font-bold text-[#4A3728] flex items-center gap-1.5 mb-1">
                      <Tag className="size-3.5 text-[#8B5E34]" />
                      <span>نوع المنتج / الوصف التلقائي</span>
                    </label>
                    <input
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      placeholder="مثال: جاكيت رجالي كاجوال..."
                      className="w-full bg-[#FDF8EE] border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#8B5E34]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#4A3728] flex items-center gap-1.5 mb-1">
                      <DollarSign className="size-3.5 text-[#8B5E34]" />
                      <span>سعر السلعة في المتجر (اختياري)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="any"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        dir="ltr"
                        className="flex-1 bg-[#FDF8EE] border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-left outline-none focus:ring-2 focus:ring-[#8B5E34]"
                      />
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="bg-[#FDF8EE] border border-gray-200 rounded-lg px-2.5 py-2 text-[12px] font-bold text-[#4A3728] outline-none"
                      >
                        <option value="$">$ دولار</option>
                        <option value="ر.س">ر.س (سعودي)</option>
                        <option value="ر.ي">ر.ي (يمني)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (!url.trim()) {
                  alert("يرجى لصق رابط المنتج أولاً");
                  return;
                }
                setStep(2);
              }}
              className="w-full bg-[#4A3728] hover:bg-[#382a1f] text-white rounded-xl py-3.5 font-black transition"
            >
              التالي: عنوان التوصيل
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex justify-between items-center">
              <h1 className="font-black text-[18px]">إتمام الطلب</h1>
              <span className="text-[11px] bg-[#F1E6D0] px-2 py-1 rounded-full">الخطوة 2 من 2</span>
            </div>
            <div>
              <label className="text-[12px] font-bold block mb-1">الاسم الكامل</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك الكامل"
                className="w-full bg-[#FDF8EE] border rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#C17A4A]"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold block mb-1">رقم الهاتف (واتساب)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="7XXXXXXXX"
                dir="ltr"
                className="w-full bg-[#FDF8EE] border rounded-xl px-4 py-3 text-[13px] text-left outline-none focus:ring-2 focus:ring-[#C17A4A]"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold block mb-1">عنوان التوصيل بالتفصيل</label>
              <div className="relative">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المحافظة - الحي - الشارع..."
                  className="w-full bg-[#FDF8EE] border rounded-xl px-4 py-3 pr-10 text-[13px] outline-none focus:ring-2 focus:ring-[#C17A4A]"
                />
                <button
                  onClick={getLocation}
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#F5B86E] rounded-lg flex items-center justify-center text-lg"
                >
                  📍
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 border rounded-xl font-bold text-[13px]"
              >
                رجوع
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 bg-[#B4662A] text-white rounded-xl py-3.5 font-black disabled:opacity-50"
              >
                {loading ? "جاري الإرسال..." : "تأكيد وإرسال الطلب"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
