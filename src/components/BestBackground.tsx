export default function BestBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{
        backgroundColor: "#071a37",
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, rgba(28, 91, 157, 0.68) 0%, rgba(12, 42, 82, 0.55) 34%, transparent 70%), radial-gradient(circle at 8% 36%, rgba(0, 180, 255, 0.13), transparent 25%), radial-gradient(circle at 92% 58%, rgba(249, 115, 22, 0.10), transparent 24%), linear-gradient(180deg, #0a2851 0%, #071a37 54%, #06152f 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(147, 197, 253, 0.8) 0.8px, transparent 0.8px)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />
      <div className="absolute -left-32 top-44 size-80 rounded-full bg-sky-500/10 blur-[100px]" />
      <div className="absolute -right-36 top-[38rem] size-96 rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-400/10 blur-[100px]" />
    </div>
  );
}
