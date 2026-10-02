import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowLeft,
  Banknote,
  Coins,
  Landmark,
  Minus,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "النظام المالي والمحاسبي المتكامل | السوق الشامل" },
      {
        name: "description",
        content:
          "إدارة السيولة والصناديق وسندات القبض والصرف بالدولار والريال السعودي والريال اليمني.",
      },
    ],
  }),
  component: AccountsPage,
});

type Currency = "USD" | "SAR" | "YER";

interface Fund {
  id: number;
  name: string;
  kind: "bank" | "wallet" | "cash";
  balances: Record<Currency, number>;
}

interface Voucher {
  id: number;
  kind: "قبض" | "صرف";
  fundId: number;
  fundName: string;
  currency: Currency;
  amount: number;
  note: string;
  date: string;
}

const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: "USD", label: "دولار أمريكي", symbol: "$" },
  { code: "SAR", label: "ريال سعودي", symbol: "ر.س" },
  { code: "YER", label: "ريال يمني", symbol: "ر.ي" },
];

// أسعار الصرف مقابل الدولار (قابلة للتعديل من الحاسبة)
const DEFAULT_RATES: Record<Currency, number> = { USD: 1, SAR: 3.75, YER: 1600 };

const FUND_DEFS: { name: string; kind: Fund["kind"]; icon: React.ElementType }[] = [
  { name: "بنك الكريمي", kind: "bank", icon: Landmark },
  { name: "محفظة جوالي", kind: "wallet", icon: Wallet },
  { name: "محفظة ون كاش", kind: "wallet", icon: Wallet },
  { name: "محفظة جيب", kind: "wallet", icon: Wallet },
  { name: "صندوق صنعاء", kind: "cash", icon: Banknote },
  { name: "صندوق عدن", kind: "cash", icon: Banknote },
];

const LS_FUNDS = "alsouk_funds_v1";
const LS_VOUCHERS = "alsouk_vouchers_v1";
const LS_RATES = "alsouk_rates_v1";

const emptyBalances = (): Record<Currency, number> => ({ USD: 0, SAR: 0, YER: 0 });

const loadFunds = (): Fund[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_FUNDS) || "null");
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    /* تجاهل */
  }
  return FUND_DEFS.map((f, i) => ({ id: i + 1, name: f.name, kind: f.kind, balances: emptyBalances() }));
};

const loadVouchers = (): Voucher[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_VOUCHERS) || "null");
    if (Array.isArray(saved)) return saved;
  } catch {
    /* تجاهل */
  }
  return [];
};

const loadRates = (): Record<Currency, number> => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_RATES) || "null");
    if (saved && typeof saved === "object") return { ...DEFAULT_RATES, ...saved };
  } catch {
    /* تجاهل */
  }
  return { ...DEFAULT_RATES };
};

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

const kindStyles: Record<Fund["kind"], string> = {
  bank: "bg-sky-50 text-[#0F4C81] border-sky-200",
  wallet: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cash: "bg-orange-50 text-[#C2410C] border-orange-200",
};

