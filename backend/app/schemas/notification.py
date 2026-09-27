from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationCreate(BaseModel):
    user_id: int | None = None
    patient_id: int | None = None
    appointment_id: int | None = None
    type: str
    title: str
    message: str
    scheduled_for: datetime


class NotificationUpdate(BaseModel):
    status: str
    sent_at: datetime | None = None


class NotificationResponse(BaseModel):
    id: int
    user_id: int | None
    patient_id: int | None
    appointment_id: int | None
    type: str
    title: str
    message: str
    scheduled_for: datetime
    sent_at: datetime | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)