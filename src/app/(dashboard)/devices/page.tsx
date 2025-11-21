'use client';

import { useMemo, useRef, useState } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useDevices } from "@/hooks/useDevices";
import type { CreateDevicePayload, DeviceState } from "@/lib/types";
import { encryptString } from "@/lib/crypto";
import { formatDateLabel } from "@/lib/utils";

const initialForm: CreateDevicePayload = {
  vendor: "",
  product: "",
  version: "",
  name: "",
  ip: "",
  serial: "",
  state: undefined,
};

export default function DevicesPage() {
  const { devices, loading, mutating, error, addDevice, bulkAddDevices, removeDevice, refresh, updateDevice } =
    useDevices();
  const [form, setForm] = useState<CreateDevicePayload>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateDevicePayload> | null>(null);
  const [tab, setTab] = useState<'single' | 'bulk'>('single');
  const [isImporting, setIsImporting] = useState(false);
  const [bulkText, setBulkText] = useState<string>(`{
  "devices": [
    { "vendor": "Fortinet", "product": "FortiGate 60F", "version": "7.0.0", "name": "Firewall", "ip": "192.168.1.1", "serial": "FG60F123456", "state": "active" }
  ]
}`);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSummary, setBulkSummary] = useState<null | { total: number; created: number; failed: number; results: Array<{ index: number; status: string; id?: string; error?: string }> }>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [sanitizedDraft, setSanitizedDraft] = useState<CreateDevicePayload[] | null>(null);
  const [validation, setValidation] = useState<null | { total: number; errors: number; items: Array<{ index: number; missing: string[]; invalid: string[] }> }>(null);
  const [encryptedBlobUrl, setEncryptedBlobUrl] = useState<string | null>(null);

  const totalCritical = useMemo(
    () => devices.reduce((sum, device) => sum + (device.criticalFindings ?? 0), 0),
    [devices],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = {
      ...form,
      ip: typeof form.ip === 'string' ? form.ip.trim() : '',
    };

    // normalize and validate state to match DeviceState type
    const normalizedState = normalizeStateValue(trimmed.state);

    if (!trimmed.vendor || !trimmed.product || !trimmed.version || !trimmed.name || !trimmed.ip || !trimmed.serial || !normalizedState) {
      setFormError("All fields are required (vendor, product, version, name, ip, serial, state)");
      return;
    }
    setFormError(null);

    const payload: CreateDevicePayload = {
      vendor: trimmed.vendor,
      product: trimmed.product,
      version: trimmed.version,
      name: trimmed.name,
      ip: trimmed.ip,
      serial: trimmed.serial,
      state: normalizedState?.toLowerCase() as DeviceState,  // Force lowercase
    };

    await addDevice(payload);
    setForm(initialForm);
  };

  // --- Helpers for bulk validation ---
  const isValidIPv4 = (ip: string) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(ip);
  const isValidSerial = (s: string) => /^[A-Za-z0-9-]+$/.test(s);
  const isValidText = (s: string) => /^[A-Za-z0-9-_.:\s]+$/.test(s);
  const isValidVersion = (s: string) => /^[A-Za-z0-9-_.()\s]+$/.test(s);

  function normalizeStateValue(value: unknown): DeviceState | undefined {
    if (typeof value !== 'string') return undefined;
    const up = value.toLowerCase();
    if (up === 'active' || up === 'inactive' || up === 'retired') {
      return up as DeviceState;
    }
    return undefined;
  }

  async function validateBulkText(jsonText: string): Promise<
    | { sanitized: CreateDevicePayload[]; summary: { total: number; errors: number; items: Array<{ index: number; missing: string[]; invalid: string[] }> } }
    | undefined
  > {
    setProgress(0);
    setProgressLabel('Leyendo archivo…');
    setBulkError(null);
    setBulkSummary(null);
    setValidation(null);
    setSanitizedDraft(null);

    // Simular progreso
    setProgress(20);
    setProgressLabel('Parseando JSON…');

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      setProgress(0);
      setProgressLabel(null);
      setBulkError(e instanceof Error ? e.message : 'JSON inválido');
      return undefined;
    }

    let devicesList: unknown;
    if (Array.isArray(parsed)) {
      devicesList = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { devices?: unknown }).devices)) {
      devicesList = (parsed as { devices?: unknown[] }).devices;
    } else {
      setProgress(0);
      setProgressLabel(null);
      setBulkError('El JSON debe ser un arreglo o un objeto con la propiedad "devices"');
      return undefined;
    }

    const arr = devicesList as unknown[];
    const total = arr.length;
    const items: Array<{ index: number; missing: string[]; invalid: string[] }> = [];
    const sanitized: CreateDevicePayload[] = [];

    setProgressLabel('Validando registros…');
    for (let i = 0; i < arr.length; i++) {
      const rec = (arr[i] && typeof arr[i] === 'object') ? (arr[i] as Record<string, unknown>) : {};
      const payload: CreateDevicePayload = {
        vendor: typeof rec.vendor === 'string' ? rec.vendor.trim() : '',
        product: typeof rec.product === 'string' ? rec.product.trim() : '',
        version: typeof rec.version === 'string' ? rec.version.trim() : '',
        name: typeof rec.name === 'string' ? rec.name.trim() : '',
        ip: typeof rec.ip === 'string' ? rec.ip.trim() : '',
        serial: typeof rec.serial === 'string' ? rec.serial.trim() : '',
        state: normalizeStateValue(rec.state),
      };

      const missing: string[] = [];
      const invalid: string[] = [];
      if (!payload.vendor) missing.push('vendor');
      if (!payload.product) missing.push('product');
      if (!payload.version) missing.push('version');
      if (!payload.name) missing.push('name');
      if (!payload.ip) missing.push('ip');
      if (!payload.serial) missing.push('serial');
      if (!payload.state) missing.push('state');

      if (payload.vendor && !isValidText(payload.vendor)) invalid.push('vendor');
      if (payload.product && !isValidText(payload.product)) invalid.push('product');
      if (payload.version && !isValidVersion(payload.version)) invalid.push('version');
      if (payload.name && !isValidText(payload.name)) invalid.push('name');
      if (payload.ip && !isValidIPv4(payload.ip)) invalid.push('ip');
      if (payload.serial && !isValidSerial(payload.serial)) invalid.push('serial');

      if (missing.length > 0 || invalid.length > 0) {
        items.push({ index: i, missing, invalid });
      }

      sanitized.push(payload);

      // update progress incrementally
      const percent = 20 + Math.floor(((i + 1) / Math.max(total, 1)) * 80);
      setProgress(percent);
    }

    const errors = items.length;
    setValidation({ total, errors, items });
    setSanitizedDraft(sanitized);
    setProgress(100);
    setProgressLabel(errors === 0 ? 'Validación completa' : 'Validación con errores');
    // auto-clear label after a short delay
    setTimeout(() => setProgressLabel(null), 1200);
    return { sanitized, summary: { total, errors, items } };
  }

  async function encryptCurrentText() {
    try {
      const payload = await encryptString(bulkText);
      const blob = new Blob([payload], { type: 'application/json' });
      if (encryptedBlobUrl) URL.revokeObjectURL(encryptedBlobUrl);
      const url = URL.createObjectURL(blob);
      setEncryptedBlobUrl(url);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'No se pudo encriptar el JSON');
    }
  }

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
                    <p className="text-sm font-semibold">
                      {device.name ?? `${device.vendor} ${device.product}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      <span className="text-slate-300 font-medium">{device.vendor} {device.product} · v{device.version}</span>
                    </p>
                  </div>
                ),
              },
              {
                key: "state",
                header: "State",
                render: (device) => {
                  const rawState = String(device.state ?? "active");
                  const stateNormalized = rawState.toLowerCase();
                  const tone =
                    stateNormalized === "active" ? "safe" :
                    stateNormalized === "inactive" ? "neutral" :
                    "warning";
                  const label = stateNormalized.charAt(0).toUpperCase() + stateNormalized.slice(1);
                  return (
                    <StatusBadge tone={tone}>
                      {label}
                    </StatusBadge>
                  );
                },
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
                          state: normalizeStateValue(device.state) ?? 'active',
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
              <p className="text-sm font-semibold text-slate-200">Open critical findings</p>
            </div>
            <p className="text-sm text-slate-300">
              VulnTrack continuously ingests CVE intelligence and cross-references with your device firmware. Resolve
              exposures to unlock downgrade scenarios.
            </p>
          </div>
        </CoalCard>
      </section>

      {/* Tabs inside Register device below */}

      {editingId && editForm ? (
        <CoalCard title="Edit device" subtitle="Update device attributes">
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editingId || !editForm) return;
              try {
                // Normalize state to lowercase
                const normalizedEditForm: Partial<CreateDevicePayload> = {
                  ...editForm,
                  state: normalizeStateValue(editForm.state) ?? 'active',
                };

                await updateDevice(editingId, normalizedEditForm);
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
            <select
              value={editForm.state ?? 'active'}
              onChange={(e) => setEditForm({ ...(editForm ?? {}), state: e.target.value as DeviceState })}
              className="rounded-md border px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="retired">Retired</option>
            </select>
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
        {/* Tab switcher */}
        <div className="mb-4 inline-flex rounded-lg border border-white/10 surface p-1 text-sm">
          <button type="button" onClick={() => setTab('single')} className={`rounded-md px-3 py-1.5 font-medium ${tab==='single' ? 'surface text-white/90 shadow border border-white/10' : 'text-slate-300 hover:text-white'}`}>A device</button>
          <button type="button" onClick={() => setTab('bulk')} className={`ml-1 rounded-md px-3 py-1.5 font-medium ${tab==='bulk' ? 'surface text-white/90 shadow border border-white/10' : 'text-slate-300 hover:text-white'}`}>Multiple (JSON)</button>
        </div>

        {tab === 'single' ? (
          <>
            <form id="device-form" className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200" htmlFor="vendor">Vendor</label>
                <input id="vendor" name="vendor" value={form.vendor} onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))} placeholder="e.g., Fortinet, Cisco, Palo Alto" required className="w-full rounded-md border border-white/10 px-4 py-2 text-sm focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200" htmlFor="product">Product</label>
                <input id="product" name="product" value={form.product} onChange={(e) => setForm((p) => ({ ...p, product: e.target.value }))} placeholder="Nexus 9000" required className="w-full rounded-md border border-white/10 px-4 py-2 text-sm focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200" htmlFor="version">Version</label>
                <input id="version" name="version" value={form.version} onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} placeholder="9.3(5)" required className="w-full rounded-md border border-white/10 px-4 py-2 text-sm focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200" htmlFor="name">Friendly name</label>
                <input id="name" name="name" value={form.name ?? ''} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Core switch" required className="w-full rounded-md border border-white/10 px-4 py-2 text-sm focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200" htmlFor="ip">IP address</label>
                <input id="ip" name="ip" value={form.ip ?? ''} onChange={(e) => setForm((p) => ({ ...p, ip: e.target.value }))} placeholder="10.10.21.14" required className="w-full rounded-md border border-white/10 px-4 py-2 text-sm focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200" htmlFor="serial">Serial number</label>
                <input id="serial" name="serial" value={form.serial ?? ''} onChange={(e) => setForm((p) => ({ ...p, serial: e.target.value }))} placeholder="SN123456789" required className="w-full rounded-md border border-white/10 px-4 py-2 text-sm focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200" htmlFor="state">State</label>
                <select id="state" name="state" value={form.state ?? ''} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value as DeviceState }))} required className="w-full rounded-md border border-white/10 px-4 py-2 text-sm focus:outline-none">
                  <option value="" disabled>Select device state</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
            </form>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-200">For bulk device onboarding, use the &quot;Bulk upload&quot; tab or download the JSON template.</div>
              <CoalButton variant="primary" size="sm" form="device-form" type="submit" isLoading={mutating}>Add device</CoalButton>
            </div>
            {formError ? (
              <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{formError}</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-sm text-slate-300">Import a .json file with <code>devices</code> or paste the JSON. All fields are required: vendor, product, version, name, ip, serial, state (active|inactive|retired).</p>
            {/* Pretty uploader + drag & drop */}
            <div
              className={`flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors ${dragOver ? 'border-blue-500/60 bg-blue-500/10' : 'border-white/10 bg-slate-900/40'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                try {
                  setIsImporting(true);
                  const text = await file.text();
                  setBulkText(text);
                  await encryptCurrentText();
                  await validateBulkText(text);
                } catch (err) {
                  setBulkError(err instanceof Error ? err.message : 'No se pudo leer el archivo');
                } finally {
                  setIsImporting(false);
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/15 text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M7 20a5 5 0 1 1 1-9.9 7 7 0 0 1 13.9 1.9H23a4 4 0 1 1 0 8H7Zm5-9v5a1 1 0 1 0 2 0v-5h2.586a1 1 0 0 0 .707-1.707l-3.586-3.586a1 1 0 0 0-1.414 0L9.414 9.293A1 1 0 0 0 10.121 11H12Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-50">Upload your inventory (.json)</p>
                  <p className="text-xs text-slate-300">Drag and drop or select a file. You can also paste the JSON below.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setIsImporting(true);
                    const text = await file.text();
                    setBulkText(text);
                    setBulkError(null);
                    await encryptCurrentText();
                    await validateBulkText(text);
                  } catch (err) {
                    setBulkError(err instanceof Error ? err.message : 'No se pudo leer el archivo');
                  } finally {
                    setIsImporting(false);
                  }
                }} />
                <CoalButton variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>Select file</CoalButton>
                <CoalButton variant="ghost" size="sm" onClick={() => window.open('/api/devices/template', '_blank')}>Download JSON template</CoalButton>
                <CoalButton variant="ghost" size="sm" onClick={() => validateBulkText(bulkText)}>Validate JSON</CoalButton>
                <CoalButton variant="ghost" size="sm" onClick={encryptCurrentText}>Encrypt (local)</CoalButton>
              </div>
            </div>
            {encryptedBlobUrl ? (
              <div className="mt-2 flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
                <span className="text-emerald-300">Locally encrypted file (AES-GCM, current session)</span>
                <div className="flex items-center gap-2">
                  <a className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-emerald-200 hover:bg-emerald-500/30" href={encryptedBlobUrl} download={`devices.encrypted.json`}>Descargar encriptado</a>
                  <button className="text-emerald-300/80 hover:text-emerald-200" onClick={() => { if (encryptedBlobUrl) URL.revokeObjectURL(encryptedBlobUrl); setEncryptedBlobUrl(null); }}>Limpiar</button>
                </div>
              </div>
            ) : null}
            {/* Progress bar */}
            {progressLabel ? (
              <div className="mt-3 rounded-md border border-white/10 bg-slate-900/40 p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                  <span>{progressLabel}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
                  <div className="h-2 rounded bg-gradient-to-r from-blue-400 to-blue-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}
            <textarea value={bulkText} onChange={(e) => { setBulkText(e.target.value); setBulkError(null); setEncryptedBlobUrl(null); }} className="min-h-[220px] w-full rounded-md border border-white/10 bg-slate-900/40 p-3 font-mono text-xs text-slate-100 placeholder:text-slate-400" placeholder='{"devices": [{"vendor":"Fortinet","product":"FortiGate 60F","version":"7.0.0","name":"Firewall","ip":"192.168.1.1","serial":"FG60F123456","state":"active"}]}' />
            {bulkError ? (<p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{bulkError}</p>) : null}
            {/* Validation summary */}
            {validation ? (
              <div className="rounded-md border border-white/10 bg-slate-900/40 p-3 text-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-slate-100">Validation: {validation.total} items · {validation.errors > 0 ? `${validation.errors} with errors` : 'no errors'}</p>
                  {validation.errors > 0 ? <span className="text-xs text-red-300">Correct the errors before importing</span> : <span className="text-xs text-emerald-300">Ready to import</span>}
                </div>
                {validation.errors > 0 ? (
                  <ul className="mb-3 list-disc space-y-1 pl-5">
                    {validation.items.slice(0, 10).map((it) => (
                      <li key={it.index} className="text-slate-200">
                        Item #{it.index + 1}: {it.missing.length > 0 ? <>missing <strong>{it.missing.join(', ')}</strong></> : null}
                        {it.missing.length > 0 && it.invalid.length > 0 ? ' · ' : ''}
                        {it.invalid.length > 0 ? <>invalid <strong>{it.invalid.join(', ')}</strong></> : null}
                      </li>
                    ))}
                    {validation.errors > 10 ? <li className="text-slate-400">… and {validation.errors - 10} more</li> : null}
                  </ul>
                ) : null}

                {/* Preview table */}
                {sanitizedDraft && sanitizedDraft.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-800 text-slate-300">
                        <tr>
                          <th className="px-2 py-2">#</th>
                          <th className="px-2 py-2">Name</th>
                          <th className="px-2 py-2">Vendor</th>
                          <th className="px-2 py-2">Product</th>
                          <th className="px-2 py-2">Version</th>
                          <th className="px-2 py-2">IP</th>
                          <th className="px-2 py-2">Serial</th>
                          <th className="px-2 py-2">State</th>
                          <th className="px-2 py-2 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sanitizedDraft.slice(0, 8).map((d, i) => {
                          const issue = validation.items.find((it) => it.index === i);
                          const ok = !issue;
                          return (
                            <tr key={i} className="border-b border-white/10">
                              <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                              <td className="px-2 py-1">{d.name}</td>
                              <td className="px-2 py-1">{d.vendor}</td>
                              <td className="px-2 py-1">{d.product}</td>
                              <td className="px-2 py-1">{d.version}</td>
                              <td className="px-2 py-1">{d.ip}</td>
                              <td className="px-2 py-1">{d.serial}</td>
                              <td className="px-2 py-1">{d.state}</td>
                              <td className="px-2 py-1 text-right">{ok ? (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.6a1 1 0 0 1-1.427.01L3.29 9.82a1 1 0 1 1 1.42-1.41l3.07 3.08 6.79-6.885a1 1 0 0 1 1.414-.006Z" clipRule="evenodd" />
                                  </svg>
                                  OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-300">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-.75-5.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm.75-6.5a.75.75 0 0 0-.75.75v3a.75.75 0 1 0 1.5 0v-3a.75.75 0 0 0-.75-.75Z" clipRule="evenodd" />
                                  </svg>
                                  {issue?.missing.length ? `Missing ${issue.missing.join(', ')}` : ''}{issue?.missing.length && issue?.invalid.length ? ' · ' : ''}{issue?.invalid.length ? `Invalid ${issue.invalid.join(', ')}` : ''}
                                </span>
                              )}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
            {bulkSummary ? (
              <div className="rounded-md border border-white/10 bg-slate-900/40 p-3 text-sm text-slate-200">
                <p><strong>Result:</strong> {bulkSummary.created} created, {bulkSummary.failed} failed out of {bulkSummary.total}.</p>
                {bulkSummary.failed > 0 ? (
                  <ul className="mt-2 list-disc pl-5">
                    {bulkSummary.results.filter(r => r.status !== 'created').slice(0, 10).map(r => (
                      <li key={r.index}>Item #{r.index + 1}: {r.error || 'Error'}</li>
                    ))}
                    {bulkSummary.failed > 10 ? <li>... y {bulkSummary.failed - 10} más</li> : null}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <CoalButton
                variant="primary"
                size="sm"
                disabled={!!validation && validation.errors > 0}
                isLoading={mutating || isImporting}
                onClick={async () => {
                  try {
                    setIsImporting(true);
                    setBulkError(null);
                    setBulkSummary(null);
                    const res = await validateBulkText(bulkText);
                    // Si hay errores, detenemos
                    if (!res || res.summary.errors > 0) {
                      setBulkError('Correct the errors before importing.');
                      return;
                    }
                    const summary = await bulkAddDevices(res.sanitized);
                    setBulkSummary(summary);
                  } catch (err) {
                    setBulkError(err instanceof Error ? err.message : 'Failed to process JSON');
                  } finally {
                    setIsImporting(false);
                  }
                }}
              >Import</CoalButton>
            </div>
          </>
        )}
      </CoalCard>
    </div>
  );
}
