from datetime import date, time

from pydantic import BaseModel, ConfigDict


class AvailabilityRequest(BaseModel):
    dentist_id: int
    appointment_date: date
    start_time: time
    end_time: time


class AvailabilityResponse(BaseModel):
    dentist_id: int
    appointment_date: date
    start_time: time
    end_time: time
    available: bool
    message: str

    model_config = ConfigDict(from_attributes=True)