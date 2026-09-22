import React, { useState } from 'react';

const AIRobot = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{from:'bot', text:'أهلاً بك في BIGHT! كيف أقدر أساعدك اليوم؟'}]);
  const [input, setInput] = useState('');

  const send = () => {
    if(!input.trim()) return;
    const q = input;
    setMsgs(p=>[...p, {from:'user', text:q}]);
    setInput('');
    setTimeout(()=>{
      let r = 'تواصل معنا وسنرد عليك فوراً.';
      if(q.includes('توصيل')||q.includes('شحن')) r = 'نوصل لك من أشهر المتاجر العالمية حتى باب بيتك خلال 7-14 يوم.';
      else if(q.includes('كيف اطلب')||q.includes('طلب')) r = 'اضغط على اطلب الآن، سجل، ثم الصق رابط المنتج وسنتولى الباقي.';
      else if(q.includes('سعر')||q.includes('عمولة')) r = 'نحسب لك السعر شامل الشحن والجمارك بشفافية كاملة.';
      setMsgs(p=>[...p, {from:'bot', text:r}]);
    },600);
  };

  return (
    <>
      <div onClick={()=>setOpen(!open)} className="fixed bottom-6 left-6 w-16 h-16 z-50 cursor-pointer">
        <img src="/robot.png" alt="robot" className="w-full h-full object-contain drop-shadow-xl" />
      </div>

      {open && (
        <div className="fixed bottom-24 left-6 w-80 bg-[#FFF8F0] rounded-2xl shadow-2xl z-50 overflow-hidden border border-[#A6683C]/20" dir="rtl">
          <div className="bg-[#A6683C] p-3 flex items-center gap-3">
            <img src="/robot.png" className="w-10 h-10 object-contain bg-white rounded-full p-1" />
            <div className="text-white">
              <div className="font-bold text-sm">مساعد BIGHT</div>
              <div className="text-xs opacity-90">متصل الآن</div>
            </div>
          </div>
          <div className="h-72 p-3 overflow-y-auto space-y-2">
            {msgs.map((m,i)=>(
              <div key={i} className={`p-2 rounded-xl text-sm max-w-[85%] ${m.from==='bot'?'bg-white shadow-sm border':'bg-[#A6683C] text-white mr-auto'}`}>{m.text}</div>
            ))}
          </div>
          <div className="p-2 border-t bg-white flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="اكتب سؤالك..." className="flex-1 border rounded-full px-3 py-2 text-sm outline-none"/>
            <button onClick={send} className="bg-[#A6683C] text-white px-4 rounded-full text-sm">إرسال</button>
          </div>
        </div>
      )}
    </>
  );
};
export default AIRobot;
