import React from 'react';

const AIRobot = () => {
  return (
    <div className="fixed bottom-6 right-6 w-32 h-32 rounded-full overflow-hidden shadow-2xl z-50 border-2 border-white/20">
      <video
        src="/VID-20260921-WA1647.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default AIRobot;
