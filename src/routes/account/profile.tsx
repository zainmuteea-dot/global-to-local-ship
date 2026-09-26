import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCheck, Mail, Phone, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AccountShell } from "@/components/AccountShell";

export const Route = createFileRoute("/account/profile")({
  head: () => ({
    meta: [
      { title: "تعديل الحساب — السوق الشامل" },
      { name: "description", content: "عدّل اسمك ورقم جوالك في حسابك على السوق الشامل." },
      { property: "og:title", content: "تعديل الحساب — السوق الشامل" },
      { property: "og:description", content: "عدّل اسمك ورقم جوالك في حسابك على السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useSession();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.full_name ?? "");
      setPhone((data?.phone ?? "").replace(/^\+967\s?/, ""));
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    const n = name.trim();
    const d = phone.replace(/\D/g, "");
    if (!n || n.length > 100) return setMsg("أدخل اسماً صحيحاً");
    if (d && d.length !== 9) return setMsg("رقم الجوال 9 أرقام");
    const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: n, phone: d ? `+967 ${d}` : null });
    setMsg(error ? "تعذر الحفظ" : "تم حفظ التعديلات ✓");
  };

  const field = "mt-2 w-full rounded-2xl bg-background px-4 py-3.5 text-cocoadeep outline-none ring-1 ring-border focus:ring-2 focus:ring-cocoa";
  return (
    <AccountShell title="تعديل الحساب">
      <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
        <label className="flex items-center gap-1.5 text-sm font-bold text-cocoa"><UserRound className="size-4" /> الاسم</label>
        <input value={name} onChange={(e) => { setName(e.target.value); setMsg(""); }} className={field} />
        <label className="mt-4 flex items-center gap-1.5 text-sm font-bold text-cocoa"><Phone className="size-4" /> رقم الجوال</label>
        <input value={phone} onChange={(e) => { setPhone(e.target.value); setMsg(""); }} inputMode="numeric" placeholder="7XXXXXXXX" className={`${field} tracking-widest`} />
        <label className="mt-4 flex items-center gap-1.5 text-sm font-bold text-cocoa"><Mail className="size-4" /> البريد الإلكتروني</label>
        <input dir="ltr" value={user?.email ?? ""} readOnly className={`${field} bg-secondary text-muted-foreground`} />
        {msg && <p className="mt-3 text-center text-xs font-bold text-clay">{msg}</p>}
        <button onClick={save} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa py-3.5 font-bold text-cream">
          <CheckCheck className="size-4" /> حفظ التعديلات
        </button>
      </div>
    </AccountShell>
  );
}
