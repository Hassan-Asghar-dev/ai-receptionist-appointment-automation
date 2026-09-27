import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  UserCheck,
  UserRound,
  UserX,
  Users,
  X,
} from "lucide-react";

import api from "../services/api";

const DAYS = [
  { value: 0, label: "Monday", short: "Mon" },
  { value: 1, label: "Tuesday", short: "Tue" },
  { value: 2, label: "Wednesday", short: "Wed" },
  { value: 3, label: "Thursday", short: "Thu" },
  { value: 4, label: "Friday", short: "Fri" },
  { value: 5, label: "Saturday", short: "Sat" },
  { value: 6, label: "Sunday", short: "Sun" },
];

const EMPTY_DENTIST = {
  full_name: "",
  specialization: "",
  phone: "",
  email: "",
  notes: "",
};

function Dentists() {
  const [dentists, setDentists] = useState([]);
  const [workingDays, setWorkingDays] = useState([]);
  const [workingHours, setWorkingHours] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedDentist, setSelectedDentist] = useState(null);
  const [editingDentist, setEditingDentist] = useState(null);
  const [scheduleDentist, setScheduleDentist] = useState(null);
  const [addDentistOpen, setAddDentistOpen] = useState(false);

  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = useCallback(async (mainLoader = true) => {
    try {
      if (mainLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const results = await Promise.allSettled([
        api.get("/dentists/"),
        api.get("/working-days/"),
        api.get("/working-hours/"),
        api.get("/appointments/"),
      ]);

      const [
        dentistsResult,
        daysResult,
        hoursResult,
        appointmentsResult,
      ] = results;

      if (dentistsResult.status === "rejected") {
        throw dentistsResult.reason;
      }

      setDentists(
        Array.isArray(dentistsResult.value.data)
          ? dentistsResult.value.data
          : []
      );

      setWorkingDays(
        daysResult.status === "fulfilled" &&
          Array.isArray(daysResult.value.data)
          ? daysResult.value.data
          : []
      );

      setWorkingHours(
        hoursResult.status === "fulfilled" &&
          Array.isArray(hoursResult.value.data)
          ? hoursResult.value.data
          : []
      );

      setAppointments(
        appointmentsResult.status === "fulfilled" &&
          Array.isArray(appointmentsResult.value.data)
          ? appointmentsResult.value.data
          : []
      );
    } catch (err) {
      console.error(err);
      setError(
        getErrorMessage(
          err,
          "Could not load dentists. Please try again."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredDentists = useMemo(() => {
    const query = search.trim().toLowerCase();

    return dentists.filter((dentist) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && dentist.is_active) ||
        (statusFilter === "INACTIVE" && !dentist.is_active);

      const matchesSearch =
        !query ||
        String(dentist.full_name || "")
          .toLowerCase()
          .includes(query) ||
        String(dentist.specialization || "")
          .toLowerCase()
          .includes(query) ||
        String(dentist.phone || "")
          .toLowerCase()
          .includes(query) ||
        String(dentist.email || "")
          .toLowerCase()
          .includes(query) ||
        String(dentist.id).includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [dentists, search, statusFilter]);

  const activeDentists = dentists.filter(
    (dentist) => dentist.is_active
  ).length;

  const inactiveDentists = dentists.length - activeDentists;

  const configuredDentists = dentists.filter((dentist) =>
    workingDays.some(
      (day) =>
        day.dentist_id === dentist.id && day.is_working
    )
  ).length;

  const getDentistDays = (dentistId) =>
    workingDays.filter((day) => day.dentist_id === dentistId);

  const getDentistHours = (dentistId) =>
    workingHours.filter(
      (hours) => hours.dentist_id === dentistId
    );

  const getDentistAppointments = (dentistId) =>
    appointments
      .filter(
        (appointment) => appointment.dentist_id === dentistId
      )
      .sort((a, b) =>
        `${b.appointment_date} ${b.start_time}`.localeCompare(
          `${a.appointment_date} ${a.start_time}`
        )
      );

  const handleCreated = (dentist) => {
    setDentists((current) => [
      dentist,
      ...current.filter((item) => item.id !== dentist.id),
    ]);
    setAddDentistOpen(false);
  };

  const handleUpdated = (dentist) => {
    setDentists((current) =>
      current.map((item) =>
        item.id === dentist.id ? dentist : item
      )
    );

    if (selectedDentist?.id === dentist.id) {
      setSelectedDentist(dentist);
    }

    if (scheduleDentist?.id === dentist.id) {
      setScheduleDentist(dentist);
    }

    setEditingDentist(null);
  };

  const handleStatusChange = async (dentist) => {
    const makingActive = !dentist.is_active;

    if (!makingActive) {
      const confirmed = window.confirm(
        `Deactivate ${dentist.full_name}? The dentist will remain in the database and can be reactivated later.`
      );

      if (!confirmed) return;
    }

    try {
      setActionLoading(dentist.id);

      const response = await api.patch(
        `/dentists/${dentist.id}/status`,
        { is_active: makingActive }
      );

      handleUpdated(response.data);
    } catch (err) {
      console.error(err);
      window.alert(
        getErrorMessage(
          err,
          `Could not ${
            makingActive ? "reactivate" : "deactivate"
          } dentist.`
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Dentists
          </h1>

          <p className="mt-2 text-slate-500">
            Manage dentists, availability and weekly schedules.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setAddDentistOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={18} />
            Add Dentist
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Dentists"
          value={dentists.length}
          icon={<Users size={21} />}
        />

        <SummaryCard
          title="Active Dentists"
          value={activeDentists}
          icon={<UserCheck size={21} />}
        />

        <SummaryCard
          title="Inactive Dentists"
          value={inactiveDentists}
          icon={<UserX size={21} />}
        />

        <SummaryCard
          title="Schedules Configured"
          value={configuredDentists}
          icon={<CalendarDays size={21} />}
        />
      </div>

      {/* Search */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, specialization, phone or email..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        <div className="flex gap-2">
          {["ALL", "ACTIVE", "INACTIVE"].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                statusFilter === filter
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {filter === "ALL"
                ? "All"
                : filter === "ACTIVE"
                ? "Active"
                : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading && (
          <LoadingState text="Loading dentists..." />
        )}

        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => fetchData()}
          />
        )}

        {!loading &&
          !error &&
          filteredDentists.length === 0 && (
            <div className="flex min-h-64 items-center justify-center p-8 text-center">
              <div>
                <Stethoscope
                  size={38}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-semibold text-slate-700">
                  No dentists found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing your filters or add a dentist.
                </p>
              </div>
            </div>
          )}

        {!loading &&
          !error &&
          filteredDentists.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <TableHeading>Dentist</TableHeading>
                    <TableHeading>Specialization</TableHeading>
                    <TableHeading>Contact</TableHeading>
                    <TableHeading>Working Days</TableHeading>
                    <TableHeading>Appointments</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading>Actions</TableHeading>
                  </tr>
                </thead>

                <tbody>
                  {filteredDentists.map((dentist) => {
                    const days = getDentistDays(dentist.id).filter(
                      (day) => day.is_working
                    );

                    const dentistAppointments =
                      getDentistAppointments(dentist.id);

                    return (
                      <tr
                        key={dentist.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50 last:border-0"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <DentistAvatar
                              name={dentist.full_name}
                            />

                            <div>
                              <p className="font-semibold text-slate-900">
                                {dentist.full_name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                Dentist #{dentist.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600">
                          {dentist.specialization || "-"}
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-sm text-slate-700">
                            {dentist.phone || "-"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {dentist.email || "No email"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          {days.length > 0 ? (
                            <div className="flex max-w-52 flex-wrap gap-1">
                              {days.map((day) => (
                                <span
                                  key={day.id}
                                  className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                                >
                                  {getDay(day.day_of_week).short}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Not configured
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {dentistAppointments.length}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <StatusBadge
                            active={dentist.is_active}
                          />
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <IconButton
                              title="View dentist"
                              onClick={() =>
                                setSelectedDentist(dentist)
                              }
                            >
                              <Eye size={17} />
                            </IconButton>

                            <IconButton
                              title="Edit dentist"
                              onClick={() =>
                                setEditingDentist(dentist)
                              }
                            >
                              <Edit3 size={16} />
                            </IconButton>

                            <button
                              type="button"
                              onClick={() =>
                                setScheduleDentist(dentist)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              <Clock3 size={15} />
                              Schedule
                            </button>

                            <button
                              type="button"
                              disabled={
                                actionLoading === dentist.id
                              }
                              onClick={() =>
                                handleStatusChange(dentist)
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                                dentist.is_active
                                  ? "bg-red-50 text-red-700 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {actionLoading === dentist.id
                                ? "Saving..."
                                : dentist.is_active
                                ? "Deactivate"
                                : "Reactivate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {!loading && !error && (
        <p className="mt-3 text-sm text-slate-400">
          Showing {filteredDentists.length} of{" "}
          {dentists.length} dentists
        </p>
      )}

      {/* Create */}
      <DentistFormModal
        open={addDentistOpen}
        mode="create"
        onClose={() => setAddDentistOpen(false)}
        onSaved={handleCreated}
      />

      {/* Edit */}
      <DentistFormModal
        open={Boolean(editingDentist)}
        mode="edit"
        dentist={editingDentist}
        onClose={() => setEditingDentist(null)}
        onSaved={handleUpdated}
      />

      {/* Details */}
      <DentistDetailsModal
        dentist={selectedDentist}
        workingDays={
          selectedDentist
            ? getDentistDays(selectedDentist.id)
            : []
        }
        workingHours={
          selectedDentist
            ? getDentistHours(selectedDentist.id)
            : []
        }
        appointments={
          selectedDentist
            ? getDentistAppointments(selectedDentist.id)
            : []
        }
        onClose={() => setSelectedDentist(null)}
        onEdit={() => {
          setEditingDentist(selectedDentist);
          setSelectedDentist(null);
        }}
        onSchedule={() => {
          setScheduleDentist(selectedDentist);
          setSelectedDentist(null);
        }}
      />

      {/* Schedule */}
      <ScheduleModal
        dentist={scheduleDentist}
        workingDays={
          scheduleDentist
            ? getDentistDays(scheduleDentist.id)
            : []
        }
        workingHours={
          scheduleDentist
            ? getDentistHours(scheduleDentist.id)
            : []
        }
        onClose={() => setScheduleDentist(null)}
        onChanged={async () => {
          await fetchData(false);
        }}
      />
    </div>
  );
}

/* =========================================================
   DENTIST FORM
========================================================= */

function DentistFormModal({
  open,
  mode,
  dentist,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(EMPTY_DENTIST);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && dentist) {
      setForm({
        full_name: dentist.full_name || "",
        specialization: dentist.specialization || "",
        phone: dentist.phone || "",
        email: dentist.email || "",
        notes: dentist.notes || "",
      });
    } else {
      setForm(EMPTY_DENTIST);
    }

    setError("");
  }, [open, mode, dentist]);

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.full_name.trim()) {
      setError("Dentist name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        full_name: form.full_name.trim(),
        specialization:
          form.specialization.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      };

      const response =
        mode === "edit"
          ? await api.put(
              `/dentists/${dentist.id}`,
              payload
            )
          : await api.post("/dentists/", payload);

      onSaved(response.data);
    } catch (err) {
      console.error(err);
      setError(
        getErrorMessage(
          err,
          mode === "edit"
            ? "Could not update dentist."
            : "Could not create dentist."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} width="max-w-2xl">
      <ModalHeader
        title={
          mode === "edit"
            ? "Edit Dentist"
            : "Add New Dentist"
        }
        subtitle={
          mode === "edit"
            ? "Update dentist information."
            : "Create a dentist profile. You can configure the weekly schedule afterwards."
        }
        onClose={onClose}
      />

      <form onSubmit={submit}>
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error && <InlineError message={error} />}

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Full Name"
              required
              value={form.full_name}
              onChange={(value) =>
                updateField("full_name", value)
              }
              placeholder="Dr. Ahmed Khan"
            />

            <FormField
              label="Specialization"
              value={form.specialization}
              onChange={(value) =>
                updateField("specialization", value)
              }
              placeholder="General Dentist"
            />

            <FormField
              label="Phone"
              value={form.phone}
              onChange={(value) =>
                updateField("phone", value)
              }
              placeholder="+923001234567"
            />

            <FormField
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) =>
                updateField("email", value)
              }
              placeholder="dentist@clinic.com"
            />

            <div className="sm:col-span-2">
              <TextAreaField
                label="Notes"
                value={form.notes}
                onChange={(value) =>
                  updateField("notes", value)
                }
                placeholder="Internal notes about the dentist..."
              />
            </div>
          </div>
        </div>

        <ModalFooter
          onCancel={onClose}
          saving={saving}
          submitText={
            mode === "edit"
              ? "Save Changes"
              : "Add Dentist"
          }
        />
      </form>
    </ModalShell>
  );
}

/* =========================================================
   SCHEDULE
========================================================= */

function ScheduleModal({
  dentist,
  workingDays,
  workingHours,
  onClose,
  onChanged,
}) {
  const [savingDay, setSavingDay] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [error, setError] = useState("");

  if (!dentist) return null;

  const findDay = (day) =>
    workingDays.find(
      (item) => Number(item.day_of_week) === day
    );

  const findHours = (day) =>
    workingHours.find(
      (item) => Number(item.day_of_week) === day
    );

  const toggleWorkingDay = async (day) => {
    const record = findDay(day);
    const nextStatus = record ? !record.is_working : true;

    try {
      setSavingDay(day);
      setError("");

      if (record) {
        await api.put(`/working-days/${record.id}`, {
          is_working: nextStatus,
        });
      } else {
        await api.post("/working-days/", {
          dentist_id: dentist.id,
          day_of_week: day,
          is_working: true,
        });
      }

      await onChanged();
    } catch (err) {
      console.error(err);
      setError(
        getErrorMessage(
          err,
          "Could not update working day."
        )
      );
    } finally {
      setSavingDay(null);
    }
  };

  return (
    <ModalShell onClose={onClose} width="max-w-4xl">
      <ModalHeader
        title="Weekly Schedule"
        subtitle={`Configure working days and hours for ${dentist.full_name}. These settings affect appointment availability.`}
        onClose={onClose}
      />

      <div className="max-h-[75vh] overflow-y-auto p-6">
        {error && <InlineError message={error} />}

        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          Working hours can only be configured after a day
          is enabled as a working day.
        </div>

        <div className="space-y-3">
          {DAYS.map((day) => {
            const dayRecord = findDay(day.value);
            const hours = findHours(day.value);
            const working = Boolean(dayRecord?.is_working);

            return (
              <div
                key={day.value}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      disabled={savingDay === day.value}
                      onClick={() =>
                        toggleWorkingDay(day.value)
                      }
                      className={`relative h-6 w-11 rounded-full transition ${
                        working
                          ? "bg-emerald-500"
                          : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
                          working ? "left-6" : "left-1"
                        }`}
                      />
                    </button>

                    <div>
                      <p className="font-semibold text-slate-900">
                        {day.label}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {working
                          ? "Working day"
                          : "Not working"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {working && hours ? (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800">
                          {formatTime(hours.start_time)} –{" "}
                          {formatTime(hours.end_time)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {hours.break_start &&
                          hours.break_end
                            ? `Break ${formatTime(
                                hours.break_start
                              )} – ${formatTime(
                                hours.break_end
                              )}`
                            : "No break configured"}
                        </p>
                      </div>
                    ) : working ? (
                      <span className="text-sm text-amber-600">
                        Hours not configured
                      </span>
                    ) : null}

                    {working && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingDay({
                            day: day.value,
                            label: day.label,
                            hours,
                          })
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {hours ? "Edit Hours" : "Add Hours"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Done
        </button>
      </div>

      <HoursModal
        dentist={dentist}
        editingDay={editingDay}
        onClose={() => setEditingDay(null)}
        onSaved={async () => {
          setEditingDay(null);
          await onChanged();
        }}
      />
    </ModalShell>
  );
}

/* =========================================================
   WORKING HOURS FORM
========================================================= */

function HoursModal({
  dentist,
  editingDay,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    start_time: "09:00",
    end_time: "17:00",
    break_start: "",
    break_end: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editingDay) return;

    setForm({
      start_time: toInputTime(
        editingDay.hours?.start_time || "09:00"
      ),
      end_time: toInputTime(
        editingDay.hours?.end_time || "17:00"
      ),
      break_start: toInputTime(
        editingDay.hours?.break_start || ""
      ),
      break_end: toInputTime(
        editingDay.hours?.break_end || ""
      ),
    });

    setError("");
  }, [editingDay]);

  if (!editingDay) return null;

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const save = async (event) => {
    event.preventDefault();

    if (!form.start_time || !form.end_time) {
      setError("Start time and end time are required.");
      return;
    }

    if (form.start_time >= form.end_time) {
      setError("End time must be later than start time.");
      return;
    }

    if (
      (form.break_start && !form.break_end) ||
      (!form.break_start && form.break_end)
    ) {
      setError(
        "Enter both break start and break end, or leave both empty."
      );
      return;
    }

    if (
      form.break_start &&
      form.break_end &&
      form.break_start >= form.break_end
    ) {
      setError(
        "Break end time must be later than break start."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        start_time: toApiTime(form.start_time),
        end_time: toApiTime(form.end_time),
        break_start: form.break_start
          ? toApiTime(form.break_start)
          : null,
        break_end: form.break_end
          ? toApiTime(form.break_end)
          : null,
      };

      if (editingDay.hours) {
        await api.put(
          `/working-hours/${editingDay.hours.id}`,
          payload
        );
      } else {
        await api.post("/working-hours/", {
          dentist_id: dentist.id,
          day_of_week: editingDay.day,
          ...payload,
        });
      }

      await onSaved();
    } catch (err) {
      console.error(err);
      setError(
        getErrorMessage(
          err,
          "Could not save working hours."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <ModalHeader
          title={`${editingDay.label} Hours`}
          subtitle={`Set ${dentist.full_name}'s working hours and optional break.`}
          onClose={onClose}
        />

        <form onSubmit={save}>
          <div className="p-6">
            {error && <InlineError message={error} />}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Start Time"
                type="time"
                required
                value={form.start_time}
                onChange={(value) =>
                  updateField("start_time", value)
                }
              />

              <FormField
                label="End Time"
                type="time"
                required
                value={form.end_time}
                onChange={(value) =>
                  updateField("end_time", value)
                }
              />

              <FormField
                label="Break Start"
                type="time"
                value={form.break_start}
                onChange={(value) =>
                  updateField("break_start", value)
                }
              />

              <FormField
                label="Break End"
                type="time"
                value={form.break_end}
                onChange={(value) =>
                  updateField("break_end", value)
                }
              />
            </div>
          </div>

          <ModalFooter
            onCancel={onClose}
            saving={saving}
            submitText="Save Hours"
          />
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   DETAILS
========================================================= */

function DentistDetailsModal({
  dentist,
  workingDays,
  workingHours,
  appointments,
  onClose,
  onEdit,
  onSchedule,
}) {
  if (!dentist) return null;

  return (
    <ModalShell onClose={onClose} width="max-w-4xl">
      <ModalHeader
        title={dentist.full_name}
        subtitle={`Dentist #${dentist.id}`}
        onClose={onClose}
      />

      <div className="max-h-[75vh] overflow-y-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <DentistAvatar name={dentist.full_name} large />

          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-slate-900">
                {dentist.specialization ||
                  "No specialization specified"}
              </p>

              <StatusBadge active={dentist.is_active} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard
            title="Contact Information"
            icon={<Phone size={18} />}
          >
            <DetailRow
              label="Phone"
              value={dentist.phone || "Not provided"}
            />
            <DetailRow
              label="Email"
              value={dentist.email || "Not provided"}
            />
          </DetailCard>

          <DetailCard
            title="Profile"
            icon={<Activity size={18} />}
          >
            <DetailRow
              label="Status"
              value={
                dentist.is_active ? "Active" : "Inactive"
              }
            />
            <DetailRow
              label="Created"
              value={formatDateTime(dentist.created_at)}
            />
            <DetailRow
              label="Updated"
              value={formatDateTime(dentist.updated_at)}
            />
          </DetailCard>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900">
            Notes
          </h3>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {dentist.notes || "No notes recorded."}
          </p>
        </div>

        <div className="mt-6">
          <h3 className="mb-4 font-bold text-slate-900">
            Weekly Schedule
          </h3>

          <div className="grid gap-2 sm:grid-cols-2">
            {DAYS.map((day) => {
              const dayRecord = workingDays.find(
                (item) =>
                  Number(item.day_of_week) === day.value
              );

              const hours = workingHours.find(
                (item) =>
                  Number(item.day_of_week) === day.value
              );

              return (
                <div
                  key={day.value}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                >
                  <span className="text-sm font-semibold text-slate-700">
                    {day.label}
                  </span>

                  {dayRecord?.is_working ? (
                    hours ? (
                      <span className="text-sm text-slate-600">
                        {formatTime(hours.start_time)} –{" "}
                        {formatTime(hours.end_time)}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600">
                        Hours missing
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">
                      Off
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                Appointment History
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {appointments.length} appointment
                {appointments.length === 1 ? "" : "s"}
              </p>
            </div>

            <CalendarDays
              size={20}
              className="text-slate-400"
            />
          </div>

          {appointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-7 text-center text-sm text-slate-500">
              No appointments found for this dentist.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <TableHeading>Date</TableHeading>
                    <TableHeading>Time</TableHeading>
                    <TableHeading>Status</TableHeading>
                  </tr>
                </thead>

                <tbody>
                  {appointments.slice(0, 10).map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatDate(
                          appointment.appointment_date
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatTime(
                          appointment.start_time
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <AppointmentStatus
                          status={appointment.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <button
          type="button"
          onClick={onSchedule}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          <Clock3 size={16} />
          Manage Schedule
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Edit3 size={16} />
          Edit Dentist
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SummaryCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function DentistAvatar({ name, large = false }) {
  const initials = String(name || "D")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white ${
        large ? "h-14 w-14 text-base" : "h-10 w-10 text-xs"
      }`}
    >
      {initials || "D"}
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function AppointmentStatus({ status }) {
  const styles = {
    CONFIRMED: "bg-emerald-50 text-emerald-700",
    COMPLETED: "bg-blue-50 text-blue-700",
    CANCELLED: "bg-slate-100 text-slate-600",
    REJECTED: "bg-red-50 text-red-700",
    NO_SHOW: "bg-amber-50 text-amber-700",
    PENDING: "bg-violet-50 text-violet-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status || "UNKNOWN"}
    </span>
  );
}

function TableHeading({ children }) {
  return (
    <th className="whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function IconButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </button>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
}

function DetailCard({ title, icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-slate-900">
          {title}
        </h3>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-slate-400">
        {label}
      </span>
      <span className="text-right text-sm font-medium text-slate-700">
        {value || "-"}
      </span>
    </div>
  );
}

function ModalShell({
  children,
  onClose,
  width = "max-w-3xl",
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${width} overflow-hidden rounded-2xl bg-white shadow-2xl`}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  title,
  subtitle,
  onClose,
}) {
  return (
    <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <X size={20} />
      </button>
    </div>
  );
}

function ModalFooter({
  onCancel,
  saving,
  submitText,
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {saving ? "Saving..." : submitText}
      </button>
    </div>
  );
}

function InlineError({ message }) {
  return (
    <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle
        size={18}
        className="mt-0.5 shrink-0"
      />
      {message}
    </div>
  );
}

function LoadingState({ text }) {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="text-center">
        <RefreshCw
          size={28}
          className="mx-auto animate-spin text-slate-400"
        />
        <p className="mt-3 text-sm text-slate-500">
          {text}
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex min-h-64 items-center justify-center p-6">
      <div className="text-center">
        <AlertCircle
          size={34}
          className="mx-auto text-red-500"
        />
        <p className="mt-3 font-semibold text-slate-800">
          Could not load dentists
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getDay(value) {
  return (
    DAYS.find(
      (day) => day.value === Number(value)
    ) || {
      label: `Day ${value}`,
      short: String(value),
    }
  );
}

function toInputTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function toApiTime(value) {
  if (!value) return null;

  return value.length === 5
    ? `${value}:00`
    : value;
}

function formatTime(time) {
  if (!time) return "-";

  const [hours, minutes] = String(time).split(":");

  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg)
      .filter(Boolean)
      .join(", ");
  }

  return error?.message || fallback;
}

export default Dentists;