import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

export const Route = createFileRoute("/insurance-amounts")({
  component: () => (
    <AdminRouteGuard redirectTo="/insurance-amounts">
      <InsurancePage />
    </AdminRouteGuard>
  ),
});

function InsurancePage() {
  const [list, setList] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchData = async () => {
    setErrorMessage("");
    const { data, error } = await db
      .from("insurance_amounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setErrorMessage(`تعذر تحميل مبالغ التأمين: ${error.message}`);
    else if (data) setList(data);
    const { data: acc, error: accountError } = await db.from("accounts").select("id, name");
    if (accountError)
      setErrorMessage((prev: string) => prev || `تعذر تحميل الحسابات: ${accountError.message}`);
    else if (acc) setAccounts(acc);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    const parsedAccountId = Number(accountId);
    if (
      !accountId ||
      !Number.isFinite(parsedAccountId) ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setErrorMessage("اختر حسابًا وأدخل مبلغًا صحيحًا أكبر من صفر.");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    const { error } = await db.from("insurance_amounts").insert({
      account_id: parsedAccountId,
      amount: parsedAmount,
      description: desc.trim() || null,
    });
    setLoading(false);
    if (error) {
      setErrorMessage(`تعذر حفظ مبلغ التأمين: ${error.message}`);
      return;
    }
    setAccountId("");
    setAmount("");
    setDesc("");
    await fetchData();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] p-6 font-['Cairo',sans-serif]">
      <h1 className="text-2xl font-extrabold text-[#3d2314] mb-6">مبالغ التأمين</h1>
      {errorMessage && (
        <p
          role="alert"
          className="mb-4 max-w-4xl rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800"
        >
          {errorMessage}
        </p>
      )}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-[24px] p-6 border border-[#ede5d8] mb-6 max-w-2xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5">الحساب *</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full h-12 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] px-4 text-sm"
            >
              <option value="">اختر الحساب</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5">المبلغ *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-12 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] px-4 text-sm"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-bold text-[#3d2314] mb-1.5">البيان</label>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="وصف مبلغ التأمين"
            className="w-full h-12 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] px-4 text-sm"
          />
        </div>
        <button
          disabled={loading}
          className="mt-4 w-full h-12 rounded-2xl bg-[#3d2314] text-white font-bold text-sm hover:bg-[#2b170c] disabled:opacity-60"
        >
          {loading ? "جارٍ الحفظ..." : "إضافة مبلغ التأمين"}
        </button>
      </form>
      <div className="bg-white rounded-[24px] border border-[#ede5d8] overflow-x-auto max-w-4xl">
        <table className="w-full text-sm">
          <thead className="bg-[#f5ede1] text-[#3d2314]">
            <tr>
              <th className="p-3 text-right font-bold">الحساب</th>
              <th className="p-3 text-right font-bold">المبلغ</th>
              <th className="p-3 text-right font-bold">البيان</th>
              <th className="p-3 text-right font-bold">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr key={item.id} className="border-t border-[#ede5d8]">
                <td className="p-3">
                  {accounts.find((a) => String(a.id) === String(item.account_id))?.name ??
                    item.account_id}
                </td>
                <td className="p-3 font-bold">{item.amount}</td>
                <td className="p-3">{item.description}</td>
                <td className="p-3 text-xs text-gray-500">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString("ar") : "—"}
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-slate-500">
                  لا توجد مبالغ مسجلة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
