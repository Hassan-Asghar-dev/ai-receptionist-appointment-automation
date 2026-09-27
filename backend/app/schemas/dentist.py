from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class DentistCreate(BaseModel):
    full_name: str
    specialization: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    notes: str | None = None


class DentistUpdate(BaseModel):
    full_name: str | None = None
    specialization: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    notes: str | None = None


class DentistResponse(BaseModel):
    id: int
    full_name: str
    specialization: str | None
    phone: str | None
    email: EmailStr | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DentistStatusUpdate(BaseModel):
    is_active: bool