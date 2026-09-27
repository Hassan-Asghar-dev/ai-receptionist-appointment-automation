from datetime import time

from pydantic import BaseModel, ConfigDict


class BookingStateUpdate(BaseModel):
    service_name: str | None = None
    dentist_name: str | None = None
    appointment_year: int | None = None
    appointment_month: int | None = None
    appointment_day: int | None = None
    selected_time: time | None = None


class BookingStateResponse(BaseModel):
    whatsapp_number: str
    service_name: str | None = None
    dentist_name: str | None = None
    appointment_year: int | None = None
    appointment_month: int | None = None
    appointment_day: int | None = None
    selected_time: time | None = None

    model_config = ConfigDict(from_attributes=True)