import React, { useState } from 'react';

const AIRobot = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{from:'bot', text:'أهلاً بك! أنا مساعد السوق الشامل، كيف يمكنني مساعدتك؟'}]);
  const [input, setInput] = useState('');

  const send = () => {
    if(!input.trim()) return;
    const userMsg = {from:'user', text:input};
    setMsgs(p=>[...p, userMsg]);
    setInput('');
    setTimeout(()=>{
      let r='شكراً لسؤالك! التوصيل 2-5 أيام والدفع آمن 100%.';
      if(input.includes('توصيل')||input.includes('شحن')) r='التوصيل خلال 2-5 أيام عمل لجميع المحافظات.';
      else if(input.includes('دفع')) r='ندعم الدفع عند الاستلام والتحويل الإلكتروني.';
      else if(input.includes('تتبع')) r='تقدر تتبع طلبك من صفحة طلباتي برقم الطلب.';
      setMsgs(p=>[...p, {from:'bot', text:r}]);
    },600);
  };

  return (
    <>
      <div onClick={()=>setOpen(!open)} className="fixed bottom-6 right-6 w-24 h-24 rounded-full overflow-hidden shadow-2xl z-50 border-2 border-white/20 cursor-pointer">
        <video src="/VID-20260921-WA1647.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
      </div>

      {open && (
        <div className="fixed bottom-32 right-6 w-80 h-96 bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden" dir="rtl">
          <div className="bg-orange-500 text-white p-3 font-bold">مساعد السوق الشامل 🤖</div>
          <div className="flex-1 p-3 overflow-y-auto bg-gray-50 space-y-2">
            {msgs.map((m,i)=>(
              <div key={i} className={`p-2 rounded-xl max-w-[80%] text-sm ${m.from==='bot'?'bg-white shadow':'bg-orange-500 text-white mr-auto'}`}>{m.text}</div>
            ))}
          </div>
          <div className="p-2 border-t flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="اكتب سؤالك..." className="flex-1 border rounded-full px-3 py-1 text-sm outline-none"/>
            <button onClick={send} className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm">إرسال</button>
          </div>
        </div>
      )}
    </>
  );
};
export default AIRobot;
