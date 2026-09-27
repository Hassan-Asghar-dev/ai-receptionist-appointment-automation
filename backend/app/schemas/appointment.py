from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AppointmentCreate(BaseModel):
    patient_id: int
    dentist_id: int
    service_id: int | None = None

    appointment_date: date
    start_time: time
    end_time: time

    status: str = "PENDING"
    booking_source: str

    other_service_text: str | None = None
    notes: str | None = None

    created_by_user_id: int | None = None

    @model_validator(mode="after")
    def validate_appointment(self):
        if self.start_time >= self.end_time:
            raise ValueError(
                "start_time must be before end_time"
            )

        if self.booking_source not in [
            "WHATSAPP",
            "RECEPTIONIST"
        ]:
            raise ValueError(
                "booking_source must be WHATSAPP or RECEPTIONIST"
            )

        if self.status not in [
            "PENDING",
            "CONFIRMED",
            "COMPLETED",
            "CANCELLED",
            "NO_SHOW",
            "REJECTED"
        ]:
            raise ValueError(
                "Invalid appointment status"
            )

        if self.service_id is None and not self.other_service_text:
            raise ValueError(
                "Either service_id or other_service_text must be provided"
            )

        return self


class AppointmentUpdate(BaseModel):
    appointment_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None

    status: str | None = None
    service_id: int | None = None
    other_service_text: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_status(self):
        if self.status is not None:
            if self.status not in [
                "PENDING",
                "CONFIRMED",
                "COMPLETED",
                "CANCELLED",
                "NO_SHOW",
                "REJECTED"
            ]:
                raise ValueError(
                    "Invalid appointment status"
                )

        if (
            self.start_time is not None
            and self.end_time is not None
            and self.start_time >= self.end_time
        ):
            raise ValueError(
                "start_time must be before end_time"
            )

        return self


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    dentist_id: int
    service_id: int | None

    appointment_date: date
    start_time: time
    end_time: time

    status: str
    booking_source: str

    other_service_text: str | None
    notes: str | None
    created_by_user_id: int | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AppointmentReschedule(BaseModel):
    appointment_date: date
    start_time: time
    end_time: time



class WhatsAppAppointmentCreate(BaseModel):
    whatsapp_number: str
    dentist_name: str
    service_name: str
    appointment_date: date
    start_time: time


class WhatsAppAppointmentResponse(BaseModel):
    appointment_id: int

    patient_id: int
    patient_name: str
    whatsapp_number: str

    dentist_id: int
    dentist_name: str

    service_id: int
    service_name: str

    appointment_date: date
    start_time: time
    end_time: time

    duration_minutes: int
    status: str
    booking_source: str
    message: str