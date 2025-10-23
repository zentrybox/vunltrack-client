'use client';

import { useMemo, useState } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useDevices } from "@/hooks/useDevices";
import type { CreateDevicePayload, DeviceState } from "@/lib/types";
import { formatDateLabel } from "@/lib/utils";

const initialForm: CreateDevicePayload = {
  vendor: "",
  product: "",
  version: "",
  name: "",
  ip: "",
  serial: "",
  state: "ACTIVE",
};

export default function DevicesPage() {
  const { devices, loading, mutating, error, addDevice, removeDevice, refresh, updateDevice } =
    useDevices();
  const [form, setForm] = useState<CreateDevicePayload>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateDevicePayload> | null>(null);

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
          subtitle="Inventory synchronised from the VulnTrack API"
          action={
            <div className="flex items-center gap-2">
              <CoalButton variant="ghost" size="sm" onClick={() => refresh()}>
                Refresh
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
                key: "name",
                header: "Device",
                render: (device) => (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {device.name ?? `${device.vendor} ${device.product}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {device.vendor} {device.product} · v{device.version}
                    </p>
                  </div>
                ),
              },
              {
                key: "state",
                header: "State",
                render: (device) => (
                  <StatusBadge
                    tone={device.state === "ACTIVE" ? "safe" : device.state === "INACTIVE" ? "neutral" : "warning"}
                  >
                    {device.state ?? "ACTIVE"}
                  </StatusBadge>
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
                key: "lastScanAt",
                header: "Last scan",
                render: (device) => (
                  <span className="text-xs text-gray-500">
                    {device.lastScanAt
                      ? formatDateLabel(device.lastScanAt)
                      : device.updatedAt
                      ? formatDateLabel(device.updatedAt)
                      : "—"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                align: "right",
                render: (device) => (
                  <div className="flex items-center justify-end gap-2">
                    <CoalButton
                      variant="ghost"
                      size="icon"
                      aria-label="Edit device"
                      onClick={() => {
                        setEditingId(device.id);
                        setEditForm({
                          vendor: device.vendor,
                          product: device.product,
                          version: device.version,
                          ip: device.ip ?? undefined,
                          name: device.name ?? undefined,
                          serial: device.serial ?? undefined,
                          state: device.state ?? undefined,
                        });
                      }}
                    >
                      {/* Lápiz SVG */}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 5.487a2.1 2.1 0 0 0-2.97-2.97l-8.1 8.1a2.1 2.1 0 0 0-.553.98l-.6 2.4a.6.6 0 0 0 .73.73l2.4-.6a2.1 2.1 0 0 0 .98-.553l8.1-8.1ZM11.25 6.75l2 2" />
                      </svg>
                    </CoalButton>
                    <CoalButton
                      variant="ghost"
                      size="icon"
                      aria-label="Remove device"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeDevice(device.id)}
                      isLoading={mutating}
                    >
                      {/* Basurero SVG */}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5v5m5-5v5M3.75 6.25h12.5M5.5 6.25v8.75a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6.25m-7.5 0V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.25" />
                      </svg>
                    </CoalButton>
                  </div>
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

      {editingId && editForm ? (
        <CoalCard title="Edit device" subtitle="Update device attributes">
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editingId || !editForm) return;
              try {
                await updateDevice(editingId, editForm as Partial<CreateDevicePayload>);
                setEditingId(null);
                setEditForm(null);
              } catch {
                // error handled by hook
              }
            }}
          >
            <input
              value={editForm.vendor ?? ""}
              onChange={(e) => setEditForm({ ...(editForm ?? {}), vendor: e.target.value })}
              placeholder="Vendor"
              className="rounded-md border px-3 py-2"
            />
            <input
              value={editForm.product ?? ""}
              onChange={(e) => setEditForm({ ...(editForm ?? {}), product: e.target.value })}
              placeholder="Product"
              className="rounded-md border px-3 py-2"
            />
            <input
              value={editForm.version ?? ""}
              onChange={(e) => setEditForm({ ...(editForm ?? {}), version: e.target.value })}
              placeholder="Version"
              className="rounded-md border px-3 py-2"
            />
            <input
              value={editForm.ip ?? ""}
              onChange={(e) => setEditForm({ ...(editForm ?? {}), ip: e.target.value })}
              placeholder="IP"
              className="rounded-md border px-3 py-2"
            />
            <input
              value={editForm.name ?? ""}
              onChange={(e) => setEditForm({ ...(editForm ?? {}), name: e.target.value })}
              placeholder="Friendly name"
              className="rounded-md border px-3 py-2"
            />
            <input
              value={editForm.serial ?? ""}
              onChange={(e) => setEditForm({ ...(editForm ?? {}), serial: e.target.value })}
              placeholder="Serial"
              className="rounded-md border px-3 py-2"
            />
            <div className="md:col-span-3 flex gap-2">
              <CoalButton type="submit" variant="primary" size="sm" isLoading={mutating}>
                Save
              </CoalButton>
              <CoalButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingId(null);
                  setEditForm(null);
                }}
              >
                Cancel
              </CoalButton>
            </div>
          </form>
        </CoalCard>
      ) : null}

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
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="name">
              Friendly name
            </label>
            <input
              id="name"
              name="name"
              value={form.name ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Core switch"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="ip">
              IP address
            </label>
            <input
              id="ip"
              name="ip"
              value={form.ip ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, ip: event.target.value }))}
              placeholder="10.10.21.14"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="serial">
              Serial number
            </label>
            <input
              id="serial"
              name="serial"
              value={form.serial ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, serial: event.target.value }))}
              placeholder="SN123456789"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="state">
              State
            </label>
            <select
              id="state"
              name="state"
              value={form.state ?? "ACTIVE"}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, state: event.target.value as DeviceState }))
              }
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </form>
        <div className="mt-4 flex items-center justify-end">
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
        {formError ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {formError}
          </p>
        ) : null}
      </CoalCard>
    </div>
  );
}
