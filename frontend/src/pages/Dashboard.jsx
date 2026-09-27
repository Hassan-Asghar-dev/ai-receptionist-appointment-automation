import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  HeartPulse,
  MessageCircle,
  RefreshCw,
  Stethoscope,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

import api from "../services/api";

function Dashboard() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     FETCH REAL BACKEND DATA
  ========================================================= */

  const fetchDashboardData = useCallback(async (initial = true) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
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

      setAppointments(
        Array.isArray(appointmentsResponse.data)
          ? appointmentsResponse.data
          : []
      );

      setPatients(
        Array.isArray(patientsResponse.data)
          ? patientsResponse.data
          : []
      );

      setDentists(
        Array.isArray(dentistsResponse.data)
          ? dentistsResponse.data
          : []
      );

      setServices(
        Array.isArray(servicesResponse.data)
          ? servicesResponse.data
          : []
      );
    } catch (err) {
      console.error("Dashboard load error:", err);

      setError(
        err?.response?.data?.detail ||
          "Could not load dashboard data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /* =========================================================
     DATE
  ========================================================= */

  const today = getLocalDateString();

  /* =========================================================
     LOOKUPS
  ========================================================= */

  const patientMap = useMemo(
    () =>
      Object.fromEntries(
        patients.map((patient) => [patient.id, patient])
      ),
    [patients]
  );

  const dentistMap = useMemo(
    () =>
      Object.fromEntries(
        dentists.map((dentist) => [dentist.id, dentist])
      ),
    [dentists]
  );

  const serviceMap = useMemo(
    () =>
      Object.fromEntries(
        services.map((service) => [service.id, service])
      ),
    [services]
  );

  const getPatientName = (id) =>
    patientMap[id]?.full_name ||
    patientMap[id]?.name ||
    `Patient #${id}`;

  const getDentistName = (id) =>
    dentistMap[id]?.full_name ||
    dentistMap[id]?.name ||
    `Dentist #${id}`;

  const getServiceName = (id) =>
    serviceMap[id]?.name ||
    serviceMap[id]?.service_name ||
    `Service #${id}`;

  /* =========================================================
     DASHBOARD DATA
  ========================================================= */

  const todayAppointments = useMemo(() => {
    return appointments
      .filter(
        (appointment) =>
          appointment.appointment_date === today
      )
      .sort((a, b) =>
        String(a.start_time || "").localeCompare(
          String(b.start_time || "")
        )
      );
  }, [appointments, today]);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(
        (appointment) =>
          appointment.appointment_date >= today &&
          !["CANCELLED", "REJECTED", "COMPLETED"].includes(
            appointment.status
          )
      )
      .sort((a, b) => {
        const first = `${a.appointment_date} ${
          a.start_time || ""
        }`;

        const second = `${b.appointment_date} ${
          b.start_time || ""
        }`;

        return first.localeCompare(second);
      });
  }, [appointments, today]);

  const activePatients = patients.filter(
    (patient) => patient.is_active
  ).length;

  const activeDentists = dentists.filter(
    (dentist) => dentist.is_active
  ).length;

  const activeServices = services.filter(
    (service) => service.is_active
  ).length;

  const confirmedCount = appointments.filter(
    (appointment) => appointment.status === "CONFIRMED"
  ).length;

  const completedCount = appointments.filter(
    (appointment) => appointment.status === "COMPLETED"
  ).length;

  const cancelledCount = appointments.filter(
    (appointment) =>
      appointment.status === "CANCELLED" ||
      appointment.status === "REJECTED"
  ).length;

  const noShowCount = appointments.filter(
    (appointment) => appointment.status === "NO_SHOW"
  ).length;

  const whatsappBookings = appointments.filter(
    (appointment) => appointment.booking_source === "WHATSAPP"
  ).length;

  const receptionistBookings = appointments.filter(
    (appointment) =>
      appointment.booking_source === "RECEPTIONIST"
  ).length;

  const stats = [
    {
      title: "Today's Appointments",
      value: todayAppointments.length,
      subtitle: `${upcomingAppointments.length} upcoming`,
      icon: CalendarDays,
    },
    {
      title: "Patients",
      value: patients.length,
      subtitle: `${activePatients} active`,
      icon: Users,
    },
    {
      title: "Active Dentists",
      value: activeDentists,
      subtitle: `${dentists.length} total`,
      icon: Stethoscope,
    },
    {
      title: "Active Services",
      value: activeServices,
      subtitle: `${services.length} total`,
      icon: HeartPulse,
    },
  ];

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw
            size={32}
            className="mx-auto animate-spin text-slate-400"
          />

          <p className="mt-3 text-sm text-slate-500">
            Loading clinic dashboard...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="p-8">
        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
          <div className="max-w-md text-center">
            <AlertCircle
              size={40}
              className="mx-auto text-red-500"
            />

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Could not load dashboard
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => fetchDashboardData()}
              className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="p-8">
      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-2 text-slate-500">
            Welcome back. Here's what's happening at your clinic
            today.
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {formatLongDate(new Date())}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => fetchDashboardData(false)}
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
            onClick={() => navigate("/appointments")}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <CalendarDays size={17} />
            Appointments
          </button>
        </div>
      </div>

      {/* MAIN STAT CARDS */}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {stat.value}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {stat.subtitle}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK ACTIONS */}

      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Quickly access common clinic tasks.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            title="Manage Appointments"
            description="Book and manage clinic appointments."
            icon={<CalendarDays size={20} />}
            onClick={() => navigate("/appointments")}
          />

          <QuickAction
            title="Manage Patients"
            description="View and manage patient records."
            icon={<UserPlus size={20} />}
            onClick={() => navigate("/patients")}
          />

          <QuickAction
            title="Manage Dentists"
            description="Dentists and working schedules."
            icon={<Stethoscope size={20} />}
            onClick={() => navigate("/dentists")}
          />

          <QuickAction
            title="Manage Services"
            description="Treatments, duration and pricing."
            icon={<HeartPulse size={20} />}
            onClick={() => navigate("/services")}
          />
        </div>
      </div>

      {/* APPOINTMENT STATUS */}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Appointment Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current appointment status across the clinic.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SmallStat
              title="Confirmed"
              value={confirmedCount}
              icon={<CheckCircle2 size={19} />}
              style="emerald"
            />

            <SmallStat
              title="Completed"
              value={completedCount}
              icon={<Activity size={19} />}
              style="blue"
            />

            <SmallStat
              title="Cancelled / Rejected"
              value={cancelledCount}
              icon={<XCircle size={19} />}
              style="red"
            />

            <SmallStat
              title="No Show"
              value={noShowCount}
              icon={<AlertCircle size={19} />}
              style="amber"
            />
          </div>
        </div>

        {/* BOOKING SOURCE */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Booking Sources
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              See how patients are booking appointments.
            </p>
          </div>

          <div className="space-y-4">
            <SourceRow
              icon={<MessageCircle size={19} />}
              title="WhatsApp"
              value={whatsappBookings}
              total={appointments.length}
            />

            <SourceRow
              icon={<Users size={19} />}
              title="Receptionist"
              value={receptionistBookings}
              total={appointments.length}
            />
          </div>
        </div>
      </div>

      {/* TODAY'S APPOINTMENTS */}

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Today's Appointments
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {todayAppointments.length === 0
                ? "No appointments are scheduled for today."
                : `${todayAppointments.length} appointment${
                    todayAppointments.length === 1 ? "" : "s"
                  } scheduled today.`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/appointments")}
            className="flex items-center gap-2 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
          >
            View all
            <ArrowRight size={16} />
          </button>
        </div>

        {todayAppointments.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center p-8 text-center">
            <div>
              <CalendarDays
                size={38}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-semibold text-slate-700">
                No appointments today
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Today's scheduled appointments will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                  <TableHeading>Patient</TableHeading>
                  <TableHeading>Service</TableHeading>
                  <TableHeading>Dentist</TableHeading>
                  <TableHeading>Time</TableHeading>
                  <TableHeading>Source</TableHeading>
                  <TableHeading>Status</TableHeading>
                </tr>
              </thead>

              <tbody>
                {todayAppointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50 last:border-0"
                  >
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">
                        {getPatientName(
                          appointment.patient_id
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Appointment #{appointment.id}
                      </p>
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {getServiceName(
                        appointment.service_id
                      )}
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-600">
                      {getDentistName(
                        appointment.dentist_id
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock size={16} />

                        {formatTime(
                          appointment.start_time
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <BookingSource
                        source={
                          appointment.booking_source
                        }
                      />
                    </td>

                    <td className="px-6 py-5">
                      <StatusBadge
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

      {/* UPCOMING APPOINTMENTS */}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Upcoming Appointments
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Next scheduled appointments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/appointments")}
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View all
          </button>
        </div>

        {upcomingAppointments.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No upcoming appointments.
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments
              .slice(0, 5)
              .map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <CalendarDays size={18} />
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900">
                        {getPatientName(
                          appointment.patient_id
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {getServiceName(
                          appointment.service_id
                        )}{" "}
                        •{" "}
                        {getDentistName(
                          appointment.dentist_id
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-700">
                        {formatDate(
                          appointment.appointment_date
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatTime(
                          appointment.start_time
                        )}
                      </p>
                    </div>

                    <StatusBadge
                      status={appointment.status}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function QuickAction({
  title,
  description,
  icon,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>

        <ArrowRight
          size={18}
          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600"
        />
      </div>

      <p className="mt-4 font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </button>
  );
}

function SmallStat({ title, value, icon, style }) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div
        className={`inline-flex rounded-lg p-2 ${
          styles[style] || "bg-slate-100 text-slate-700"
        }`}
      >
        {icon}
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-500">
        {title}
      </p>
    </div>
  );
}

function SourceRow({ icon, title, value, total }) {
  const percentage =
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
            {icon}
          </div>

          <div>
            <p className="font-semibold text-slate-800">
              {title}
            </p>

            <p className="text-xs text-slate-400">
              {percentage}% of bookings
            </p>
          </div>
        </div>

        <p className="text-2xl font-bold text-slate-900">
          {value}
        </p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-800 transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function BookingSource({ source }) {
  const whatsapp = source === "WHATSAPP";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        whatsapp
          ? "bg-emerald-50 text-emerald-700"
          : "bg-blue-50 text-blue-700"
      }`}
    >
      {source || "-"}
    </span>
  );
}

function StatusBadge({ status }) {
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
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
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

/* =========================================================
   HELPERS
========================================================= */

function getLocalDateString() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(
    2,
    "0"
  );

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatLongDate(date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString(
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

  date.setHours(
    Number(hours),
    Number(minutes),
    0,
    0
  );

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default Dashboard;