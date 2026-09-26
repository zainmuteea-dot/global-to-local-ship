const [filter, setFilter] = useState("الكل");
const filtered = filter==="الكل" ? orders : orders.filter(o=>o.status===filter);

<div className="flex gap-2 flex-wrap mb-4">
  {["الكل", ...ORDER_STATUSES.map(s=>s.value)].map(v=>(
    <button key={v} onClick={()=>setFilter(v)}
      className={`px-4 py-1.5 rounded-full text-sm font-bold ${filter===v?'bg-cocoa text-white':'bg-sand text-cocoa'}`}>
      {v}
    </button>
  ))}
</div>
