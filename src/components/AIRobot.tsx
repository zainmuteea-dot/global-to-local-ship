import React, { useState, useEffect, useRef } from 'react';

const AIRobot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'أهلاً بك! أنا مساعد جلوبال الذكي 🤖 كيف أقدر أساعدك اليوم؟', sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(scrollToBottom, [messages]);
  const botResponses = [
    'شكراً لسؤالك! فريق جلوبال جاهز لخدمتك. هل تريد الاستفسار عن خدمات الشحن؟',
    'يمكنك تتبع شحنتك من صفحة التتبع، أو تواصل معنا واتساب للمساعدة السريعة.',
    'أسعار الشحن تعتمد على الوزن والوجهة. أخبرني من أين إلى أين؟',
    'نعم، نوفر شحن من الصين، تركيا، الإمارات، وأمريكا إلى اليمن.',
  ];
  const handleSend = () => {
    if (!inputValue.trim()) return;
    const userMsg = { id: Date.now(), text: inputValue, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    setTimeout(() => {
      const randomReply = botResponses[Math.floor(Math.random() * botResponses.length)];
      setMessages(prev => [...prev, { id: Date.now() + 1, text: randomReply, sender: 'bot' }]);
      setIsTyping(false);
    }, 1200);
  };
  return (
    <>
      <div style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ background: '#fff', color: '#8B5A2B', fontSize: '12px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '20px', marginBottom: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '2px solid #8B5A2B', whiteSpace: 'nowrap' }}>
          اسألني! 🤖
        </div>
        <button onClick={() => setIsOpen(!isOpen)} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #8B5A2B', background: '#fff', cursor: 'pointer', padding: '5px', boxShadow: '0 8px 25px rgba(139,90,43,0.3)' }}>
          <img src="/IMG-20260922-WA6153.jpg" alt="AI Assistant" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        </button>
      </div>
      {isOpen && (
        <div style={{ position: 'fixed', bottom: '115px', left: '20px', width: '340px', maxWidth: '90vw', height: '480px', background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '2px solid #8B5A2B' }}>
          <div style={{ background: 'linear-gradient(135deg, #8B5A2B, #A06A35)', color: 'white', padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/IMG-20260922-WA6153.jpg" alt="bot" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid white', objectFit: 'cover' }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>مساعد جلوبال الذكي</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>🟢 متصل الآن</div>
            </div>
          </div>
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', background: '#FFF8F0' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ marginBottom: '12px', textAlign: msg.sender === 'user'? 'left' : 'right' }}>
                <div style={{ display: 'inline-block', padding: '10px 14px', borderRadius: '15px', maxWidth: '80%', fontSize: '14px', background: msg.sender === 'user'? '#8B5A2B' : 'white', color: msg.sender === 'user'? 'white' : '#333', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: msg.sender === 'bot'? '1px solid #E8D5B5' : 'none' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && <div style={{ fontSize: '13px', color: '#8B5A2B' }}>يكتب الآن...</div>}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid #E8D5B5', display: 'flex', gap: '8px', background: 'white' }}>
            <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="اكتب رسالتك..." style={{ flex: 1, padding: '10px 14px', borderRadius: '25px', border: '1.5px solid #E8D5B5', outline: 'none', fontSize: '14px' }} />
            <button onClick={handleSend} style={{ background: '#8B5A2B', color: 'white', border: 'none', width: '42px', height: '42px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px' }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
};
export default AIRobot;
