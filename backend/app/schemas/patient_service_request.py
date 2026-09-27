from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PatientServiceRequestCreate(BaseModel):
    patient_id: int
    appointment_id: int | None = None
    requested_service: str
    description: str | None = None


class PatientServiceRequestUpdate(BaseModel):
    status: str


class PatientServiceRequestResponse(BaseModel):
    id: int
    patient_id: int
    appointment_id: int | None
    requested_service: str
    description: str | None
    status: str
    resolved_by_user_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)