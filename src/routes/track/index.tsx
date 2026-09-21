import { useState } from "react";

export default function TrackIndex() {
  const [code, setCode] = useState("");
  
  return (
    <div dir="rtl" style={{minHeight:'100vh',background:'#E8DDD1',padding:20,fontFamily:'Segoe UI'}}>
      <div style={{maxWidth:500,margin:'40px auto',background:'#FFFBF2',borderRadius:24,padding:24,textAlign:'center'}}>
        <div style={{fontSize:50}}>📦</div>
        <h2 style={{color:'#3E2410',margin:'10px 0'}}>تتبع شحنتك</h2>
        <p style={{color:'#8A6D4B',fontSize:14}}>أدخل رقم التتبع لعرض حالة الشحنة</p>
        
        <div style={{display:'flex',gap:8,marginTop:20}}>
          <input 
            value={code} 
            onChange={e=>setCode(e.target.value)}
            placeholder="مثال: SH-12345"
            style={{flex:1,padding:14,borderRadius:16,border:'2px solid #B78D5E',background:'#fff',textAlign:'center',outline:'none'}} 
          />
        </div>
        
        <a href={`/track/${code || 'demo'}`} 
          style={{display:'block',marginTop:12,background:'#5C3A21',color:'#fff',padding:14,borderRadius:16,textDecoration:'none',fontWeight:700}}>
          تتبع الآن
        </a>
      </div>
    </div>
  )
}
