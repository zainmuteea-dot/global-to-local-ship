import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/pay')({
  component: PayPage,
  validateSearch: (s: Record<string, unknown>) => ({ 
    order: typeof s['order'] === 'string' ? (s['order'] as string) : '' 
  })
})

/* ===================== Styles ===================== */
const CSS = `
:root{
  --blue-900:#013a70;--blue-800:#004A8D;--blue-600:#2f6fb0;--blue-500:#3E86C4;
  --blue-100:#e3eef8;--blue-50:#f0f6fc;--orange-600:#D86616;--orange-500:#f08a2d;
  --orange-400:#F5A623;--ink:#0f2440;--muted:#6b7f99;--line:#e4ecf5;--bg:#eef3f9;
  --card:#fff;--green:#1aa260;--green-bg:#e8f8ef;--red:#e3443a;--red-bg:#fdecea;
  --radius:18px;--shadow:0 10px 30px -12px rgba(0,74,141,.22);--shadow-sm:0 4px 14px -6px rgba(0,74,141,.18);
}
.pay-root *{box-sizing:border-box;margin:0;padding:0}
.pay-root{font-family:'Cairo',system-ui,sans-serif;min-height:100vh;color:var(--ink);line-height:1.6;
  direction:rtl;padding:24px 14px 60px;-webkit-font-smoothing:antialiased;
  background:radial-gradient(1200px 500px at 100% -10%,rgba(62,134,196,.12),transparent 60%),
    radial-gradient(1000px 500px at 0% 110%,rgba(245,166,35,.10),transparent 55%),var(--bg);}
.pay-wrap{max-width:620px;margin:0 auto}
.pay-topbar{background:linear-gradient(135deg,var(--blue-800) 0%,var(--blue-900) 55%,#06284a 100%);
  border-radius:22px;padding:18px 20px;color:#fff;box-shadow:var(--shadow);position:relative;
  overflow:hidden;display:flex;align-items:center;gap:14px}
.pay-topbar::after{content:'';position:absolute;inset:0;
  background:radial-gradient(140px 140px at 10% 120%,rgba(245,166,35,.35),transparent 70%)}
.pay-badge{width:52px;height:52px;border-radius:15px;flex:0 0 auto;
  background:linear-gradient(145deg,#fff,#eaf2fb);display:grid;place-items:center;position:relative;z-index:1;
  box-shadow:0 6px 16px -6px rgba(0,0,0,.4)}
.pay-badge svg{width:34px;height:34px}
.pay-brand{z-index:1}
.pay-brand h1{font-size:19px;font-weight:900;letter-spacing:.3px;line-height:1.2}
.pay-brand h1 b{color:var(--orange-400)}
.pay-brand p{font-size:12px;color:#bcd3ec;font-weight:600;margin-top:2px}
.pay-arrow{margin-inline-start:auto;z-index:1;width:38px;height:38px;border-radius:11px;
  display:grid;place-items:center;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;transition:.2s;border:none}
.pay-arrow:hover{background:rgba(255,255,255,.22)}
.pay-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
  padding:18px;margin-top:16px;box-shadow:var(--shadow-sm)}
.pay-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.pay-ico{width:34px;height:34px;border-radius:10px;background:var(--blue-100);color:var(--blue-800);display:grid;place-items:center}
.pay-title{font-size:15px;font-weight:800;color:var(--blue-900)}
.pay-ord{display:flex;flex-direction:column;gap:10px}
.od-top{display:flex;gap:10px}
.od-box{flex:1;background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:10px 14px}
.od-k{font-size:11px;color:var(--muted);font-weight:700}
.od-v{font-size:15px;font-weight:900;color:var(--ink);display:flex;align-items:center;gap:6px;margin-top:2px}
.badge{padding:3px 10px;border-radius:20px;font-size:12px;font-weight:800}
.badge.ok{background:var(--green-bg);color:var(--green)}
.badge.warn{background:#fff8e8;color:#b45309}
.od-name{font-size:13px;font-weight:800;color:var(--blue-900);padding:4px 6px}
.od-prod{font-size:12px;color:var(--muted);padding:0 6px}

.pay-wait-btn{width:100%;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px;
  font-family:inherit;font-weight:800;font-size:13px;padding:11px 14px;border-radius:12px;border:none;cursor:pointer;transition:.2s}
.pay-wait-btn.notified{background:var(--green-bg);color:var(--green)}
.pay-wait-btn:not(.notified){background:#fff8e8;color:#b45309;border:1px solid #fde68a}

.pay-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.stat{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:12px 10px;text-align:center}
.stat .lab{font-size:11px;color:var(--muted);font-weight:700;margin-bottom:4px}
.stat .num{font-size:20px;font-weight:900;line-height:1.2}
.stat .cur{font-size:11px;color:var(--muted);font-weight:700}
.stat.total .num{color:var(--blue-900)}
.stat.paid .num{color:var(--green)}
.stat.rest .num{color:var(--red)}

.pay-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-top:4px;padding:7px;background:#fffdfa;border:1px solid #eee1c2;border-radius:18px;}
.wbtn{position:relative;display:flex;direction:rtl;align-items:center;gap:12px;width:100%;min-height:54px;padding:7px 9px;background:#fff;border:1px solid transparent;border-radius:13px;cursor:pointer;font-family:inherit;text-align:right;transition:.18s;}
.wbtn:hover{background:#fffaf0;border-color:#efe2c6}
.wbtn .wchip{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;overflow:hidden;background:#fff;border:1px solid #f0ece5;border-radius:11px;}
.wbtn .wname{min-width:0;color:#46382b;font-size:13px;font-weight:800}
.wbtn.active{background:#fff8e8;border-color:#e6c76e}
.wbtn .tick{position:absolute;top:50%;inset-inline-start:10px;display:none;width:18px;height:18px;align-items:center;justify-content:center;color:#198754;background:#fff;border-radius:50%;transform:translateY(-50%)}
.wbtn.active .tick{display:flex}

.pay-acc{margin-top:16px;border-radius:16px;padding:16px;color:#fff;position:relative;overflow:hidden;box-shadow:0 12px 26px -12px rgba(0,0,0,.4)}
.pay-acc .atop{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.pay-acc .wlogo{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;font-weight:900;font-size:18px;flex:0 0 auto}
.pay-acc .at{font-size:12px;opacity:.9}
.pay-acc .an{font-size:16px;font-weight:800}
.pay-accnum{display:flex;flex-direction:column;gap:8px;background:rgba(0,0,0,.22);border-radius:14px;padding:14px}
.pay-acc-row{display:flex;align-items:center;justify-content:space-between}
.pay-accnum .k{font-size:12px;opacity:.88;font-weight:700}
.pay-accnum .name-val{font-size:15px;font-weight:900;color:#fff}
.pay-accnum .num-val{font-size:22px;font-weight:900;letter-spacing:1px;direction:ltr;color:#fff}
.pay-accnum .cp{border:none;background:rgba(255,255,255,.25);color:#fff;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;cursor:pointer;transition:.2s}
.pay-accnum .cp:hover{background:rgba(255,255,255,.4)}
.pay-accnum .cp.ok{background:#1aa260}

.upload-box{margin-top:14px;background:rgba(255,255,255,.18);border:1.6px dashed rgba(255,255,255,.6);border-radius:14px;padding:14px;text-align:center;cursor:pointer;transition:.2s}
.upload-box:hover{background:rgba(255,255,255,.26);border-color:#fff}
.upload-box-content{display:flex;align-items:center;justify-content:center;gap:9px;font-size:13.5px;font-weight:800}
.upload-preview{margin-top:10px;position:relative;display:inline-block;border-radius:10px;overflow:hidden;border:2px solid #fff;max-height:160px}
.upload-preview img{max-height:160px;width:auto;display:block}
.upload-remove{position:absolute;top:5px;inset-inline-end:5px;background:#e3443a;color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:grid;place-items:center;font-size:12px;font-weight:900}
.pay-hint{margin-top:12px;font-size:12px;display:flex;gap:7px;align-items:center;opacity:.95;line-height:1.5}
.pay-btn{width:100%;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:800;font-size:16px;border:none;cursor:pointer;padding:15px;border-radius:14px;transition:.2s}
.pay-primary{color:#fff;background:linear-gradient(135deg,var(--green),#15803d);box-shadow:0 10px 24px -8px rgba(26,162,96,.5)}
.pay-primary:hover{transform:translateY(-2px)}
.pay-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.pay-error{margin-top:10px;background:var(--red-bg);color:var(--red);padding:10px 14px;border-radius:10px;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:space-between}
.pay-retry{background:var(--red);color:#fff;border:none;border-radius:8px;padding:4px 10px;cursor:pointer;font-family:inherit;font-size:12px}
`

