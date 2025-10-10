'use client';

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { SkeletonCard, SkeletonTable } from "@/components/Skeleton";
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

const toneTextClass: Record<
	"info" | "critical" | "warning" | "safe" | "neutral",
	string
> = {
	info: "text-blue-600",
	critical: "text-red-600",
	warning: "text-amber-600",
	safe: "text-emerald-600",
	neutral: "text-gray-600",
};

export default function DashboardPage() {
	const router = useRouter();
	const { metrics, queue, scans, incidents, systemMetrics, loading, error } =
		useDashboard();

	const systemTiles = [
		{
			id: "avg-duration",
			label: "Avg scan duration",
			value: systemMetrics
				? `${Math.round(systemMetrics.averageScanDurationMs / 1000)}s`
				: "—",
			tone: "info" as const,
			description: "Rolling 24h window",
		},
		{
			id: "success-ratio",
			label: "Device success ratio",
			value: systemMetrics
				? `${Math.round(systemMetrics.deviceSuccessRatio * 100)}%`
				: "—",
			tone: "safe" as const,
			description: "Runs completed without issues",
		},
		{
			id: "cve-detection",
			label: "CVE detection rate",
			value: systemMetrics
				? `${Math.round(systemMetrics.cveDetectionRate * 100)}%`
				: "—",
			tone: "warning" as const,
			description: "Devices reporting new exposures",
		},
	];

	const scanStatusTone: Record<string, ComponentProps<typeof StatusBadge>["tone"]> = {
		running: "info",
		completed: "safe",
		failed: "critical",
		cancelled: "neutral",
	};

	const incidentStatusTone: Record<string, ComponentProps<typeof StatusBadge>["tone"]> = {
		open: "critical",
		in_progress: "warning",
		escalated: "warning",
		resolved: "safe",
		closed: "neutral",
		false_positive: "neutral",
	};

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
					title="Recent scans"
					subtitle="Monitor cadence and completion rates"
					action={
						<CoalButton
							variant="secondary"
							size="sm"
							onClick={() => router.push("/scans")}
						>
							View scans
						</CoalButton>
					}
				>
					<CoalTable
						data={scans}
						isLoading={loading}
						columns={[
							{
								key: "id",
								header: "Scan",
								render: (scan) => (
									<div className="space-y-1">
										<p className="text-sm font-semibold text-gray-900">{scan.id}</p>
										<p className="text-xs text-gray-500">
											Started {formatDateLabel(scan.startedAt)}
										</p>
									</div>
								),
							},
							{
								key: "status",
								header: "Status",
								render: (scan) => (
									<StatusBadge tone={scanStatusTone[scan.status] ?? "neutral"}>
										{scan.status}
									</StatusBadge>
								),
							},
							{
								key: "success",
								header: "Success",
								render: (scan) => (
									<span className="text-xs font-semibold text-gray-800">
										{scan.successful}/{scan.totalDevices}
									</span>
								),
							},
							{
								key: "issues",
								header: "With issues",
								align: "right",
								render: (scan) => (
									<span className="text-xs text-amber-700">{scan.withIssues}</span>
								),
							},
						]}
						emptyState="No scans have run yet. Start a scan to populate history."
					/>
				</CoalCard>
				<CoalCard title="System health" subtitle="Backend performance indicators">
					<div className="space-y-4">
						{systemTiles.map((tile) => (
							<div key={tile.id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
									{tile.label}
								</p>
								<div className="mt-2 flex items-center justify-between">
									<p className={cn("text-2xl font-semibold", toneTextClass[tile.tone])}>
										{tile.value}
									</p>
									<StatusBadge tone={tile.tone}>Live</StatusBadge>
								</div>
								<p className="mt-1 text-xs text-gray-500">{tile.description}</p>
							</div>
							))}
					</div>
				</CoalCard>
			</section>

			<section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
				<CoalCard
					title="Active incidents"
					subtitle="Track exposures requiring attention"
					action={
						<CoalButton
							variant="secondary"
							size="sm"
							onClick={() => router.push("/incidents")}
						>
							View incidents
						</CoalButton>
					}
				>
					<CoalTable
						data={incidents}
						isLoading={loading}
						columns={[
							{
								key: "cveId",
								header: "CVE",
								render: (incident) => (
									<div className="space-y-1">
										<p className="text-sm font-semibold text-gray-900">
											{incident.cveId}
										</p>
										<p className="text-xs text-gray-500">Device {incident.deviceId}</p>
									</div>
								),
							},
							{
								key: "status",
								header: "Status",
								render: (incident) => (
									<StatusBadge tone={incidentStatusTone[incident.status] ?? "neutral"}>
										{incident.status}
									</StatusBadge>
								),
							},
							{
								key: "assignedTo",
								header: "Owner",
								render: (incident) => (
									<span className="text-xs text-gray-700">
										{incident.assignedTo ?? "Unassigned"}
									</span>
								),
							},
							{
								key: "updatedAt",
								header: "Updated",
								render: (incident) => (
									<span className="text-xs text-gray-500">
										{formatDateLabel(incident.updatedAt)}
									</span>
								),
							},
						]}
						emptyState="No incidents open."
					/>
				</CoalCard>
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
			</section>
		</div>
	);
}
