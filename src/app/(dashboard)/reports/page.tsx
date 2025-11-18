'use client';

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import { formatDateLabel } from "@/lib/utils";

const reports = [
  {
    id: "tenant-summary",
    name: "Tenant security summary",
    format: "PDF",
    generatedAt: "2025-10-01T00:00:00.000Z",
  },
  {
    id: "device-inventory",
    name: "Device inventory export",
    format: "CSV",
    generatedAt: "2025-10-02T08:00:00.000Z",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <CoalCard
        title="Scheduled reports"
        subtitle="Generate executive-ready exports"
        action={
          <CoalButton variant="primary" size="sm">
            New report
          </CoalButton>
        }
      >
        <CoalTable
          data={reports}
          isLoading={false}
          columns={[
            {
              key: "name",
              header: "Report",
              render: (report) => (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{report.name}</p>
                  <p className="text-xs text-gray-500">ID: {report.id}</p>
                </div>
              ),
            },
            {
              key: "format",
              header: "Format",
            },
            {
              key: "generatedAt",
              header: "Last generated",
              render: (report) => (
                <span className="text-xs text-gray-500">
                  {formatDateLabel(report.generatedAt)}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: () => (
                <CoalButton variant="ghost" size="sm">
                  Download
                </CoalButton>
              ),
            },
          ]}
        />
      </CoalCard>
      <CoalCard
        title="Compliance templates"
        subtitle="Instantly align with SOC 2, ISO 27001, and PCI guidelines"
      >
  <div className="space-y-4 text-sm text-slate-200">
          <p>
            Build tailored reports for auditors with curated evidence packages and device posture trends.
          </p>
          <CoalButton variant="secondary" size="sm">
            Browse templates
          </CoalButton>
        </div>
      </CoalCard>
    </div>
  );
}
