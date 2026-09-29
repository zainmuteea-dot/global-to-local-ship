import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/pay')({
  validateSearch: (s: Record<string, string>) => ({ order: s.order?? '' }),
  component: PayPage,
})

const WALLETS = [
  { id: 'jeeb', name: 'جيب', en: 'Jeeb', logo: '/wallets/jeeb.png', color: '#e23b3b', acc: '772399744' },
  { id: 'jawali', name: 'جوالي', en: 'Jawali', logo: '/wallets/jawali.png', color: '#f39c12', acc: '772399744' },
  { id: 'floosak', name: 'فلوسك', en: 'Floosak', logo: '/wallets/floosak.png', color: '#1e7fd4', acc: '772399744' },
  { id: 'haseb', name: 'حاسب', en: 'Haseb', logo: '/wallets/haseb.png', color: '#2e9e5b', acc: '772399744' },
  { id: 'cash', name: 'كاش', en: 'Cash', logo: '/wallets/cash.png', color: '#0ea5b5', acc: '772399744' },
  { id: 'onecash', name: 'ون كاش', en: 'One Cash', logo: '/wallets/onecash.png', color: '#ef7d00', acc: '772399744' },
]

function PayPage() {
  const { order } = Route.useSearch()
  const [cName, setCName] = useState('')
  const [phone, setPhone] = useState('')
  const [methodId, setMethodId] = useState('')
  const [open, setOpen] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!order) return
    supabase.from('orders').select('customer_name, phone').eq('tracking_code', order).maybeSingle()
     .then(({ data }) => { if (data) { setCName(data.customer_name||''); setPhone(data.phone||'') } })
  }, [order])

  const sel = WALLETS.find(w => w.id === methodId)

  const handlePay = async () => {
    if (!sel) return alert('اختر طريقة الدفع')
    setSaving(true)
    const { error } = await supabase.from('payments').insert([{
      order_tracking: order, customer_name: cName, method: sel.name, amount: 3650, account_number: sel.acc
    }])
    setSaving(false)
    if (error) alert(error.message)
    else alert('تم تسجيل الدفع عبر ' + sel.name)
  }

  return (
    <div dir="rtl" style={{fontFamily:"'Cairo',sans-serif", background:'#f3ede4', minHeight:'100vh', padding:'30px 16px'}}>
      <style>{`
       .card{background:#fff;border-radius:20px;box-shadow:0 20px 50px -20px rgba(90,70,40,.35);padding:24px}
       .order{background:#faf6ef;border:1px solid #ece4d7;border-radius:16px;padding:18px}
       .sum{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}
       .sum div{background:#faf6ef;border:1px solid #ece4d7;border-radius:14px;padding:14px;text-align:center}
       .method{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;cursor:pointer}
       .method:hover{background:#fbe9d7}
       .method.active{background:#fbe9d7;border:1px solid #e8873b}
       .method img{width:44px;height:44px;object-fit:contain;background:#fff;border:1px solid #ece4d7;border-radius:12px;padding:4px}
      `}</style>

      <div style={{maxWidth:560, margin:'0 auto'}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:18}}>
          <h1 style={{fontWeight:800}}>الدفع</h1>
          <button onClick={()=>history.back()} style={{background:'#fff', border:'1px solid #ece4d7', borderRadius:12, padding:'8px 16px'}}>رجوع</button>
        </div>

        <div className="card">
          <div className="order">
            <div style={{display:'flex', justifyContent:'space-between'}}><span style={{color:'#8a8378'}}>رقم الطلب</span><b>{order || '144684'}</b></div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:8}}><span style={{color:'#8a8378'}}>حالة الدفع</span><span style={{background:'#fdecec', color:'#d9534f', padding:'4px 12px', borderRadius:999, fontSize:13, fontWeight:700}}>غير مكتمل</span></div>
            {(cName||phone) && <div style={{borderTop:'1px dashed #ece4d7', marginTop:12, paddingTop:10, fontSize:14, color:'#8a8378'}}>{cName} – <span dir="ltr">{phone}</span></div>}
          </div>

          <div className="sum">
            <div><div style={{fontSize:12, color:'#8a8378'}}>الإجمالي</div><b>3,650 ري</b></div>
            <div><div style={{fontSize:12, color:'#8a8378'}}>المدفوع</div><b style={{color:'#2e9e5b'}}>0 ري</b></div>
            <div><div style={{fontSize:12, color:'#8a8378'}}>المتبقي</div><b style={{color:'#e8873b'}}>3,650 ري</b></div>
          </div>

          <div style={{fontWeight:800, marginBottom:10}}>طريقة الدفع</div>
          <div style={{border:'1px solid #ece4d7', borderRadius:14, background:'#faf6ef'}}>
            <div onClick={()=>setOpen(!open)} style={{padding:14, fontWeight:700, cursor:'pointer', display:'flex', justifyContent:'space-between'}}>
              <span>{sel? sel.name : 'اختر طريقة الدفع'}</span><span>⌄</span>
            </div>
            {open && <div style={{padding:6, background:'#fff', borderTop:'1px solid #ece4d7'}}>
              {WALLETS.map(w=>(
                <div key={w.id} onClick={()=>setMethodId(w.id)} className={`method ${methodId===w.id?'active':''}`}>
                  <img src={w.logo} alt={w.name} onError={e=>{e.currentTarget.style.display='none'}} />
                  <div><div style={{fontWeight:700}}>{w.name}</div><div style={{fontSize:12, color:'#8a8378'}}>{w.en}</div></div>
                  {methodId===w.id && <span style={{marginInlineStart:'auto', color:'#e8873b'}}>✓</span>}
                </div>
              ))}
            </div>}
          </div>

          {sel && (
            <div style={{marginTop:16, background:'#fff8ef', border:`1.5px solid ${sel.color}`, borderRadius:16, padding:18}}>
              <div style={{fontWeight:800, color: sel.color, marginBottom:10, display:'flex', alignItems:'center', gap:8}}>
                <img src={sel.logo} style={{width:30, height:30, objectFit:'contain'}} /> حساب التحويل - {sel.name}
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}><span style={{color:'#8a8378'}}>اسم المستفيد</span><b>زين العابدين مطيع حاتم الوصابي</b></div>
              <div style={{display:'flex', justifyContent:'space-between', marginTop:8}}><span style={{color:'#8a8378'}}>رقم الحساب</span><b dir="ltr" style={{userSelect:'all'}}>{sel.acc}</b></div>
              <div style={{fontSize:12, color:'#8a8378', textAlign:'center', marginTop:10}}>اضغط على الرقم لنسخه</div>
            </div>
          )}

          <button onClick={handlePay} disabled={saving} style={{marginTop:20, width:'100%', background:'linear-gradient(135deg,#ef9a4e,#e8873b)', color:'#fff', border:'none', padding:16, borderRadius:14, fontWeight:800, fontSize:17}}>
            {saving? 'جاري الحفظ...' : 'المتابعة للدفع · 3,650 ري'}
          </button>
        </div>
      </div>
    </div>
  )
}
