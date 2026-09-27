from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class PatientCreate(BaseModel):
    full_name: str
    whatsapp_number: str
    email: EmailStr | None = None
    medical_history: str | None = None
    allergies: str | None = None
    notes: str | None = None


class PatientUpdate(BaseModel):
    full_name: str | None = None
    whatsapp_number: str | None = None
    email: EmailStr | None = None
    medical_history: str | None = None
    allergies: str | None = None
    notes: str | None = None


class PatientResponse(BaseModel):
    id: int
    full_name: str
    whatsapp_number: str
    email: EmailStr | None
    medical_history: str | None
    allergies: str | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PatientStatusUpdate(BaseModel):
    is_active: bool