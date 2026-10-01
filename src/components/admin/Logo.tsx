import React from "react";

export const EmbeddedLogo: React.FC<{ size?: "sm" | "md" | "lg" }> = ({ size = "sm" }) => {
  const iconSizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
  return (
    <div className="flex items-center gap-2.5 select-none" dir="rtl">
      <div className={`relative ${iconSizes[size]} rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-[#0284C7] p-1.5 flex items-center justify-center shadow-md shadow-sky-950/20 shrink-0`}>
        <div className="relative w-full h-full flex items-center justify-center">
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <path d="M6 10H10L14 26H30L34 14H12" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="31" r="2.5" fill="#F97316" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="28" cy="31" r="2.5" fill="#F97316" stroke="#FFFFFF" strokeWidth="1" />
            <path d="M18 17L22 13M22 13L26 17M22 13V21" stroke="#FDBA74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col text-right">
        <span className="font-black tracking-tight text-[#0A2540] text-base sm:text-lg leading-tight">السوق الشامل</span>
        <span className="font-mono text-[9px] sm:text-[10px] font-black tracking-wider text-[#F97316] leading-none">AL SHAMEL SHOPPING</span>
      </div>
    </div>
  );
};