/* ===================== Icons ===================== */
const Hash = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>)
const Receipt = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>)
const Wallet = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3H4a2 2 0 0 0-2 2v2"/><circle cx="16" cy="14" r="1.5"/></svg>)
const Card = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>)
const Info = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>)
const CheckIc = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>)
const Copy = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>)
const Arrow = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>)
const Bell = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>)
const Camera = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>)

const Logo = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3E86C4"/><stop offset="1" stopColor="#004A8D"/></linearGradient>
      <linearGradient id="gOr" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#D86616"/><stop offset="1" stopColor="#F5A623"/></linearGradient>
    </defs>
    <path d="M22 12 L34 44 H18 L30 12 Z" fill="url(#gBlue)"/>
    <path d="M40 14 c7 0 7 9 0 9 c-7 0 -7 9 0 9" stroke="url(#gBlue)" strokeWidth={5} strokeLinecap="round" fill="none"/>
    <path d="M14 46 H46 L50 32 H20" stroke="url(#gOr)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="22" cy="54" r="4" fill="url(#gOr)"/>
    <circle cx="42" cy="54" r="4" fill="url(#gOr)"/>
    <path d="M50 10 l1.6 3.4 L55 15 l-3.4 1.6 L50 20 l-1.6-3.4 L45 15 l3.4-1.6 Z" fill="#F5A623"/>
  </svg>
)

