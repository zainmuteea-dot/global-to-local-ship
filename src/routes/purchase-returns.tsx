import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from "react"
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Eye,
  FileText,
  DollarSign,
  PackageX,
  MessageSquare,
  ShieldAlert,
  Send,
  HelpCircle,
  X
} from "lucide-react"

export const Route = createFileRoute('/purchase-returns')({
  component: PurchaseReturnsPage,
})

interface ReturnClaim {
  id: string
  claimNumber: string // DISP-2026-012
  trackingCode: string // SQ-800816
  customerName: string
  customerPhone: string
  storeName: 'AliExpress' | 'SHEIN' | 'Amazon' | 'Trendyol' | 'TEMU'
  externalOrderNumber: string
  productTitle: string
  reason: 'تالف ومكسور' | 'مقاس/لون غير مطابق' | 'لم يصل/مفقود' | 'إلغاء قبل الشحن' | 'بضاعة مقلدة'
  claimAmountUSD: number
  refundAmountUSD: number
  compensationYER: number
  settlementMethod: 'إيداع بمحفظة العميل' | 'استرداد نقدي كاش' | 'إعادة طلب بديل' | 'قيد الرصيد بالبطاقة'
  storeDisputeStatus: 'قيد فتح النزاع' | 'بانتظار رد المتجر' | 'تم قبول الاسترداد' | 'نزاع مرفوض'
  customerStatus: 'بانتظار تسوية المتجر' | 'تم تعويض العميل' | 'قيد الفحص والمطابقة'
  date: string
  notes: string
}

const INITIAL_CLAIMS: ReturnClaim[] = [
  {
    id: "CLM-001",
    claimNumber: "DISP-2026-031",
    trackingCode: "SQ-800816",
    customerName: "محمد الأصبحي",
    customerPhone: "777123456",
    storeName: "AliExpress",
    externalOrderNumber: "AE-9821401",
    productTitle: "شاشة لابتوب بديلة 15.6 بوصة FHD",
    reason: "تالف ومكسور",
    claimAmountUSD: 68.50,
    refundAmountUSD: 68.50,
    compensationYER: 110285,
    settlementMethod: "إيداع بمحفظة العميل",
    storeDisputeStatus: "تم قبول الاسترداد",
    customerStatus: "تم تعويض العميل",
    date: "2026-09-28",
    notes: "تم إرفاق فيديو فتح الطرد وصور الكسر وقبل علي إكسبرس الاسترجاع كاملاً."
  },
  {
    id: "CLM-002",
    claimNumber: "DISP-2026-032",
    trackingCode: "SQ-800822",
    customerName: "سارة القاسمي",
    customerPhone: "771987654",
    storeName: "SHEIN",
    externalOrderNumber: "SH-4412093",
    productTitle: "طقم فستان سهورة بناتي - مقاس غير مطابق",
    reason: "مقاس/لون غير مطابق",
    claimAmountUSD: 42.00,
    refundAmountUSD: 0,
    compensationYER: 0,
    settlementMethod: "إيداع بمحفظة العميل",
    storeDisputeStatus: "بانتظار رد المتجر",
    customerStatus: "بانتظار تسوية المتجر",
    date: "2026-10-01",
    notes: "شي إن طلبت صور لعلامة القياس على القماش، تم إرسالها وبانتظار الرد خلال 48 ساعة."
  },
  {
    id: "CLM-003",
    claimNumber: "DISP-2026-033",
    trackingCode: "SQ-800799",
    customerName: "مؤسسة الأفق للتجارة",
    customerPhone: "733445566",
    storeName: "Trendyol",
    externalOrderNumber: "TY-781920",
    productTitle: "شحنة أحذية رياضية جملة (طرد ناقص 4 قطع)",
    reason: "لم يصل/مفقود",
    claimAmountUSD: 145.00,
    refundAmountUSD: 145.00,
    compensationYER: 233450,
    settlementMethod: "استرداد نقدي كاش",
    storeDisputeStatus: "تم قبول الاسترداد",
    customerStatus: "قيد الفحص والمطابقة",
    date: "2026-09-25",
    notes: "ترينديول ردت المبلغ للمحفظة التركية، بانتظار صرف السند للتاجر نقداً."
  },
  {
    id: "CLM-004",
    claimNumber: "DISP-2026-034",
    trackingCode: "SQ-800845",
    customerName: "مروان الصلوي",
    customerPhone: "770112233",
    storeName: "Amazon",
    externalOrderNumber: "AMZ-112-99812",
    productTitle: "ساعة ذكية أمازون فيت - توقف الشاحن",
    reason: "تالف ومكسور",
    claimAmountUSD: 89.99,
    refundAmountUSD: 89.99,
    compensationYER: 144883,
    settlementMethod: "إعادة طلب بديل",
    storeDisputeStatus: "تم قبول الاسترداد",
    customerStatus: "تم تعويض العميل",
    date: "2026-09-20",
    notes: "أمازون وافقت على الاسترجاع دون حاجة لإعادة الشحنة، تم عمل طلب بديل للعميل."
  }
]

