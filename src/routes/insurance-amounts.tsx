import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

export const Route = createFileRoute("/insurance-amounts")({
  component: InsurancePage,
});

function InsurancePage() {
  const [list, setList] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const { data } = await db.from("insurance_amounts").select("*").order("created_at", { ascending: false });
    if (data) setList(data);
    const { data: acc } = await db.from("accounts").select("id, name");
    if (acc) setAccounts(acc);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId ||!amount) return;
    setLoading(true);
    const { error } = await db.from("insurance_amounts").insert({
      account_id: parseInt(accountId),
      amount: parseFloat(amount),
      description: desc,
    });
    setLoading(false);
    if (!error) {
      setAccountId(""); setAmount(""); setDesc("");
      fetchData();
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] p-6 font-['Cairo',sans-serif]">
      <h1 className="text-2xl font-extrabold text-[#3d2314] mb-6">مبالغ التأمين</h1>

      <form onSubmit={handleAdd} className="bg-white rounded-[24px] p-6 border border-[#ede5d8] mb-6 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5">الحساب *</label>
            <select value={accountId} onChange={e=>setAccountId(e.target.value)}
              className="w-full h-12 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] px-4 text-sm">
              <option value="">اختر الحساب</option>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3d2314] mb-1.5">المبلغ *</label>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-12 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] px-4 text-sm" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-bold text-[#3d2314] mb-1.5">البيان</label>
          <input type="text" value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder="وصف مبلغ التأمين"
            className="w-full h-12 rounded-xl border border-[#ded5c7] bg-[#fbf9f5] px-4 text-sm" />
        </div>
        <button disabled={loading}
          className="mt-4 w-full h-12 rounded-2xl bg-[#3d2314] text-white font-bold text-sm hover:bg-[#2b170c] disabled:opacity-60">
          {loading? "جارٍ الحفظ..." : "إضافة مبلغ التأمين"}
        </button>
      </form>

      <div className="bg-white rounded-[24px] border border-[#ede5d8] overflow-hidden max-w-4xl">
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
            {list.map(item=>(
              <tr key={item.id} className="border-t border-[#ede5d8]">
                <td className="p-3">{item.account_id}</td>
                <td className="p-3 font-bold">{item.amount}</td>
                <td className="p-3">{item.description}</td>
                <td className="p-3 text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString('ar')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
