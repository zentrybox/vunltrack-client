type HeatmapCell = { id: string; intensity: number; label?: string };

interface HeatmapGridProps {
  cells?: HeatmapCell[];
}

function intensityToColor(value: number) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const red = 255;
  const green = Math.floor(255 - 155 * clamped);
  const blue = Math.floor(78 + 40 * (1 - clamped));
  return `rgba(${red}, ${green}, ${blue}, ${0.15 + clamped * 0.55})`;
}

const DEFAULT_CELLS: HeatmapCell[] = [
  { id: "cell-0", intensity: 0.94, label: "Edge" },
  { id: "cell-1", intensity: 0.78 },
  { id: "cell-2", intensity: 0.62 },
  { id: "cell-3", intensity: 0.48 },
  { id: "cell-4", intensity: 0.35 },
  { id: "cell-5", intensity: 0.86 },
  { id: "cell-6", intensity: 0.71 },
  { id: "cell-7", intensity: 0.55 },
  { id: "cell-8", intensity: 0.42 },
  { id: "cell-9", intensity: 0.28 },
  { id: "cell-10", intensity: 0.68 },
  { id: "cell-11", intensity: 0.52 },
  { id: "cell-12", intensity: 0.41 },
  { id: "cell-13", intensity: 0.33 },
  { id: "cell-14", intensity: 0.22 },
  { id: "cell-15", intensity: 0.57 },
  { id: "cell-16", intensity: 0.46 },
  { id: "cell-17", intensity: 0.31 },
  { id: "cell-18", intensity: 0.24 },
  { id: "cell-19", intensity: 0.18 },
  { id: "cell-20", intensity: 0.44 },
  { id: "cell-21", intensity: 0.36 },
  { id: "cell-22", intensity: 0.27 },
  { id: "cell-23", intensity: 0.21 },
  { id: "cell-24", intensity: 0.14 },
];

export default function HeatmapGrid({ cells }: HeatmapGridProps) {
  const computedCells: HeatmapCell[] =
    cells ?? DEFAULT_CELLS;

  return (
    <div
      suppressHydrationWarning
      className="grid grid-cols-5 gap-1 rounded-lg border border-gray-200 bg-white p-3"
    >
      {computedCells.map((cell) => (
        <div
          key={cell.id}
          className="flex aspect-square items-center justify-center rounded-md text-[0.65rem] font-semibold uppercase tracking-wide text-gray-700"
          style={{ backgroundColor: intensityToColor(cell.intensity) }}
        >
          {cell.label ?? `${Math.round(cell.intensity * 100)}%`}
        </div>
      ))}
    </div>
  );
}
