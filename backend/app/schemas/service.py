from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ServiceCreate(BaseModel):
    name: str
    description: str | None = None
    duration_minutes: int = Field(gt=0)
    price: float = Field(ge=0)


class ServiceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    duration_minutes: int | None = Field(default=None, gt=0)
    price: float | None = Field(default=None, ge=0)


class ServiceResponse(BaseModel):
    id: int
    name: str
    description: str | None
    duration_minutes: int
    price: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ServiceStatusUpdate(BaseModel):
    is_active: bool