import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminClients(){
  const [rows,setRows]=useState<any[]>([]);
  const [name,setName]=useState(""); const [phone,setPhone]=useState(""); const [city,setCity]=useState("");
  const load=async()=>{
    const {data,error}=await supabase.from("clients").select("*").order("id",{ascending:false});
    if(!error) setRows(data||[]); else alert(error.message);
  };
  useEffect(()=>{load()},[]);
  const add=async()=>{
    if(!name.trim()){alert("ادخل الاسم");return;}
    const {error}=await supabase.from("clients").insert([{name,phone,city}]);
    if(error){alert("خطأ: "+error.message);return;}
    setName("");setPhone("");setCity(""); load();
  };
  return(<div style={{padding:20,direction:"rtl"}}>
    <h2>العملاء</h2>
    <input placeholder="الاسم" value={name} onChange={e=>setName(e.target.value)} style={{display:"block",margin:"8px 0",padding:8,width:"100%"}}/>
    <input placeholder="الهاتف" value={phone} onChange={e=>setPhone(e.target.value)} style={{display:"block",margin:"8px 0",padding:8,width:"100%"}}/>
    <input placeholder="المدينة" value={city} onChange={e=>setCity(e.target.value)} style={{display:"block",margin:"8px 0",padding:8,width:"100%"}}/>
    <button onClick={add} style={{padding:"10px 20px"}}>+ إضافة</button>
    <div style={{marginTop:20}}>{rows.map(r=>(<div key={r.id} style={{border:"1px solid #ddd",padding:8,margin:"6px 0"}}>{r.name} - {r.phone} - {r.city}</div>))}</div>
  </div>);
}
