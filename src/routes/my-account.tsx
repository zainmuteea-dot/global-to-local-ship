import React, { useEffect, useState } from 'react';
import { 
  User, 
  ShoppingBag, 
  FileText, 
  Zap, 
  MapPin, 
  Wallet, 
  Headphones, 
  Bell, 
  Share2, 
  ShieldCheck, 
  Info, 
  LogOut, 
  ArrowRight, 
  ChevronLeft, 
  Check, 
  Copy, 
  ExternalLink, 
  X, 
  Clock, 
  Truck, 
  DollarSign, 
  Edit3, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { useSession } from '@/hooks/use-session';
import { OrdersService } from '@/services/supabaseOrders';
import { OrderItem } from '@/types/orders';

interface MyAccountProps {
  onNavigateToCreateAccount?: () => void;
  onNavigateToNewOrder?: () => void;
  onNavigateToTracker?: (orderNumber?: string) => void;
  onNavigateToDashboard?: () => void;
}

export const MyAccountPage: React.FC<MyAccountProps> = ({
  onNavigateToCreateAccount,
  onNavigateToNewOrder,
  onNavigateToTracker,
  onNavigateToDashboard
}) => {
  const { session, user, isLoading, signOut } = useSession();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  
  // بيانات الملف الشخصي
  const [customerName, setCustomerName] = useState('zain muteea');
  const [customerPhone, setCustomerPhone] = useState('772399744');
  const [customerCity, setCustomerCity] = useState('صنعاء');
  const [customerAddress, setCustomerAddress] = useState('');

  // حالات النوافذ المنبثقة للأزرار
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // تحميل بيانات المستخدم والطلبات
  useEffect(() => {
    try {
      const stored = localStorage.getItem('alsouk_current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.full_name) setCustomerName(parsed.full_name);
        if (parsed.phone) setCustomerPhone(parsed.phone);
        if (parsed.city) setCustomerCity(parsed.city);
        if (parsed.address) setCustomerAddress(parsed.address);
      } else if (user) {
        if (user.user_metadata?.full_name) setCustomerName(user.user_metadata.full_name);
        if (user.user_metadata?.phone) setCustomerPhone(user.user_metadata.phone);
      }
      setOrders(OrdersService.getLocalOrders());
    } catch (e) {
      console.warn(e);
    }
  }, [user]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = {
        id: user?.id || 'guest',
        full_name: customerName,
        phone: customerPhone,
        city: customerCity,
        address: customerAddress,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('alsouk_current_user', JSON.stringify(updated));
      setEditSuccess(true);
      setTimeout(() => {
        setEditSuccess(false);
        setActiveModal(null);
      }, 1500);
    } catch {}
  };

  const handleSharePlatform = () => {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://alshamel-shopping.com';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleLogout = async () => {
    await signOut();
    if (onNavigateToCreateAccount) {
      onNavigateToCreateAccount();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/create-account';
    }
  };

  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] via-[#FAF9F6] to-[#FFF7ED] text-[#0A2540] font-sans selection:bg-[#0F4C81] selection:text-white pb-20" dir="rtl">
      
      {/* 🌟 1. الهيدر والترويسة العلوية بألوان الشعار */}
      <header className="max-w-md mx-auto pt-6 pb-3 px-4 flex items-center justify-between">
        <button
          onClick={() => {
            if (onNavigateToDashboard) onNavigateToDashboard();
            else if (typeof window !== 'undefined') window.location.href = '/';
          }}
          className="px-4 py-2 rounded-2xl bg-white/90 hover:bg-sky-50 border-2 border-sky-100 hover:border-[#0F4C81] text-xs font-black text-[#0F4C81] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 group"
          title="الرجوع للرئيسية"
        >
          <ArrowRight className="w-4 h-4 text-[#0F4C81] group-hover:-translate-x-0.5 transition-transform" />
          <span>رجوع</span>
        </button>

        <h1 className="text-xl sm:text-2xl font-black text-[#0F4C81] tracking-tight">
          إدارة الحساب
        </h1>

        <div className="w-16 flex justify-end">
          <div className="flex items-center gap-1 text-[11px] font-black text-[#0F4C81]">
            <span>AL SHAMEL</span>
          </div>
        </div>
      </header>

      {/* 🌟 2. المحتوى الرئيسي وقائمة الأزرار المطورة */}
      <main className="max-w-md mx-auto px-4 mt-2 space-y-3.5">
        
        {/* 🌟 بطاقة ملف المستخدم الرئيسية (Hero Profile Card) */}
        <div className="bg-white/95 backdrop-blur-md border-2 border-sky-100 rounded-[28px] p-5 sm:p-6 shadow-[0_16px_50px_rgba(15,76,129,0.08)] ring-1 ring-sky-50 flex items-center justify-between gap-4">
          <div className="space-y-1 text-right">
            <span className="text-xs font-bold text-slate-500 block">أهلاً بك،</span>
            <h2 className="text-lg sm:text-xl font-black text-[#0F4C81] tracking-tight">
              {customerName}
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-600">
              <span dir="ltr">{customerPhone}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="متصل"></span>
            </div>
            
            <button
              onClick={() => setActiveModal('address')}
              className="inline-flex items-center gap-1 text-[11px] font-black text-[#EA580C] bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-xl border border-orange-200 transition-all cursor-pointer shadow-2xs mt-1"
            >
              <MapPin className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>{customerAddress ? `${customerCity} - ${customerAddress}` : 'أضف عنوان للتوصيل'}</span>
            </button>
          </div>

          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0F4C81] via-[#0284C7] to-[#0F4C81] text-white flex items-center justify-center font-black text-2xl shadow-md shadow-[#0F4C81]/30 ring-4 ring-sky-100">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FF7A00] border-2 border-white flex items-center justify-center text-white" title="موثق">
              <Sparkles className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* 🌟 3. قائمة الأزرار المطورة بألوان الشعار وتأثيرات تفاعلية راقية */}
        <div className="space-y-2.5">
          
          {/* 1. زر حسابي */}
          <button
            onClick={() => setActiveModal('profile')}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-sky-50/60 border-2 border-slate-200/80 hover:border-[#0F4C81] rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0F4C81] group-hover:bg-[#0F4C81] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <User className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-[#0F4C81] transition-colors">
                حسابي
              </span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#0F4C81] group-hover:-translate-x-1 transition-transform" />
          </button>

          {/* 2. زر طلباتي */}
          <button
            onClick={() => setActiveModal('orders')}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-orange-50/60 border-2 border-slate-200/80 hover:border-[#FF7A00] rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF7A00] group-hover:bg-[#FF7A00] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-[#FF7A00] transition-colors">
                طلباتي
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeOrdersCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-[#EA580C] border border-orange-200">
                  {activeOrdersCount} نشط
                </span>
              )}
              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#FF7A00] group-hover:-translate-x-1 transition-transform" />
            </div>
          </button>

          {/* 3. زر فواتير المبيعات */}
          <button
            onClick={() => setActiveModal('invoices')}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-sky-50/60 border-2 border-slate-200/80 hover:border-[#0F4C81] rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284C7] group-hover:bg-[#0284C7] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-[#0F4C81] transition-colors">
                فواتير المبيعات
              </span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#0F4C81] group-hover:-translate-x-1 transition-transform" />
          </button>

          {/* 4. زر القطع الفورية */}
          <button
            onClick={() => {
              if (onNavigateToNewOrder) onNavigateToNewOrder();
              else if (typeof window !== 'undefined') window.location.href = '/new-order';
            }}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-amber-50/60 border-2 border-slate-200/80 hover:border-amber-500 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-amber-600 transition-colors">
                القطع الفورية
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                فوري ⚡
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:-translate-x-1 transition-transform" />
            </div>
          </button>

          {/* 5. زر العناوين */}
          <button
            onClick={() => setActiveModal('address')}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-emerald-50/60 border-2 border-slate-200/80 hover:border-emerald-600 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-emerald-700 transition-colors">
                العناوين
              </span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:-translate-x-1 transition-transform" />
          </button>

          {/* 6. زر رصيدي */}
          <button
            onClick={() => setActiveModal('wallet')}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-orange-50/60 border-2 border-slate-200/80 hover:border-[#EA580C] rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#EA580C] group-hover:bg-[#EA580C] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-[#EA580C] transition-colors">
                رصيدي
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                0.00 ر.ي
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#EA580C] group-hover:-translate-x-1 transition-transform" />
            </div>
          </button>

          {/* 7. زر خدمة العملاء */}
          <button
            onClick={() => setActiveModal('support')}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-sky-50/60 border-2 border-slate-200/80 hover:border-[#0F4C81] rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0F4C81] group-hover:bg-[#0F4C81] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <Headphones className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-[#0F4C81] transition-colors">
                خدمة العملاء
              </span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#0F4C81] group-hover:-translate-x-1 transition-transform" />
          </button>

          {/* 8. زر الإشعارات */}
          <button
            onClick={() => setActiveModal('notifications')}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-orange-50/60 border-2 border-slate-200/80 hover:border-[#FF7A00] rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF7A00] group-hover:bg-[#FF7A00] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <Bell className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-[#FF7A00] transition-colors">
                الإشعارات
              </span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#FF7A00] group-hover:-translate-x-1 transition-transform" />
          </button>

          {/* 9. زر مشاركة المنصة */}
          <button
            onClick={handleSharePlatform}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-indigo-50/60 border-2 border-slate-200/80 hover:border-indigo-600 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-indigo-700 transition-colors">
                مشاركة المنصة
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {copiedLink && (
                <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  تم نسخ الرابط ✓
                </span>
              )}
              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-700 group-hover:-translate-x-1 transition-transform" />
            </div>
          </button>

          {/* 10. زر شروط الاستخدام */}
          <button
            onClick={() => setActiveModal('terms')}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-slate-50 border-2 border-slate-200/80 hover:border-slate-500 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-slate-900 transition-colors">
                شروط الاستخدام
              </span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:-translate-x-1 transition-transform" />
          </button>

          {/* 11. زر سياسة الخصوصية */}
          <button
            onClick={() => setActiveModal('privacy')}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-teal-50/60 border-2 border-slate-200/80 hover:border-teal-600 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-teal-700 transition-colors">
                سياسة الخصوصية
              </span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-teal-700 group-hover:-translate-x-1 transition-transform" />
          </button>

          {/* 12. زر معلومات المنصة */}
          <button
            onClick={() => setActiveModal('about')}
            className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-sky-50/60 border-2 border-slate-200/80 hover:border-[#0F4C81] rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0F4C81] group-hover:bg-[#0F4C81] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
                <Info className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-800 group-hover:text-[#0F4C81] transition-colors">
                معلومات المنصة
              </span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#0F4C81] group-hover:-translate-x-1 transition-transform" />
          </button>

          {/* 13. زر تسجيل الخروج الفاخر باللون الأحمر */}
          <button
            onClick={handleLogout}
            className="w-full bg-rose-50/70 hover:bg-rose-100 border-2 border-rose-200 hover:border-rose-400 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group active:scale-[0.99] mt-3"
          >
            <LogOut className="w-4.5 h-4.5 text-rose-600 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-black text-rose-600 group-hover:text-rose-700">
              تسجيل الخروج
            </span>
          </button>

        </div>
      </main>

      {/* 🌟 4. النوافذ التفاعلية المنبثقة لكل زر عند النقر (Interactive Modals) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
          <div className="bg-white border-2 border-sky-100 rounded-[32px] p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b-2 border-sky-100">
              <h3 className="text-base font-black text-[#0F4C81] flex items-center gap-2">
                {activeModal === 'profile' && <span>تعديل بيانات الحساب</span>}
                {activeModal === 'orders' && <span>طلباتي المسجلة</span>}
                {activeModal === 'invoices' && <span>فواتير المبيعات وسندات الشحن</span>}
                {activeModal === 'address' && <span>عناوين التوصيل والاستلام</span>}
                {activeModal === 'wallet' && <span>رصيد الحساب والمحفظة</span>}
                {activeModal === 'support' && <span>خدمة العملاء والدعم الفني</span>}
                {activeModal === 'notifications' && <span>مركز الإشعارات</span>}
                {activeModal === 'terms' && <span>شروط الاستخدام</span>}
                {activeModal === 'privacy' && <span>سياسة الخصوصية والأمان</span>}
                {activeModal === 'about' && <span>عن السوق الشامل (AL SHAMEL)</span>}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* محتوى: تعديل بيانات الحساب */}
            {activeModal === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[#0F4C81] font-black mb-1">الاسم الكامل:</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 font-bold focus:outline-none focus:border-[#0F4C81]"
                  />
                </div>
                <div>
                  <label className="block text-[#0F4C81] font-black mb-1">رقم الهاتف:</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 font-mono font-bold focus:outline-none focus:border-[#0F4C81]"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[#0F4C81] font-black mb-1">المدينة:</label>
                  <select
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 font-bold focus:outline-none focus:border-[#0F4C81]"
                  >
                    <option value="صنعاء">صنعاء</option>
                    <option value="عدن">عدن</option>
                    <option value="تعز">تعز</option>
                    <option value="الحديدة">الحديدة</option>
                    <option value="إب">إب</option>
                    <option value="حضرموت (المكلا)">حضرموت (المكلا)</option>
                    <option value="مأرب">مأرب</option>
                    <option value="ذمار">ذمار</option>
                  </select>
                </div>
                {editSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-center border border-emerald-200">
                    تم حفظ التعديلات بنجاح ✓
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0F4C81] via-[#0284C7] to-[#0F4C81] text-white font-black text-sm shadow-md cursor-pointer transition active:scale-95"
                >
                  حفظ البيانات
                </button>
              </form>
            )}

            {/* محتوى: طلباتي */}
            {activeModal === 'orders' && (
              <div className="space-y-3">
                {orders.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    لا توجد طلبات مسجلة حالياً.
                  </div>
                ) : (
                  orders.map((ord) => (
                    <div key={ord.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          {ord.orderNumber}
                        </span>
                        <span className="font-black text-white bg-gradient-to-r from-[#FF7A00] to-[#EA580C] px-2 py-0.5 rounded-md text-[10px]">
                          {OrdersService.getStatusLabel(ord.status)}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800">{ord.productTitle}</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                        <span>المتجر: {ord.storeName}</span>
                        <button
                          onClick={() => {
                            if (onNavigateToTracker) onNavigateToTracker(ord.orderNumber);
                            else if (typeof window !== 'undefined') window.location.href = `/track?order=${ord.orderNumber}`;
                          }}
                          className="text-[#0F4C81] font-bold hover:underline cursor-pointer"
                        >
                          تتبع المسار 📍
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* محتوى: العناوين */}
            {activeModal === 'address' && (
              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#0F4C81] font-black mb-1">المدينة الرئيسية:</label>
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border-2 border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#0F4C81] font-black mb-1">تفاصيل الحي والشارع والمعلم القريب:</label>
                  <textarea
                    rows={3}
                    placeholder="مثال: شارع الستين الجنوبي - جوار فندق سبأ - عمارة 4 شقة 2"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border-2 border-slate-200 font-bold"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0F4C81] via-[#0284C7] to-[#0F4C81] text-white font-black text-sm shadow-md cursor-pointer"
                >
                  حفظ العنوان الرئيسي
                </button>
              </form>
            )}

            {/* محتوى: رصيدي والمحفظة */}
            {activeModal === 'wallet' && (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-orange-200 text-[#EA580C] mx-auto flex items-center justify-center">
                  <Wallet className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500">الرصيد المتاح حالياً</span>
                  <div className="text-2xl font-black text-[#0F4C81] mt-1 font-mono">0.00 ر.ي</div>
                  <p className="text-xs text-slate-500 mt-1">يمكنك استخدام الرصيد لدفع تكاليف الشحن والسلع مباشرة</p>
                </div>
                <button
                  onClick={() => setActiveModal('support')}
                  className="w-full py-2.5 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-200 font-black text-xs cursor-pointer hover:bg-sky-100 transition"
                >
                  شحن الرصيد عبر الكريمي أو ون كاش
                </button>
              </div>
            )}

            {/* محتوى: خدمة العملاء والدعم */}
            {activeModal === 'support' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 leading-relaxed font-bold">
                  فريق دعم عملاء السوق الشامل متواجد على مدار الساعة لخدمتكم والإجابة عن كافة الاستفسارات:
                </p>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-emerald-950">خدمة الواتساب المباشرة:</span>
                  </div>
                  <a
                    href="https://wa.me/967772399744"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200"
                  >
                    772399744
                  </a>
                </div>
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#0F4C81]" />
                    <span className="font-bold text-[#0F4C81]">البريد الإلكتروني:</span>
                  </div>
                  <span className="font-mono text-slate-700 text-[11px]">support@alshamel.ye</span>
                </div>
              </div>
            )}

            {/* محتوى: الشروط والمعلومات والخصوصية */}
            {(activeModal === 'terms' || activeModal === 'privacy' || activeModal === 'about' || activeModal === 'invoices' || activeModal === 'notifications') && (
              <div className="text-xs text-slate-700 leading-relaxed space-y-2">
                <p className="font-bold text-[#0F4C81]">
                  منصة السوق الشامل (AL SHAMEL SHOPPING) بوابتك الأولى للتسوق والشحن الدولي من كبرى المتاجر العالمية (شي إن، أمازون، علي إكسبرس) مباشرة إلى باب منزلك في الجمهورية اليمنية.
                </p>
                <p className="text-slate-500">
                  جميع العمليات والبيانات محمية ومشفرة وفق أعلى معايير الخصوصية والأمان.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default MyAccountPage;
