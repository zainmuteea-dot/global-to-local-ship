import React, { useState } from 'react';

const AIRobot = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{from:'bot', text:'أهلاً بك! كيف يمكنني مساعدتك؟'}]);
  const [input, setInput] = useState('');

  const send = () => {
    if(!input.trim()) return;
    setMsgs(p=>[...p, {from:'user', text:input}]);
    setInput('');
    setTimeout(()=> setMsgs(p=>[...p, {from:'bot', text:'التوصيل 2-5 أيام والدفع آمن.'}]), 500);
  };

  return (
    <>
      <button onClick={()=>setOpen(!open)} className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 text-white rounded-full shadow-2xl z-50 text-2xl">💬</button>
      {open && (
        <div className="fixed bottom-24 right-6 w-80 h-96 bg-white rounded-2xl shadow-2xl z-50 flex flex-col" dir="rtl">
          <div className="bg-orange-500 text-white p-3 font-bold rounded-t-2xl">المساعد الذكي</div>
          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-gray-50">
            {msgs.map((m,i)=><div key={i} className={`p-2 rounded-lg text-sm ${m.from==='bot'?'bg-white shadow':'bg-orange-500 text-white mr-auto'}`}>{m.text}</div>)}
          </div>
          <div className="p-2 flex gap-2 border-t">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} className="flex-1 border rounded-full px-3 text-sm outline-none" placeholder="اكتب..."/>
            <button onClick={send} className="bg-orange-500 text-white px-3 rounded-full text-sm">إرسال</button>
          </div>
        </div>
      )}
    </>
  );
};
export default AIRobot;
