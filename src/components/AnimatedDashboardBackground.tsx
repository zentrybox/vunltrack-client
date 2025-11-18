export default function AnimatedDashboardBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden scanlines">
      {/* Neon gamer gradient wash */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "linear-gradient(120deg, var(--color-bg), var(--color-accent2), var(--color-bg), var(--color-accent1), var(--color-bg))",
          backgroundSize: "300% 300%",
          animation: "gradient-pan 26s ease infinite",
        }}
      />
      {/* Soft radial glows */}
      <div
        aria-hidden
        className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--color-accent1) 22%, transparent), color-mix(in srgb, var(--color-accent1) 10%, transparent), transparent)",
          filter: "blur(8px)",
          animation: "pulse-soft 3.2s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -right-24 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--color-accent2) 20%, transparent), color-mix(in srgb, var(--color-accent2) 10%, transparent), transparent)",
          filter: "blur(10px)",
          animation: "pulse-soft 4s ease-in-out infinite",
          animationDelay: "0.6s",
        }}
      />

  {/* Subtle animated grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px, 40px 40px",
          animation: "grid-pan 30s linear infinite",
        }}
      />

      {/* Radar sweep accent */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(255,255,255,0.12), rgba(255,255,255,0.0) 35%)",
          maskImage: "radial-gradient(closest-side, transparent 55%, black 56%)",
          WebkitMaskImage: "radial-gradient(closest-side, transparent 55%, black 56%)",
          animation: "radar-sweep 6s linear infinite",
        }}
      />
    </div>
  );
}
