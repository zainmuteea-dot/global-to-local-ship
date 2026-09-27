import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SalesReturns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ invoice_id: "", reason: "" });
  const [items, setItems] = useState([{ product_id: "", quantity: 1, unit_price: 0 }]);

  const load = async () => {
    const { data } = await supabase.from("sales_returns").select("*, sales_invoices(invoice_number)").order("created_at", { ascending: false });
    setReturns(data || []);
    const inv = await supabase.from("sales_invoices").select("id, invoice_number");
    setInvoices(inv.data || []);
    const prod = await supabase.from("products").select("id, name, sale_price");
    setProducts(prod.data || []);
  };
  useEffect(() => { load(); }, []);

  const addItem = () => setItems([...items, { product_id: "", quantity: 1, unit_price: 0 }]);

  const submit = async () => {
    const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const { data: ret, error } = await supabase.from("sales_returns").insert({
      invoice_id: form.invoice_id,
      return_number: `SR-${Date.now()}`,
      reason: form.reason,
      total_amount: total,
      status: "completed"
    }).select().single();
    if (error) return alert(error.message);
    for (const it of items) {
      await supabase.from("sales_return_items").insert({
        return_id: ret.id,
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: it.quantity * it.unit_price
      });
      await supabase.rpc("increment_product_stock", { p_id: it.product_id, p_qty: it.quantity });
    }
    setForm({ invoice_id: "", reason: "" });
    setItems([{ product_id: "", quantity: 1, unit_price: 0 }]);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">مرتجعات المبيعات</h1>
      <Card><CardHeader><CardTitle>مرتجع جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={form.invoice_id} onValueChange={v => setForm({...form, invoice_id: v })}>
            <SelectTrigger><SelectValue placeholder="اختر الفاتورة" /></SelectTrigger>
            <SelectContent>{invoices.map(i => <SelectItem key={i.id} value={i.id}>{i.invoice_number}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="سبب الإرجاع" value={form.reason} onChange={e => setForm({...form, reason: e.target.value })} />
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-2">
              <Select value={it.product_id} onValueChange={v => {
                const p = products.find(x => x.id === v);
                const c = [...items]; c[idx] = {...c[idx], product_id: v, unit_price: p?.sale_price || 0 }; setItems(c);
              }}>
                <SelectTrigger><SelectValue placeholder="منتج" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" className="w-24" value={it.quantity} onChange={e => { const c=[...items]; c[idx].quantity=+e.target.value; setItems(c); }} />
              <Input type="number" className="w-32" value={it.unit_price} onChange={e => { const c=[...items]; c[idx].unit_price=+e.target.value; setItems(c); }} />
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={addItem}>+ صنف</Button>
            <Button onClick={submit}>حفظ المرتجع</Button>
          </div>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>السجل</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-right p-2">الرقم</th><th className="text-right p-2">الفاتورة</th><th className="text-right p-2">الإجمالي</th><th className="text-right p-2">السبب</th></tr></thead>
          <tbody>{returns.map(r => <tr key={r.id} className="border-b"><td className="p-2">{r.return_number}</td><td className="p-2">{r.sales_invoices?.invoice_number}</td><td className="p-2">{r.total_amount}</td><td className="p-2">{r.reason}</td></tr>)}</tbody></table>
        </CardContent>
      </Card>
    </div>
  );
}