export function AccountsPage() {
  const navigate = useNavigate();
  const [funds, setFunds] = useState<Fund[]>(loadFunds);
  const [vouchers, setVouchers] = useState<Voucher[]>(loadVouchers);
  const [rates, setRates] = useState<Record<Currency, number>>(loadRates);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isRatesOpen, setIsRatesOpen] = useState(false);

  const [voucherForm, setVoucherForm] = useState({
    kind: "قبض" as Voucher["kind"],
    fundId: 1,
    currency: "USD" as Currency,
    amount: "",
    note: "",
  });

  const [calc, setCalc] = useState({ amount: "100", from: "USD" as Currency, to: "YER" as Currency });

  const persist = (nextFunds: Fund[], nextVouchers: Voucher[]) => {
    setFunds(nextFunds);
    setVouchers(nextVouchers);
    localStorage.setItem(LS_FUNDS, JSON.stringify(nextFunds));
    localStorage.setItem(LS_VOUCHERS, JSON.stringify(nextVouchers));
  };

  // إجمالي السيولة لكل عملة عبر جميع الصناديق
  const totals = useMemo(() => {
    const t: Record<Currency, number> = { USD: 0, SAR: 0, YER: 0 };
    funds.forEach((f) => {
      (Object.keys(t) as Currency[]).forEach((c) => {
        t[c] += Number(f.balances?.[c] || 0);
      });
    });
    return t;
  }, [funds]);

  const saveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(voucherForm.amount);
    if (!amount || amount <= 0) return alert("يرجى إدخال مبلغ صحيح");
    const fund = funds.find((f) => f.id === voucherForm.fundId);
    if (!fund) return;

    const voucher: Voucher = {
      id: Date.now(),
      kind: voucherForm.kind,
      fundId: fund.id,
      fundName: fund.name,
      currency: voucherForm.currency,
      amount,
      note: voucherForm.note.trim() || "بدون وصف",
      date: new Date().toISOString(),
    };

    const nextFunds = funds.map((f) => {
      if (f.id !== fund.id) return f;
      const delta = voucher.kind === "قبض" ? amount : -amount;
      return { ...f, balances: { ...f.balances, [voucher.currency]: Number(f.balances?.[voucher.currency] || 0) + delta } };
    });

    persist(nextFunds, [voucher, ...vouchers]);
    setIsVoucherModalOpen(false);
    setVoucherForm({ kind: "قبض", fundId: 1, currency: "USD", amount: "", note: "" });
    alert(`تم تسجيل سند ${voucher.kind} بنجاح: ${fmt(amount)} ${voucher.currency}`);
  };

  const depositFund = (fundId: number) => {
    const input = prompt("مبلغ الإيداع (مثال: 500 USD أو 150000 YER):", "500 USD");
    if (!input) return;
    const match = input.trim().match(/^([\d.,]+)\s*(USD|SAR|YER)?$/i);
    if (!match) return alert("صيغة غير صحيحة. مثال: 500 USD");
    const amount = Number((match[1] ?? "0").replace(/,/g, ""));
    const currency = ((match[2] ?? "USD").toUpperCase() as Currency) || "USD";
    if (!amount || amount <= 0) return alert("أدخل مبلغاً صحيحاً");

    const nextFunds = funds.map((f) =>
      f.id === fundId
        ? { ...f, balances: { ...f.balances, [currency]: Number(f.balances?.[currency] || 0) + amount } }
        : f
    );
    const fund = funds.find((f) => f.id === fundId)!;
    persist(nextFunds, [
      {
        id: Date.now(),
        kind: "قبض",
        fundId,
        fundName: fund.name,
        currency,
        amount,
        note: "إيداع مباشر بالصندوق",
        date: new Date().toISOString(),
      },
      ...vouchers,
    ]);
    alert(`تم إيداع ${fmt(amount)} ${currency} في ${fund.name}`);
  };

  const deleteVoucher = (v: Voucher) => {
    if (!confirm(`حذف سند ${v.kind} (${fmt(v.amount)} ${v.currency})؟ سيتم إرجاع المبلغ للصندوق.`)) return;
    const nextFunds = funds.map((f) => {
      if (f.id !== v.fundId) return f;
      const delta = v.kind === "قبض" ? -v.amount : v.amount;
      return { ...f, balances: { ...f.balances, [v.currency]: Number(f.balances?.[v.currency] || 0) + delta } };
    });
    persist(nextFunds, vouchers.filter((x) => x.id !== v.id));
  };

  const calcResult = useMemo(() => {
    const amount = Number(calc.amount) || 0;
    const usd = amount / (rates[calc.from] || 1);
    return usd * (rates[calc.to] || 1);
  }, [calc, rates]);

  const updateRate = (code: Currency, value: string) => {
    const next = { ...rates, [code]: Number(value) || DEFAULT_RATES[code] };
    setRates(next);
    localStorage.setItem(LS_RATES, JSON.stringify(next));
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFF9F5] text-[#0A2540] font-sans pb-14"
    >
      {/* شريط علوي كبسولي */}
      <div className="bg-white border-b border-sky-100/80 px-4 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <a href="/admin" className="px-3 py-1.5 rounded-lg bg-[#004B87] text-white shadow-sm">
              لوحة الأدمن
            </a>
            <a
              href="/new-order"
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white shadow-sm hover:brightness-105"
            >
              اطلب الآن ⚡
            </a>
            <a href="/track" className="px-3 py-1.5 rounded-lg bg-sky-950 text-white shadow-sm">
              تتبع الشحنة
            </a>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>النظام المالي — النسخة الحية</span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* هيدر النظام المالي */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <h1 className="text-xl sm:text-2xl font-black text-[#0A2540]">
                النظام المالي والمحاسبي المتكامل
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              متعدد العملات: <strong className="text-[#0F4C81]">USD $</strong> •{" "}
              <strong className="text-emerald-700">SAR ر.س</strong> •{" "}
              <strong className="text-orange-600">YER ر.ي</strong> — سندات قبض وصرف وإيداع
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRatesOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black hover:bg-amber-100 transition cursor-pointer"
            >
              <ArrowDownUp className="size-3.5" />
              <span>حاسبة أسعار الصرف ⚡</span>
            </button>
            <button
              onClick={() => navigate({ to: "/admin" })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>رجوع للإدارة</span>
            </button>
          </div>
        </div>

        {/* بطاقات السيولة الثلاث */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {CURRENCIES.map(({ code, label, symbol }) => (
            <div
              key={code}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`size-10 rounded-xl grid place-items-center text-white ${
                    code === "USD" ? "bg-[#004B87]" : code === "SAR" ? "bg-emerald-600" : "bg-[#F97316]"
                  }`}
                >
                  <Coins className="size-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {label}
                </span>
              </div>
              <div className="text-3xl font-black font-mono text-[#0A2540] mb-1" dir="ltr">
                {symbol} {fmt(totals[code])}
              </div>
              <div className="text-xs font-bold text-slate-700">إجمالي السيولة المتاحة</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                موزعة على {funds.length} صناديق ومحافظ
              </div>
            </div>
          ))}
        </div>

        {/* أزرار السندات */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setVoucherForm((f) => ({ ...f, kind: "قبض" }));
                setIsVoucherModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-md hover:brightness-105 transition cursor-pointer"
            >
              <Plus className="size-4" />
              <span>+ سند قبض جديد</span>
            </button>
            <button
              onClick={() => {
                setVoucherForm((f) => ({ ...f, kind: "صرف" }));
                setIsVoucherModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 text-white text-xs font-black shadow-md hover:brightness-105 transition cursor-pointer"
            >
              <Minus className="size-4" />
              <span>- سند صرف جديد</span>
            </button>
          </div>
          <div className="text-[11px] font-bold text-slate-500">
            آخر الحركات: <span className="font-mono text-[#0F4C81]">{vouchers.length}</span> سند مسجل
          </div>
        </div>

        {/* الصناديق الستة */}
        <div>
          <h2 className="text-sm font-black text-[#0F4C81] mb-3 flex items-center gap-2">
            <Landmark className="size-4 text-[#F97316]" />
            صناديق ومحافظ الشركة الستة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {funds.map((fund) => {
              const Icon = FUND_DEFS.find((d) => d.name === fund.name)?.icon || Wallet;
              return (
                <div
                  key={fund.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`size-9 rounded-xl border grid place-items-center ${kindStyles[fund.kind]}`}>
                        <Icon className="size-4" />
                      </div>
                      <div className="leading-tight">
                        <div className="text-xs font-black text-[#0A2540]">{fund.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          {fund.kind === "bank" ? "حساب بنكي" : fund.kind === "wallet" ? "محفظة إلكترونية" : "صندوق نقدي"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => depositFund(fund.id)}
                      className="size-8 rounded-xl bg-[#0F4C81] text-white grid place-items-center hover:bg-[#0A2540] transition shadow-sm cursor-pointer"
                      title="إيداع بالصندوق"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {CURRENCIES.map(({ code, symbol }) => (
                      <div
                        key={code}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50/80 text-xs"
                      >
                        <span className="font-bold text-slate-500">{symbol} {code}</span>
                        <span className="font-mono font-black text-[#0A2540]" dir="ltr">
                          {fmt(Number(fund.balances?.[code] || 0))}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                    <button
                      onClick={() => {
                        setVoucherForm({ kind: "قبض", fundId: fund.id, currency: "YER", amount: "", note: "" });
                        setIsVoucherModalOpen(true);
                      }}
                      className="text-emerald-600 hover:underline cursor-pointer"
                    >
                      + إيداع
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => {
                        setVoucherForm({ kind: "صرف", fundId: fund.id, currency: "YER", amount: "", note: "" });
                        setIsVoucherModalOpen(true);
                      }}
                      className="text-rose-600 hover:underline cursor-pointer"
                    >
                      - صرف مسحوب
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* الحاسبة السريعة */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <h2 className="text-sm font-black text-[#0F4C81] mb-3 flex items-center gap-2">
            <ArrowDownUp className="size-4 text-[#F97316]" />
            حاسبة التحويل بين العملات
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">المبلغ</label>
              <input
                type="number"
                value={calc.amount}
                onChange={(e) => setCalc({ ...calc, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono outline-none focus:border-[#0284C7]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">من</label>
              <select
                value={calc.from}
                onChange={(e) => setCalc({ ...calc, from: e.target.value as Currency })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-[#0284C7]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">إلى</label>
              <select
                value={calc.to}
                onChange={(e) => setCalc({ ...calc, to: e.target.value as Currency })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-[#0284C7]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F0F7FF] border border-sky-200 text-center">
              <div className="text-[10px] font-bold text-slate-500">الناتج</div>
              <div className="text-lg font-black font-mono text-[#0F4C81]" dir="ltr">
                {fmt(calcResult)} {calc.to}
              </div>
            </div>
          </div>
        </div>

        {/* سجل السندات */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black text-[#0F4C81] flex items-center gap-2">
              <Receipt className="size-4 text-[#F97316]" />
              سجل سندات القبض والصرف
            </span>
            <span className="text-[11px] font-bold text-slate-500">{vouchers.length} سند</span>
          </div>

          {vouchers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              لا توجد سندات بعد — ابدأ بسند قبض أو صرف جديد.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {vouchers.map((v) => (
                <div key={v.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`size-8 rounded-xl grid place-items-center text-white shrink-0 ${
                        v.kind === "قبض" ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                    >
                      {v.kind === "قبض" ? <Plus className="size-4" /> : <Minus className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-[#0A2540] truncate">
                        سند {v.kind} — {v.note}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold truncate">
                        {v.fundName} • {new Date(v.date).toLocaleString("ar-YE")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono font-black text-xs ${
                        v.kind === "قبض" ? "text-emerald-600" : "text-rose-600"
                      }`}
                      dir="ltr"
                    >
                      {v.kind === "قبض" ? "+" : "-"} {fmt(v.amount)} {v.currency}
                    </span>
                    <button
                      onClick={() => deleteVoucher(v)}
                      className="size-7 rounded-lg bg-red-50 text-red-500 grid place-items-center hover:bg-red-100 transition cursor-pointer"
                      title="حذف السند"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* نافذة سند جديد */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-black text-[#0F4C81]">
                {voucherForm.kind === "قبض" ? "+ سند قبض جديد" : "- سند صرف جديد"}
              </h2>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={saveVoucher} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-600">الصندوق / المحفظة:</label>
                <select
                  value={voucherForm.fundId}
                  onChange={(e) => setVoucherForm({ ...voucherForm, fundId: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#0284C7]"
                >
                  {funds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1 text-slate-600">العملة:</label>
                  <select
                    value={voucherForm.currency}
                    onChange={(e) => setVoucherForm({ ...voucherForm, currency: e.target.value as Currency })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#0284C7]"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-600">المبلغ:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={voucherForm.amount}
                    onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono outline-none focus:border-[#0284C7]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-600">البيان / الوصف:</label>
                <input
                  type="text"
                  placeholder="مثال: تحصيل مبلغ شحنة SQ-892411"
                  value={voucherForm.note}
                  onChange={(e) => setVoucherForm({ ...voucherForm, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-bold shadow-md transition ${
                    voucherForm.kind === "قبض"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  حفظ السند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة أسعار الصرف */}
      {isRatesOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-black text-[#0F4C81]">تعديل أسعار الصرف ⚡</h2>
              <button
                onClick={() => setIsRatesOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-bold mb-3">
              الأسعار مقابل الدولار الأمريكي الواحد — تُستخدم في الحاسبة.
            </p>
            <div className="space-y-3">
              {CURRENCIES.filter((c) => c.code !== "USD").map(({ code, label }) => (
                <div key={code} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-[#0A2540]">1 USD = ? {label}</span>
                  <input
                    type="number"
                    value={rates[code]}
                    onChange={(e) => updateRate(code, e.target.value)}
                    className="w-28 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono text-center outline-none focus:border-[#0284C7]"
                    dir="ltr"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => setIsRatesOpen(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-black hover:bg-[#0A2540] transition shadow-md cursor-pointer"
            >
              حفظ وإغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountsPage;
