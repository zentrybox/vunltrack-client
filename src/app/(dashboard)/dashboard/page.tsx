'use client';

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import HeatmapGrid from "@/components/HeatmapGrid";
import RadarWidget from "@/components/RadarWidget";
import StatusBadge from "@/components/StatusBadge";
import { useDashboard } from "@/hooks/useDashboard";
import { cn, formatDateLabel } from "@/lib/utils";

const statCards = [
	{
		id: "devices",
		label: "Total devices",
		dataKey: "totalDevices" as const,
		tone: "info" as const,
	},
	{
		id: "critical",
		label: "Critical findings",
		dataKey: "criticalFindings" as const,
		tone: "critical" as const,
	},
	{
		id: "high",
		label: "High risk",
		dataKey: "highFindings" as const,
		tone: "warning" as const,
	},
	{
		id: "medium",
		label: "Medium",
		dataKey: "mediumFindings" as const,
		tone: "info" as const,
	},
];

const toneTextClass: Record<(typeof statCards)[number]["tone"], string> = {
	info: "text-blue-600",
	critical: "text-red-600",
	warning: "text-amber-600",
};

export default function DashboardPage() {
	const { metrics, queue, loading, error } = useDashboard();

	return (
		<div className="space-y-8">
			<section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
				{statCards.map((card) => (
					<CoalCard key={card.id} className="relative overflow-hidden">
						<div
							className="absolute inset-x-0 top-0 h-1 bg-blue-200"
							aria-hidden
						/>
						<div className="space-y-4">
							<p className="text-xs font-semibold uppercase tracking-[0.32em] text-gray-500">
								{card.label}
							</p>
							<p
								className={cn(
									"text-3xl font-semibold",
									toneTextClass[card.tone]
								)}
							>
								{metrics ? metrics[card.dataKey] ?? 0 : "—"}
							</p>
							<p className="text-xs text-gray-500">
								{metrics?.lastScanAt
									? `Last scan ${formatDateLabel(metrics.lastScanAt)}`
									: "Awaiting first scan"}
							</p>
						</div>
					</CoalCard>
				))}
			</section>

			<section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
				<CoalCard
					title="Vulnerability queue"
					subtitle="Prioritized exposures across your managed devices"
					action={
						<CoalButton variant="secondary" size="sm">
							View all alerts
						</CoalButton>
					}
				>
					{error ? (
						<p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{error}
						</p>
					) : (
						<CoalTable
							data={queue}
							isLoading={loading}
							columns={[
								{
									key: "title",
									header: "Threat",
									render: (item) => (
										<div className="space-y-1">
												<p className="text-sm font-semibold text-gray-900">
												{item.title}
											</p>
												<p className="text-xs text-gray-500">
												{item.device}
											</p>
										</div>
									),
								},
								{
									key: "severity",
									header: "Severity",
									render: (item) => (
										<StatusBadge
											tone={
												item.severity === "CRITICAL"
													? "critical"
													: item.severity === "HIGH"
													? "warning"
													: item.severity === "MEDIUM"
													? "info"
													: item.severity === "LOW"
													? "safe"
													: "neutral"
											}
										>
											{item.severity}
										</StatusBadge>
									),
								},
								{
									key: "detectedAt",
									header: "Detected",
									render: (item) => (
											<span className="text-xs text-gray-500">
											{formatDateLabel(item.detectedAt)}
										</span>
									),
								},
								{
									key: "status",
									header: "Status",
									render: (item) => (
											<span className="text-xs font-semibold text-gray-800">
											{item.status.replace("_", " ")}
										</span>
									),
								},
							]}
							emptyState="All systems nominal."
						/>
					)}
				</CoalCard>
				<div className="space-y-6">
					<CoalCard title="Radar sweep" subtitle="Live signal coverage">
						<RadarWidget />
					</CoalCard>
					<CoalCard title="Heatmap" subtitle="Device posture across segments">
						<HeatmapGrid />
					</CoalCard>
				</div>
			</section>
		</div>
	);
}
