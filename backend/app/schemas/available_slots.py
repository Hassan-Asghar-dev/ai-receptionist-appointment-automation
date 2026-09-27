from datetime import date, time

from pydantic import BaseModel, ConfigDict




class AvailableSlotsRequest(BaseModel):
    dentist_id: int
    appointment_date: date
    service_id: int


class AvailableSlot(BaseModel):
    start_time: time
    end_time: time


class AvailableSlotsResponse(BaseModel):
    dentist_id: int
    appointment_date: date
    service_id: int
    duration_minutes: int
    slot_interval_minutes: int
    slots: list[AvailableSlot]

    model_config = ConfigDict(from_attributes=True)




class AvailableSlotsByNameRequest(BaseModel):
    dentist_name: str
    service_name: str
    appointment_date: date


class AvailableSlotsByNameResponse(BaseModel):
    dentist_id: int
    dentist_name: str
    service_id: int
    service_name: str
    appointment_date: date
    duration_minutes: int
    slot_interval_minutes: int
    slots: list[AvailableSlot]

    model_config = ConfigDict(from_attributes=True)