'use client';

import { useMemo, useState } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useDevices } from "@/hooks/useDevices";
import { useSchedules } from "@/hooks/useSchedules";
import type { SchedulePayload } from "@/lib/types";
import { formatDateLabel } from "@/lib/utils";

export default function SchedulingPage() {
  const { devices, loading: devicesLoading } = useDevices();
  const {
    schedules,
    loading,
    error,
    mutating,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  } = useSchedules();

  const [form, setForm] = useState<SchedulePayload>({
    name: "",
    cron: "0 2 * * 1",
    active: true,
    deviceIds: [],
  });
  const [formError, setFormError] = useState<string | null>(null);

  const sortedSchedules = useMemo(
    () =>
      schedules
        .slice()
        .sort((a, b) => (a.nextRunAt && b.nextRunAt ? a.nextRunAt.localeCompare(b.nextRunAt) : 0)),
    [schedules],
  );

  const selectableDevices = useMemo(
    () => devices.slice().sort((a, b) => (a.name ?? a.product).localeCompare(b.name ?? b.product)),
    [devices],
  );

  const handleToggleDevice = (deviceId: string) => {
    setForm((prev) => {
      const list = prev.deviceIds ?? [];
      return {
        ...prev,
        deviceIds: list.includes(deviceId)
          ? list.filter((id) => id !== deviceId)
          : [...list, deviceId],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name || !form.cron) {
      setFormError("Name and cron expression are required");
      return;
    }
    setFormError(null);
    try {
      await createSchedule(form);
      setForm({ name: "", cron: form.cron, active: true, deviceIds: [] });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create schedule");
    }
  };

  const handleToggleActive = async (scheduleId: string, active: boolean, name: string, cron: string) => {
    try {
      await updateSchedule(scheduleId, { name, cron, active: !active });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update schedule");
    }
  };

  const handleDelete = async (scheduleId: string) => {
    try {
      await deleteSchedule(scheduleId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to delete schedule");
    }
  };

  return (
    <div className="space-y-8">
      <CoalCard
        title="Automation schedules"
        subtitle="Recurring scans keep your posture continuously updated"
      >
        {error ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <CoalTable
          data={sortedSchedules}
          isLoading={loading}
          columns={[
            {
              key: "name",
              header: "Schedule",
              render: (schedule) => (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{schedule.name}</p>
                  <p className="text-xs text-gray-500">Cron: {schedule.cron}</p>
                </div>
              ),
            },
            {
              key: "active",
              header: "Status",
              render: (schedule) => (
                <StatusBadge tone={schedule.active ? "safe" : "neutral"}>
                  {schedule.active ? "Active" : "Paused"}
                </StatusBadge>
              ),
            },
            {
              key: "nextRunAt",
              header: "Next run",
              render: (schedule) => (
                <span className="text-xs text-gray-500">
                  {schedule.nextRunAt ? formatDateLabel(schedule.nextRunAt) : "—"}
                </span>
              ),
            },
            {
              key: "lastRunAt",
              header: "Last run",
              render: (schedule) => (
                <span className="text-xs text-gray-500">
                  {schedule.lastRunAt ? formatDateLabel(schedule.lastRunAt) : "—"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (schedule) => (
                <div className="flex items-center justify-end gap-2">
                  <CoalButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleToggleActive(schedule.id, schedule.active, schedule.name, schedule.cron)}
                    isLoading={mutating}
                  >
                    {schedule.active ? "Pause" : "Resume"}
                  </CoalButton>
                  <CoalButton
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(schedule.id)}
                    isLoading={mutating}
                  >
                    Delete
                  </CoalButton>
                </div>
              ),
            },
          ]}
          emptyState="No schedules configured. Create your first schedule below."
        />
      </CoalCard>

      <CoalCard
        title="Create schedule"
        subtitle="Define cadence and scope for automated scans"
      >
        <form className="grid gap-5 lg:grid-cols-[1.2fr_1fr]" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Schedule name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Weekly core sweep"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Cron expression
              </label>
              <input
                type="text"
                value={form.cron}
                onChange={(event) => setForm((prev) => ({ ...prev, cron: event.target.value }))}
                placeholder="0 2 * * 1"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <p className="text-xs text-gray-500">
                Use standard cron syntax (UTC). Example: <code className="font-mono">0 2 * * 1</code> runs every Monday 02:00.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Enable immediately</p>
                <p className="text-xs text-gray-500">Disable to keep saved as draft.</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  form.active ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    form.active ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Target devices
              </label>
              <div className="max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-4">
                {devicesLoading ? (
                  <p className="text-sm text-gray-500">Loading devices…</p>
                ) : selectableDevices.length === 0 ? (
                  <p className="text-sm text-gray-500">No devices available.</p>
                ) : (
                  <ul className="space-y-3 text-sm text-gray-700">
                    {selectableDevices.map((device) => (
                      <li key={device.id} className="flex items-start gap-3">
                        <input
                          id={`schedule-device-${device.id}`}
                          type="checkbox"
                          checked={form.deviceIds?.includes(device.id) ?? false}
                          onChange={() => handleToggleDevice(device.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`schedule-device-${device.id}`}
                          className="flex-1 cursor-pointer space-y-1"
                        >
                          <p className="font-semibold text-gray-900">
                            {device.name ?? `${device.vendor} ${device.product}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            State: {device.state ?? "ACTIVE"}
                          </p>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Leave empty to include all devices in the tenant.
              </p>
            </div>
            {formError ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {formError}
              </p>
            ) : null}
            <CoalButton type="submit" isLoading={mutating} className="w-full">
              Save schedule
            </CoalButton>
          </div>
        </form>
      </CoalCard>
    </div>
  );
}
