'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
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
	const { metrics, scans, incidents, systemMetrics, loading, liveUpdating, lastCompletedScan, ackLastCompleted, refresh } =
		useDashboard();

		const [showToast, setShowToast] = useState(false);

		useEffect(() => {
			if (lastCompletedScan) {
				setShowToast(true);
				const t = setTimeout(() => {
					setShowToast(false);
					ackLastCompleted();
				}, 4000);
				return () => clearTimeout(t);
			}
		}, [lastCompletedScan, ackLastCompleted]);

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
						{/* Live updating banner and completion toast */}
						<div className="relative">
							{liveUpdating ? (
								<div className="mb-2 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
									<span className="relative flex h-2 w-2">
										<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
										<span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
									</span>
									Live updating…
								</div>
							) : null}
							{showToast && lastCompletedScan ? (
								<div className="pointer-events-auto mb-2 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 shadow-sm">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
										<path fillRule="evenodd" d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm3.28-9.78a.75.75 0 0 0-1.06-1.06L9 10.37 7.78 9.16a.75.75 0 1 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0l3.75-3.75Z" clipRule="evenodd" />
									</svg>
									Scan {lastCompletedScan.id} completed. Metrics updated.
								</div>
							) : null}
						</div>
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
						<div className="flex items-center gap-2">
							<CoalButton
								variant="ghost"
								size="sm"
								onClick={() => refresh()}
							>
								Refresh
							</CoalButton>
							<CoalButton
								variant="secondary"
								size="sm"
								onClick={() => router.push("/scans")}
							>
								View scans
							</CoalButton>
						</div>
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

			<section className="grid gap-6">
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
				{/* Vulnerability queue hidden per request */}
			</section>
		</div>
	);
}
