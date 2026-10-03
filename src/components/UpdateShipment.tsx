import { useState } from 'react'
import { supabase } from '../lib/supabase'

const stages = [
  { key: 'received', label: 'استلام الطلب والاعتماد' },
  { key: 'purchased', label: 'الشراء من المتجر الدولي' },
  { key: 'warehouse', label: 'وصول المستودع الدولي' },
  { key: 'international', label: 'الشحن الدولي (جوي / بحري)' },
  { key: 'yemen', label: 'الوصول لليمن والفرز المحلي' },
  { key: 'out_for_delivery', label: 'خروج الشحنة مع المندوب للتوصيل' },
  { key: 'delivered', label: 'تم التسليم بنجاح' },
];

export function UpdateShipment({ orderId, onDone }: { orderId: string, onDone?: () => void }) {
  const [loading, setLoading] = useState<string|null>(null)

  const updateStage = async (stageKey: string) => {
    setLoading(stageKey)
    const { error } = await supabase
      .from('orders')
      .update({ shipment_status: stageKey })
      .eq('id', orderId);
    
    setLoading(null)
    if (!error) {
      alert('تم تحديث المرحلة وإرسال إشعار للعميل');
      onDone?.()
    } else {
      alert('خطأ: ' + error.message)
    }
  };

  return (
    <div className="flex flex-col gap-2" dir="rtl">
      {stages.map(s => (
        <button 
          key={s.key} 
          disabled={loading===s.key}
          onClick={() => updateStage(s.key)}
          className="p-3 border rounded-lg hover:bg-green-50 text-right"
        >
          📦 {loading===s.key ? 'جاري التحديث...' : s.label}
        </button>
      ))}
    </div>
  )
}