export default function PurchaseReturnsPage() {
  const [claims, setClaims] = useState<ReturnClaim[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shamel_claims_data")
      if (saved) {
        try { return JSON.parse(saved) } catch (e) { /* ignore */ }
      }
    }
    return INITIAL_CLAIMS
  })

  const [activeTab, setActiveTab] = useState<'all' | 'store_disputes' | 'customer_refunds'>('all')
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStore, setSelectedStore] = useState<string>("ALL")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  
  // Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [viewClaim, setViewClaim] = useState<ReturnClaim | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    trackingCode: "",
    customerName: "",
    customerPhone: "",
    storeName: "AliExpress" as ReturnClaim['storeName'],
    externalOrderNumber: "",
    productTitle: "",
    reason: "تالف ومكسور" as ReturnClaim['reason'],
    claimAmountUSD: 0,
    settlementMethod: "إيداع بمحفظة العميل" as ReturnClaim['settlementMethod'],
    notes: ""
  })

  const saveClaims = (newClaims: ReturnClaim[]) => {
    setClaims(newClaims)
    if (typeof window !== "undefined") {
      localStorage.setItem("shamel_claims_data", JSON.stringify(newClaims))
    }
  }

  // KPIs
  const stats = useMemo(() => {
    const total = claims.length
    const openDisputes = claims.filter(c => c.storeDisputeStatus === 'بانتظار رد المتجر' || c.storeDisputeStatus === 'قيد فتح النزاع').length
    const refundedUSD = claims.reduce((sum, c) => sum + c.refundAmountUSD, 0)
    const compensatedYER = claims.filter(c => c.customerStatus === 'تم تعويض العميل').reduce((sum, c) => sum + c.compensationYER, 0)
    return { total, openDisputes, refundedUSD, compensatedYER }
  }, [claims])

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return claims.filter(claim => {
      if (activeTab === 'store_disputes' && claim.storeDisputeStatus === 'تم قبول الاسترداد') return false
      if (activeTab === 'customer_refunds' && claim.customerStatus !== 'تم تعويض العميل') return false

      if (selectedStore !== "ALL" && claim.storeName !== selectedStore) return false
      if (selectedStatus !== "ALL" && claim.storeDisputeStatus !== selectedStatus) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match = 
          claim.claimNumber.toLowerCase().includes(q) ||
          claim.trackingCode.toLowerCase().includes(q) ||
          claim.customerName.toLowerCase().includes(q) ||
          claim.externalOrderNumber.toLowerCase().includes(q) ||
          claim.productTitle.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [claims, activeTab, selectedStore, selectedStatus, searchQuery])

  // Create new claim
  const handleCreateClaim = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.trackingCode || !formData.customerName) {
      alert("يرجى ملء بيانات كود الشحنة واسم العميل")
      return
    }

    const newClaim: ReturnClaim = {
      id: `CLM-${Date.now()}`,
      claimNumber: `DISP-2026-${Math.floor(100 + Math.random() * 900)}`,
      trackingCode: formData.trackingCode,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      storeName: formData.storeName,
      externalOrderNumber: formData.externalOrderNumber || `EXT-${Date.now().toString().slice(-6)}`,
      productTitle: formData.productTitle,
      reason: formData.reason,
      claimAmountUSD: Number(formData.claimAmountUSD) || 0,
      refundAmountUSD: 0,
      compensationYER: Math.round((Number(formData.claimAmountUSD) || 0) * 1610),
      settlementMethod: formData.settlementMethod,
      storeDisputeStatus: "بانتظار رد المتجر",
      customerStatus: "بانتظار تسوية المتجر",
      date: new Date().toISOString().split('T')[0] || "2026-10-03",
      notes: formData.notes
    }

    saveClaims([newClaim, ...claims])
    setIsNewModalOpen(false)
    setFormData({
      trackingCode: "",
      customerName: "",
      customerPhone: "",
      storeName: "AliExpress",
      externalOrderNumber: "",
      productTitle: "",
      reason: "تالف ومكسور",
      claimAmountUSD: 0,
      settlementMethod: "إيداع بمحفظة العميل",
      notes: ""
    })
  }

  // Quick WhatsApp link
  const openWhatsApp = (phone: string, text: string) => {
    let clean = phone.replace(/\D/g, '')
    if (clean.startsWith('0')) clean = clean.substring(1)
    if (!clean.startsWith('967')) clean = '967' + clean
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#F0F7FF] to-[#FFF9F5] text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="العودة للإدارة"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                إدارة المرتجعات ومطالبات النزاع
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  Dispute & Claims
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                متابعة قضايا الاسترداد مع المتاجر العالمية وتعويضات العملاء والمحفظة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-orange-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              فتح مطالبة جديدة
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">إجمالي النزاعات المسجلة</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.total}</div>
            <div className="text-xs text-slate-400 mt-1">مطالبات داخلية وخارجية</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-600">نزاعات قيد المتابعة</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-700">{stats.openDisputes}</div>
            <div className="text-xs text-amber-600/80 mt-1">بانتظار رد المتجر أو البنك</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-600">مستردات المتاجر الدولية</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700">${stats.refundedUSD.toFixed(2)}</div>
            <div className="text-xs text-emerald-600 mt-1">مبالغ استرجعت لبطاقاتنا</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-600">تعويضات مسلمة للعملاء</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-800">{stats.compensatedYER.toLocaleString()} <span className="text-xs font-normal">ر.ي</span></div>
            <div className="text-xs text-blue-500 mt-1">نقداً أو عبر المحفظة</div>
          </div>
        </div>

        {/* Filters and Navigation Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                جميع المطالبات ({claims.length})
              </button>
              <button
                onClick={() => setActiveTab('store_disputes')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'store_disputes'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                نزاعات نشطة مع المتاجر
              </button>
              <button
                onClick={() => setActiveTab('customer_refunds')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'customer_refunds'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                تم تعويض العميل
              </button>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              النتائج المعروضة: {filteredClaims.length} مطالبة
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث برقم المطالبة، الشحنة، العميل، الطلب..."
                className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedStore}
                onChange={e => setSelectedStore(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">جميع المتاجر (All Stores)</option>
                <option value="AliExpress">AliExpress</option>
                <option value="SHEIN">SHEIN</option>
                <option value="Amazon">Amazon</option>
                <option value="Trendyol">Trendyol</option>
                <option value="TEMU">TEMU</option>
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">جميع حالات النزاع</option>
                <option value="قيد فتح النزاع">قيد فتح النزاع</option>
                <option value="بانتظار رد المتجر">بانتظار رد المتجر</option>
                <option value="تم قبول الاسترداد">تم قبول الاسترداد</option>
                <option value="نزاع مرفوض">نزاع مرفوض</option>
              </select>
            </div>
          </div>
        </div>

        {/* Claims Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-4">رقم المطالبة والشحنة</th>
                  <th className="p-4">العميل والتواصل</th>
                  <th className="p-4">المتجر والمنتج</th>
                  <th className="p-4">سبب المطالبة</th>
                  <th className="p-4">المبلغ والتعويض</th>
                  <th className="p-4">حالة نزاع المتجر</th>
                  <th className="p-4">حالة العميل</th>
                  <th className="p-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      لا توجد مطالبات أو نزاعات مطابقة لمعايير البحث.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map(claim => (
                    <tr key={claim.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4">
                        <div className="font-mono font-bold text-blue-900">{claim.claimNumber}</div>
                        <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>📦 {claim.trackingCode}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{claim.date}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900">{claim.customerName}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{claim.customerPhone}</div>
                      </td>

                      <td className="p-4 max-w-[200px]">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mb-1">
                          {claim.storeName}
                        </span>
                        <div className="font-medium text-slate-800 truncate" title={claim.productTitle}>
                          {claim.productTitle}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {claim.externalOrderNumber}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                          claim.reason === 'تالف ومكسور' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          claim.reason === 'لم يصل/مفقود' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          <AlertTriangle className="w-3 h-3" />
                          {claim.reason}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-950 font-mono">
                          ${claim.claimAmountUSD.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-mono text-emerald-600 font-semibold">
                          ≈ {claim.compensationYER.toLocaleString()} ر.ي
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {claim.settlementMethod}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          claim.storeDisputeStatus === 'تم قبول الاسترداد'
                            ? 'bg-emerald-100 text-emerald-800'
                            : claim.storeDisputeStatus === 'بانتظار رد المتجر'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : claim.storeDisputeStatus === 'نزاع مرفوض'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {claim.storeDisputeStatus === 'تم قبول الاسترداد' && <CheckCircle2 className="w-3 h-3" />}
                          {claim.storeDisputeStatus === 'بانتظار رد المتجر' && <Clock className="w-3 h-3" />}
                          {claim.storeDisputeStatus}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          claim.customerStatus === 'تم تعويض العميل'
                            ? 'bg-blue-100 text-blue-800'
                            : claim.customerStatus === 'قيد الفحص والمطابقة'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {claim.customerStatus}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewClaim(claim)}
                            title="تفاصيل القضية"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const text = `مرحباً أستاذ ${claim.customerName}، نفيدك بمستجدات مطالبتكم برقم (${claim.claimNumber}) لشحنتكم (${claim.trackingCode}): حالة المتجر: ${claim.storeDisputeStatus}. حالة التعويض: ${claim.customerStatus}. السوق الشامل في خدمتكم.`
                              openWhatsApp(claim.customerPhone, text)
                            }}
                            title="إشعار العميل عبر واتساب"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* View Claim Modal */}
      {viewClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  تفاصيل المطالبة: {viewClaim.claimNumber}
                </h3>
                <p className="text-xs text-slate-400">شحنة رقم: {viewClaim.trackingCode}</p>
              </div>
              <button onClick={() => setViewClaim(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">العميل:</span>
                <span className="font-bold text-slate-800">{viewClaim.customerName} ({viewClaim.customerPhone})</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">المتجر الدولي:</span>
                <span className="font-bold text-slate-800">{viewClaim.storeName} - {viewClaim.externalOrderNumber}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">قيمة المطالبة:</span>
                <span className="font-bold text-slate-900 font-mono">${viewClaim.claimAmountUSD} ({viewClaim.compensationYER.toLocaleString()} ر.ي)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">طريقة التسوية:</span>
                <span className="font-bold text-blue-700">{viewClaim.settlementMethod}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-900">
              <span className="font-bold block mb-1">ملاحظات وقرار الفحص:</span>
              <p>{viewClaim.notes || "لا توجد ملاحظات مسجلة."}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setViewClaim(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Claim Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">فتح مطالبة نزاع / إرجاع جديدة</h3>
                <p className="text-xs text-slate-400">توثيق طلب استرداد أو تعويض لشحنة</p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClaim} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كود الشحنة (Tracking) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: SQ-800816"
                    value={formData.trackingCode}
                    onChange={e => setFormData({ ...formData, trackingCode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    placeholder="اسم العميل الكامل"
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">هاتف العميل</label>
                  <input
                    type="text"
                    placeholder="77XXXXXXX"
                    value={formData.customerPhone}
                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المتجر الخارجي</label>
                  <select
                    value={formData.storeName}
                    onChange={e => setFormData({ ...formData, storeName: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="AliExpress">AliExpress</option>
                    <option value="SHEIN">SHEIN</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Trendyol">Trendyol</option>
                    <option value="TEMU">TEMU</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم طلب المتجر (Store Order #)</label>
                  <input
                    type="text"
                    placeholder="مثال: AE-991204"
                    value={formData.externalOrderNumber}
                    onChange={e => setFormData({ ...formData, externalOrderNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">سبب المطالبة</label>
                  <select
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="تالف ومكسور">تالف ومكسور أثناء الشحن</option>
                    <option value="مقاس/لون غير مطابق">مقاس أو لون أو صنف غير مطابق</option>
                    <option value="لم يصل/مفقود">شحنة لم تصل أو مفقودة</option>
                    <option value="إلغاء قبل الشحن">إلغاء قبل شحن البضاعة</option>
                    <option value="بضاعة مقلدة">بضاعة مقلدة رديئة الجودة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">وصف المنتج</label>
                <input
                  type="text"
                  placeholder="اسم أو وصف المنتج المرجع"
                  value={formData.productTitle}
                  onChange={e => setFormData({ ...formData, productTitle: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">قيمة المطالبة بالدولار ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.claimAmountUSD || ""}
                    onChange={e => setFormData({ ...formData, claimAmountUSD: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">طريقة التسوية المقترحة</label>
                  <select
                    value={formData.settlementMethod}
                    onChange={e => setFormData({ ...formData, settlementMethod: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="إيداع بمحفظة العميل">إيداع بمحفظة العميل (رصيد دائن)</option>
                    <option value="استرداد نقدي كاش">استرداد نقدي كاش (سند صرف)</option>
                    <option value="إعادة طلب بديل">إعادة طلب منتج بديل مجاناً</option>
                    <option value="قيد الرصيد بالبطاقة">قيد الرصيد ببطاقة المشتريات</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات وتفاصيل الدليل (فيديو/صور)</label>
                <textarea
                  rows={3}
                  placeholder="أدخل روابط الصور أو وصف المشكلة للمتجر..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-500/20"
                >
                  تسجيل المطالبة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
