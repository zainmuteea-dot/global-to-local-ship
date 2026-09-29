import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { PackageCheck, ArrowRight, Printer, Copy, Check, ShoppingBag } from "lucide-react";
import ProductPriceForm from "../components/ProductPriceForm";

export const Route = createFileRoute("/new-order")({ component: NewOrder });

function NewOrder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [productType, setProductType] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const autoFill = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { navigate({ to: "/signup" }); return; }
      const { data: prof } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
      if (prof?.full_name) setName(prof.full_name);
      if (prof?.phone) setPhone(prof.phone);
    };
    autoFill();
  }, [navigate]);

  const submit = async () => {
    if (!name ||!phone ||!address) { alert("يرجى إكمال الاسم ورقم الهاتف وعنوان التوصيل"); return; }
    setLoading(true);
    try {
      const curLabel = currency === "SAR"? "ر.س" : currency === "AED"? "د.إ" : currency === "YER"? "ر.ي" : "$";
      const fullNotes = `العنوان: ${address}${price? ` | السعر التقريبي: ${price} ${curLabel}` : ""}`;
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const { data, error } = await supabase.from("orders").insert([{
        customer_name: name.trim(), phone: phone.trim(),
        product_link: url.trim(), product_name: productType || "منتج من SHEIN",
        status: "جديد", notes: fullNotes, user_id: user?.id
      }]).select("tracking_code").single();
      if (error) throw error;
      if (data) setTrackingCode(data.tracking_code);
    } catch (err: any) { alert("حدث خطأ: " + err.message); }
    finally { setLoading(false); }
  };

  if (trackingCode) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#EDE0CC] flex items-center justify-center p-4 font-body">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 border border-[#dfcca9]">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50"><PackageCheck className="size-9" /></div>
          <div><h1 className="text-xl font-black text-[#4A3728]">تم استلام طلبك بنجاح!</h1><p className="text-xs text-gray-500 mt-1">احتفظ برقم الشحنة لتتبع طلبك</p></div>
          <div className="bg-[#FFFBF2] border-2 border-dashed border-[#8B5E34] rounded-2xl p-4">
            <span className="text-[11px] font-bold text-gray-500 block mb-1">رقم تتبع الشحنة</span>
            <div className="text-2xl font-black font-mono text-[#8B5E34] tracking-wider select-all">{trackingCode}</div>
            <button onClick={() => { navigator.clipboard.writeText(trackingCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#8B5E34] bg-white px-3 py-1.5 rounded-lg border shadow-sm">{copied? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}{copied? "تم النسخ!" : "نسخ الرقم"}</button>
          </div>
          <div className="text-right text-xs bg-gray-50 p-3.5 rounded-xl space-y-1.5 text-gray-700">
            <div><span className="font-bold">الاسم:</span> {name}</div>
            <div><span className="font-bold">الهاتف:</span> <span dir="ltr">{phone}</span></div>
            <div><span className="font-bold">المنتج:</span> {productType}</div>
            {price && <div><span className="font-bold">السعر:</span> {price} {currency}</div>}
            <div><span className="font-bold">العنوان:</span> {address}</div>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link to="/pay" search={{ order: trackingCode }} className="w-full bg-[#B4662A] hover:bg-[#96521e] text-white py-3.5 rounded-xl font-black flex items-center justify-center gap-2">المتابعة إلى الدفع 💳<ArrowRight className="size-4" /></Link>
            <Link to="/track" search={{ code: trackingCode }} className="w-full bg-[#4A3728] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">تتبع الشحنة<ArrowRight className="size-4" /></Link>
            <button onClick={() => window.print()} className="w-full border border-gray-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs"><Printer className="size-4" />طباعة السند</button>
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

            <ProductPriceForm
              url={url} setUrl={setUrl}
              title={productType} setTitle={setProductType}
              price={price} setPrice={setPrice}
              currency={currency} setCurrency={setCurrency}
            />

            <button onClick={() => { if (!url.trim()) { alert("الصق رابط المنتج أولاً"); return; } setStep(2); }}
              className="w-full bg-[#4A3728] hover:bg-[#382a1f] text-white rounded-xl py-3.5 font-black shadow">التالي: عنوان التوصيل</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex justify-between items-center">
              <h1 className="font-black text-[18px]">إتمام الطلب</h1>
              <span className="text-[11px] bg-[#F1E6D0] px-2 py-1 rounded-full">الخطوة 2 من 2</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-[#4A3728] flex items-center gap-1.5"><ShoppingBag className="size-3.5 text-[#8B5E34]" />المنتج المطلوب</div>
              <p className="text-[11px] text-gray-700 font-medium">{productType || "منتج SHEIN"}</p>
              {price && <div className="pt-1 text-[#8B5E34] font-black flex justify-between border-t border-amber-200/50"><span>السعر التقديري:</span><span>{price} {currency}</span></div>}
            </div>
            <div className="space-y-3">
              <div><label className="text-[12px] font-bold block mb-1">الاسم الكامل</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="أدخل اسمك الكامل" className="w-full bg-[#FDF8EE] border rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#C17A4A]" /></div>
              <div><label className="text-[12px] font-bold block mb-1">رقم الهاتف (واتساب)</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="7XXXXXXXX" dir="ltr" className="w-full bg-[#FDF8EE] border rounded-xl px-4 py-3 text-[13px] text-left outline-none focus:ring-2 focus:ring-[#C17A4A]" /></div>
              <div><label className="text-[12px] font-bold block mb-1">عنوان التوصيل بالتفصيل</label><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="المحافظة - الحي - الشارع..." className="w-full bg-[#FDF8EE] border rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#C17A4A]" /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={()=>setStep(1)} className="px-4 py-3 border border-gray-300 rounded-xl font-bold text-[13px]">رجوع</button>
              <button onClick={submit} disabled={loading} className="flex-1 bg-[#B4662A] text-white rounded-xl py-3.5 font-black disabled:opacity-50">{loading? "جاري الإرسال..." : "تأكيد وإرسال الطلب"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
