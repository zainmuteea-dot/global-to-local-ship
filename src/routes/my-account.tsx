import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

type Sheet = null | "name" | "avatar";

export default function MyAccountPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession(true);

  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; avatar_url: string | null } | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [hasAddress, setHasAddress] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    setProfile(data);
    if (data?.avatar_url) {
      const { data: s } = await supabase.storage.from("avatars").createSignedUrl(data.avatar_url, 3600);
      setAvatar(s?.signedUrl?? null);
    }
    const { count } = await supabase.from("addresses").select("*", { count: "exact", head: true }).eq("user_id", uid);
    setHasAddress((count?? 0) > 0);
  };

  useEffect(() => { if (user) load(user.id); }, [user]);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#8B5E3C]/30 border-t-[#8B5E3C] rounded-full animate-spin" />
          <p className="text-sm text-[#7D6E63] font-medium">جارٍ تحميل بيانات الحساب...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4">
      {/* هنا باقي واجهة حسابك كما كانت */}
      <h1 className="text-xl font-bold">حسابي</h1>
      <p>{profile?.full_name?? "مستخدم"}</p>
      {avatar && <img src={avatar} className="w-20 h-20 rounded-full" />}
      <p>{hasAddress? "لديك عنوان" : "لا يوجد عنوان"}</p>
    </div>
  );
}
