import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import api from "../services/api";

const EMPTY_FORM = {
  name: "",
  description: "",
  duration_minutes: "",
  price: "",
};

function Services() {
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [addOpen, setAddOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

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
        api.get("/services/"),
        api.get("/appointments/"),
      ]);

      const [servicesResult, appointmentsResult] = results;

      if (servicesResult.status === "rejected") {
        throw servicesResult.reason;
      }

      setServices(
        Array.isArray(servicesResult.value.data)
          ? servicesResult.value.data
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
          "Could not load services. Please try again."
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

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return services.filter((service) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && service.is_active) ||
        (statusFilter === "INACTIVE" && !service.is_active);

      const matchesSearch =
        !query ||
        String(service.name || "")
          .toLowerCase()
          .includes(query) ||
        String(service.description || "")
          .toLowerCase()
          .includes(query) ||
        String(service.id).includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [services, search, statusFilter]);

  const activeServices = services.filter(
    (service) => service.is_active
  ).length;

  const inactiveServices = services.length - activeServices;

  const averageDuration =
    services.length > 0
      ? Math.round(
          services.reduce(
            (total, service) =>
              total + Number(service.duration_minutes || 0),
            0
          ) / services.length
        )
      : 0;

  const getAppointmentCount = (serviceId) =>
    appointments.filter(
      (appointment) => appointment.service_id === serviceId
    ).length;

  const getServiceAppointments = (serviceId) =>
    appointments
      .filter(
        (appointment) => appointment.service_id === serviceId
      )
      .sort((a, b) =>
        `${b.appointment_date} ${b.start_time}`.localeCompare(
          `${a.appointment_date} ${a.start_time}`
        )
      );

  const handleCreated = (service) => {
    setServices((current) => [
      service,
      ...current.filter((item) => item.id !== service.id),
    ]);

    setAddOpen(false);
  };

  const handleUpdated = (service) => {
    setServices((current) =>
      current.map((item) =>
        item.id === service.id ? service : item
      )
    );

    if (selectedService?.id === service.id) {
      setSelectedService(service);
    }

    setEditingService(null);
  };

  const handleStatusChange = async (service) => {
    const makingActive = !service.is_active;

    if (!makingActive) {
      const confirmed = window.confirm(
        `Deactivate "${service.name}"? It will remain in the database and can be reactivated later.`
      );

      if (!confirmed) return;
    }

    try {
      setActionLoading(service.id);

      const response = await api.patch(
        `/services/${service.id}/status`,
        {
          is_active: makingActive,
        }
      );

      const updatedService = response.data;

      setServices((current) =>
        current.map((item) =>
          item.id === service.id ? updatedService : item
        )
      );

      if (selectedService?.id === service.id) {
        setSelectedService(updatedService);
      }
    } catch (err) {
      console.error(err);

      window.alert(
        getErrorMessage(
          err,
          `Could not ${
            makingActive ? "reactivate" : "deactivate"
          } service.`
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Services
          </h1>

          <p className="mt-2 text-slate-500">
            Manage treatments, prices and appointment durations.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
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
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={18} />
            Add Service
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Services"
          value={services.length}
          icon={<Stethoscope size={21} />}
        />

        <SummaryCard
          title="Active Services"
          value={activeServices}
          icon={<UserCheck size={21} />}
        />

        <SummaryCard
          title="Inactive Services"
          value={inactiveServices}
          icon={<UserX size={21} />}
        />

        <SummaryCard
          title="Average Duration"
          value={`${averageDuration} min`}
          icon={<Clock3 size={21} />}
        />
      </div>

      {/* SEARCH + FILTER */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search service name, description or ID..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading && (
          <LoadingState text="Loading services..." />
        )}

        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => fetchData()}
          />
        )}

        {!loading &&
          !error &&
          filteredServices.length === 0 && (
            <div className="flex min-h-64 items-center justify-center p-8 text-center">
              <div>
                <Stethoscope
                  size={40}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-semibold text-slate-700">
                  No services found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {search || statusFilter !== "ALL"
                    ? "Try changing your search or filter."
                    : "Add your first clinic service."}
                </p>
              </div>
            </div>
          )}

        {!loading &&
          !error &&
          filteredServices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <TableHeading>Service</TableHeading>
                    <TableHeading>Duration</TableHeading>
                    <TableHeading>Price</TableHeading>
                    <TableHeading>Appointments</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading>Actions</TableHeading>
                  </tr>
                </thead>

                <tbody>
                  {filteredServices.map((service) => (
                    <tr
                      key={service.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50 last:border-0"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <ServiceIcon />

                          <div className="max-w-sm">
                            <p className="font-semibold text-slate-900">
                              {service.name}
                            </p>

                            <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                              {service.description ||
                                `Service #${service.id}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                          <Clock3
                            size={16}
                            className="text-slate-400"
                          />

                          {service.duration_minutes} min
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="font-semibold text-slate-900">
                          {formatPrice(service.price)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {getAppointmentCount(service.id)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <StatusBadge
                          active={service.is_active}
                        />
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <IconButton
                            title="View service"
                            onClick={() =>
                              setSelectedService(service)
                            }
                          >
                            <Eye size={17} />
                          </IconButton>

                          <IconButton
                            title="Edit service"
                            onClick={() =>
                              setEditingService(service)
                            }
                          >
                            <Edit3 size={16} />
                          </IconButton>

                          <button
                            type="button"
                            disabled={
                              actionLoading === service.id
                            }
                            onClick={() =>
                              handleStatusChange(service)
                            }
                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              service.is_active
                                ? "bg-red-50 text-red-700 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {actionLoading === service.id
                              ? "Saving..."
                              : service.is_active
                              ? "Deactivate"
                              : "Reactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {!loading && !error && (
        <p className="mt-3 text-sm text-slate-400">
          Showing {filteredServices.length} of{" "}
          {services.length} services
        </p>
      )}

      {/* ADD */}
      <ServiceFormModal
        open={addOpen}
        mode="create"
        onClose={() => setAddOpen(false)}
        onSaved={handleCreated}
      />

      {/* EDIT */}
      <ServiceFormModal
        open={Boolean(editingService)}
        mode="edit"
        service={editingService}
        onClose={() => setEditingService(null)}
        onSaved={handleUpdated}
      />

      {/* DETAILS */}
      <ServiceDetailsModal
        service={selectedService}
        appointments={
          selectedService
            ? getServiceAppointments(selectedService.id)
            : []
        }
        onClose={() => setSelectedService(null)}
        onEdit={() => {
          setEditingService(selectedService);
          setSelectedService(null);
        }}
      />
    </div>
  );
}

/* =========================================================
   CREATE / EDIT SERVICE
========================================================= */

function ServiceFormModal({
  open,
  mode,
  service,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && service) {
      setForm({
        name: service.name || "",
        description: service.description || "",
        duration_minutes:
          service.duration_minutes?.toString() || "",
        price: service.price?.toString() || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setError("");
  }, [open, mode, service]);

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const duration = Number(form.duration_minutes);
    const price = Number(form.price);

    if (!name) {
      setError("Service name is required.");
      return;
    }

    if (
      !form.duration_minutes ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      setError(
        "Enter a valid service duration greater than 0 minutes."
      );
      return;
    }

    if (
      form.price === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError("Enter a valid service price.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name,
        description: form.description.trim() || null,
        duration_minutes: duration,
        price,
      };

      const response =
        mode === "edit"
          ? await api.put(
              `/services/${service.id}`,
              payload
            )
          : await api.post("/services/", payload);

      onSaved(response.data);
    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(
          err,
          mode === "edit"
            ? "Could not update service."
            : "Could not create service."
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
            ? "Edit Service"
            : "Add New Service"
        }
        subtitle={
          mode === "edit"
            ? "Update treatment information, duration or price."
            : "Create a treatment that can be used when booking appointments."
        }
        onClose={onClose}
      />

      <form onSubmit={submit}>
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error && <InlineError message={error} />}

          {mode === "edit" && (
            <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              If you change the price, your backend will
              automatically record the old and new price in
              the service price history.
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField
                label="Service Name"
                required
                value={form.name}
                onChange={(value) =>
                  updateField("name", value)
                }
                placeholder="Dental Cleaning"
              />
            </div>

            <FormField
              label="Duration (minutes)"
              required
              type="number"
              min="1"
              step="1"
              value={form.duration_minutes}
              onChange={(value) =>
                updateField("duration_minutes", value)
              }
              placeholder="60"
            />

            <FormField
              label="Price (PKR)"
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(value) =>
                updateField("price", value)
              }
              placeholder="5000"
            />

            <div className="sm:col-span-2">
              <TextAreaField
                label="Description"
                value={form.description}
                onChange={(value) =>
                  updateField("description", value)
                }
                placeholder="Describe the treatment or service..."
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
              : "Add Service"
          }
        />
      </form>
    </ModalShell>
  );
}

/* =========================================================
   SERVICE DETAILS
========================================================= */

function ServiceDetailsModal({
  service,
  appointments,
  onClose,
  onEdit,
}) {
  if (!service) return null;

  const confirmed = appointments.filter(
    (appointment) => appointment.status === "CONFIRMED"
  ).length;

  const completed = appointments.filter(
    (appointment) => appointment.status === "COMPLETED"
  ).length;

  return (
    <ModalShell onClose={onClose} width="max-w-4xl">
      <ModalHeader
        title={service.name}
        subtitle={`Service #${service.id}`}
        onClose={onClose}
      />

      <div className="max-h-[75vh] overflow-y-auto p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Stethoscope size={26} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">
                {service.name}
              </h3>

              <StatusBadge active={service.is_active} />
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {service.description ||
                "No description provided."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat
            title="Price"
            value={formatPrice(service.price)}
            icon={<Banknote size={18} />}
          />

          <MiniStat
            title="Duration"
            value={`${service.duration_minutes} min`}
            icon={<Clock3 size={18} />}
          />

          <MiniStat
            title="Appointments"
            value={appointments.length}
            icon={<Activity size={18} />}
          />

          <MiniStat
            title="Completed"
            value={completed}
            icon={<CheckCircle2 size={18} />}
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DetailCard
            title="Service Information"
            icon={<Stethoscope size={18} />}
          >
            <DetailRow
              label="Service ID"
              value={`#${service.id}`}
            />

            <DetailRow
              label="Price"
              value={formatPrice(service.price)}
            />

            <DetailRow
              label="Duration"
              value={`${service.duration_minutes} minutes`}
            />

            <DetailRow
              label="Status"
              value={
                service.is_active ? "Active" : "Inactive"
              }
            />
          </DetailCard>

          <DetailCard
            title="Usage"
            icon={<Activity size={18} />}
          >
            <DetailRow
              label="Total Appointments"
              value={appointments.length}
            />

            <DetailRow
              label="Confirmed"
              value={confirmed}
            />

            <DetailRow
              label="Completed"
              value={completed}
            />

            <DetailRow
              label="Last Updated"
              value={formatDateTime(service.updated_at)}
            />
          </DetailCard>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900">
            Description
          </h3>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {service.description ||
              "No description has been added for this service."}
          </p>
        </div>

        <div className="mt-6">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900">
              Recent Appointments
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Appointments booked for this treatment.
            </p>
          </div>

          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <Activity
                size={30}
                className="mx-auto text-slate-300"
              />

              <p className="mt-2 text-sm text-slate-500">
                No appointments have used this service yet.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <TableHeading>
                        Appointment
                      </TableHeading>

                      <TableHeading>Date</TableHeading>
                      <TableHeading>Time</TableHeading>
                      <TableHeading>Status</TableHeading>
                    </tr>
                  </thead>

                  <tbody>
                    {appointments
                      .slice(0, 10)
                      .map((appointment) => (
                        <tr
                          key={appointment.id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">
                            #{appointment.id}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
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
          Edit Service
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   COMPONENTS
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

function MiniStat({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">
          {title}
        </span>
      </div>

      <p className="mt-2 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function ServiceIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
      <Stethoscope size={18} />
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
  min,
  step,
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
        min={min}
        step={step}
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
        rows={5}
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
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-slate-400">
        {label}
      </span>

      <span className="text-right text-sm font-medium text-slate-700">
        {value ?? "-"}
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
        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="max-w-md text-center">
        <AlertCircle
          size={34}
          className="mx-auto text-red-500"
        />

        <p className="mt-3 font-semibold text-slate-800">
          Could not load services
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

function formatPrice(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "PKR 0";
  }

  return `PKR ${amount.toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
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

  const [hours, minutes] = String(time).split(":");

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

export default Services;