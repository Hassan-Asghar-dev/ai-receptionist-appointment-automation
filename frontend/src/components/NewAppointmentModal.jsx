import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import api from "../services/api";

function NewAppointmentModal({
  open,
  onClose,
  patients,
  dentists,
  services,
  onCreated,
}) {
  const [patientId, setPatientId] = useState("");
  const [patientMode, setPatientMode] = useState("existing");
  const [newPatient, setNewPatient] = useState({
    full_name: "",
    whatsapp_number: "",
    allergies: "",
    medical_history: "",
  });
  const [localPatients, setLocalPatients] = useState(patients);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [patientError, setPatientError] = useState("");
  const [dentistId, setDentistId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");

  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [notes, setNotes] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [creating, setCreating] = useState(false);

  const [slotError, setSlotError] = useState("");
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    setSlots([]);
    setSelectedSlot("");
    setSlotError("");
    setCreateError("");
  }, [dentistId, serviceId, appointmentDate]);

  useEffect(() => {
    setLocalPatients(patients);
  }, [patients]);

  useEffect(() => {
    if (!open) {
      setPatientId("");
      setPatientMode("existing");
      setNewPatient({
        full_name: "",
        whatsapp_number: "",
        allergies: "",
        medical_history: "",
      });
      setPatientError("");
      setDentistId("");
      setServiceId("");
      setAppointmentDate("");
      setSlots([]);
      setSelectedSlot("");
      setNotes("");
      setSlotError("");
      setCreateError("");
    }
  }, [open]);

  if (!open) return null;

  const selectedDentist = dentists.find(
    (dentist) => dentist.id === Number(dentistId)
  );

  const selectedService = services.find(
    (service) => service.id === Number(serviceId)
  );

  const dentistName =
    selectedDentist?.full_name ||
    selectedDentist?.name ||
    "";

  const serviceName =
    selectedService?.service_name ||
    selectedService?.name ||
    "";

  const duration = Number(
    selectedService?.duration_minutes || 0
  );

  const activePatients = localPatients.filter(
    (patient) => patient.is_active !== false
  );

  const activeDentists = dentists.filter(
    (dentist) => dentist.is_active !== false
  );

  const activeServices = services.filter(
    (service) => service.is_active !== false
  );

  const formatTime = (time) => {
    if (!time) return "-";

    const cleanTime =
      typeof time === "string"
        ? time.substring(0, 5)
        : time;

    const [hours, minutes] = cleanTime.split(":");

    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const calculateEndTime = (startTime) => {
    if (!startTime || !duration) return null;

    const [hours, minutes] = startTime
      .substring(0, 5)
      .split(":")
      .map(Number);

    const total = hours * 60 + minutes + duration;

    if (total >= 1440) return null;

    const endHours = Math.floor(total / 60);
    const endMinutes = total % 60;

    return `${String(endHours).padStart(2, "0")}:${String(
      endMinutes
    ).padStart(2, "0")}:00`;
  };

  const normalizeSlots = (data) => {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.slots)) {
      return data.slots;
    }

    if (Array.isArray(data?.available_slots)) {
      return data.available_slots;
    }

    return [];
  };

  const getSlotValue = (slot) => {
    if (typeof slot === "string") {
      return slot.substring(0, 8);
    }

    return (
      slot?.start_time ||
      slot?.time ||
      slot?.slot ||
      ""
    );
  };


  const handleNewPatientChange = (field, value) => {
    setNewPatient((current) => ({
      ...current,
      [field]: value,
    }));
    setPatientError("");
  };

  const normalizeWhatsappNumber = (value) => {
    const trimmed = value.trim().replace(/\s+/g, "");
    if (!trimmed) return "";
    return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
  };

  const handleCreatePatient = async () => {
    setPatientError("");

    if (!newPatient.full_name.trim() || !newPatient.whatsapp_number.trim()) {
      setPatientError("Patient name and WhatsApp number are required.");
      return;
    }

    try {
      setCreatingPatient(true);

      const response = await api.post("/patients/", {
        full_name: newPatient.full_name.trim(),
        whatsapp_number: normalizeWhatsappNumber(newPatient.whatsapp_number),
        allergies: newPatient.allergies.trim() || "None",
        medical_history: newPatient.medical_history.trim() || "None",
      });

      const createdPatient = response.data;
      setLocalPatients((current) => {
        if (current.some((patient) => patient.id === createdPatient.id)) return current;
        return [...current, createdPatient];
      });
      setPatientId(String(createdPatient.id));
      setPatientMode("existing");
      setNewPatient({
        full_name: "",
        whatsapp_number: "",
        allergies: "",
        medical_history: "",
      });
    } catch (err) {
      console.error("Patient creation failed:", err);
      setPatientError(
        err.response?.data?.detail || "Could not create the patient."
      );
    } finally {
      setCreatingPatient(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!dentistId || !serviceId || !appointmentDate) {
      setSlotError(
        "Select a dentist, service and date first."
      );
      return;
    }

    if (!dentistName || !serviceName) {
      setSlotError(
        "Could not determine the dentist or service name."
      );
      return;
    }

    try {
      setLoadingSlots(true);
      setSlotError("");
      setCreateError("");
      setSelectedSlot("");

      const response = await api.post(
        "/availability/slots/by-name",
        {
          dentist_name: dentistName,
          service_name: serviceName,
          appointment_date: appointmentDate,
        }
      );

      const availableSlots = normalizeSlots(response.data);

      setSlots(availableSlots);

      if (availableSlots.length === 0) {
        setSlotError(
          "No available appointment times were found for this date."
        );
      }
    } catch (err) {
      console.error("Slot loading failed:", err);

      setSlots([]);

      setSlotError(
        err.response?.data?.detail ||
          "Could not load available appointment times."
      );
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    setCreateError("");

    if (
      !patientId ||
      !dentistId ||
      !serviceId ||
      !appointmentDate ||
      !selectedSlot
    ) {
      setCreateError(
        "Complete all appointment details and select an available time."
      );
      return;
    }

    const startTime = getSlotValue(selectedSlot);

    const endTime = calculateEndTime(startTime);

    if (!endTime) {
      setCreateError(
        "Could not calculate the appointment end time."
      );
      return;
    }

    try {
      setCreating(true);

      const response = await api.post("/appointments/", {
        patient_id: Number(patientId),
        dentist_id: Number(dentistId),
        service_id: Number(serviceId),

        appointment_date: appointmentDate,

        start_time:
          startTime.length === 5
            ? `${startTime}:00`
            : startTime,

        end_time: endTime,

        status: "CONFIRMED",
        booking_source: "RECEPTIONIST",

        other_service_text: null,
        notes: notes.trim() || null,
        created_by_user_id: null,
      });

      onCreated(response.data);
      onClose();
    } catch (err) {
      console.error("Appointment creation failed:", err);

      setCreateError(
        err.response?.data?.detail ||
          "Could not create the appointment."
      );

      // The slot may have been taken after we loaded it.
      if (err.response?.status === 409) {
        loadAvailableSlots();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              New Appointment
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Book an appointment for a patient.
            </p>
          </div>

          <button
            type="button"
            disabled={creating}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6">
          {/* Patient */}
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-slate-700">
                Patient
              </label>

              <button
                type="button"
                onClick={() => {
                  setPatientMode((current) =>
                    current === "existing" ? "new" : "existing"
                  );
                  setPatientError("");
                }}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {patientMode === "existing"
                  ? "+ Add New Patient"
                  : "Select Existing Patient"}
              </button>
            </div>

            {patientMode === "existing" ? (
              <select
                required
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
              >
                <option value="">Select patient</option>

                {activePatients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name ||
                      patient.name ||
                      `Patient #${patient.id}`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={newPatient.full_name}
                      onChange={(event) =>
                        handleNewPatientChange("full_name", event.target.value)
                      }
                      placeholder="Patient full name"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      value={newPatient.whatsapp_number}
                      onChange={(event) =>
                        handleNewPatientChange("whatsapp_number", event.target.value)
                      }
                      placeholder="923001234567"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Allergies
                    </label>
                    <input
                      type="text"
                      value={newPatient.allergies}
                      onChange={(event) =>
                        handleNewPatientChange("allergies", event.target.value)
                      }
                      placeholder="None"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Medical History
                    </label>
                    <input
                      type="text"
                      value={newPatient.medical_history}
                      onChange={(event) =>
                        handleNewPatientChange("medical_history", event.target.value)
                      }
                      placeholder="None"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {patientError && (
                  <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {patientError}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreatePatient}
                    disabled={creatingPatient}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingPatient ? "Saving Patient..." : "Save Patient & Continue"}
                  </button>
                </div>
              </div>
            )}

            {patientMode === "existing" && patientId && (
              <p className="mt-2 text-xs font-medium text-emerald-700">
                Patient selected. Continue with dentist, service and appointment time.
              </p>
            )}
          </div>

          {/* Dentist + Service */}
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Dentist
              </label>

              <select
                required
                value={dentistId}
                onChange={(event) =>
                  setDentistId(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
              >
                <option value="">
                  Select dentist
                </option>

                {activeDentists.map((dentist) => (
                  <option
                    key={dentist.id}
                    value={dentist.id}
                  >
                    {dentist.full_name ||
                      dentist.name ||
                      `Dentist #${dentist.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Service
              </label>

              <select
                required
                value={serviceId}
                onChange={(event) =>
                  setServiceId(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
              >
                <option value="">
                  Select service
                </option>

                {activeServices.map((service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.service_name ||
                      service.name ||
                      `Service #${service.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Service information */}
          {selectedService && (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Duration:{" "}
              <strong className="text-slate-800">
                {duration} minutes
              </strong>
            </div>
          )}

          {/* Date */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Appointment Date
            </label>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <CalendarDays
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="date"
                  required
                  value={appointmentDate}
                  onChange={(event) =>
                    setAppointmentDate(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={loadAvailableSlots}
                disabled={
                  loadingSlots ||
                  !dentistId ||
                  !serviceId ||
                  !appointmentDate
                }
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingSlots ? (
                  <span className="flex items-center gap-2">
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Checking
                  </span>
                ) : (
                  "Check Times"
                )}
              </button>
            </div>
          </div>

          {/* Available slots */}
          {(loadingSlots ||
            slots.length > 0 ||
            slotError) && (
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <Clock
                  size={17}
                  className="text-slate-500"
                />

                <h3 className="text-sm font-semibold text-slate-800">
                  Available Times
                </h3>
              </div>

              {loadingSlots && (
                <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                  Checking real clinic availability...
                </div>
              )}

              {!loadingSlots &&
                slots.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {slots.map((slot, index) => {
                      const value =
                        getSlotValue(slot);

                      const active =
                        getSlotValue(
                          selectedSlot
                        ) === value;

                      return (
                        <button
                          key={`${value}-${index}`}
                          type="button"
                          onClick={() =>
                            setSelectedSlot(slot)
                          }
                          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                            active
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                          }`}
                        >
                          {formatTime(value)}
                        </button>
                      );
                    })}
                  </div>
                )}

              {!loadingSlots && slotError && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {slotError}
                </div>
              )}
            </div>
          )}

          {/* Selected appointment summary */}
          {selectedSlot && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <Check size={18} />

                <h3 className="font-semibold">
                  Selected Appointment
                </h3>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-slate-500">
                    Dentist
                  </p>
                  <p className="font-medium text-slate-900">
                    {dentistName}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    Service
                  </p>
                  <p className="font-medium text-slate-900">
                    {serviceName}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    Start
                  </p>
                  <p className="font-medium text-slate-900">
                    {formatTime(
                      getSlotValue(selectedSlot)
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    End
                  </p>
                  <p className="font-medium text-slate-900">
                    {formatTime(
                      calculateEndTime(
                        getSlotValue(selectedSlot)
                      )
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
              <span className="ml-1 font-normal text-slate-400">
                (optional)
              </span>
            </label>

            <textarea
              rows={3}
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Add appointment notes..."
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          {createError && (
            <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {createError}
            </div>
          )}

          {/* Buttons */}
          <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                creating ||
                !patientId ||
                !dentistId ||
                !serviceId ||
                !appointmentDate ||
                !selectedSlot
              }
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating
                ? "Creating..."
                : "Create Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewAppointmentModal;