interface RadarWidgetProps {
  label?: string;
}

export default function RadarWidget({ label = "Global Sweep" }: RadarWidgetProps) {
  return (
    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border border-blue-200 bg-blue-50 text-blue-600">
      <div className="absolute inset-6 rounded-full border border-blue-200/70" />
      <div className="absolute inset-12 rounded-full border border-blue-200/40" />
      <div className="absolute inset-20 rounded-full border border-blue-200/30" />
      <div className="relative z-10 flex flex-col items-center justify-center gap-2">
        <span className="text-xs uppercase tracking-[0.2em] text-blue-500/70">{label}</span>
        <span className="text-2xl font-semibold text-blue-700">72%</span>
        <span className="text-xs text-gray-500">Coverage synced</span>
      </div>
    </div>
  );
}
