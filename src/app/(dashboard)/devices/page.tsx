'use client';

import { useMemo, useState } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useDevices } from "@/hooks/useDevices";
import type { CreateDevicePayload } from "@/lib/types";
import { formatDateLabel } from "@/lib/utils";

const initialForm: CreateDevicePayload = {
  vendor: "",
  product: "",
  version: "",
};

export default function DevicesPage() {
  const { devices, loading, mutating, error, addDevice, removeDevice, refresh } =
    useDevices();
  const [form, setForm] = useState<CreateDevicePayload>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const totalCritical = useMemo(
    () => devices.reduce((sum, device) => sum + (device.criticalFindings ?? 0), 0),
    [devices],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.vendor || !form.product || !form.version) {
      setFormError("Vendor, product, and version are required");
      return;
    }
    setFormError(null);
    await addDevice(form);
    setForm(initialForm);
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <CoalCard
          title="Managed devices"
          subtitle="Inventory synchronized from the VulnTrack API"
          action={
            <div className="flex items-center gap-2">
              <CoalButton variant="ghost" size="sm" onClick={() => refresh()}>
                Refresh
              </CoalButton>
              <CoalButton
                variant="primary"
                size="sm"
                form="device-form"
                type="submit"
                isLoading={mutating}
              >
                Add device
              </CoalButton>
            </div>
          }
        >
          {error ? (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <CoalTable
            data={devices}
            isLoading={loading}
            columns={[
              {
                key: "vendor",
                header: "Device",
                render: (device) => (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {device.vendor} {device.product}
                    </p>
                    <p className="text-xs text-gray-500">Version {device.version}</p>
                  </div>
                ),
              },
              {
                key: "criticalFindings",
                header: "Critical",
                align: "center",
                render: (device) => (
                  <StatusBadge tone={(device.criticalFindings ?? 0) > 0 ? "critical" : "neutral"}>
                    {device.criticalFindings ?? 0}
                  </StatusBadge>
                ),
              },
              {
                key: "highFindings",
                header: "High",
                align: "center",
                render: (device) => (
                  <StatusBadge tone={(device.highFindings ?? 0) > 0 ? "warning" : "neutral"}>
                    {device.highFindings ?? 0}
                  </StatusBadge>
                ),
              },
              {
                key: "updatedAt",
                header: "Last sync",
                render: (device) => (
                  <span className="text-xs text-gray-500">
                    {formatDateLabel(device.updatedAt)}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                align: "right",
                render: (device) => (
                  <CoalButton
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => removeDevice(device.id)}
                    isLoading={mutating}
                  >
                    Remove
                  </CoalButton>
                ),
              },
            ]}
            emptyState="No devices enrolled yet. Add your first asset to begin scanning."
          />
        </CoalCard>
        <CoalCard title="Fleet health" subtitle="Critical vulnerabilities open">
          <div className="space-y-6">
            <div>
              <p className="text-5xl font-semibold text-red-600">{totalCritical}</p>
              <p className="text-sm text-gray-500">Open critical findings</p>
            </div>
            <p className="text-sm text-gray-600">
              VulnTrack continuously ingests CVE intelligence and cross-references with your device firmware. Resolve
              exposures to unlock downgrade scenarios.
            </p>
          </div>
        </CoalCard>
      </section>

      <CoalCard title="Register device" subtitle="Manual onboarding for out-of-band assets">
        <form id="device-form" className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="vendor">
              Vendor
            </label>
            <input
              id="vendor"
              name="vendor"
              value={form.vendor}
              onChange={(event) => setForm((prev) => ({ ...prev, vendor: event.target.value }))}
              placeholder="Cisco"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="product">
              Product
            </label>
            <input
              id="product"
              name="product"
              value={form.product}
              onChange={(event) => setForm((prev) => ({ ...prev, product: event.target.value }))}
              placeholder="Nexus 9000"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="version">
              Version
            </label>
            <input
              id="version"
              name="version"
              value={form.version}
              onChange={(event) => setForm((prev) => ({ ...prev, version: event.target.value }))}
              placeholder="9.3(5)"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </form>
        {formError ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {formError}
          </p>
        ) : null}
      </CoalCard>
    </div>
  );
}
