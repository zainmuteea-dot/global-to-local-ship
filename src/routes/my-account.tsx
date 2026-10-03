import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserRound, Star, BookCheck, Coins, MapPin, Wallet, Headset, Bell, Share2, FileText, ShieldCheck, LogOut, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/my-account")({
  component: MyAccountPage,
});

function MyAccountPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/" }); return; }
      const { data: p } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single();
      setProfile({
        name: p?.full_name || user.user_metadata?.full_name || user.email,
        phone: p?.phone || user.phone || "",
      });
      setLoading(false);
    };
    load();
  }, [navigate]);

  const menu = [
    { label: 'تعديل حسابي', icon: UserRound, href: '/my-account/edit' },
    { label: 'تقييمي', icon: Star, href: '#' },
    { label: 'طلباتي', icon: BookCheck, href: '/track' },
    { label: 'النقاط التراكمية', icon: Coins, href: '#' },
    { label: 'العناوين', icon: MapPin, href: '/my-account/addresses' },
    { label: 'رصيدي', icon: Wallet, href: '#' },
    { label: 'خدمة العملاء', icon: Headset, href: '#' },
    { label: 'الإشعارات', icon: Bell, href: '#' },
    { label: 'مشاركة المنصة', icon: Share2, href: '#' },
    { label: 'شروط الاستخدام', icon: FileText, href: '#' },
    { label: 'سياسة الخصوصية', icon: ShieldCheck, href: '#' },
  ];

  if (loading) return <div dir="rtl" className="p-10 text-center font-bold">جاري التحميل...</div>;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 max-w-md mx-auto font-sans">
      <h1 className="font-black text-xl mb-4 text-center">حسابي</h1>

      <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm mb-4">
        <div className="size-14 rounded-full bg-slate-200 grid place-items-center shrink-0">
          <UserRound className="size-7 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500">أهلاً بك</p>
          <h2 className="font-black text-sm truncate">{profile?.name}</h2>
          {profile?.phone? <p className="text-xs text-slate-500 mt-0.5" dir="ltr">{profile.phone}</p> : null}
        </div>
        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold shrink-0">متصل</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        {menu.map((item, i) => (
          <a key={i} href={item.href} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <item.icon className="size-5 text-slate-600" />
              <span className="text-sm font-bold">{item.label}</span>
            </div>
            <ChevronLeft className="size-4 text-slate-400" />
          </a>
        ))}
      </div>

      <button
        onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
        className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-2xl text-red-600 font-black text-sm shadow-sm hover:bg-red-50"
      >
        <LogOut className="size-5" /> تسجيل الخروج
      </button>
    </div>
  );
}
