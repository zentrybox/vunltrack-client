'use client';

import CoalCard from "@/components/CoalCard";
import HeatmapGrid from "@/components/HeatmapGrid";
import RadarWidget from "@/components/RadarWidget";

export default function RadarPage() {
  return (
    <div className="space-y-8">
      <CoalCard
        title="Vulnerability radar"
        subtitle="Live signal across your monitored networks"
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <RadarWidget label="Perimeter" />
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Signal map</h3>
            <HeatmapGrid />
            <p className="text-sm text-gray-600">
              Radar pulses highlight active sweeps. Hover nodes to inspect segments and schedule deep scans.
            </p>
          </div>
        </div>
      </CoalCard>
    </div>
  );
}
