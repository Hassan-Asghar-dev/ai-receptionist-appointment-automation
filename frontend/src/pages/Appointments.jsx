import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Eye,
  Filter,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import api from "../services/api";
import NewAppointmentModal from "../components/NewAppointmentModal";

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [services, setServices] = useState([]);
  const [newAppointmentOpen, setNewAppointmentOpen] =
  useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  // Details modal
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Reschedule modal
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const fetchData = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        appointmentsResponse,
        patientsResponse,
        dentistsResponse,
        servicesResponse,
      ] = await Promise.all([
        api.get("/appointments/"),
        api.get("/patients/"),
        api.get("/dentists/"),
        api.get("/services/"),
      ]);

      setAppointments(appointmentsResponse.data);
      setPatients(patientsResponse.data);
      setDentists(dentistsResponse.data);
      setServices(servicesResponse.data);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Could not load appointment data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getPatient = (patientId) =>
    patients.find((item) => item.id === patientId);

  const getDentist = (dentistId) =>
    dentists.find((item) => item.id === dentistId);

  const getService = (serviceId) =>
    services.find((item) => item.id === serviceId);

  const getPatientName = (patientId) => {
    const patient = getPatient(patientId);

    return (
      patient?.full_name ||
      patient?.name ||
      `Patient #${patientId}`
    );
  };

  const getDentistName = (dentistId) => {
    const dentist = getDentist(dentistId);

    return (
      dentist?.full_name ||
      dentist?.name ||
      `Dentist #${dentistId}`
    );
  };

  const getServiceName = (serviceId) => {
    if (!serviceId) return "Other";

    const service = getService(serviceId);

    return (
      service?.service_name ||
      service?.name ||
      `Service #${serviceId}`
    );
  };

  const getServiceDuration = (serviceId) => {
    const service = getService(serviceId);

    return Number(service?.duration_minutes || 0);
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return "-";

    return new Date(dateTime).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatTime = (time) => {
    if (!time) return "-";

    const [hours, minutes] = time.split(":");

    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-50 text-yellow-700 ring-yellow-600/20";

      case "CONFIRMED":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

      case "COMPLETED":
        return "bg-blue-50 text-blue-700 ring-blue-600/20";

      case "CANCELLED":
        return "bg-slate-100 text-slate-600 ring-slate-500/20";

      case "REJECTED":
        return "bg-red-50 text-red-700 ring-red-600/20";

      case "NO_SHOW":
        return "bg-amber-50 text-amber-700 ring-amber-600/20";

      default:
        return "bg-slate-100 text-slate-700 ring-slate-500/20";
    }
  };

  const updateAppointmentStatus = async (
    appointmentId,
    action,
    confirmationMessage
  ) => {
    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) return;

    try {
      setActionLoading(appointmentId);

      const response = await api.patch(
        `/appointments/${appointmentId}/${action}`
      );

      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === appointmentId
            ? response.data
            : appointment
        )
      );

      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment(response.data);
      }
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.detail ||
          "Could not update the appointment."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirm = (id) =>
    updateAppointmentStatus(
      id,
      "confirm",
      "Confirm this appointment?"
    );

  const handleReject = (id) =>
    updateAppointmentStatus(
      id,
      "reject",
      "Are you sure you want to reject this appointment?"
    );

  const handleCancel = (id) =>
    updateAppointmentStatus(
      id,
      "cancel",
      "Are you sure you want to cancel this appointment?"
    );

  const handleComplete = (id) =>
    updateAppointmentStatus(
      id,
      "complete",
      "Mark this appointment as completed?"
    );

  const handleNoShow = (id) =>
    updateAppointmentStatus(
      id,
      "no-show",
      "Mark this patient as a no-show?"
    );

  const openRescheduleModal = (appointment) => {
    setRescheduleAppointment(appointment);
    setRescheduleDate(appointment.appointment_date);
    setRescheduleTime(
      appointment.start_time?.slice(0, 5) || ""
    );
    setRescheduleError("");
  };

  const closeRescheduleModal = () => {
    if (rescheduleLoading) return;

    setRescheduleAppointment(null);
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleError("");
  };

  const calculateEndTime = (startTime, durationMinutes) => {
    if (!startTime || !durationMinutes) return null;

    const [hours, minutes] = startTime
      .split(":")
      .map(Number);

    const totalMinutes =
      hours * 60 + minutes + durationMinutes;

    if (totalMinutes >= 24 * 60) {
      return null;
    }

    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;

    return `${String(endHours).padStart(2, "0")}:${String(
      endMinutes
    ).padStart(2, "0")}:00`;
  };

  const handleRescheduleSubmit = async (event) => {
    event.preventDefault();

    if (!rescheduleAppointment) return;

    setRescheduleError("");

    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError(
        "Please select both a date and start time."
      );
      return;
    }

    const duration = getServiceDuration(
      rescheduleAppointment.service_id
    );

    if (!duration) {
      setRescheduleError(
        "The service duration could not be determined."
      );
      return;
    }

    const endTime = calculateEndTime(
      rescheduleTime,
      duration
    );

    if (!endTime) {
      setRescheduleError(
        "This appointment would extend into the next day."
      );
      return;
    }

    try {
      setRescheduleLoading(true);

      const response = await api.patch(
        `/appointments/${rescheduleAppointment.id}/reschedule`,
        {
          appointment_date: rescheduleDate,
          start_time: `${rescheduleTime}:00`,
          end_time: endTime,
        }
      );

      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === rescheduleAppointment.id
            ? response.data
            : appointment
        )
      );

      setSelectedAppointment((current) =>
        current?.id === rescheduleAppointment.id
          ? response.data
          : current
      );

      closeRescheduleModal();
      setRescheduleAppointment(null);
    } catch (err) {
      console.error(err);

      setRescheduleError(
        err.response?.data?.detail ||
          "Could not reschedule the appointment."
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setDateFilter("");
  };

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const patientName = getPatientName(
        appointment.patient_id
      ).toLowerCase();

      const dentistName = getDentistName(
        appointment.dentist_id
      ).toLowerCase();

      const serviceName = getServiceName(
        appointment.service_id
      ).toLowerCase();

      const matchesSearch =
        !query ||
        patientName.includes(query) ||
        dentistName.includes(query) ||
        serviceName.includes(query) ||
        String(appointment.id).includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        appointment.status === statusFilter;

      const matchesSource =
        sourceFilter === "ALL" ||
        appointment.booking_source === sourceFilter;

      const matchesDate =
        !dateFilter ||
        appointment.appointment_date === dateFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSource &&
        matchesDate
      );
    });
  }, [
    appointments,
    patients,
    dentists,
    services,
    search,
    statusFilter,
    sourceFilter,
    dateFilter,
  ]);

  const counts = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter(
        (item) => item.status === "PENDING"
      ).length,
      confirmed: appointments.filter(
        (item) => item.status === "CONFIRMED"
      ).length,
      completed: appointments.filter(
        (item) => item.status === "COMPLETED"
      ).length,
    };
  }, [appointments]);

  const ActionButton = ({
    children,
    onClick,
    variant = "default",
    disabled = false,
  }) => {
    const styles = {
      default:
        "border-slate-200 text-slate-700 hover:bg-slate-50",
      green:
        "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
      blue:
        "border-blue-200 text-blue-700 hover:bg-blue-50",
      amber:
        "border-amber-200 text-amber-700 hover:bg-amber-50",
      red:
        "border-red-200 text-red-600 hover:bg-red-50",
    };

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
      >
        {children}
      </button>
    );
  };

  const renderActions = (appointment) => {
    const busy = actionLoading === appointment.id;

    if (appointment.status === "PENDING") {
      return (
        <div className="flex flex-wrap gap-2">
          <ActionButton
            variant="green"
            disabled={busy}
            onClick={() => handleConfirm(appointment.id)}
          >
            Confirm
          </ActionButton>

          <ActionButton
            variant="red"
            disabled={busy}
            onClick={() => handleReject(appointment.id)}
          >
            Reject
          </ActionButton>

          <ActionButton
            disabled={busy}
            onClick={() =>
              openRescheduleModal(appointment)
            }
          >
            Reschedule
          </ActionButton>

          <ActionButton
            variant="red"
            disabled={busy}
            onClick={() => handleCancel(appointment.id)}
          >
            Cancel
          </ActionButton>
        </div>
      );
    }

    if (appointment.status === "CONFIRMED") {
      return (
        <div className="flex flex-wrap gap-2">
          <ActionButton
            variant="blue"
            disabled={busy}
            onClick={() => handleComplete(appointment.id)}
          >
            Complete
          </ActionButton>

          <ActionButton
            variant="amber"
            disabled={busy}
            onClick={() => handleNoShow(appointment.id)}
          >
            No Show
          </ActionButton>

          <ActionButton
            disabled={busy}
            onClick={() =>
              openRescheduleModal(appointment)
            }
          >
            Reschedule
          </ActionButton>

          <ActionButton
            variant="red"
            disabled={busy}
            onClick={() => handleCancel(appointment.id)}
          >
            Cancel
          </ActionButton>
        </div>
      );
    }

    return (
      <span className="text-sm text-slate-400">—</span>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Appointments
          </h1>

          <p className="mt-2 text-slate-500">
            View and manage clinic appointments.
          </p>
        </div>

        <div className="flex gap-3">
  <button
    type="button"
    onClick={() => fetchData(true)}
    disabled={refreshing}
    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
  >
    <RefreshCw
      size={17}
      className={refreshing ? "animate-spin" : ""}
    />

    {refreshing ? "Refreshing..." : "Refresh"}
    </button>

     <button
      type="button"
      onClick={() => setNewAppointmentOpen(true)}
      className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
     >
    <Plus size={18} />
    New Appointment
     </button>
   </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Appointments
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {counts.total}
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-200 bg-yellow-50/40 p-5">
          <p className="text-sm text-yellow-700">
            Pending
          </p>
          <p className="mt-2 text-2xl font-bold text-yellow-800">
            {counts.pending}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
          <p className="text-sm text-emerald-700">
            Confirmed
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-800">
            {counts.confirmed}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
          <p className="text-sm text-blue-700">
            Completed
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-800">
            {counts.completed}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-900">
            Filters
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search patient, dentist or service..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
              <option value="NO_SHOW">No Show</option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div className="relative">
            <select
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(event.target.value)
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="ALL">All sources</option>
              <option value="RECEPTIONIST">
                Receptionist
              </option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <input
            type="date"
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(event.target.value)
            }
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {filteredAppointments.length}
            </span>{" "}
            of {appointments.length} appointments
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <RotateCcw size={15} />
            Clear filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading && (
          <div className="p-8 text-center text-slate-500">
            Loading appointments...
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <p className="font-medium text-red-600">
              {error}
            </p>

            <button
              onClick={() => fetchData()}
              className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          filteredAppointments.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <CalendarDays
                size={38}
                className="text-slate-300"
              />

              <h3 className="mt-4 font-semibold text-slate-900">
                No appointments found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                No appointments match the selected filters.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          filteredAppointments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Patient
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Dentist
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Service
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Time
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Source
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAppointments.map(
                    (appointment) => (
                      <tr
                        key={appointment.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50 last:border-0"
                      >
                        <td className="px-5 py-5">
                          <p className="font-medium text-slate-900">
                            {getPatientName(
                              appointment.patient_id
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Appointment #{appointment.id}
                          </p>
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {getDentistName(
                            appointment.dentist_id
                          )}
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {getServiceName(
                            appointment.service_id
                          )}
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {formatDate(
                            appointment.appointment_date
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock size={15} />
                            {formatTime(
                              appointment.start_time
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <span className="text-xs font-medium text-slate-600">
                            {appointment.booking_source ||
                              "-"}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(
                              appointment.status
                            )}`}
                          >
                            {appointment.status.replace(
                              "_",
                              " "
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          {renderActions(appointment)}
                        </td>

                        <td className="px-5 py-5">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedAppointment(
                                appointment
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            title="View details"
                          >
                            <Eye size={17} />
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Appointment Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Appointment #{selectedAppointment.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedAppointment(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <DetailItem
                label="Patient"
                value={getPatientName(
                  selectedAppointment.patient_id
                )}
              />

              <DetailItem
                label="Dentist"
                value={getDentistName(
                  selectedAppointment.dentist_id
                )}
              />

              <DetailItem
                label="Service"
                value={getServiceName(
                  selectedAppointment.service_id
                )}
              />

              <DetailItem
                label="Status"
                value={selectedAppointment.status.replace(
                  "_",
                  " "
                )}
              />

              <DetailItem
                label="Appointment Date"
                value={formatDate(
                  selectedAppointment.appointment_date
                )}
              />

              <DetailItem
                label="Time"
                value={`${formatTime(
                  selectedAppointment.start_time
                )} – ${formatTime(
                  selectedAppointment.end_time
                )}`}
              />

              <DetailItem
                label="Booking Source"
                value={
                  selectedAppointment.booking_source ||
                  "-"
                }
              />

              <DetailItem
                label="Created"
                value={formatDateTime(
                  selectedAppointment.created_at
                )}
              />

              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Notes
                </p>

                <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  {selectedAppointment.notes ||
                    "No notes for this appointment."}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
              {(selectedAppointment.status ===
                "PENDING" ||
                selectedAppointment.status ===
                  "CONFIRMED") && (
                <button
                  type="button"
                  onClick={() => {
                    const appointment =
                      selectedAppointment;

                    setSelectedAppointment(null);
                    openRescheduleModal(appointment);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reschedule
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setSelectedAppointment(null)
                }
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Reschedule Appointment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {getPatientName(
                    rescheduleAppointment.patient_id
                  )}
                </p>
              </div>

              <button
                type="button"
                disabled={rescheduleLoading}
                onClick={closeRescheduleModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleRescheduleSubmit}
              className="p-6"
            >
              <div className="mb-5 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  {getServiceName(
                    rescheduleAppointment.service_id
                  )}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {getDentistName(
                    rescheduleAppointment.dentist_id
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Duration:{" "}
                  {getServiceDuration(
                    rescheduleAppointment.service_id
                  ) || "Unknown"}{" "}
                  minutes
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  New Date
                </label>

                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(event) =>
                    setRescheduleDate(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  New Start Time
                </label>

                <input
                  type="time"
                  required
                  value={rescheduleTime}
                  onChange={(event) =>
                    setRescheduleTime(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </div>

              {rescheduleTime &&
                getServiceDuration(
                  rescheduleAppointment.service_id
                ) > 0 && (
                  <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <div className="flex items-center gap-2">
                      <Check size={16} />

                      <span>
                        Expected end time:{" "}
                        <strong>
                          {formatTime(
                            calculateEndTime(
                              rescheduleTime,
                              getServiceDuration(
                                rescheduleAppointment.service_id
                              )
                            )
                          )}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

              {rescheduleError && (
                <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {rescheduleError}
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-slate-500">
                The backend will verify the dentist's
                availability before the appointment is
                rescheduled.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRescheduleModal}
                  disabled={rescheduleLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={rescheduleLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rescheduleLoading
                    ? "Rescheduling..."
                    : "Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <NewAppointmentModal
        open={newAppointmentOpen}
        onClose={() => setNewAppointmentOpen(false)}
        patients={patients}
        dentists={dentists}
        services={services}
        onCreated={(appointment) => {
          setAppointments((current) => [
            ...current,
            appointment,
          ]);

          setNewAppointmentOpen(false);
        }}
      />
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium text-slate-800">
        {value || "-"}
      </p>

    </div>
  );
}

export default Appointments;