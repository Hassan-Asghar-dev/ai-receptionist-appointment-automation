import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserRound,
  UserX,
  Users,
  X,
} from "lucide-react";

import api from "../services/api";

const EMPTY_FORM = {
  full_name: "",
  whatsapp_number: "",
  email: "",
  allergies: "",
  medical_history: "",
  notes: "",
};

function Patients() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [addPatientOpen, setAddPatientOpen] = useState(false);

  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = useCallback(async (showMainLoader = true) => {
    try {
      if (showMainLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const results = await Promise.allSettled([
        api.get("/patients/"),
        api.get("/appointments/"),
        api.get("/dentists/"),
        api.get("/services/"),
      ]);

      const [
        patientsResult,
        appointmentsResult,
        dentistsResult,
        servicesResult,
      ] = results;

      if (patientsResult.status === "rejected") {
        throw patientsResult.reason;
      }

      setPatients(
        Array.isArray(patientsResult.value.data)
          ? patientsResult.value.data
          : []
      );

      setAppointments(
        appointmentsResult.status === "fulfilled" &&
          Array.isArray(appointmentsResult.value.data)
          ? appointmentsResult.value.data
          : []
      );

      setDentists(
        dentistsResult.status === "fulfilled" &&
          Array.isArray(dentistsResult.value.data)
          ? dentistsResult.value.data
          : []
      );

      setServices(
        servicesResult.status === "fulfilled" &&
          Array.isArray(servicesResult.value.data)
          ? servicesResult.value.data
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          "Could not load patients. Please try again."
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

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return patients.filter((patient) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && patient.is_active) ||
        (statusFilter === "INACTIVE" && !patient.is_active);

      const matchesSearch =
        !query ||
        String(patient.full_name || "")
          .toLowerCase()
          .includes(query) ||
        String(patient.whatsapp_number || "")
          .toLowerCase()
          .includes(query) ||
        String(patient.email || "")
          .toLowerCase()
          .includes(query) ||
        String(patient.id || "").includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [patients, search, statusFilter]);

  const activePatients = patients.filter(
    (patient) => patient.is_active
  ).length;

  const inactivePatients = patients.filter(
    (patient) => !patient.is_active
  ).length;

  const patientsWithAppointments = new Set(
    appointments.map((appointment) => appointment.patient_id)
  ).size;

  const getPatientAppointments = (patientId) => {
    return appointments
      .filter(
        (appointment) => appointment.patient_id === patientId
      )
      .sort((a, b) => {
        const first = `${a.appointment_date} ${a.start_time}`;
        const second = `${b.appointment_date} ${b.start_time}`;

        return second.localeCompare(first);
      });
  };

  const getDentistName = (dentistId) => {
    const dentist = dentists.find(
      (item) => item.id === dentistId
    );

    return (
      dentist?.full_name ||
      dentist?.name ||
      `Dentist #${dentistId}`
    );
  };

  const getServiceName = (serviceId) => {
    const service = services.find(
      (item) => item.id === serviceId
    );

    return (
      service?.service_name ||
      service?.name ||
      `Service #${serviceId}`
    );
  };

  const handlePatientCreated = (patient) => {
    setPatients((current) => [
      patient,
      ...current.filter((item) => item.id !== patient.id),
    ]);

    setAddPatientOpen(false);
  };

  const handlePatientUpdated = (patient) => {
    setPatients((current) =>
      current.map((item) =>
        item.id === patient.id ? patient : item
      )
    );

    if (selectedPatient?.id === patient.id) {
      setSelectedPatient(patient);
    }

    setEditingPatient(null);
  };

  const handleStatusChange = async (patient) => {
    const makingActive = !patient.is_active;

    if (!makingActive) {
      const confirmed = window.confirm(
        `Deactivate ${patient.full_name}? The patient will remain in the database and can be reactivated later.`
      );

      if (!confirmed) return;
    }

    try {
      setActionLoading(patient.id);

      const response = await api.patch(
        `/patients/${patient.id}/status`,
        {
          is_active: makingActive,
        }
      );

      const updatedPatient = response.data;

      setPatients((current) =>
        current.map((item) =>
          item.id === patient.id ? updatedPatient : item
        )
      );

      if (selectedPatient?.id === patient.id) {
        setSelectedPatient(updatedPatient);
      }
    } catch (err) {
      console.error(err);

      window.alert(
        getErrorMessage(
          err,
          `Could not ${
            makingActive ? "reactivate" : "deactivate"
          } the patient.`
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
            Patients
          </h1>

          <p className="mt-2 text-slate-500">
            View and manage clinic patients and their records.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={() => setAddPatientOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={18} />
            Add Patient
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Patients"
          value={patients.length}
          icon={<Users size={21} />}
        />

        <SummaryCard
          title="Active Patients"
          value={activePatients}
          icon={<UserCheck size={21} />}
        />

        <SummaryCard
          title="Inactive Patients"
          value={inactivePatients}
          icon={<UserX size={21} />}
        />

        <SummaryCard
          title="With Appointments"
          value={patientsWithAppointments}
          icon={<CalendarDays size={21} />}
        />
      </div>

      {/* Search / filters */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, WhatsApp, email or ID..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
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

      {/* Content */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading && (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <RefreshCw
                size={28}
                className="mx-auto animate-spin text-slate-400"
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading patients...
              </p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex min-h-64 items-center justify-center p-6">
            <div className="max-w-md text-center">
              <AlertCircle
                size={34}
                className="mx-auto text-red-500"
              />

              <p className="mt-3 font-semibold text-slate-800">
                Could not load patients
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {error}
              </p>

              <button
                type="button"
                onClick={() => fetchData()}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!loading &&
          !error &&
          filteredPatients.length === 0 && (
            <div className="flex min-h-64 items-center justify-center p-6">
              <div className="text-center">
                <UserRound
                  size={38}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-semibold text-slate-700">
                  No patients found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {search || statusFilter !== "ALL"
                    ? "Try changing your search or filter."
                    : "Add your first patient to get started."}
                </p>
              </div>
            </div>
          )}

        {!loading &&
          !error &&
          filteredPatients.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <TableHeading>Patient</TableHeading>
                    <TableHeading>WhatsApp</TableHeading>
                    <TableHeading>Email</TableHeading>
                    <TableHeading>Appointments</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading>Actions</TableHeading>
                  </tr>
                </thead>

                <tbody>
                  {filteredPatients.map((patient) => {
                    const patientAppointments =
                      getPatientAppointments(patient.id);

                    return (
                      <tr
                        key={patient.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50 last:border-0"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <PatientAvatar
                              name={patient.full_name}
                            />

                            <div>
                              <p className="font-semibold text-slate-900">
                                {patient.full_name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                Patient #{patient.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone
                              size={15}
                              className="text-slate-400"
                            />

                            {patient.whatsapp_number || "-"}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail
                              size={15}
                              className="text-slate-400"
                            />

                            {patient.email || "-"}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {patientAppointments.length}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <StatusBadge active={patient.is_active} />
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <IconButton
                              title="View patient"
                              onClick={() =>
                                setSelectedPatient(patient)
                              }
                            >
                              <Eye size={17} />
                            </IconButton>

                            <IconButton
                              title="Edit patient"
                              onClick={() =>
                                setEditingPatient(patient)
                              }
                            >
                              <Edit3 size={16} />
                            </IconButton>

                            <button
                              type="button"
                              disabled={
                                actionLoading === patient.id
                              }
                              onClick={() =>
                                handleStatusChange(patient)
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                patient.is_active
                                  ? "bg-red-50 text-red-700 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {actionLoading === patient.id
                                ? "Saving..."
                                : patient.is_active
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
          Showing {filteredPatients.length} of {patients.length}{" "}
          patients
        </p>
      )}

      {/* Add */}
      <PatientFormModal
        open={addPatientOpen}
        mode="create"
        onClose={() => setAddPatientOpen(false)}
        onSaved={handlePatientCreated}
      />

      {/* Edit */}
      <PatientFormModal
        open={Boolean(editingPatient)}
        mode="edit"
        patient={editingPatient}
        onClose={() => setEditingPatient(null)}
        onSaved={handlePatientUpdated}
      />

      {/* Details */}
      <PatientDetailsModal
        patient={selectedPatient}
        appointments={
          selectedPatient
            ? getPatientAppointments(selectedPatient.id)
            : []
        }
        getDentistName={getDentistName}
        getServiceName={getServiceName}
        onClose={() => setSelectedPatient(null)}
        onEdit={() => {
          setEditingPatient(selectedPatient);
          setSelectedPatient(null);
        }}
      />
    </div>
  );
}

/* =========================================================
   PATIENT FORM
========================================================= */

function PatientFormModal({
  open,
  mode,
  patient,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && patient) {
      setForm({
        full_name: patient.full_name || "",
        whatsapp_number: patient.whatsapp_number || "",
        email: patient.email || "",
        allergies: patient.allergies || "",
        medical_history: patient.medical_history || "",
        notes: patient.notes || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setError("");
  }, [open, mode, patient]);

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.full_name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!form.whatsapp_number.trim()) {
      setError("WhatsApp number is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        full_name: form.full_name.trim(),
        whatsapp_number: normalizeWhatsApp(
          form.whatsapp_number
        ),
        email: form.email.trim() || null,
        allergies: form.allergies.trim() || null,
        medical_history:
          form.medical_history.trim() || null,
        notes: form.notes.trim() || null,
      };

      const response =
        mode === "edit"
          ? await api.put(`/patients/${patient.id}`, payload)
          : await api.post("/patients/", payload);

      onSaved(response.data);
    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          mode === "edit"
            ? "Could not update patient."
            : "Could not create patient."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} width="max-w-2xl">
      <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {mode === "edit"
              ? "Edit Patient"
              : "Add New Patient"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {mode === "edit"
              ? "Update the patient's clinic record."
              : "Create a new patient record."}
          </p>
        </div>

        <CloseButton onClick={onClose} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />
              {error}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Full Name"
              required
              value={form.full_name}
              onChange={(value) =>
                updateField("full_name", value)
              }
              placeholder="Patient full name"
            />

            <FormField
              label="WhatsApp Number"
              required
              value={form.whatsapp_number}
              onChange={(value) =>
                updateField("whatsapp_number", value)
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
              placeholder="patient@example.com"
            />

            <div className="hidden sm:block" />

            <TextAreaField
              label="Allergies"
              value={form.allergies}
              onChange={(value) =>
                updateField("allergies", value)
              }
              placeholder="Known allergies, or None"
            />

            <TextAreaField
              label="Medical History"
              value={form.medical_history}
              onChange={(value) =>
                updateField("medical_history", value)
              }
              placeholder="Relevant medical history"
            />

            <div className="sm:col-span-2">
              <TextAreaField
                label="Notes"
                value={form.notes}
                onChange={(value) =>
                  updateField("notes", value)
                }
                placeholder="Internal clinic notes..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : mode === "edit"
              ? "Save Changes"
              : "Add Patient"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* =========================================================
   DETAILS
========================================================= */

function PatientDetailsModal({
  patient,
  appointments,
  getDentistName,
  getServiceName,
  onClose,
  onEdit,
}) {
  if (!patient) return null;

  return (
    <ModalShell onClose={onClose} width="max-w-4xl">
      <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-4">
          <PatientAvatar
            name={patient.full_name}
            large
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                {patient.full_name}
              </h2>

              <StatusBadge active={patient.is_active} />
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Patient #{patient.id}
            </p>
          </div>
        </div>

        <CloseButton onClick={onClose} />
      </div>

      <div className="max-h-[75vh] overflow-y-auto p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard
            title="Contact Information"
            icon={<Phone size={18} />}
          >
            <DetailRow
              label="WhatsApp"
              value={patient.whatsapp_number}
            />

            <DetailRow
              label="Email"
              value={patient.email || "Not provided"}
            />
          </DetailCard>

          <DetailCard
            title="Patient Record"
            icon={<Activity size={18} />}
          >
            <DetailRow
              label="Status"
              value={patient.is_active ? "Active" : "Inactive"}
            />

            <DetailRow
              label="Created"
              value={formatDateTime(patient.created_at)}
            />

            <DetailRow
              label="Last Updated"
              value={formatDateTime(patient.updated_at)}
            />
          </DetailCard>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <MedicalCard
            title="Allergies"
            value={patient.allergies}
          />

          <MedicalCard
            title="Medical History"
            value={patient.medical_history}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900">
            Notes
          </h3>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {patient.notes || "No notes recorded."}
          </p>
        </div>

        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                Appointment History
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {appointments.length} appointment
                {appointments.length === 1 ? "" : "s"} found
              </p>
            </div>

            <CalendarDays
              size={21}
              className="text-slate-400"
            />
          </div>

          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <CalendarDays
                size={30}
                className="mx-auto text-slate-300"
              />

              <p className="mt-2 text-sm text-slate-500">
                This patient has no appointments yet.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <TableHeading>Date</TableHeading>
                      <TableHeading>Time</TableHeading>
                      <TableHeading>Service</TableHeading>
                      <TableHeading>Dentist</TableHeading>
                      <TableHeading>Status</TableHeading>
                    </tr>
                  </thead>

                  <tbody>
                    {appointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {formatDate(
                            appointment.appointment_date
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatTime(
                            appointment.start_time
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {getServiceName(
                            appointment.service_id
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {getDentistName(
                            appointment.dentist_id
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <AppointmentStatus
                            status={appointment.status}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Edit3 size={16} />
          Edit Patient
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   REUSABLE COMPONENTS
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

function PatientAvatar({ name, large = false }) {
  const initials = String(name || "P")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white ${
        large
          ? "h-12 w-12 text-sm"
          : "h-10 w-10 text-xs"
      }`}
    >
      {initials || "P"}
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
        styles[status] ||
        "bg-slate-100 text-slate-700"
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
        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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
        className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />
    </label>
  );
}

function DetailCard({ title, icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="mb-4 flex items-center gap-2 text-slate-900">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-slate-400">
        {label}
      </span>

      <span className="text-right text-sm font-medium text-slate-700">
        {value || "-"}
      </span>
    </div>
  );
}

function MedicalCard({ title, value }) {
  const hasValue =
    value &&
    String(value).trim() &&
    String(value).toLowerCase() !== "none";

  return (
    <div
      className={`rounded-2xl border p-5 ${
        hasValue
          ? "border-amber-200 bg-amber-50/40"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-2">
        {hasValue ? (
          <AlertCircle
            size={18}
            className="text-amber-600"
          />
        ) : (
          <CheckCircle2
            size={18}
            className="text-emerald-600"
          />
        )}

        <h3 className="font-semibold text-slate-900">
          {title}
        </h3>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {value || "None recorded"}
      </p>
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

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
    >
      <X size={20} />
    </button>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeWhatsApp(number) {
  const cleaned = String(number || "")
    .trim()
    .replace(/\s+/g, "");

  if (!cleaned) return "";

  return cleaned.startsWith("+")
    ? cleaned
    : `+${cleaned}`;
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

function formatTime(time) {
  if (!time) return "-";

  const [hours, minutes] = time.split(":");

  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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

export default Patients;