type Wallet = { key: string; label: string; color: string; mark: string; markClass?: string }

const WALLETS: Wallet[] = [
  { key: 'kuraimi', label: 'الكريمي جوال / حاسب', color: '#0e7090', mark: 'K' },
  { key: 'onecash', label: 'ون كاش OneCash', color: '#7c3aed', mark: '1C' },
  { key: 'floosak', label: 'فلوسك Floosak', color: '#2563eb', mark: 'F' },
  { key: 'jawali', label: 'جوالي Jawali', color: '#be185d', mark: 'J' },
  { key: 'jeeb', label: 'جيب Jeeb', color: '#0284c7', mark: 'Je' },
  { key: 'najm', label: 'حوالة النجم', color: '#ea580c', mark: '✦', markClass: 'najm' },
]

const UNIFIED_PHONE = '772399744'
const UNIFIED_NAME = 'زين العابدين مطيع حاتم الوصابي'

function fmt(n: number) {
  if (!n || isNaN(n)) return '0'
  return Number(Math.round(n)).toLocaleString('en-US')
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/* ===================== Component ===================== */
function PayPage() {
  const { order } = Route.useSearch()
  const navigate = useNavigate()

  const orderNo = order || 'SHP-885120'

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [productName, setProductName] = useState('')
  const [currency, setCurrency] = useState('ر.ي')
  const [total, setTotal] = useState(0)
  const [paid, setPaid] = useState(0)
  const [status, setStatus] = useState('غير مكتمل')
  
  const [isNotified, setIsNotified] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [paymentSaved, setPaymentSaved] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentWarning, setPaymentWarning] = useState('')

  const [receiptImg, setReceiptImg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remaining = Math.max(total - paid, 0)
  const isPaid = /مدفوع|مكتمل|paid|complete/i.test(status) && !/غير|جزئي/i.test(status)

  // قراءة تفاصيل الطلب والدفعات بدقة من Supabase
  useEffect(() => {
    let active = true

    const loadOrderData = async () => {
      setLoading(true)

      try {
        // 1. استعلام الطلب بجميع حقول المبالغ والحالة
        const orderQuery = supabase
          .from('orders')
          .select('id, tracking_code, customer_name, phone, product_name, notes, status, created_at, user_id, total_cost_yer, paid_amount, remaining_amount, payment_status')

        const { data: dbOrder } = await (isUuid(orderNo)
          ? orderQuery.or(`tracking_code.eq.${orderNo},id.eq.${orderNo}`)
          : orderQuery.eq('tracking_code', orderNo)
        ).maybeSingle()

        // 2. استعلام الدفعات المعتمدة والمعلقة للطلب
        const { data: paymentsList } = await supabase
          .from('payments')
          .select('id, amount, status, receipt_image')
          .eq('order_tracking', orderNo)

        let totalApprovedPaid = 0
        let hasPendingPayment = false
        let latestReceipt = ''

        if (paymentsList && paymentsList.length > 0) {
          paymentsList.forEach((p: any) => {
            if (p.status === 'approved') {
              totalApprovedPaid += Number(p.amount) || 0
            } else if (p.status === 'pending' || p.status === 'بانتظار التأكيد') {
              hasPendingPayment = true
              if (p.receipt_image) latestReceipt = p.receipt_image
            }
          })
        }

        if (dbOrder && active) {
          setCustomer(dbOrder.customer_name || '')
          setPhone(dbOrder.phone || '')
          setProductName(dbOrder.product_name || 'طلب متجر دولي')

          // حساب الإجمالي: الاعتماد أولاً على total_cost_yer من قاعدة البيانات
          let calculatedTotal = Number(dbOrder.total_cost_yer) || 0

          if (!calculatedTotal) {
            const notesText = dbOrder.notes || ''
            const priceMatch = notesText.match(/السعر المعلن:\s*([\d.]+)\s*([^|]*)/)
            if (priceMatch) {
              const rawPrice = parseFloat(priceMatch[1] ?? '0') || 0
              const rawCur = priceMatch[2]?.trim() || ''

              if (rawCur.includes('سعودي') || rawCur.includes('ر.س')) {
                calculatedTotal = Math.round(rawPrice * 142)
              } else if (rawCur.includes('$') || rawCur.includes('دولار')) {
                calculatedTotal = Math.round(rawPrice * 535)
              } else if (rawPrice > 0) {
                calculatedTotal = Math.round(rawPrice)
              }
            }
          }

          if (!calculatedTotal) calculatedTotal = 42458
          setTotal(calculatedTotal)
          setCurrency('ر.ي')

          // حساب المدفوع: الأعلى بين paid_amount ومجموع الدفعات المعتمدة
          const orderPaid = Number(dbOrder.paid_amount) || 0
          const finalPaid = Math.max(orderPaid, totalApprovedPaid)
          setPaid(finalPaid)

          // تحديد حالة الدفع
          if (finalPaid >= calculatedTotal && calculatedTotal > 0) {
            setStatus('مدفوع بالكامل')
            setIsNotified(false)
          } else if (finalPaid > 0) {
            setStatus(hasPendingPayment ? 'قيد مراجعة الدفعة الإضافية' : 'مدفوع جزئياً')
            setIsNotified(hasPendingPayment)
          } else if (hasPendingPayment) {
            setStatus('قيد مراجعة الدفع والتأكيد')
            setIsNotified(true)
          } else {
            setStatus(dbOrder.status || 'بانتظار الدفع')
            setIsNotified(false)
          }

          if (latestReceipt) {
            setReceiptImg(latestReceipt)
          }
        }
      } catch (err) {
        console.warn('Order fetch error:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOrderData()
    return () => { active = false }
  }, [orderNo])

  const handleNotifyAdmin = async () => {
    if (isNotified || notifying) return
    setNotifying(true)
    setPaymentError('')
    setPaymentWarning('')

    try {
      if (!receiptImg) {
        throw new Error('أرفق صورة سند التحويل أولاً قبل إرسال طلب المراجعة.')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        throw new Error(`تعذر التحقق من تسجيل الدخول: ${authError.message}`)
      }
      if (!user) {
        const next = window.location.pathname + window.location.search
        window.location.replace(`/login?next=${encodeURIComponent(next)}`)
        return
      }

      const orderOwnershipQuery = supabase
        .from('orders')
        .select('user_id, tracking_code, customer_name, phone')
      const { data: ownedOrder, error: ownerError } = await (isUuid(orderNo)
        ? orderOwnershipQuery.or(`tracking_code.eq.${orderNo},id.eq.${orderNo}`)
        : orderOwnershipQuery.eq('tracking_code', orderNo)
      ).maybeSingle()

      if (ownerError) {
        throw new Error(`تعذر التحقق من ملكية الطلب: ${ownerError.message}`)
      }
      if (!ownedOrder || ownedOrder.user_id !== user.id) {
        throw new Error('هذا الطلب غير مرتبط بحسابك. سجّل الدخول بالحساب الذي أنشأ الطلب.')
      }
      if (!ownedOrder.tracking_code) {
        throw new Error('تعذر قراءة رمز تتبع الطلب؛ لم يتم إرسال الدفع.')
      }
      if (!Number.isFinite(remaining) || remaining <= 0) {
        throw new Error('لا يوجد مبلغ متبقٍ صالح لإرسال طلب الدفع.')
      }

      const paymentMethod = wallet?.label || walletKey
      const paymentPayload = {
        order_tracking: ownedOrder.tracking_code,
        tracking_code: ownedOrder.tracking_code,
        customer_name: ownedOrder.customer_name || null,
        phone: ownedOrder.phone || null,
        user_id: user.id,
        method: paymentMethod,
        payment_method: paymentMethod,
        amount: remaining,
        currency,
        receipt_image: receiptImg,
        status: 'pending',
        beneficiary_name: UNIFIED_NAME,
        account_number: UNIFIED_PHONE,
      }

      const { data: savedPayment, error: payErr } = await (supabase.from('payments') as any)
        .insert(paymentPayload)
        .select('id')
        .single()

      if (payErr) {
        throw new Error(`تعذر حفظ الدفعة: ${payErr.message}`)
      }

      await (supabase.from('notifications') as any)
        .insert({
          user_id: user.id,
          title: 'طلب الدفع',
          message: 'تم استلام طلب الدفع للمراجعة',
          payment_id: savedPayment.id,
        })

      setPaymentSaved(true)
      setStatus('قيد مراجعة الدفع والتأكيد')
      setIsNotified(true)
    } catch (e) {
      console.error('Payment notification failed:', e)
      setPaymentError(e instanceof Error ? e.message : 'تعذر حفظ الدفعة. تحقق من الاتصال ثم أعد المحاولة.')
    } finally {
      setNotifying(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setReceiptImg(base64)
    }
    reader.readAsDataURL(file)
  }

  const [walletKey, setWalletKey] = useState('kuraimi')
  const [copied, setCopied] = useState(false)
  const wallet = useMemo(() => WALLETS.find((w) => w.key === walletKey) || WALLETS[0], [walletKey])

  const copyAcc = async () => {
    try {
      await navigator.clipboard.writeText(UNIFIED_PHONE)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div className="pay-root">
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <div className="pay-wrap">

        <header className="pay-topbar">
          <div className="pay-badge"><Logo /></div>
          <div className="pay-brand">
            <h1>SHOPPING <b>AL SHAMEL</b></h1>
            <p>طرق الدفع • أودِع بأمان</p>
          </div>
          <button className="pay-arrow" type="button" title="رجوع" onClick={() => navigate({ to: '/' })}>
            <Arrow />
          </button>
        </header>

        {/* تفاصيل الطلب */}
        <section className="pay-card">
          <div className="pay-head">
            <div className="pay-ico"><Receipt /></div>
            <div className="pay-title">تفاصيل الطلب</div>
          </div>
          <div className="pay-ord">
            <div className="od-top">
              <div className="od-box num">
                <div className="od-k">رقم الطلب</div>
                <div className="od-v"><Hash />{orderNo}</div>
              </div>
              <div className="od-box stat">
                <div className="od-k">حالة الدفع</div>
                <div className="od-v">
                  <span className={'badge ' + (isPaid ? 'ok' : 'warn')}>
                    {loading ? '...' : status}
                  </span>
                </div>
              </div>
            </div>

            <div className="od-name">
              {loading ? 'جارٍ التحميل...' : `${customer || 'عميل السوق الشامل'} • ${phone || ''}`}
            </div>
            {productName && (
              <div className="od-prod">
                {productName}
              </div>
            )}

            <button
              type="button"
              className={`pay-wait-btn ${isNotified ? 'notified' : ''}`}
              onClick={handleNotifyAdmin}
              disabled={isNotified || notifying}
              title="حالة المراجعة"
            >
              {isNotified ? (
                <>
                  <CheckIc />
                  <span>تم إشعار الإدارة بنجاح! طلبك قيد المراجعة الفورية الآن ✓</span>
                </>
              ) : notifying ? (
                <span>جارٍ إشعار الإدارة...</span>
              ) : isPaid ? (
                <>
                  <CheckIc />
                  <span>تم سداد كامل المبلغ بنجاح ✓</span>
                </>
              ) : paid > 0 ? (
                <>
                  <Bell />
                  <span>تم اعتماد دفعة سابقة ({fmt(paid)} {currency}) • يمكنك سداد المتبقي أدناه</span>
                </>
              ) : (
                <>
                  <Bell />
                  <span>يرجى إيداع المبلغ وإشعار الإدارة للمراجعة الفورية</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* ملخص المبالغ المالية */}
        <section className="pay-card">
          <div className="pay-head">
            <div className="pay-ico"><Wallet /></div>
            <div className="pay-title">ملخص المبالغ المالية</div>
          </div>
          <div className="pay-stats">
            <div className="stat total">
              <div className="lab">الإجمالي المطلوب</div>
              <div className="num">{loading ? '…' : fmt(total)}</div>
              <div className="cur">{currency}</div>
            </div>
            <div className="stat paid">
              <div className="lab">المدفوع حالياً</div>
              <div className="num">{loading ? '…' : fmt(paid)}</div>
              <div className="cur">{currency}</div>
            </div>
            <div className="stat rest">
              <div className="lab">المتبقي عليكم</div>
              <div className="num">{loading ? '…' : fmt(remaining)}</div>
              <div className="cur">{currency}</div>
            </div>
          </div>
        </section>

        {/* طريقة الدفع والتحويل */}
        {!isPaid && (
          <section className="pay-card">
            <div className="pay-head alt">
              <div className="pay-ico"><Card /></div>
              <div className="pay-title">طريقة الدفع المعتمدة</div>
            </div>
            <div className="pay-grid" role="listbox" aria-label="اختر طريقة الدفع">
              {WALLETS.map((w) => {
                const active = w.key === walletKey
                return (
                  <button
                    key={w.key}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={'wbtn' + (active ? ' active' : '')}
                    onClick={() => { setWalletKey(w.key); setCopied(false) }}
                  >
                    <span className="tick"><CheckIc /></span>
                    <span className="wchip" aria-hidden="true" style={{ color: '#fff', background: w.color, borderColor: w.color }}>
                      <span className={'brand-mark ' + (w.markClass || '')}>{w.mark}</span>
                    </span>
                    <span className="wname">{w.label}</span>
                  </button>
                )
              })}
            </div>

            {wallet && (
              <div className="pay-acc" style={{ background: `linear-gradient(140deg, ${wallet.color}, ${wallet.color}cc)` }}>
                <div className="atop">
                  <div className="wlogo" aria-hidden="true" style={{ background: '#fff', color: wallet.color }}>
                    <span className={'brand-mark ' + (wallet.markClass || '')}>{wallet.mark}</span>
                  </div>
                  <div>
                    <div className="at">أودِع عبر</div>
                    <div className="an">{wallet.label}</div>
                  </div>
                </div>

                <div className="pay-accnum">
                  <div className="pay-acc-row">
                    <div>
                      <div className="k">اسم المستلم المعتمد:</div>
                      <div className="name-val">{UNIFIED_NAME}</div>
                    </div>
                  </div>
                  <div className="pay-acc-row" style={{ marginTop: 4, borderTop: '1px dashed rgba(255,255,255,0.25)', paddingTop: 8 }}>
                    <div>
                      <div className="k">رقم الحساب / المحفظة:</div>
                      <div className="num-val">{UNIFIED_PHONE}</div>
                    </div>
                    <button className={'cp' + (copied ? ' ok' : '')} type="button" onClick={copyAcc} title="نسخ الرقم">
                      {copied ? <CheckIc /> : <Copy />}
                    </button>
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload} 
                />
                
                <div 
                  className="upload-box" 
                  onClick={() => fileInputRef.current?.click()}
                  title="انقر لتحميل صورة إشعار التحويل"
                >
                  <div className="upload-box-content">
                    <Camera />
                    <span>{receiptImg ? 'تغيير صورة سند / إشعار التحويل' : 'اضغط هنا لتحميل صورة إشعار الدفع (سند التحويل)'}</span>
                  </div>
                  {receiptImg && (
                    <div className="upload-preview" onClick={(e) => e.stopPropagation()}>
                      <img src={receiptImg} alt="سند الدفع" />
                      <button 
                        className="upload-remove" 
                        type="button" 
                        title="حذف الصورة"
                        onClick={() => setReceiptImg(null)}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="pay-hint">
                  <Info />
                  <span>أودِع المبلغ المطلوب ({fmt(remaining)} {currency}) إلى الرقم والاسم أعلاه، ثم ارفع صورة الإشعار واضغط على الزر أدناه لتأكيد الإيداع.</span>
                </div>
              </div>
            )}

            <button 
              className="pay-btn pay-primary" 
              type="button" 
              disabled={!wallet || notifying || isNotified || remaining <= 0}
              onClick={handleNotifyAdmin}
            >
              {isNotified ? <CheckIc /> : null}
              <span>
                {notifying
                  ? 'جارٍ إرسال إشعار الدفع للإدارة...'
                  : isNotified
                    ? 'تم إرسال إشعار الدفع للإدارة بنجاح ✓'
                    : 'لقد أودعت المبلغ — إشعار الإدارة الآن'}
              </span>
            </button>

            {paymentWarning && <div className="pay-error">{paymentWarning}</div>}
            {paymentError && (
              <div className="pay-error">
                <div>{paymentError}</div>
                <button className="pay-retry" type="button" onClick={handleNotifyAdmin} disabled={notifying}>
                  إعادة المحاولة
                </button>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  )
}
