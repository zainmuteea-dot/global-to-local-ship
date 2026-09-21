import { useEffect, useState } from "react";
export default function AIRobot() {
  const [show, setShow] = useState(false);
  useEffect(() => { if (!localStorage.getItem("robotClosed")) setShow(true); }, []);
  if (!show) return null;
  return (
    <div style={{position:"fixed",bottom:20,left:20,zIndex:1000,textAlign:"center"}}>
      <button onClick={()=>{setShow(false);localStorage.setItem("robotClosed","true");}} style={{position:"absolute",top:-8,right:-8,width:24,height:24,borderRadius:"50%",border:"none",background:"#ff4444",color:"#fff",cursor:"pointer"}}>×</button>
      <video src="/robot.mp4" autoPlay loop muted playsInline style={{width:120,height:120,borderRadius:20,display:"block"}} />
      <div style={{background:"#5C3A21",color:"#fff",fontSize:12,padding:"6px 10px",borderRadius:12,marginTop:5}}>تسوق عالمياً واستلم محلياً 🚚</div>
    </div>
  );
}
