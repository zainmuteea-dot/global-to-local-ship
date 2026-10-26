export default function BestBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{
        background: "radial-gradient(130% 130% at 20% 20%, #1a4a8a 0%, #0f2a5c 55%, #081a38 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,.09) 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}
