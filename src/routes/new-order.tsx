import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { PackageCheck, ArrowRight, Printer, Copy, Check, Tag, DollarSign, Store, ShoppingBag } from "lucide-react";

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

// تنظيف وتنسيق اسم المنتج من مسار الرابط
function cleanProductTitle(url: string, store: string) {
  try {
    const cleanUrl = url.split("?")[0];
    const segments = cleanUrl.split("/").filter(Boolean);
    const lastPart = segments[segments.length - 1] || segments[segments.length - 2] || "";
    
    let text = decodeURIComponent(lastPart)
      .replace(/\.(html|htm|php)$/i, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\d{6,}\b/g, "") // إزالة الأكواد الرقمية الطويلة
      .replace(/\b(p|dp|item|product|goods|detail)\b/gi, "")
      .trim();

    if (text.length > 5) {
      return text;
    }
    return store ? `سلعة تسوق من متجر ${store}` : "منتج تسوق عالمي";
  } catch {
    return store ? `سلعة تسوق من متجر ${store}` : "منتج تسوق عالمي";
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
      const { data: { session } } = await supabase.auth.getSession();
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

      const savedName = prof?.full_name || user.user_metadata?.full_name || sessionStorage.getItem("sc_name") || "";
      const savedPhone = prof?.phone || user.user_metadata?.phone || sessionStorage.getItem("sc_phone") || "";

      if (savedName) setName(savedName);
      if (savedPhone) setPhone(savedPhone);
    };
    autoFill();
  }, [navigate]);

  const onUrlChange = (val: string) => {
    setUrl(val);
    if (val.length > 10) {
      const detected = detectStore(val);
      setStore(detected);
      const title = cleanProductTitle(val, detected);
      setProductType(title);
    } else {
      setStore("");
      setProductType("");
    }
  };

  const submit = async () => {
    if (!name || !phone || !address) {
      alert("يرجى إكمال الاسم ورقم الهاتف وعنوان التوصيل");
      return;
    }
    setLoading(true);
    try {
      const fullNotes = `العنوان: ${address}${lat ? ` (إحداثيات: ${lat}, ${lng})` : ""}${price ? ` | السعر التقريبي: ${price} ${currency}` : ""}`;
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      const fullProductName = productType
        ? `${productType}${store ? ` (${store})` : ""}`
        : store ? `منتج من ${store}` : "طلب وسيط شراء";

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
              onClick={() => {
                navigator.clipboard.writeText(trackingCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#8B5E34] bg-white px-3 py-1.5 rounded-lg border shadow-sm hover:bg-[#FAF4E6]"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? "تم النسخ!" : "نسخ الرقم"}
            </button>
          </div>
          <div className="text-right text-xs bg-gray-50 p-3.5 rounded-xl space-y-1.5 text-gray-700">
            <div><span className="font-bold">اسم العميل:</span> {name}</div>
            <div><span className="font-bold">رقم الهاتف:</span> <span dir="ltr">{phone}</span></div>
            <div><span className="font-bold">المنتج:</span> {productType}</div>
            {price && <div><span className="font-bold">السعر التقديري:</span> {price} {currency}</div>}
            <div><span className="font-bold">العنوان:</span> {address}</div>
            {store && <div><span className="font-bold">المتجر:</span> {store}</div>}
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              to="/track"
              className="w-full bg-[#4A3728] hover:bg-[#382a1f] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition"
            >
              <span>متابعة تتبع الشحنة الآن</span>
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
                  onChange={(e) => onUrlChange(e.target.value)}
                  placeholder="الصق رابط شي إن / أمازون / Temu..."
                  dir="ltr"
                  className="w-full bg-[#F9F5EB] border rounded-xl px-4 py-3 text-[12px] font-mono text-left outline-none focus:ring-2 focus:ring-[#8B5E34]"
                />
              </div>

              {store && (
                <div className="flex items-center justify-center gap-2 bg-white border border-emerald-200 rounded-xl py-2.5 shadow-sm">
                  <img
                    src={LOGOS[store]}
                    className="h-5 max-w-[90px] object-contain"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    alt={store}
                  />
                  <span className="bg-black text-white text-[11px] font-black px-2.5 py-0.5 rounded-full">{store}</span>
                  <span className="text-emerald-600 text-[11px] font-bold">✓ تم التعرف على {store}</span>
                </div>
              )}

              {url.length > 10 && (
                <div className="bg-white border border-[#dfcca9] rounded-xl p-3.5 space-y-3 shadow-sm">
                  <div>
                    <label className="text-[11px] font-bold text-[#4A3728] flex items-center gap-1.5 mb-1">
                      <Tag className="size-3.5 text-[#8B5E34]" />
                      <span>نوع المنتج / الوصف (يمكنك تعديله)</span>
                    </label>
                    <input
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      placeholder="مثال: فستان سهرة، قميص رجالي، حذاء كاجوال..."
                      className="w-full bg-[#FDF8EE] border border-gray-200 rounded-lg px-3 py-2.5 text-[12px] font-medium text-[#4A3728] outline-none focus:ring-2 focus:ring-[#8B5E34]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#4A3728] flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="size-3.5 text-[#8B5E34]" />
                        <span>سعر السلعة في المتجر الأصلي</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">اختياري</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="any"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="أدخل السعر الظاهر بالمتجر"
                        dir="ltr"
                        className="flex-1 bg-[#FDF8EE] border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-left font-bold outline-none focus:ring-2 focus:ring-[#8B5E34]"
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
              className="w-full bg-[#4A3728] hover:bg-[#382a1f] text-white rounded-xl py-3.5 font-black transition shadow"
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

            {/* بطاقة ملخص للمنتج والسعر لكي لا يختفيا أمام العميل */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-[#4A3728]">
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="size-3.5 text-[#8B5E34]" />
                  <span>المنتج المطلوب:</span>
                </span>
                {store && <span className="bg-[#4A3728] text-white text-[10px] px-2 py-0.5 rounded-full">{store}</span>}
              </div>
              <p className="text-[11px] text-gray-700 line-clamp-2 pr-5 font-medium">{productType || "منتج تسوق"}</p>
              {price && (
                <div className="pt-1 text-[#8B5E34] font-black text-xs flex items-center justify-between border-t border-amber-200/50">
                  <span>السعر التقديري:</span>
                  <span>{price} {currency}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
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
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المحافظة - الحي - الشارع..."
                  className="w-full bg-[#FDF8EE] border rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#C17A4A]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 border border-gray-300 rounded-xl font-bold text-[13px] hover:bg-gray-50"
              >
                رجوع
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 bg-[#B4662A] hover:bg-[#96521e] text-white rounded-xl py-3.5 font-black disabled:opacity-50 transition shadow"
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
