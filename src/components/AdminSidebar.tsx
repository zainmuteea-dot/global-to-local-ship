import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  X,
  Home,
  Truck,
  Zap,
  UserCheck,
  MessageSquare,
  Tag,
  ShoppingBag,
  Coins,
  Wallet,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  Database,
  Users,
  UserCog,
  Store,
  Bot,
  FileText,
  Headphones,
  Settings,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAccountsTree?: () => void;
  onOpenQuickScan?: () => void;
  onOpenAddModal?: () => void;
  navigateTo?: (path: string) => void;
}

export function AdminSidebar({
  isOpen,
  onClose,
  onOpenAccountsTree,
  onOpenQuickScan,
  onOpenAddModal,
  navigateTo,
}: AdminSidebarProps) {
  // حالات فتح وإغلاق القوائم المنسدلة الفرعية
  const [isAccountsTreeOpen, setIsAccountsTreeOpen] = useState(true);
  const [isPricesOpen, setIsPricesOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isHrOpen, setIsHrOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  const location = useLocation();
  const currentPath = location.pathname;

  if (!isOpen) return null;

  const handleLinkClick = (path: string) => {
    onClose();
    if (navigateTo) {
      navigateTo(path);
    }
  };

  return (
    <>
      {/* خلفية معتمة عند الفتح */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* القائمة الجانبية الداكنة */}
      <aside
        dir="rtl"
        className="fixed top-0 right-0 z-50 h-full w-[300px] max-w-[88vw] bg-[#071426] border-l border-sky-950/60 text-slate-100 flex flex-col shadow-2xl transition-transform duration-300 overflow-hidden font-sans select-none"
      >
        {/* 1. رأس القائمة: زر الإغلاق + الشعار الرسمي */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-[#06101f]">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="إغلاق القائمة"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="flex items-center gap-1 leading-none">
                <span className="font-black text-sm tracking-wide text-[#F97316]">SHOPPING</span>
                <span className="font-black text-sm tracking-wide text-white">AL SHAMEL</span>
              </div>
              <div className="text-[10px] font-bold text-sky-400 tracking-wider mt-0.5">
                السوق الشامل • وسيطكم العالمي
              </div>
            </div>

            <div className="size-8 rounded-lg bg-gradient-to-tr from-[#EA580C] to-[#F97316] grid place-items-center text-white shadow-sm shadow-orange-500/30">
              <ShoppingBag className="size-4" />
            </div>
          </div>
        </div>

        {/* 2. بطاقة المشرف المتصل */}
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-[#0B1E36] border border-sky-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-white">زين مطيع</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              متصل
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-sky-400">ID: #92841</span>
        </div>

        {/* 3. عناصر وأزرار القائمة */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs scrollbar-thin scrollbar-thumb-sky-900/40">
          
          {/* ================= القسم 1: التسوق وخدمات العملاء ================= */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[11px] font-black text-sky-400">
              التسوق وخدمات العملاء
            </div>

            {/* الرئيسية */}
            <Link
              to="/"
              onClick={() => handleLinkClick("/")}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition ${
                currentPath === "/"
                  ? "bg-[#0284C7] text-white shadow-md shadow-sky-600/30"
                  : "text-slate-300 hover:bg-[#0B1E36] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Home className="size-4 text-sky-200" />
                <span>الرئيسية (متجر السوق الشامل)</span>
              </div>
              <ChevronLeft className="size-3.5 opacity-70" />
            </Link>

            {/* لوحة عمليات الشحن والفرز */}
            <Link
              to="/admin"
              onClick={() => handleLinkClick("/admin")}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold ${
                currentPath === "/admin" ? "bg-[#0B1E36] text-white border border-sky-800/40" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Truck className="size-4 text-sky-400" />
                <span>لوحة عمليات الشحن والفرز</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                إدارة
              </span>
            </Link>

            {/* طلب جديد (اطلب الآن) */}
            <Link
              to="/new-order"
              onClick={() => handleLinkClick("/new-order")}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold"
            >
              <div className="flex items-center gap-2.5">
                <Zap className="size-4 text-amber-400" />
                <span>طلب جديد (اطلب الآن)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-950 text-amber-400 border border-amber-800/40">
                فوراً
              </span>
            </Link>

            {/* تتبع الطلبات والشحنات */}
            <Link
              to="/track"
              onClick={() => handleLinkClick("/track")}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold"
            >
              <div className="flex items-center gap-2.5">
                <Truck className="size-4 text-sky-400" />
                <span>تتبع الطلبات والشحنات</span>
              </div>
              <ChevronLeft className="size-3.5 opacity-50" />
            </Link>

            {/* حسابي وإدارة العمليات */}
            <Link
              to="/my-account"
              onClick={() => handleLinkClick("/my-account")}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="size-4 text-emerald-400" />
                <span>حسابي وإدارة العمليات</span>
              </div>
              <ChevronLeft className="size-3.5 opacity-50" />
            </Link>

            {/* الرسائل والمحادثات */}
            <Link
              to="/notifications"
              onClick={() => handleLinkClick("/notifications")}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="size-4 text-indigo-400" />
                <span>الرسائل والمحادثات</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                2 جديدة
              </span>
            </Link>

            {/* الأسعار والشحن (منسدلة) */}
            <div>
              <button
                onClick={() => setIsPricesOpen(!isPricesOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Tag className="size-4 text-amber-500" />
                  <span>الأسعار والشحن</span>
                </div>
                {isPricesOpen ? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
              </button>
              {isPricesOpen && (
                <div className="pr-7 pl-2 py-1 space-y-1 text-[11px] font-semibold text-slate-300">
                  <div onClick={() => handleLinkClick("/prices")} className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">
                    • حاسبة أجور الشحن الدولي
                  </div>
                  <div className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">
                    • أسعار التوصيل للمحافظات
                  </div>
                </div>
              )}
            </div>

            {/* المتجر الإلكتروني (منسدلة) */}
            <div>
              <button
                onClick={() => setIsStoreOpen(!isStoreOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="size-4 text-emerald-400" />
                  <span>المتجر الإلكتروني</span>
                </div>
                {isStoreOpen ? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
              </button>
              {isStoreOpen && (
                <div className="pr-7 pl-2 py-1 space-y-1 text-[11px] font-semibold text-slate-300">
                  <div onClick={() => handleLinkClick("/")} className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">
                    • المنتجات المميزة والشائعة
                  </div>
                  <div onClick={() => handleLinkClick("/new-order")} className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">
                    • استيراد منتج من رابط خارجي
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================= القسم 2: الإدارة المالية والمحاسبية ================= */}
          <div className="space-y-1 pt-1 border-t border-slate-800/60">
            <div className="px-2 py-1 flex items-center justify-between">
              <span className="text-[11px] font-black text-sky-400">الإدارة المالية والمحاسبية</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                3 عملات YEM/SAR/USD
              </span>
            </div>

            {/* النظام المالي والمحاسبي المتكامل */}
            <Link
              to="/accounts"
              onClick={() => handleLinkClick("/accounts")}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold"
            >
              <div className="flex items-center gap-2.5">
                <Coins className="size-4 text-emerald-400" />
                <span>النظام المالي والمحاسبي المتكامل</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-700/50 flex items-center gap-0.5">
                جديد ⚡
              </span>
            </Link>

            {/* الخزنة والمحافظ النقدية */}
            <div
              onClick={() => handleLinkClick("/accounts")}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="size-4 text-amber-400" />
                <span>الخزنة والمحافظ النقدية (6 حسابات)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800/40">
                شامل
              </span>
            </div>

            {/* السندات المالية */}
            <div
              onClick={() => handleLinkClick("/accounts")}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="size-4 text-emerald-400" />
                <span>السندات المالية (قبض وصرف)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                $ [0]
              </span>
            </div>

            {/* الحسابات والدليل المالي */}
            <div>
              <button
                onClick={() => setIsAccountsTreeOpen(!isAccountsTreeOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="size-4 text-cyan-400" />
                  <span>الحسابات والدليل المالي</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/30">
                    [70]
                  </span>
                  {isAccountsTreeOpen ? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
                </div>
              </button>

              {/* القائمة الفرعية المفتوحة كما في الصورة */}
              {isAccountsTreeOpen && (
                <div className="pr-7 pl-2 py-1 space-y-1 text-[11px] font-semibold text-slate-300">
                  <div
                    onClick={() => {
                      onClose();
                      if (onOpenAccountsTree) onOpenAccountsTree();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#271311] border border-amber-900/60 text-amber-300 font-bold flex items-center justify-between cursor-pointer hover:bg-[#341a18] transition"
                  >
                    <span>• شجرة الحسابات والعملاء [70]</span>
                    <span className="text-amber-400">⚡</span>
                  </div>
                  <div
                    onClick={() => handleLinkClick("/accounts")}
                    className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer"
                  >
                    • كشوفات الحسابات بالعملات
                  </div>
                  <div
                    onClick={() => handleLinkClick("/accounts")}
                    className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer"
                  >
                    • قيود اليومية المزدوجة
                  </div>
                </div>
              )}
            </div>

            {/* العمولات الآلية والأرباح */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="size-4 text-teal-400" />
                <span>العمولات الآلية والأرباح</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-950 text-teal-300 border border-teal-800/40">
                $10/طلب
              </span>
            </div>
          </div>

          {/* ================= القسم 3: لوحة التحكم والعمليات ================= */}
          <div className="space-y-1 pt-1 border-t border-slate-800/60">
            <div className="px-2 py-1 flex items-center justify-between">
              <span className="text-[11px] font-black text-sky-400">لوحة التحكم والعمليات</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                الشحن والتوزيع
              </span>
            </div>

            {/* لوحة عمليات الشحن والتوزيع */}
            <Link
              to="/admin"
              onClick={() => handleLinkClick("/admin")}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold"
            >
              <div className="flex items-center gap-2.5">
                <Truck className="size-4 text-sky-400" />
                <span>لوحة عمليات الشحن والتوزيع</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800/40">
                [114]
              </span>
            </Link>

            {/* البيانات والمدخلات السريعة */}
            <div
              onClick={() => {
                onClose();
                if (onOpenQuickScan) onOpenQuickScan();
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Database className="size-4 text-sky-300" />
                <span>البيانات والمدخلات السريعة</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                [0]
              </span>
            </div>

            {/* العملاء والمستخدمون (منسدلة) */}
            <div>
              <button
                onClick={() => setIsUsersOpen(!isUsersOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="size-4 text-sky-400" />
                  <span>العملاء والمستخدمون</span>
                </div>
                {isUsersOpen ? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
              </button>
              {isUsersOpen && (
                <div className="pr-7 pl-2 py-1 space-y-1 text-[11px] font-semibold text-slate-300">
                  <div onClick={() => handleLinkClick("/admin-clients")} className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">
                    • إدارة بيانات العملاء
                  </div>
                  <div onClick={() => handleLinkClick("/customers")} className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">
                    • دليل الحسابات وأرصدة العملاء
                  </div>
                </div>
              )}
            </div>

            {/* الموارد البشرية (الموظفين) */}
            <div>
              <button
                onClick={() => setIsHrOpen(!isHrOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <UserCog className="size-4 text-amber-400" />
                  <span>الموارد البشرية (الموظفين)</span>
                </div>
                {isHrOpen ? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
              </button>
              {isHrOpen && (
                <div className="pr-7 pl-2 py-1 space-y-1 text-[11px] font-semibold text-slate-300">
                  <div className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">
                    • طاقم العمل وتوزيع المهام
                  </div>
                  <div className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">
                    • صلاحيات الوصول والأدوار
                  </div>
                </div>
              )}
            </div>

            {/* قسم التاجر والشركاء */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Store className="size-4 text-amber-500" />
                <span>قسم التاجر والشركاء</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/40">
                جملة
              </span>
            </div>

            {/* روبوتاتي (الأتمتة والـ AI) */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Bot className="size-4 text-teal-400" />
                <span>روبوتاتي (الأتمتة والـ AI)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                نشط 🤖
              </span>
            </div>

            {/* التقارير المالية والتشغيلية */}
            <div>
              <button
                onClick={() => setIsReportsOpen(!isReportsOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="size-4 text-rose-400" />
                  <span>التقارير المالية والتشغيلية</span>
                </div>
                {isReportsOpen ? <ChevronUp className="size-3.5 opacity-60" /> : <ChevronDown className="size-3.5 opacity-60" />}
              </button>
              {isReportsOpen && (
                <div className="pr-7 pl-2 py-1 space-y-1 text-[11px] font-semibold text-slate-300">
                  <div className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">
                    • كشف الإيرادات والتحصيل اليومي
                  </div>
                  <div className="px-2.5 py-1 rounded-lg hover:bg-[#0B1E36] hover:text-white transition cursor-pointer">
                    • تقارير الشحنات المسلمة والراجعة
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================= القسم 4: الدعم والمساعدة ================= */}
          <div className="space-y-1 pt-1 border-t border-slate-800/60">
            <div className="px-2 pb-1 text-[11px] font-black text-sky-400">الدعم والمساعدة</div>

            {/* الدعم الفني وخدمة العملاء */}
            <a
              href="https://wa.me/967770000000"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold"
            >
              <div className="flex items-center gap-2.5">
                <Headphones className="size-4 text-emerald-400" />
                <span>الدعم الفني وخدمة العملاء</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                واتساب
              </span>
            </a>

            {/* إعدادات النظام والربط */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:bg-[#0B1E36] hover:text-white transition font-bold cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Settings className="size-4 text-slate-400" />
                <span>إعدادات النظام والربط</span>
              </div>
              <ChevronLeft className="size-3.5 opacity-50" />
            </div>
          </div>

        </div>

        {/* 4. فوتر القائمة الجانبية */}
        <div className="p-3 border-t border-slate-800/80 bg-[#06101f] text-center text-[10px] font-bold text-sky-400/90 tracking-wide">
          السوق الشامل © 2026 • إصدار النظام V2.8
        </div>
      </aside>
    </>
  );
}
