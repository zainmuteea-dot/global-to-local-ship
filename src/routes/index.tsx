<style>{`
@keyframes glowPulseFix {
  0% {
    box-shadow: 0 0 12px rgba(0,255,255,0.6), 0 0 22px rgba(255,122,0,0.5), 0 0 35px rgba(0,255,255,0.2);
    border-color: rgba(0,255,255,0.8);
  }
  50% {
    box-shadow: 0 0 25px rgba(0,255,255,1), 0 0 45px rgba(255,122,0,0.9), 0 0 65px rgba(255,122,0,0.4);
    border-color: rgba(255,160,0,1);
  }
  100% {
    box-shadow: 0 0 12px rgba(0,255,255,0.6), 0 0 22px rgba(255,122,0,0.5), 0 0 35px rgba(0,255,255,0.2);
    border-color: rgba(0,255,255,0.8);
  }
}

.card-fixed {
  animation: glowPulseFix 2.2s ease-in-out infinite !important;
  border: 2.5px solid rgba(0,255,255,0.8) !important;
  background: rgba(37,71,133,0.92) !important;
  border-radius: 14px !important;
  box-shadow: 0 0 15px rgba(0,255,255,0.5), 0 0 25px rgba(255,122,0,0.4) !important;
}

.testimonial-fixed {
  animation: glowPulseFix 2.2s ease-in-out infinite !important;
  border: 2.5px solid rgba(0,255,255,0.8) !important;
  background: rgba(25,55,110,0.95) !important;
  border-radius: 16px !important;
  box-shadow: 0 0 15px rgba(0,255,255,0.5), 0 0 25px rgba(255,122,0,0.4) !important;
}

/* تأخيرات النبض المطلوبة للبطاقات الخمس والثلاث */
.card-fixed:nth-child(1) { animation-delay: 0s !important; }
.card-fixed:nth-child(2) { animation-delay: 0.35s !important; }
.card-fixed:nth-child(3) { animation-delay: 0.7s !important; }
.card-fixed:nth-child(4) { animation-delay: 1.05s !important; }
.card-fixed:nth-child(5) { animation-delay: 1.4s !important; }
.testimonial-fixed:nth-child(1) { animation-delay: 0s !important; }
.testimonial-fixed:nth-child(2) { animation-delay: 0.35s !important; }
.testimonial-fixed:nth-child(3) { animation-delay: 0.7s !important; }
`}</style>
